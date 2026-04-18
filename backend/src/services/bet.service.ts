import createHttpError from "http-errors";
import prisma from "@/config/prisma.js";
import { lockTokens, refundTokens } from "@/services/token.service.js";
import { createBulkNotifications } from "@/services/notification.service.js";

const DAY_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export function getScheduledDates(start: Date, end: Date, days: string[]): Date[] {
  const dayNums = new Set(days.map((d) => DAY_MAP[d] ?? -1));
  const dates: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);

  while (cur <= endNorm) {
    if (dayNums.has(cur.getDay())) {
      dates.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

interface CreateBetInput {
  title: string;
  description?: string;
  type: "RECURRING" | "LAST_MAN_STANDING";
  visibility: "PRIVATE" | "PUBLIC";
  proofDescription: string;
  scheduleDays: string[];
  startDate?: string;
  endDate?: string;
  tokenPerMiss?: number;
  entryTokens?: number;
}

export async function createBet(creatorId: string, input: CreateBetInput) {
  let entryTokens = input.entryTokens ?? 0;

  if (input.type === "RECURRING") {
    if (!input.startDate || !input.endDate || !input.tokenPerMiss) {
      throw createHttpError(400, "Recurring bets require startDate, endDate, tokenPerMiss");
    }
    const scheduled = getScheduledDates(
      new Date(input.startDate),
      new Date(input.endDate),
      input.scheduleDays,
    );
    entryTokens = (input.tokenPerMiss ?? 0) * scheduled.length;
  } else {
    if (!input.entryTokens) throw createHttpError(400, "LMS bets require entryTokens");
  }

  const user = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!user) throw createHttpError(404, "User not found");
  if (user.tokenBalance < entryTokens) {
    throw createHttpError(400, `Insufficient tokens. Need ${entryTokens}, have ${user.tokenBalance}`);
  }

  const bet = await prisma.bet.create({
    data: {
      title: input.title,
      ...(input.description !== undefined && { description: input.description }),
      type: input.type,
      visibility: input.visibility,
      creatorId,
      proofDescription: input.proofDescription,
      scheduleDays: input.scheduleDays,
      tokenPerMiss: input.tokenPerMiss ?? 0,
      entryTokens,
      ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
    },
    include: { participants: true },
  });

  await prisma.betParticipant.create({
    data: {
      betId: bet.id,
      userId: creatorId,
      status: "JOINED",
      tokensLocked: entryTokens,
    },
  });

  await lockTokens(creatorId, bet.id, entryTokens);
  await prisma.bet.update({ where: { id: bet.id }, data: { prizePool: entryTokens } });

  return prisma.bet.findUnique({
    where: { id: bet.id },
    include: { participants: { include: { user: true } }, creator: true },
  });
}

export async function startBet(betId: string, adminId: string) {
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    include: { participants: true },
  });
  if (!bet) throw createHttpError(404, "Bet not found");
  if (bet.creatorId !== adminId) throw createHttpError(403, "Only the creator can start the bet");
  if (bet.status !== "DRAFT") throw createHttpError(400, "Bet is not in DRAFT status");
  if (bet.participants.length < 2) throw createHttpError(400, "Need at least 2 participants");

  if (bet.type === "RECURRING") {
    if (!bet.startDate) throw createHttpError(400, "Recurring bet requires a start date");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bet.startDate < today) throw createHttpError(400, "Start date cannot be in the past");
  }

  await prisma.bet.update({
    where: { id: betId },
    data: { status: "ACTIVE", startedAt: new Date() },
  });

  await prisma.betParticipant.updateMany({
    where: { betId, status: "JOINED" },
    data: { status: "ACTIVE" },
  });

  if (bet.type === "RECURRING" && bet.startDate && bet.endDate) {
    const dates = getScheduledDates(bet.startDate, bet.endDate, bet.scheduleDays);
    const participants = await prisma.betParticipant.findMany({ where: { betId } });

    for (const participant of participants) {
      for (const date of dates) {
        const deadline = new Date(date);
        deadline.setHours(23, 59, 59, 999);
        await prisma.betCheckInDay.upsert({
          where: { betId_participantId_scheduledDate: { betId, participantId: participant.id, scheduledDate: date } },
          create: { betId, participantId: participant.id, scheduledDate: date, deadlineAt: deadline, status: "PENDING" },
          update: {},
        });
      }
    }
  }

  const participants = await prisma.betParticipant.findMany({ where: { betId } });
  await createBulkNotifications(
    participants.map((p) => ({
      userId: p.userId,
      type: "BET_STARTED" as const,
      title: `${bet.title} has started!`,
      body: "Check-ins are now open. Don't miss a day!",
      betId,
    })),
  );

  return prisma.bet.findUnique({
    where: { id: betId },
    include: { participants: { include: { user: true } }, creator: true },
  });
}

export async function cancelBet(betId: string, adminId: string) {
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    include: { participants: true },
  });
  if (!bet) throw createHttpError(404, "Bet not found");
  if (bet.creatorId !== adminId) throw createHttpError(403, "Only the creator can cancel");
  if (bet.status !== "DRAFT") throw createHttpError(400, "Only DRAFT bets can be cancelled");

  for (const participant of bet.participants) {
    await refundTokens(participant.userId, betId, participant.tokensLocked);
  }

  await prisma.bet.update({ where: { id: betId }, data: { status: "CANCELLED" } });
  await prisma.betParticipant.updateMany({
    where: { betId },
    data: { status: "WITHDRAWN" },
  });

  await createBulkNotifications(
    bet.participants.map((p) => ({
      userId: p.userId,
      type: "BET_CANCELLED" as const,
      title: `${bet.title} was cancelled`,
      body: "Your tokens have been refunded.",
      betId,
    })),
  );
}

export async function joinBet(inviteCode: string, userId: string) {
  const bet = await prisma.bet.findUnique({
    where: { inviteCode },
    include: { participants: true },
  });
  if (!bet) throw createHttpError(404, "Bet not found");
  if (bet.status !== "DRAFT") throw createHttpError(400, "This bet is no longer accepting joins");

  const existing = bet.participants.find((p) => p.userId === userId);
  if (existing) throw createHttpError(409, "You are already in this bet");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User not found");
  if (user.tokenBalance < bet.entryTokens) {
    throw createHttpError(400, `Need ${bet.entryTokens} tokens, have ${user.tokenBalance}`);
  }

  await prisma.betParticipant.create({
    data: {
      betId: bet.id,
      userId,
      status: "JOINED",
      tokensLocked: bet.entryTokens,
    },
  });

  await lockTokens(userId, bet.id, bet.entryTokens);
  await prisma.bet.update({
    where: { id: bet.id },
    data: { prizePool: { increment: bet.entryTokens } },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "BET_INVITE",
      title: `Joined: ${bet.title}`,
      body: `${bet.entryTokens} tokens locked. Waiting for admin to start.`,
      betId: bet.id,
    },
  });

  return prisma.bet.findUnique({
    where: { id: bet.id },
    include: { participants: { include: { user: true } }, creator: true },
  });
}

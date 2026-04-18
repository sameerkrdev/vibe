import prisma from "@/config/prisma.js";
import { payoutTokens } from "@/services/token.service.js";
import { createBulkNotifications } from "@/services/notification.service.js";
import logger from "@/config/logger.js";

export async function settleBet(betId: string) {
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    include: { participants: { include: { user: true } } },
  });
  if (!bet || bet.status !== "ACTIVE") return;

  if (bet.type === "RECURRING") {
    await settleRecurring(betId);
  } else {
    await settleLMS(betId);
  }

  await prisma.bet.update({
    where: { id: betId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  const participants = await prisma.betParticipant.findMany({ where: { betId } });
  await createBulkNotifications(
    participants.map((p) => ({
      userId: p.userId,
      type: "BET_COMPLETED" as const,
      title: "Bet completed!",
      body: `The bet has ended. Check your payout.`,
      betId,
    })),
  );
}

async function settleRecurring(betId: string) {
  const participants = await prisma.betParticipant.findMany({
    where: { betId, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: { user: true },
  });

  const checkInCounts = await Promise.all(
    participants.map(async (p) => {
      const count = await prisma.betCheckInDay.count({
        where: { betId, participantId: p.id, status: "CHECKED_IN" },
      });
      return { participant: p, checkedInDays: count };
    }),
  );

  const totalCheckedIn = checkInCounts.reduce((sum, c) => sum + c.checkedInDays, 0);
  const totalDeductedPool = participants.reduce((sum, p) => sum + p.tokensDeducted, 0);

  for (const { participant, checkedInDays } of checkInCounts) {
    const proportionalShare =
      totalCheckedIn > 0
        ? Math.floor((checkedInDays / totalCheckedIn) * totalDeductedPool)
        : 0;
    const netShare = Math.max(0, proportionalShare - participant.tokensDeducted);
    const netPayout = participant.tokensLocked - participant.tokensDeducted + netShare;

    if (netPayout > 0) {
      await payoutTokens(
        participant.userId,
        betId,
        netPayout,
        `Recurring bet settlement: ${checkedInDays} check-ins`,
      );
    }

    await prisma.betParticipant.update({
      where: { id: participant.id },
      data: { status: "COMPLETED" },
    });

    if (netPayout > 0) {
      await prisma.notification.create({
        data: {
          userId: participant.userId,
          type: "PAYOUT_AVAILABLE",
          title: "Payout available!",
          body: `You earned ${netPayout} tokens from the bet settlement.`,
          betId,
        },
      });
    }
  }
}

async function settleLMS(betId: string) {
  const activeParticipants = await prisma.betParticipant.findMany({
    where: { betId, status: "ACTIVE" },
  });

  const bet = await prisma.bet.findUnique({ where: { id: betId } });
  if (!bet) return;

  if (activeParticipants.length === 0) {
    logger.info(`LMS bet ${betId} ended with no winners`);
    return;
  }

  const splitAmount = Math.floor(bet.prizePool / activeParticipants.length);

  for (const participant of activeParticipants) {
    await payoutTokens(participant.userId, betId, splitAmount, "LMS bet winner payout");
    await prisma.betParticipant.update({
      where: { id: participant.id },
      data: { status: "COMPLETED" },
    });
    await prisma.notification.create({
      data: {
        userId: participant.userId,
        type: "PAYOUT_AVAILABLE",
        title: "You won!",
        body: `You won ${splitAmount} tokens from the Last Man Standing bet!`,
        betId,
      },
    });
  }
}

import createHttpError from "http-errors";
import prisma from "@/config/prisma.js";

export async function lockTokens(userId: string, betId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User not found");
  if (user.tokenBalance < amount) {
    throw createHttpError(400, `Insufficient tokens. Need ${amount}, have ${user.tokenBalance}`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { tokenBalance: { decrement: amount } },
  });

  await prisma.tokenTransaction.create({
    data: {
      userId,
      betId,
      type: "LOCK",
      amount: -amount,
      balanceBefore: user.tokenBalance,
      balanceAfter: user.tokenBalance - amount,
      description: `Tokens locked for bet`,
    },
  });
}

export async function deductTokens(
  userId: string,
  betId: string,
  amount: number,
  participantId: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User not found");

  await prisma.betParticipant.update({
    where: { id: participantId },
    data: { tokensDeducted: { increment: amount } },
  });

  await prisma.bet.update({
    where: { id: betId },
    data: { prizePool: { increment: amount } },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totalDeducted: { increment: amount } },
  });

  await prisma.tokenTransaction.create({
    data: {
      userId,
      betId,
      type: "DEDUCT",
      amount: -amount,
      balanceBefore: user.tokenBalance,
      balanceAfter: user.tokenBalance,
      description: `Missed check-in deduction`,
    },
  });
}

export async function refundTokens(userId: string, betId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User not found");

  await prisma.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: amount } },
  });

  await prisma.tokenTransaction.create({
    data: {
      userId,
      betId,
      type: "REFUND",
      amount,
      balanceBefore: user.tokenBalance,
      balanceAfter: user.tokenBalance + amount,
      description: `Refund from cancelled bet`,
    },
  });
}

export async function payoutTokens(userId: string, betId: string, amount: number, description: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User not found");

  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenBalance: { increment: amount },
      totalEarned: { increment: amount },
    },
  });

  await prisma.tokenTransaction.create({
    data: {
      userId,
      betId,
      type: "PAYOUT",
      amount,
      balanceBefore: user.tokenBalance,
      balanceAfter: user.tokenBalance + amount,
      description,
    },
  });
}

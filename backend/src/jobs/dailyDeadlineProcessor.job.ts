import { Worker } from "bullmq";
import redis from "@/config/redis.js";
import prisma from "@/config/prisma.js";
import { deductTokens } from "@/services/token.service.js";
import { createBulkNotifications, createNotification } from "@/services/notification.service.js";
import { betSettlementQueue } from "@/config/bullmq.js";
import logger from "@/config/logger.js";

export const dailyDeadlineWorker = new Worker(
  "daily-deadline-processor",
  async () => {
    logger.info("Running daily-deadline-processor");
    const now = new Date();

    const openDays = await prisma.betCheckInDay.findMany({
      where: { status: "OPEN", deadlineAt: { lte: now } },
      include: {
        bet: { include: { participants: { where: { status: "ACTIVE" } } } },
      },
    });

    for (const day of openDays) {
      await prisma.betCheckInDay.update({ where: { id: day.id }, data: { status: "MISSED" } });

      const participant = day.bet.participants.find((p) => p.id === day.participantId);
      if (!participant) continue;

      if (day.bet.type === "RECURRING") {
        await deductTokens(participant.userId, day.betId, day.bet.tokenPerMiss, participant.id);
        await createNotification({
          userId: participant.userId,
          type: "TOKENS_DEDUCTED",
          title: "Missed check-in",
          body: `${day.bet.tokenPerMiss} tokens deducted for missing "${day.bet.title}"`,
          betId: day.betId,
        });
      } else {
        await prisma.betParticipant.update({
          where: { id: participant.id },
          data: { status: "ELIMINATED", eliminatedAt: now },
        });

        const remaining = day.bet.participants.filter(
          (p) => p.id !== participant.id && p.status === "ACTIVE",
        );
        await createBulkNotifications(
          remaining.map((p) => ({
            userId: p.userId,
            type: "PARTICIPANT_ELIMINATED" as const,
            title: "Someone was eliminated!",
            body: `A participant was eliminated from "${day.bet.title}". ${remaining.length} remain.`,
            betId: day.betId,
          })),
        );

        const activeCount = await prisma.betParticipant.count({
          where: { betId: day.betId, status: "ACTIVE" },
        });
        if (activeCount <= 1) {
          await betSettlementQueue.add("settle", { betId: day.betId });
        }
      }
    }

    // Check RECURRING bets past end date
    const expiredBets = await prisma.bet.findMany({
      where: {
        status: "ACTIVE",
        type: "RECURRING",
        endDate: { lte: now },
      },
    });
    for (const bet of expiredBets) {
      await betSettlementQueue.add("settle", { betId: bet.id });
    }
  },
  { connection: redis },
);

dailyDeadlineWorker.on("failed", (job, err) => {
  logger.error(`daily-deadline-processor job failed:`, err);
});

import { Worker } from "bullmq";
import redis from "@/config/redis.js";
import prisma from "@/config/prisma.js";
import { getScheduledDates } from "@/services/bet.service.js";
import { createBulkNotifications } from "@/services/notification.service.js";
import logger from "@/config/logger.js";

export const dailyCheckinWorker = new Worker(
  "daily-checkin-scheduler",
  async () => {
    logger.info("Running daily-checkin-scheduler");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bets = await prisma.bet.findMany({
      where: { status: "ACTIVE" },
      include: { participants: { where: { status: "ACTIVE" } } },
    });

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const todayName = dayNames[today.getDay()];

    for (const bet of bets) {
      if (!todayName || !bet.scheduleDays.includes(todayName)) continue;

      const deadline = new Date(today);
      deadline.setHours(23, 59, 59, 999);

      for (const participant of bet.participants) {
        await prisma.betCheckInDay.upsert({
          where: {
            betId_participantId_scheduledDate: {
              betId: bet.id,
              participantId: participant.id,
              scheduledDate: today,
            },
          },
          create: {
            betId: bet.id,
            participantId: participant.id,
            scheduledDate: today,
            deadlineAt: deadline,
            status: "OPEN",
          },
          update: { status: "OPEN" },
        });
      }

      await createBulkNotifications(
        bet.participants.map((p) => ({
          userId: p.userId,
          type: "CHECK_IN_REMINDER" as const,
          title: "Time to check in!",
          body: `Don't forget your daily check-in for "${bet.title}"`,
          betId: bet.id,
        })),
      );
    }
  },
  { connection: redis },
);

dailyCheckinWorker.on("failed", (job, err) => {
  logger.error(`daily-checkin-scheduler job failed:`, err);
});

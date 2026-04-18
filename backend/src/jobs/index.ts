import {
  checkinSchedulerQueue,
  voteTallierQueue,
  deadlineProcessorQueue,
} from "@/config/bullmq.js";
import { dailyCheckinWorker } from "@/jobs/dailyCheckinScheduler.job.js";
import { peerVoteTallierWorker } from "@/jobs/peerVoteTallier.job.js";
import { dailyDeadlineWorker } from "@/jobs/dailyDeadlineProcessor.job.js";
import { betSettlementWorker } from "@/jobs/betSettlement.job.js";
import logger from "@/config/logger.js";

// IST = UTC+5:30
// 00:01 IST = 18:31 UTC previous day
// 23:58 IST = 18:28 UTC
// 23:59 IST = 18:29 UTC

async function registerCronJobs() {
  await checkinSchedulerQueue.upsertJobScheduler(
    "daily-checkin-scheduler-repeat",
    { pattern: "31 18 * * *" },
    { name: "run", data: {} },
  );

  await voteTallierQueue.upsertJobScheduler(
    "peer-vote-tallier-repeat",
    { pattern: "28 18 * * *" },
    { name: "run", data: {} },
  );

  await deadlineProcessorQueue.upsertJobScheduler(
    "daily-deadline-processor-repeat",
    { pattern: "29 18 * * *" },
    { name: "run", data: {} },
  );

  logger.info("BullMQ cron jobs registered");
}

registerCronJobs().catch((err: unknown) => {
  logger.error("Failed to register cron jobs:", err);
});

export { dailyCheckinWorker, peerVoteTallierWorker, dailyDeadlineWorker, betSettlementWorker };

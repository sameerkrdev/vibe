import { Worker } from "bullmq";
import redis from "@/config/redis.js";
import { settleBet } from "@/services/settlement.service.js";
import logger from "@/config/logger.js";

export const betSettlementWorker = new Worker(
  "bet-settlement",
  async (job) => {
    const { betId } = job.data as { betId: string };
    logger.info(`Settling bet ${betId}`);
    await settleBet(betId);
  },
  { connection: redis },
);

betSettlementWorker.on("failed", (job, err) => {
  logger.error(`bet-settlement job failed:`, err);
});

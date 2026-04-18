import { Queue } from "bullmq";
import redis from "@/config/redis.js";

export const checkinSchedulerQueue = new Queue("daily-checkin-scheduler", {
  connection: redis,
});

export const voteTallierQueue = new Queue("peer-vote-tallier", {
  connection: redis,
});

export const deadlineProcessorQueue = new Queue("daily-deadline-processor", {
  connection: redis,
});

export const betSettlementQueue = new Queue("bet-settlement", {
  connection: redis,
});

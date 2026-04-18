import { Redis } from "ioredis";
import env from "@/config/dotenv.js";
import logger from "@/config/logger.js";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on("error", (err: Error) => {
  logger.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

export default redis;

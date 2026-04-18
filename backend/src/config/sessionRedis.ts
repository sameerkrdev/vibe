import { createClient } from "redis";
import env from "@/config/dotenv.js";
import logger from "@/config/logger.js";

const sessionRedis = createClient({
  url: env.REDIS_URL,
});

sessionRedis.on("error", (err: Error) => {
  logger.error("Session Redis connection error:", err.message);
});

sessionRedis.on("connect", () => {
  logger.info("Session Redis connected");
});

void sessionRedis.connect().catch((err: unknown) => {
  logger.error("Failed to connect session Redis client", err);
});

export default sessionRedis;

import { config } from "dotenv";
import { cleanEnv, port, str } from "envalid";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({
  path: join(__dirname, "../../.env"),
});

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  DATABASE_URL: str(),
  SESSION_SECRET: str({ default: "stakestreak-dev-secret-change-in-prod" }),
  REDIS_URL: str({ default: "redis://localhost:6379" }),
  CLIENT_URL: str({ default: "http://localhost:5173" }),
  GOOGLE_CLIENT_ID: str({ default: "" }),
  GOOGLE_CLIENT_SECRET: str({ default: "" }),
  GOOGLE_CALLBACK_URL: str({ default: "http://localhost:3000/api/auth/google/callback" }),
  OPENAI_API_KEY: str({ default: "" }),
  CLOUDINARY_CLOUD_NAME: str({ default: "" }),
  CLOUDINARY_API_KEY: str({ default: "" }),
  CLOUDINARY_API_SECRET: str({ default: "" }),
});

export default env;

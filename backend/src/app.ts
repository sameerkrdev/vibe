import type { Request, Response, NextFunction } from "express";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";
import type { HttpError } from "http-errors";
import logger from "@/config/logger.js";
import sessionRedis from "@/config/sessionRedis.js";
import passport from "@/config/passport.js";
import env from "@/config/dotenv.js";
import authRouter from "@/routes/authRoutes.js";
import betRouter from "@/routes/betRoutes.js";
import checkinRouter from "@/routes/checkinRoutes.js";
import walletRouter from "@/routes/walletRoutes.js";
import notificationRouter from "@/routes/notificationRoutes.js";
import userRouter from "@/routes/userRoutes.js";
import { isAuthenticated } from "@/middlewares/isAuthenticated.js";

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

app.use(
  session({
    store: new RedisStore({ client: sessionRedis }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => {
  res.json({ message: "StakeStreak API", status: "running" });
});

app.use("/api/auth", authRouter);
app.use("/api/bets", isAuthenticated, betRouter);
app.use("/api/bets", isAuthenticated, checkinRouter);
app.use("/api/wallet", isAuthenticated, walletRouter);
app.use("/api/notifications", isAuthenticated, notificationRouter);
app.use("/api/users", isAuthenticated, userRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error) {
    const statusCode = err.status ?? err.statusCode ?? 500;

    logger.error({
      name: err.name,
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.originalUrl,
    });

    return res.status(statusCode).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
});

export default app;

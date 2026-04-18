import type { Request, Response, NextFunction } from "express";
import passport from "@/config/passport.js";
import { registerUser } from "@/services/auth.service.js";
import env from "@/config/dotenv.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await registerUser(req.body as {
      email: string;
      username: string;
      displayName: string;
      password: string;
    });

    req.login(user as Express.User, (err) => {
      if (err) return next(err);
      return res.status(201).json({ success: true, user });
    });
  } catch (err) {
    next(err);
  }
}

export function login(req: Request, res: Response, next: NextFunction) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  passport.authenticate("local", (err: Error | null, user: Express.User | false) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ success: true, user });
    });
  })(req, res, next);
}

export function logout(req: Request, res: Response, next: NextFunction) {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.json({ success: true, message: "Logged out" });
    });
  });
}

export function getMe(req: Request, res: Response) {
  return res.json({ success: true, user: req.user });
}

export function googleCallback(req: Request, res: Response) {
  res.redirect(`${env.CLIENT_URL}/dashboard`);
}

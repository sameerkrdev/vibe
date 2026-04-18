import { Router } from "express";
import passport from "@/config/passport.js";
import { register, login, logout, getMe, googleCallback } from "@/controllers/auth.controller.js";
import zodValidatorMiddleware from "@/middlewares/zodValidationMiddleware.js";
import { isAuthenticated } from "@/middlewares/isAuthenticated.js";
import { registerSchema, loginSchema } from "@/zodValidationSchema/authValidationSchema.js";

const authRouter = Router();

authRouter.post("/register", zodValidatorMiddleware(registerSchema), register);
authRouter.post("/login", zodValidatorMiddleware(loginSchema), login);
authRouter.post("/logout", isAuthenticated, logout);
authRouter.get("/me", isAuthenticated, getMe);

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  googleCallback,
);

export default authRouter;

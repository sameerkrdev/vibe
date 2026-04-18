import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import prisma from "@/config/prisma.js";
import env from "@/config/dotenv.js";
import logger from "@/config/logger.js";

passport.use(
  new LocalStrategy(
    { usernameField: "emailOrUsername", passwordField: "password" },
    async (emailOrUsername, password, done) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
          },
        });

        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const { passwordHash: _pw, ...safeUser } = user;
        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));

          let user = await prisma.user.findFirst({
            where: { OR: [{ googleId: profile.id }, { email }] },
          });

          if (user) {
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
              });
            }
          } else {
            const username = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_") ?? profile.id;
            user = await prisma.user.create({
              data: {
                email,
                username,
                displayName: profile.displayName ?? email,
                googleId: profile.id,
                avatarUrl: profile.photos?.[0]?.value ?? null,
                tokenBalance: 500,
              },
            });
            await prisma.tokenTransaction.create({
              data: {
                userId: user.id,
                type: "SIGNUP_BONUS",
                amount: 500,
                balanceBefore: 0,
                balanceAfter: 500,
                description: "Welcome bonus — 500 tokens to start!",
              },
            });
          }

          const { passwordHash: _pw, ...safeUser } = user;
          return done(null, safeUser);
        } catch (err) {
          logger.error("Google OAuth error:", err);
          return done(err as Error);
        }
      },
    ),
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return done(null, false);
    const { passwordHash: _pw, ...safeUser } = user;
    done(null, safeUser);
  } catch (err) {
    done(err);
  }
});

export default passport;

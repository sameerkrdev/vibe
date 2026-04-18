import bcrypt from "bcrypt";
import createHttpError from "http-errors";
import prisma from "@/config/prisma.js";

interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });

  if (existing) {
    if (existing.email === input.email) {
      throw createHttpError(409, "Email already registered");
    }
    throw createHttpError(409, "Username already taken");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
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

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "BET_INVITE",
      title: "Welcome to StakeStreak!",
      body: "You've received 500 tokens to start betting on your habits.",
    },
  });

  const { passwordHash: _pw, ...safeUser } = user;
  return safeUser;
}

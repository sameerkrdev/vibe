import type { Request, Response, NextFunction } from "express";
import prisma from "@/config/prisma.js";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const activeBetsCount = await prisma.betParticipant.count({
      where: { userId, status: "ACTIVE" },
    });
    const allParticipations = await prisma.betParticipant.findMany({
      where: { userId },
      select: { longestStreak: true },
    });
    const longestStreak = allParticipations.reduce(
      (max, p) => Math.max(max, p.longestStreak),
      0,
    );

    const { passwordHash: _pw, ...safeUser } = user;
    res.json({ success: true, user: { ...safeUser, activeBetsCount, longestStreak } });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { displayName, avatarUrl } = req.body as { displayName?: string; avatarUrl?: string };
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });
    const { passwordHash: _pw, ...safeUser } = updated;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    next(err);
  }
}

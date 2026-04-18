import type { Request, Response, NextFunction } from "express";
import prisma from "@/config/prisma.js";
import { payoutTokens } from "@/services/token.service.js";

export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt((req.query["page"] as string) || "1"));
    const take = 20;
    const skip = (page - 1) * take;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const transactions = await prisma.tokenTransaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { user: true },
    });
    const total = await prisma.tokenTransaction.count({ where: { userId: req.user!.id } });

    res.json({
      success: true,
      balance: user?.tokenBalance ?? 0,
      transactions,
      pagination: { page, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
}

export async function claimPayout(req: Request, res: Response, next: NextFunction) {
  try {
    const betId = req.params["betId"]!;
    const userId = req.user!.id;

    const participant = await prisma.betParticipant.findFirst({
      where: { betId, userId, status: "COMPLETED" },
    });
    if (!participant) {
      return res.status(400).json({ success: false, message: "No payout available" });
    }
    if (participant.claimedAt) {
      return res.status(400).json({ success: false, message: "Already claimed" });
    }

    const bet = await prisma.bet.findUnique({ where: { id: betId } });
    if (!bet || bet.status !== "COMPLETED") {
      return res.status(400).json({ success: false, message: "Bet not completed" });
    }

    const pending = await prisma.notification.findFirst({
      where: { userId, betId, type: "PAYOUT_AVAILABLE" },
    });
    if (!pending) {
      return res.status(400).json({ success: false, message: "No payout notification found" });
    }

    // Payout was already credited by settlement job, just mark claimed
    await prisma.betParticipant.update({
      where: { id: participant.id },
      data: { claimedAt: new Date() },
    });

    res.json({ success: true, message: "Payout claimed" });
  } catch (err) {
    next(err);
  }
}

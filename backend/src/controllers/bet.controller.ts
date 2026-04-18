import type { Request, Response, NextFunction } from "express";
import prisma from "@/config/prisma.js";
import { createBet, startBet, cancelBet, joinBet } from "@/services/bet.service.js";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await createBet(req.user!.id, req.body as Parameters<typeof createBet>[1]);
    res.status(201).json({ success: true, bet });
  } catch (err) {
    next(err);
  }
}

export async function getMyBets(req: Request, res: Response, next: NextFunction) {
  try {
    const bets = await prisma.bet.findMany({
      where: { participants: { some: { userId: req.user!.id } } },
      include: {
        participants: { include: { user: true } },
        creator: true,
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, bets });
  } catch (err) {
    next(err);
  }
}

export async function explore(req: Request, res: Response, next: NextFunction) {
  try {
    const bets = await prisma.bet.findMany({
      where: {
        visibility: "PUBLIC",
        status: "DRAFT",
        type: "LAST_MAN_STANDING",
        participants: { none: { userId: req.user!.id } },
      },
      include: {
        creator: true,
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, bets });
  } catch (err) {
    next(err);
  }
}

export async function getCommunity(req: Request, res: Response, next: NextFunction) {
  try {
    const bets = await prisma.bet.findMany({
      where: {
        visibility: "PUBLIC",
        status: "DRAFT",
        type: "RECURRING",
        participants: { none: { userId: req.user!.id } },
      },
      include: {
        creator: true,
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, bets });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await prisma.bet.findUnique({
      where: { id: req.params["id"] ?? "" },
      include: {
        participants: { include: { user: true } },
        creator: true,
        _count: { select: { participants: true } },
      },
    });
    if (!bet) return res.status(404).json({ success: false, message: "Bet not found" });
    res.json({ success: true, bet });
  } catch (err) {
    next(err);
  }
}

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await startBet(req.params["id"]!, req.user!.id);
    res.json({ success: true, bet });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    await cancelBet(req.params["id"]!, req.user!.id);
    res.json({ success: true, message: "Bet cancelled and tokens refunded" });
  } catch (err) {
    next(err);
  }
}

export async function previewJoin(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await prisma.bet.findUnique({
      where: { inviteCode: req.params["inviteCode"] ?? "" },
      include: { participants: { include: { user: true } }, creator: true },
    });
    if (!bet) return res.status(404).json({ success: false, message: "Invalid invite link" });
    if (bet.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: `Bet is ${bet.status.toLowerCase()}` });
    }
    res.json({ success: true, bet });
  } catch (err) {
    next(err);
  }
}

export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await joinBet(req.params["inviteCode"]!, req.user!.id);
    res.status(201).json({ success: true, bet });
  } catch (err) {
    next(err);
  }
}

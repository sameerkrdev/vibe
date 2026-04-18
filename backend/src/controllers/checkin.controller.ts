import type { Request, Response, NextFunction } from "express";
import prisma from "@/config/prisma.js";
import { submitProof } from "@/services/proof.service.js";
import { submitVote } from "@/services/votes.service.js";

export async function getCheckIns(req: Request, res: Response, next: NextFunction) {
  try {
    const betId = req.params["betId"] ?? "";
    const participant = await prisma.betParticipant.findFirst({
      where: { betId, userId: req.user!.id },
    });
    if (!participant) return res.status(403).json({ success: false, message: "Not a participant" });

    const checkIns = await prisma.betCheckInDay.findMany({
      where: { betId, participantId: participant.id },
      include: { proofSubmissions: true },
      orderBy: { scheduledDate: "asc" },
    });
    res.json({ success: true, checkIns });
  } catch (err) {
    next(err);
  }
}

export async function getTodayCheckIn(req: Request, res: Response, next: NextFunction) {
  try {
    const betId = req.params["betId"] ?? "";
    const participant = await prisma.betParticipant.findFirst({
      where: { betId, userId: req.user!.id },
    });
    if (!participant) return res.status(403).json({ success: false, message: "Not a participant" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkIn = await prisma.betCheckInDay.findFirst({
      where: {
        betId,
        participantId: participant.id,
        scheduledDate: { gte: today, lt: tomorrow },
      },
      include: { proofSubmissions: true },
    });
    res.json({ success: true, checkIn });
  } catch (err) {
    next(err);
  }
}

export async function submitProofHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const proof = await submitProof(
      req.user!.id,
      req.params["betId"] ?? "",
      req.params["dayId"] ?? "",
      req.file.buffer,
      req.file.mimetype,
    );
    res.status(201).json({ success: true, proof });
  } catch (err) {
    next(err);
  }
}

export async function getProofForDay(req: Request, res: Response, next: NextFunction) {
  try {
    const betId = req.params["betId"] ?? "";
    const checkInDayId = req.params["dayId"] ?? "";
    const proofs = await prisma.proofSubmission.findMany({
      where: { checkInDayId, betId },
      include: { user: true, votes: true },
      orderBy: { submittedAt: "desc" },
    });
    res.json({ success: true, proofs });
  } catch (err) {
    next(err);
  }
}

export async function voteOnProof(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await submitVote(
      req.params["proofId"] ?? "",
      req.user!.id,
      (req.body as { choice: "ACCEPT" | "REJECT" }).choice,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getPendingVotes(req: Request, res: Response, next: NextFunction) {
  try {
    const proofs = await prisma.proofSubmission.findMany({
      where: {
        bet: { participants: { some: { userId: req.user!.id, status: "ACTIVE" } } },
        status: "PEER_VOTING",
        userId: { not: req.user!.id },
        votes: { none: { voterId: req.user!.id } },
      },
      include: { user: true, checkInDay: true, bet: true, votes: true },
      orderBy: { submittedAt: "desc" },
    });
    res.json({ success: true, proofs });
  } catch (err) {
    next(err);
  }
}

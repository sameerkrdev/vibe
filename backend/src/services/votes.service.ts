import createHttpError from "http-errors";
import prisma from "@/config/prisma.js";
import { markCheckedIn } from "@/services/proof.service.js";
import { createNotification } from "@/services/notification.service.js";

export async function submitVote(proofId: string, voterId: string, choice: "ACCEPT" | "REJECT") {
  const proof = await prisma.proofSubmission.findUnique({
    where: { id: proofId },
    include: { bet: { include: { participants: true } } },
  });
  if (!proof) throw createHttpError(404, "Proof not found");
  if (proof.status !== "PEER_VOTING") throw createHttpError(400, "Proof is not in voting state");
  if (proof.userId === voterId) throw createHttpError(403, "Cannot vote on your own proof");

  const isParticipant = proof.bet.participants.some(
    (p) => p.userId === voterId && p.status === "ACTIVE",
  );
  if (!isParticipant) throw createHttpError(403, "Only active participants can vote");

  await prisma.proofVote.upsert({
    where: { proofSubmissionId_voterId: { proofSubmissionId: proofId, voterId } },
    create: { proofSubmissionId: proofId, voterId, vote: choice },
    update: { vote: choice },
  });

  const votes = await prisma.proofVote.findMany({ where: { proofSubmissionId: proofId } });
  const acceptVotes = votes.filter((v) => v.vote === "ACCEPT").length;
  const rejectVotes = votes.filter((v) => v.vote === "REJECT").length;

  await prisma.proofSubmission.update({
    where: { id: proofId },
    data: { totalVotes: votes.length, acceptVotes, rejectVotes },
  });

  return { totalVotes: votes.length, acceptVotes, rejectVotes };
}

export async function tallyVotes(proofId: string) {
  const proof = await prisma.proofSubmission.findUnique({
    where: { id: proofId },
    include: { bet: true },
  });
  if (!proof || proof.status !== "PEER_VOTING") return;

  const votes = await prisma.proofVote.findMany({ where: { proofSubmissionId: proofId } });
  const acceptVotes = votes.filter((v) => v.vote === "ACCEPT").length;
  const rejectVotes = votes.filter((v) => v.vote === "REJECT").length;

  const passed = acceptVotes >= rejectVotes || votes.length === 0;
  const newStatus = passed ? "PEER_PASSED" : ("PEER_FAILED" as const);

  await prisma.proofSubmission.update({
    where: { id: proofId },
    data: {
      status: newStatus,
      totalVotes: votes.length,
      acceptVotes,
      rejectVotes,
      reviewedAt: new Date(),
    },
  });

  if (passed) {
    await markCheckedIn(proof.checkInDayId, proof.participantId);
  }

  await createNotification({
    userId: proof.userId,
    type: passed ? "PROOF_PASSED" : "PROOF_FAILED",
    title: passed ? "Proof accepted!" : "Proof rejected",
    body: passed
      ? "Your group accepted your proof. Streak maintained!"
      : "Your group rejected your proof.",
    betId: proof.betId,
  });
}

import createHttpError from "http-errors";
import prisma from "@/config/prisma.js";
import cloudinary from "@/config/cloudinary.js";
import { openai } from "@/config/openai.js";
import { createBulkNotifications, createNotification } from "@/services/notification.service.js";
import logger from "@/config/logger.js";
import type { UploadApiResponse } from "cloudinary";

export async function uploadToCloudinary(buffer: Buffer, mimetype: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "stakestreak/proofs", resource_type: "image" },
      (error, result: UploadApiResponse | undefined) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No upload result"));
        resolve(result.secure_url);
      },
    );
    uploadStream.end(buffer);
  });
}

export async function submitProof(
  userId: string,
  betId: string,
  dayId: string,
  fileBuffer: Buffer,
  mimetype: string,
) {
  const checkInDay = await prisma.betCheckInDay.findUnique({ where: { id: dayId } });
  if (!checkInDay) throw createHttpError(404, "Check-in day not found");
  if (checkInDay.status !== "OPEN") throw createHttpError(400, "Check-in window is not open");
  if (new Date() > checkInDay.deadlineAt) throw createHttpError(400, "Check-in deadline has passed");

  const participant = await prisma.betParticipant.findFirst({
    where: { betId, userId, status: "ACTIVE" },
  });
  if (!participant) throw createHttpError(403, "You are not an active participant");

  const existingAttempts = await prisma.proofSubmission.count({
    where: { checkInDayId: dayId, userId },
  });
  if (existingAttempts >= 2) throw createHttpError(400, "Maximum 2 attempts per day");

  const alreadyCheckedIn = await prisma.proofSubmission.findFirst({
    where: { checkInDayId: dayId, userId, status: { in: ["PEER_PASSED", "AI_PASSED"] } },
  });
  if (alreadyCheckedIn) throw createHttpError(400, "Already checked in for today");

  const imageUrl = await uploadToCloudinary(fileBuffer, mimetype);

  const bet = await prisma.bet.findUnique({ where: { id: betId } });
  if (!bet) throw createHttpError(404, "Bet not found");

  const proof = await prisma.proofSubmission.create({
    data: {
      betId,
      participantId: participant.id,
      userId,
      checkInDayId: dayId,
      imageUrl,
      status: "PENDING_REVIEW",
      attemptNumber: existingAttempts + 1,
    },
  });

  if (bet.type === "RECURRING") {
    const today = new Date();
    today.setHours(23, 58, 0, 0);

    await prisma.proofSubmission.update({
      where: { id: proof.id },
      data: { status: "PEER_VOTING", votingDeadline: today },
    });

    const otherParticipants = await prisma.betParticipant.findMany({
      where: { betId, status: "ACTIVE", userId: { not: userId } },
    });

    await createBulkNotifications(
      otherParticipants.map((p) => ({
        userId: p.userId,
        type: "VOTE_NEEDED" as const,
        title: "Vote on a proof!",
        body: `A group member submitted proof. Cast your vote before midnight.`,
        betId,
      })),
    );
  } else {
    await prisma.proofSubmission.update({
      where: { id: proof.id },
      data: { status: "AI_REVIEWING" },
    });

    setImmediate(() => {
      verifyWithAI(proof.id, betId, bet.proofDescription, userId).catch((err: unknown) => {
        logger.error("AI verification error:", err);
      });
    });
  }

  return prisma.proofSubmission.findUnique({ where: { id: proof.id } });
}

async function verifyWithAI(
  proofId: string,
  betId: string,
  proofDescription: string,
  userId: string,
) {
  const proof = await prisma.proofSubmission.findUnique({ where: { id: proofId } });
  if (!proof) return;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a strict but fair proof verifier for a habit accountability app.
Determine whether the submitted image proves the user completed their habit.
Respond ONLY with this JSON (no preamble, no markdown):
{"verdict":"AI_PASSED"|"AI_FAILED","reason":"One sentence shown to the user."}
Guidelines: blurry/irrelevant/staged -> AI_FAILED. Credibly shows activity -> AI_PASSED. Lenient on quality, strict on relevance.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Habit requirement: "${proofDescription}"\nDoes this image prove the user completed the habit today?` },
            { type: "image_url", image_url: { url: proof.imageUrl, detail: "low" } },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { verdict: string; reason: string };
    const passed = parsed.verdict === "AI_PASSED";

    await prisma.proofSubmission.update({
      where: { id: proofId },
      data: {
        status: passed ? "AI_PASSED" : "AI_FAILED",
        aiVerdict: parsed.verdict,
        aiReason: parsed.reason,
        reviewedAt: new Date(),
      },
    });

    if (passed) {
      await markCheckedIn(proof.checkInDayId, proof.participantId);
    }

    await createNotification({
      userId,
      type: passed ? "PROOF_PASSED" : "PROOF_FAILED",
      title: passed ? "Proof verified!" : "Proof rejected",
      body: parsed.reason ?? (passed ? "Great job!" : "Try again with a clearer photo."),
      betId,
    });
  } catch (err) {
    logger.error("OpenAI error:", err);
    await prisma.proofSubmission.update({
      where: { id: proofId },
      data: { status: "AI_FAILED", aiReason: "Verification service unavailable. Try again." },
    });
  }
}

export async function markCheckedIn(checkInDayId: string, participantId: string) {
  const checkInDay = await prisma.betCheckInDay.findUnique({ where: { id: checkInDayId } });
  if (!checkInDay) return;

  await prisma.betCheckInDay.update({
    where: { id: checkInDayId },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });

  const participant = await prisma.betParticipant.findUnique({ where: { id: participantId } });
  if (!participant) return;

  const newStreak = participant.streak + 1;
  await prisma.betParticipant.update({
    where: { id: participantId },
    data: {
      streak: newStreak,
      longestStreak: Math.max(participant.longestStreak, newStreak),
    },
  });
}

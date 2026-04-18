/*
  Warnings:

  - You are about to drop the `member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `societies` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('RECURRING', 'LAST_MAN_STANDING');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('JOINED', 'ACTIVE', 'ELIMINATED', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('PENDING', 'OPEN', 'CHECKED_IN', 'MISSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING_REVIEW', 'PEER_VOTING', 'PEER_PASSED', 'PEER_FAILED', 'AI_REVIEWING', 'AI_PASSED', 'AI_FAILED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('ACCEPT', 'REJECT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('LOCK', 'DEDUCT', 'REFUND', 'PAYOUT', 'REDISTRIBUTE', 'SIGNUP_BONUS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BET_INVITE', 'BET_STARTED', 'CHECK_IN_REMINDER', 'PROOF_PASSED', 'PROOF_FAILED', 'TOKENS_DEDUCTED', 'PARTICIPANT_ELIMINATED', 'BET_COMPLETED', 'PAYOUT_AVAILABLE', 'BET_CANCELLED', 'VOTE_NEEDED', 'VOTE_RESULT', 'MEMBER_PROOF_REJECTED');

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_societyId_fkey";

-- DropTable
DROP TABLE "member";

-- DropTable
DROP TABLE "societies";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "displayName" TEXT NOT NULL,
    "tokenBalance" INTEGER NOT NULL DEFAULT 500,
    "totalDeducted" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "BetType" NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "BetVisibility" NOT NULL DEFAULT 'PRIVATE',
    "creatorId" TEXT NOT NULL,
    "tokenPerMiss" INTEGER NOT NULL DEFAULT 0,
    "entryTokens" INTEGER NOT NULL,
    "scheduleDays" TEXT[],
    "scheduleType" TEXT NOT NULL DEFAULT 'WEEKDAYS',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "proofDescription" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "prizePool" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetParticipant" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "tokensLocked" INTEGER NOT NULL,
    "tokensDeducted" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "eliminatedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetCheckInDay" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'PENDING',
    "tokensDeducted" INTEGER NOT NULL DEFAULT 0,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "checkedInAt" TIMESTAMP(3),

    CONSTRAINT "BetCheckInDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofSubmission" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDayId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "aiVerdict" TEXT,
    "aiReason" TEXT,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "acceptVotes" INTEGER NOT NULL DEFAULT 0,
    "rejectVotes" INTEGER NOT NULL DEFAULT 0,
    "votingDeadline" TIMESTAMP(3),
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProofSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofVote" (
    "id" TEXT NOT NULL,
    "proofSubmissionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "vote" "VoteChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "betId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "betId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Bet_inviteCode_key" ON "Bet"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "BetParticipant_betId_userId_key" ON "BetParticipant"("betId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BetCheckInDay_betId_participantId_scheduledDate_key" ON "BetCheckInDay"("betId", "participantId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProofVote_proofSubmissionId_voterId_key" ON "ProofVote"("proofSubmissionId", "voterId");

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetParticipant" ADD CONSTRAINT "BetParticipant_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetParticipant" ADD CONSTRAINT "BetParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetCheckInDay" ADD CONSTRAINT "BetCheckInDay_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSubmission" ADD CONSTRAINT "ProofSubmission_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSubmission" ADD CONSTRAINT "ProofSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSubmission" ADD CONSTRAINT "ProofSubmission_checkInDayId_fkey" FOREIGN KEY ("checkInDayId") REFERENCES "BetCheckInDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofVote" ADD CONSTRAINT "ProofVote_proofSubmissionId_fkey" FOREIGN KEY ("proofSubmissionId") REFERENCES "ProofSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofVote" ADD CONSTRAINT "ProofVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

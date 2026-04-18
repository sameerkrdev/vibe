import { Worker } from "bullmq";
import redis from "@/config/redis.js";
import prisma from "@/config/prisma.js";
import { tallyVotes } from "@/services/votes.service.js";
import logger from "@/config/logger.js";

export const peerVoteTallierWorker = new Worker(
  "peer-vote-tallier",
  async () => {
    logger.info("Running peer-vote-tallier");
    const now = new Date();

    const proofs = await prisma.proofSubmission.findMany({
      where: {
        status: "PEER_VOTING",
        votingDeadline: { lte: now },
      },
    });

    for (const proof of proofs) {
      await tallyVotes(proof.id);
    }
  },
  { connection: redis },
);

peerVoteTallierWorker.on("failed", (job, err) => {
  logger.error(`peer-vote-tallier job failed:`, err);
});

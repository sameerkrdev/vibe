import { Router } from "express";
import zodValidatorMiddleware from "@/middlewares/zodValidationMiddleware.js";
import { voteSchema } from "@/zodValidationSchema/betValidationSchema.js";
import { upload } from "@/middlewares/upload.middleware.js";
import {
  getCheckIns,
  getTodayCheckIn,
  submitProofHandler,
  getProofForDay,
  voteOnProof,
  getPendingVotes,
} from "@/controllers/checkin.controller.js";

const checkinRouter = Router();

checkinRouter.get("/pending-votes", getPendingVotes);
checkinRouter.get("/:betId/checkins", getCheckIns);
checkinRouter.get("/:betId/checkins/today", getTodayCheckIn);
checkinRouter.post("/:betId/checkins/:dayId/proof", upload.single("proof"), submitProofHandler);
checkinRouter.get("/:betId/checkins/:dayId/proof", getProofForDay);
checkinRouter.post(
  "/:betId/checkins/:dayId/proof/:proofId/vote",
  zodValidatorMiddleware(voteSchema),
  voteOnProof,
);

export default checkinRouter;

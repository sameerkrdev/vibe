import { Router } from "express";
import zodValidatorMiddleware from "@/middlewares/zodValidationMiddleware.js";
import { createBetSchema } from "@/zodValidationSchema/betValidationSchema.js";
import {
  create,
  getMyBets,
  explore,
  getCommunity,
  getById,
  start,
  cancel,
  previewJoin,
  join,
} from "@/controllers/bet.controller.js";

const betRouter = Router();

// Fixed routes before parameterized
betRouter.get("/explore", explore);
betRouter.get("/community", getCommunity);
betRouter.get("/join/:inviteCode", previewJoin);
betRouter.post("/join/:inviteCode", join);

betRouter.post("/", zodValidatorMiddleware(createBetSchema), create);
betRouter.get("/", getMyBets);
betRouter.get("/:id", getById);
betRouter.patch("/:id/start", start);
betRouter.patch("/:id/cancel", cancel);

export default betRouter;

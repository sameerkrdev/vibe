import { Router } from "express";
import { getWallet, claimPayout } from "@/controllers/wallet.controller.js";

const walletRouter = Router();

walletRouter.get("/", getWallet);
walletRouter.post("/claim/:betId", claimPayout);

export default walletRouter;

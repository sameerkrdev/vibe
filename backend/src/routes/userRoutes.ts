import { Router } from "express";
import { getMe, updateMe } from "@/controllers/userController.js";

const userRouter = Router();

userRouter.get("/me", getMe);
userRouter.patch("/me", updateMe);

export default userRouter;

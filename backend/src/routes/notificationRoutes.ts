import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "@/controllers/notification.controller.js";

const notificationRouter = Router();

notificationRouter.get("/", getNotifications);
notificationRouter.get("/unread-count", getUnreadCount);
notificationRouter.patch("/read-all", markAllRead);
notificationRouter.patch("/:id/read", markRead);

export default notificationRouter;

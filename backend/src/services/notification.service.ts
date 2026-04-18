import prisma from "@/config/prisma.js";
import type { NotificationType } from "@/generated/prisma/client.js";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  betId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      ...(input.betId !== undefined && { betId: input.betId }),
    },
  });
}

export async function createBulkNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  return prisma.notification.createMany({
    data: inputs.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      ...(n.betId !== undefined && { betId: n.betId }),
    })),
  });
}

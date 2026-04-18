import prisma from "@/config/prisma.js";
import type { Prisma } from "@/generated/prisma/client.js";

export const createUser = async (data: Prisma.UserCreateInput) => {
  try {
    const newUser = await prisma.user.create({
      data,
    });

    return newUser;
  } catch (error) {
    throw error;
  }
};

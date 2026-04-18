import { z } from "zod";

export const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is too short"),
    phoneNumber: z.string().min(10, "Phone is required"),
    email: z.email("Invalid email"),
  }),
});

export type ICreateUserValidationSchema = z.infer<typeof createUserValidationSchema>;

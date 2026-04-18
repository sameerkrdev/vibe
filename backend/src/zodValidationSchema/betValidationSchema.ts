import { z } from "zod";

export const createBetSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).max(100),
      description: z.string().max(500).optional(),
      type: z.enum(["RECURRING", "LAST_MAN_STANDING"]),
      visibility: z.enum(["PRIVATE", "PUBLIC"]),
      proofDescription: z.string().min(10).max(300),
      scheduleDays: z
        .array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]))
        .min(1),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      tokenPerMiss: z.number().int().min(1).max(1000).optional(),
      entryTokens: z.number().int().min(10).max(10000).optional(),
    })
    .refine(
      (data) => {
        if (data.type === "RECURRING") return data.startDate && data.endDate && data.tokenPerMiss;
        return data.entryTokens;
      },
      { message: "Missing required fields for bet type" },
    ),
});

export const voteSchema = z.object({
  body: z.object({
    choice: z.enum(["ACCEPT", "REJECT"]),
  }),
});

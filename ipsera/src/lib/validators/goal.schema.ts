import { z } from "zod";
import { dimensionsSchema } from "./dimension.schema";

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  dimensions: dimensionsSchema,
  progress: z.number().min(0).max(100).default(0),
  targetDate: z.date().optional(),
});

export type GoalFormValues = z.infer<typeof goalSchema>;

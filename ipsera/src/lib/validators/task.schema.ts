import { z } from "zod";
import { dimensionsSchema } from "./dimension.schema";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]),
  dimensions: dimensionsSchema,
  projectId: z.string().optional(),
  goalId: z.string().optional(),
  dueDate: z.date().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

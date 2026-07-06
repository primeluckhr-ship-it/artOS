import { z } from "zod";
import { dimensionsSchema } from "./dimension.schema";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  dimensions: dimensionsSchema,
  targetDate: z.date().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

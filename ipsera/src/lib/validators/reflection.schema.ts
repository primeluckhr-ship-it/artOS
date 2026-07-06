import { z } from "zod";
import { IPSERA_DIMENSIONS } from "@/domain/types/dimension";

export const reflectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  mood: z.number().min(1).max(5),
  wins: z.array(z.string().trim().min(1)).default([]),
  challenges: z.array(z.string().trim().min(1)).default([]),
  gratitude: z.array(z.string().trim().min(1)).default([]),
  dimensionCheckIns: z.object(
    Object.fromEntries(
      IPSERA_DIMENSIONS.map((d) => [d, z.number().min(1).max(5).optional()])
    ) as Record<(typeof IPSERA_DIMENSIONS)[number], z.ZodOptional<z.ZodNumber>>
  ),
  notes: z.string().trim().max(2000).optional(),
});

export type ReflectionFormValues = z.infer<typeof reflectionSchema>;

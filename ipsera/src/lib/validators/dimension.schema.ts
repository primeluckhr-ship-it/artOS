import { z } from "zod";
import { IPSERA_DIMENSIONS } from "@/domain/types/dimension";

export const dimensionSchema = z.enum(IPSERA_DIMENSIONS);

export const dimensionsSchema = z
  .array(dimensionSchema)
  .min(1, "Link this to at least one life dimension");

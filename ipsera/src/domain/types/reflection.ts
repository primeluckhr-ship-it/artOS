import type { BaseEntity } from "./common";
import type { IpseraDimension } from "./dimension";

export type ReflectionType = "daily" | "weekly";

/** 1 (struggling) – 5 (thriving) self-rating per dimension, given by the user, never inferred by AI. */
export type DimensionCheckIns = Partial<Record<IpseraDimension, number>>;

export interface Reflection extends BaseEntity {
  type: ReflectionType;
  /** Date the reflection is for, in YYYY-MM-DD form (local day, not a timestamp). */
  date: string;
  mood: number; // 1-5
  wins: string[];
  challenges: string[];
  gratitude: string[];
  dimensionCheckIns: DimensionCheckIns;
  notes?: string;
}

export type CreateReflectionInput = Pick<
  Reflection,
  | "type"
  | "date"
  | "mood"
  | "wins"
  | "challenges"
  | "gratitude"
  | "dimensionCheckIns"
  | "notes"
>;

export type UpdateReflectionInput = Partial<CreateReflectionInput>;

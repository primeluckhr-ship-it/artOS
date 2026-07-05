import type { BaseEntity, DimensionLink } from "./common";

export type GoalStatus = "active" | "completed" | "abandoned";

export interface Goal extends BaseEntity {
  title: string;
  description?: string;
  status: GoalStatus;
  dimensions: DimensionLink;
  progress: number; // 0-100, user-controlled
  targetDate?: Date;
  completedAt?: Date;
}

export type CreateGoalInput = Pick<
  Goal,
  "title" | "description" | "dimensions" | "targetDate"
> &
  Partial<Pick<Goal, "status" | "progress">>;

export type UpdateGoalInput = Partial<CreateGoalInput> & {
  completedAt?: Date | null;
};

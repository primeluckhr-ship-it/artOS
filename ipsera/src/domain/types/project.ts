import type { BaseEntity, DimensionLink } from "./common";

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  status: ProjectStatus;
  dimensions: DimensionLink;
  targetDate?: Date;
  completedAt?: Date;
}

export type CreateProjectInput = Pick<
  Project,
  "name" | "description" | "dimensions" | "targetDate"
> &
  Partial<Pick<Project, "status">>;

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  completedAt?: Date | null;
};

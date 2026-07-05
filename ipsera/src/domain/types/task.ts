import type { BaseEntity, DimensionLink, Status } from "./common";

export type TaskPriority = "low" | "medium" | "high";

export interface Task extends BaseEntity {
  title: string;
  notes?: string;
  status: Status;
  priority: TaskPriority;
  dimensions: DimensionLink;
  projectId?: string;
  goalId?: string;
  dueDate?: Date;
  completedAt?: Date;
}

export type CreateTaskInput = Pick<
  Task,
  "title" | "notes" | "priority" | "dimensions" | "projectId" | "goalId" | "dueDate"
> &
  Partial<Pick<Task, "status">>;

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: Status;
  completedAt?: Date | null;
};

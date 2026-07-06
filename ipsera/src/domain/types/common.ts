import type { IpseraDimension } from "./dimension";

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DimensionLink = IpseraDimension[];

export type Status = "todo" | "in_progress" | "done";

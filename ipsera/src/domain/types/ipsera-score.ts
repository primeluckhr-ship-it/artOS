import type { IpseraDimension } from "./dimension";

export type DimensionScores = Record<IpseraDimension, number>;

export interface IpseraScoreSnapshot {
  date: string; // YYYY-MM-DD
  scores: DimensionScores;
  overall: number;
}

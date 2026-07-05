import { IPSERA_DIMENSIONS, type IpseraDimension } from "../types/dimension";
import type { Task } from "../types/task";
import type { Goal } from "../types/goal";
import type { Reflection } from "../types/reflection";

export interface DimensionScoreBreakdown {
  dimension: IpseraDimension;
  score: number;
  hasData: boolean;
  taskCompletionRate: number | null;
  goalProgress: number | null;
  reflectionAverage: number | null;
}

export interface IpseraScoreResult {
  dimensions: DimensionScoreBreakdown[];
  overall: number;
  hasAnyData: boolean;
}

export interface ComputeIpseraScoresInput {
  tasks: Task[];
  goals: Goal[];
  reflections: Reflection[];
  /** "Now", for windowing recent activity. Defaults to the current time. */
  referenceDate?: Date;
  /** How many days back count as "recent" for task completion. Defaults to 7. */
  windowDays?: number;
}

const WEIGHTS = {
  taskCompletionRate: 0.4,
  goalProgress: 0.3,
  reflectionAverage: 0.3,
};

/**
 * Every input here is something the user did or explicitly self-rated —
 * there is no inferred or AI-guessed signal. The breakdown is returned
 * alongside the score so the UI (and any AI coach built on top of it)
 * can always show its work.
 */
export function computeIpseraScores({
  tasks,
  goals,
  reflections,
  referenceDate = new Date(),
  windowDays = 7,
}: ComputeIpseraScoresInput): IpseraScoreResult {
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const recentReflections = reflections
    .filter((r) => r.type === "daily")
    .slice(0, windowDays);

  const dimensions = IPSERA_DIMENSIONS.map((dimension) =>
    scoreDimension(dimension, tasks, goals, recentReflections, windowStart)
  );

  const scored = dimensions.filter((d) => d.hasData);
  const overall =
    scored.length > 0
      ? Math.round(scored.reduce((sum, d) => sum + d.score, 0) / scored.length)
      : 0;

  return {
    dimensions,
    overall,
    hasAnyData: scored.length > 0,
  };
}

function scoreDimension(
  dimension: IpseraDimension,
  tasks: Task[],
  goals: Goal[],
  recentReflections: Reflection[],
  windowStart: Date
): DimensionScoreBreakdown {
  const dimensionTasks = tasks.filter((t) =>
    t.dimensions.includes(dimension)
  );
  const relevantTasks = dimensionTasks.filter(
    (t) =>
      t.createdAt >= windowStart ||
      (t.completedAt && t.completedAt >= windowStart)
  );
  const taskCompletionRate =
    relevantTasks.length > 0
      ? (relevantTasks.filter((t) => t.status === "done").length /
          relevantTasks.length) *
        100
      : null;

  const dimensionGoals = goals.filter(
    (g) => g.dimensions.includes(dimension) && g.status === "active"
  );
  const goalProgress =
    dimensionGoals.length > 0
      ? dimensionGoals.reduce((sum, g) => sum + g.progress, 0) /
        dimensionGoals.length
      : null;

  const checkIns = recentReflections
    .map((r) => r.dimensionCheckIns[dimension])
    .filter((v): v is number => typeof v === "number");
  const reflectionAverage =
    checkIns.length > 0
      ? (checkIns.reduce((sum, v) => sum + v, 0) / checkIns.length / 5) * 100
      : null;

  const components: { value: number; weight: number }[] = [];
  if (taskCompletionRate !== null)
    components.push({ value: taskCompletionRate, weight: WEIGHTS.taskCompletionRate });
  if (goalProgress !== null)
    components.push({ value: goalProgress, weight: WEIGHTS.goalProgress });
  if (reflectionAverage !== null)
    components.push({ value: reflectionAverage, weight: WEIGHTS.reflectionAverage });

  const hasData = components.length > 0;
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const score = hasData
    ? Math.round(
        components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight
      )
    : 0;

  return {
    dimension,
    score,
    hasData,
    taskCompletionRate,
    goalProgress,
    reflectionAverage,
  };
}

"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/analytics/stat-tile";
import { DimensionScoreChart } from "@/components/analytics/dimension-score-chart";
import { MoodTrendChart } from "@/components/analytics/mood-trend-chart";
import { useTasks } from "@/hooks/use-tasks";
import { useGoals } from "@/hooks/use-goals";
import { useReflections } from "@/hooks/use-reflections";
import { useIpseraScore } from "@/hooks/use-ipsera-score";

export default function AnalyticsPage() {
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { reflections } = useReflections();
  const { dimensions } = useIpseraScore();

  const tasksCompleted = tasks.filter((t) => t.status === "done").length;
  const activeGoals = goals.filter((g) => g.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Patterns in what you're doing and how you're feeling."
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Tasks completed" value={tasksCompleted} />
          <StatTile label="Active goals" value={activeGoals} />
          <StatTile label="Reflections logged" value={reflections.length} />
        </div>
        <DimensionScoreChart dimensions={dimensions} />
        <MoodTrendChart reflections={reflections} />
      </div>
    </div>
  );
}

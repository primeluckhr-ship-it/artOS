"use client";

import { PageHeader } from "@/components/shared/page-header";
import { OverallScoreCard } from "@/components/dashboard/overall-score-card";
import { DimensionCard } from "@/components/dashboard/dimension-card";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { useIpseraScore } from "@/hooks/use-ipsera-score";

export default function DashboardPage() {
  const { dimensions, overall, hasAnyData } = useIpseraScore();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A snapshot of who you're becoming, across every dimension that matters."
      />
      <div className="flex flex-col gap-6">
        <OverallScoreCard overall={overall} hasAnyData={hasAnyData} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dimensions.map((breakdown) => (
            <DimensionCard key={breakdown.dimension} breakdown={breakdown} />
          ))}
        </div>
        <TodayFocus />
      </div>
    </div>
  );
}

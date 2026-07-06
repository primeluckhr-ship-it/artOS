"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIMENSION_META } from "@/domain/types/dimension";
import type { DimensionScoreBreakdown } from "@/domain/ipsera/scoring";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DimensionScoreBreakdown & { label: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.label}</p>
      {d.hasData ? (
        <div className="text-muted-foreground mt-1 flex flex-col gap-0.5">
          {d.taskCompletionRate !== null && (
            <span>Task completion: {Math.round(d.taskCompletionRate)}%</span>
          )}
          {d.goalProgress !== null && (
            <span>Goal progress: {Math.round(d.goalProgress)}%</span>
          )}
          {d.reflectionAverage !== null && (
            <span>Self check-in: {Math.round(d.reflectionAverage)}%</span>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground mt-1">No data yet</p>
      )}
    </div>
  );
}

export function DimensionScoreChart({
  dimensions,
}: {
  dimensions: DimensionScoreBreakdown[];
}) {
  const data = dimensions.map((d) => ({
    ...d,
    label: DIMENSION_META[d.dimension].label,
    color: DIMENSION_META[d.dimension].colorVar,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score by dimension</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 32, bottom: 4, left: 4 }}
              barCategoryGap={14}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                content={<ChartTooltip />}
              />
              <Bar dataKey="score" radius={4} maxBarSize={18}>
                {data.map((d) => (
                  <Cell key={d.dimension} fill={d.hasData ? d.color : "var(--muted)"} />
                ))}
                <LabelList
                  dataKey="score"
                  position="right"
                  style={{ fill: "var(--foreground)", fontSize: 12 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Gray bars mean no activity logged for that dimension yet.
        </p>
      </CardContent>
    </Card>
  );
}

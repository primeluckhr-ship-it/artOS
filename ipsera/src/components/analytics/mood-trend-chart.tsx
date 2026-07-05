"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LineChart as LineChartIcon } from "lucide-react";
import type { Reflection } from "@/domain/types/reflection";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { date: string; mood: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.date}</p>
      <p className="text-muted-foreground mt-0.5">Mood: {d.mood} / 5</p>
    </div>
  );
}

export function MoodTrendChart({ reflections }: { reflections: Reflection[] }) {
  const data = [...reflections]
    .filter((r) => r.type === "daily")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((r) => ({ date: r.date.slice(5), mood: r.mood }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mood over time</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <EmptyState
            icon={LineChartIcon}
            title="Not enough reflections yet"
            description="Log a few daily reflections to see your mood trend."
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -20 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="0"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  width={24}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="var(--dimension-identity)"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: "var(--dimension-identity)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

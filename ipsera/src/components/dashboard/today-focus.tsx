"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useTasks } from "@/hooks/use-tasks";

function isDueTodayOrOverdue(dueDate?: Date) {
  if (!dueDate) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return dueDate <= endOfToday;
}

export function TodayFocus() {
  const { tasks, loading, toggleTaskStatus } = useTasks();

  const focusTasks = tasks
    .filter((t) => t.status !== "done")
    .filter((t) => !t.dueDate || isDueTodayOrOverdue(t.dueDate))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s focus</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : focusTasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nothing pressing today"
            description="Add a task to start building momentum."
            action={
              <Link href="/tasks" className="text-sm font-medium underline underline-offset-4">
                Go to tasks
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {focusTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3">
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={(checked) =>
                    toggleTaskStatus(task.id, checked === true)
                  }
                />
                <span className="text-sm">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

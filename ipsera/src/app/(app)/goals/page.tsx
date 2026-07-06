"use client";

import { Plus, Target } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalCard } from "@/components/goals/goal-card";
import { useGoals } from "@/hooks/use-goals";

export default function GoalsPage() {
  const { goals, loading } = useGoals();

  return (
    <div>
      <PageHeader
        title="Goals"
        description="What you're working toward, and how far you've come."
        action={
          <GoalFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New goal
              </Button>
            }
          />
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a goal and connect it to the life dimension it matters most to."
          action={<GoalFormDialog trigger={<Button size="sm">Set a goal</Button>} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}

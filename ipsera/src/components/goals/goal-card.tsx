"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DimensionBadges } from "@/components/shared/dimension-badges";
import { GoalFormDialog } from "./goal-form-dialog";
import { useGoals } from "@/hooks/use-goals";
import type { Goal } from "@/domain/types/goal";

const STATUS_LABEL: Record<Goal["status"], string> = {
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

const STATUS_VARIANT: Record<Goal["status"], "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "outline",
  abandoned: "secondary",
};

export function GoalCard({ goal }: { goal: Goal }) {
  const { removeGoal } = useGoals();

  const handleDelete = async () => {
    try {
      await removeGoal(goal.id);
      toast.success("Goal deleted");
    } catch {
      toast.error("Couldn't delete goal. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{goal.title}</CardTitle>
          <Badge variant={STATUS_VARIANT[goal.status]} className="mt-1.5">
            {STATUS_LABEL[goal.status]}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <GoalFormDialog
              goal={goal}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {goal.description && (
          <p className="text-muted-foreground text-sm">{goal.description}</p>
        )}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} />
        </div>
        <DimensionBadges dimensions={goal.dimensions} />
        {goal.targetDate && (
          <p className="text-muted-foreground text-xs">
            Target {goal.targetDate.toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DimensionBadges } from "@/components/shared/dimension-badges";
import { TaskFormDialog } from "./task-form-dialog";
import { useTasks } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import type { Task } from "@/domain/types/task";

const PRIORITY_VARIANT = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
} as const;

export function TaskItem({ task }: { task: Task }) {
  const { toggleTaskStatus, removeTask } = useTasks();
  const done = task.status === "done";

  const handleDelete = async () => {
    try {
      await removeTask(task.id);
      toast.success("Task deleted");
    } catch {
      toast.error("Couldn't delete task. Please try again.");
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox
        className="mt-0.5"
        checked={done}
        onCheckedChange={(checked) => toggleTaskStatus(task.id, checked === true)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
            {task.title}
          </p>
          <Badge variant={PRIORITY_VARIANT[task.priority]} className="capitalize">
            {task.priority}
          </Badge>
        </div>
        {task.notes && (
          <p className="text-muted-foreground mt-1 text-xs">{task.notes}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DimensionBadges dimensions={task.dimensions} />
          {task.dueDate && (
            <span className="text-muted-foreground text-xs">
              Due {task.dueDate.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <TaskFormDialog
            task={task}
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
    </div>
  );
}

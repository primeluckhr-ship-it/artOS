"use client";

import { Plus, ListChecks } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskItem } from "@/components/tasks/task-item";
import { useTasks } from "@/hooks/use-tasks";

export default function TasksPage() {
  const { tasks, loading } = useTasks();
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="The concrete actions that move each life dimension forward."
        action={
          <TaskFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New task
              </Button>
            }
          />
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Create your first task and link it to a life dimension."
          action={
            <TaskFormDialog
              trigger={<Button size="sm">Create a task</Button>}
            />
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {openTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {openTasks.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nothing outstanding — nice work.
              </p>
            )}
          </div>

          {doneTasks.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Completed
              </p>
              <div className="flex flex-col gap-2">
                {doneTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

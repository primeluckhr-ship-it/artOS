"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DimensionPicker } from "@/components/shared/dimension-picker";
import { dimensionsSchema } from "@/lib/validators/dimension.schema";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import type { Task } from "@/domain/types/task";

const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]),
  dimensions: dimensionsSchema,
  projectId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormShape = z.infer<typeof taskFormSchema>;

function toDefaultValues(task?: Task): TaskFormShape {
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    priority: task?.priority ?? "medium",
    dimensions: task?.dimensions ?? [],
    projectId: task?.projectId ?? "",
    dueDate: task?.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  };
}

export function TaskFormDialog({
  task,
  trigger,
}: {
  task?: Task;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { createTask, updateTask } = useTasks();
  const { projects } = useProjects();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormShape>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toDefaultValues(task),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(toDefaultValues(task));
  };

  const onSubmit = async (values: TaskFormShape) => {
    try {
      const payload = {
        title: values.title,
        notes: values.notes || undefined,
        priority: values.priority,
        dimensions: values.dimensions,
        projectId: values.projectId || undefined,
        dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
      };
      if (task) {
        await updateTask(task.id, payload);
        toast.success("Task updated");
      } else {
        await createTask(payload);
        toast.success("Task created");
      }
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
          </div>

          {projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Life dimensions</Label>
            <Controller
              control={control}
              name="dimensions"
              render={({ field }) => (
                <DimensionPicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.dimensions && (
              <p className="text-destructive text-xs">
                {errors.dimensions.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

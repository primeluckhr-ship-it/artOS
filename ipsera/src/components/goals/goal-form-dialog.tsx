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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DimensionPicker } from "@/components/shared/dimension-picker";
import { dimensionsSchema } from "@/lib/validators/dimension.schema";
import { useGoals } from "@/hooks/use-goals";
import type { Goal, GoalStatus } from "@/domain/types/goal";

const goalFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "completed", "abandoned"]),
  dimensions: dimensionsSchema,
  progress: z.number().min(0).max(100),
  targetDate: z.string().optional(),
});

type GoalFormShape = z.infer<typeof goalFormSchema>;

function toDefaultValues(goal?: Goal): GoalFormShape {
  return {
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    status: goal?.status ?? "active",
    dimensions: goal?.dimensions ?? [],
    progress: goal?.progress ?? 0,
    targetDate: goal?.targetDate ? goal.targetDate.toISOString().slice(0, 10) : "",
  };
}

export function GoalFormDialog({
  goal,
  trigger,
}: {
  goal?: Goal;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { createGoal, updateGoal } = useGoals();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormShape>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: toDefaultValues(goal),
  });

  const progress = watch("progress");

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(toDefaultValues(goal));
  };

  const onSubmit = async (values: GoalFormShape) => {
    try {
      const payload = {
        title: values.title,
        description: values.description || undefined,
        status: values.status as GoalStatus,
        dimensions: values.dimensions,
        progress: values.progress,
        targetDate: values.targetDate ? new Date(values.targetDate) : undefined,
        completedAt: values.status === "completed" ? new Date() : null,
      };
      if (goal) {
        await updateGoal(goal.id, payload);
        toast.success("Goal updated");
      } else {
        await createGoal(payload);
        toast.success("Goal created");
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
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
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
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" type="date" {...register("targetDate")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="text-muted-foreground text-sm">{progress}%</span>
            </div>
            <Controller
              control={control}
              name="progress"
              render={({ field }) => (
                <Slider
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  step={5}
                />
              )}
            />
          </div>

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
              {goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

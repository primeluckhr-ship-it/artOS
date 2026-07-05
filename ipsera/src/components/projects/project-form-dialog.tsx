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
import { useProjects } from "@/hooks/use-projects";
import type { Project, ProjectStatus } from "@/domain/types/project";

const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  dimensions: dimensionsSchema,
  targetDate: z.string().optional(),
});

type ProjectFormShape = z.infer<typeof projectFormSchema>;

function toDefaultValues(project?: Project): ProjectFormShape {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "active",
    dimensions: project?.dimensions ?? [],
    targetDate: project?.targetDate
      ? project.targetDate.toISOString().slice(0, 10)
      : "",
  };
}

export function ProjectFormDialog({
  project,
  trigger,
}: {
  project?: Project;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { createProject, updateProject } = useProjects();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormShape>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: toDefaultValues(project),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(toDefaultValues(project));
  };

  const onSubmit = async (values: ProjectFormShape) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        status: values.status as ProjectStatus,
        dimensions: values.dimensions,
        targetDate: values.targetDate ? new Date(values.targetDate) : undefined,
        completedAt: values.status === "completed" ? new Date() : null,
      };
      if (project) {
        await updateProject(project.id, payload);
        toast.success("Project updated");
      } else {
        await createProject(payload);
        toast.success("Project created");
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
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
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
                      <SelectItem value="on_hold">On hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
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
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

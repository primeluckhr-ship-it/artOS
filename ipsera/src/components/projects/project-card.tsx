"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DimensionBadges } from "@/components/shared/dimension-badges";
import { ProjectFormDialog } from "./project-form-dialog";
import { useProjects } from "@/hooks/use-projects";
import type { Project } from "@/domain/types/project";

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_VARIANT: Record<Project["status"], "default" | "secondary" | "outline"> = {
  active: "default",
  on_hold: "secondary",
  completed: "outline",
  archived: "secondary",
};

export function ProjectCard({ project }: { project: Project }) {
  const { removeProject } = useProjects();

  const handleDelete = async () => {
    try {
      await removeProject(project.id);
      toast.success("Project deleted");
    } catch {
      toast.error("Couldn't delete project. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{project.name}</CardTitle>
          <Badge variant={STATUS_VARIANT[project.status]} className="mt-1.5">
            {STATUS_LABEL[project.status]}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ProjectFormDialog
              project={project}
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
        {project.description && (
          <p className="text-muted-foreground text-sm">{project.description}</p>
        )}
        <DimensionBadges dimensions={project.dimensions} />
        {project.targetDate && (
          <p className="text-muted-foreground text-xs">
            Target {project.targetDate.toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

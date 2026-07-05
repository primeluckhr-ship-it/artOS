"use client";

import { Plus, FolderKanban } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { useProjects } from "@/hooks/use-projects";

export default function ProjectsPage() {
  const { projects, loading } = useProjects();

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Multi-step efforts you're driving forward."
        action={
          <ProjectFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New project
              </Button>
            }
          />
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Group related tasks into a project to track meaningful progress."
          action={
            <ProjectFormDialog
              trigger={<Button size="sm">Create a project</Button>}
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

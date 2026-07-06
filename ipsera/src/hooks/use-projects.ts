"use client";

import { useCallback } from "react";

import type { CreateProjectInput, UpdateProjectInput } from "@/domain/types/project";
import { projectsRepository } from "@/infrastructure/repositories/projects.repository";
import { useCollection } from "./use-collection";

export function useProjects() {
  const { data, loading, error, create, update, remove } =
    useCollection(projectsRepository);

  const createProject = useCallback(
    (input: CreateProjectInput) => create({ status: "active", ...input }),
    [create]
  );

  const updateProject = useCallback(
    (id: string, input: UpdateProjectInput) => update(id, input),
    [update]
  );

  return {
    projects: data,
    loading,
    error,
    createProject,
    updateProject,
    removeProject: remove,
  };
}

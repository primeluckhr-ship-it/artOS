"use client";

import { useCallback } from "react";

import type { CreateTaskInput, UpdateTaskInput } from "@/domain/types/task";
import { tasksRepository } from "@/infrastructure/repositories/tasks.repository";
import { useCollection } from "./use-collection";

export function useTasks() {
  const { data, loading, error, create, update, remove } =
    useCollection(tasksRepository);

  const createTask = useCallback(
    (input: CreateTaskInput) =>
      create({ status: "todo", ...input }),
    [create]
  );

  const updateTask = useCallback(
    (id: string, input: UpdateTaskInput) => update(id, input),
    [update]
  );

  const toggleTaskStatus = useCallback(
    (id: string, done: boolean) =>
      update(id, {
        status: done ? "done" : "todo",
        completedAt: done ? new Date() : null,
      }),
    [update]
  );

  return {
    tasks: data,
    loading,
    error,
    createTask,
    updateTask,
    toggleTaskStatus,
    removeTask: remove,
  };
}

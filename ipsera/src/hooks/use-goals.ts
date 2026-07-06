"use client";

import { useCallback } from "react";

import type { CreateGoalInput, UpdateGoalInput } from "@/domain/types/goal";
import { goalsRepository } from "@/infrastructure/repositories/goals.repository";
import { useCollection } from "./use-collection";

export function useGoals() {
  const { data, loading, error, create, update, remove } =
    useCollection(goalsRepository);

  const createGoal = useCallback(
    (input: CreateGoalInput) =>
      create({ status: "active", progress: 0, ...input }),
    [create]
  );

  const updateGoal = useCallback(
    (id: string, input: UpdateGoalInput) => update(id, input),
    [update]
  );

  return {
    goals: data,
    loading,
    error,
    createGoal,
    updateGoal,
    removeGoal: remove,
  };
}

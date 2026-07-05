"use client";

import { useMemo } from "react";

import { computeIpseraScores } from "@/domain/ipsera/scoring";
import { useTasks } from "./use-tasks";
import { useGoals } from "./use-goals";
import { useReflections } from "./use-reflections";

export function useIpseraScore() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { goals, loading: goalsLoading } = useGoals();
  const { reflections, loading: reflectionsLoading } = useReflections();

  const result = useMemo(
    () => computeIpseraScores({ tasks, goals, reflections }),
    [tasks, goals, reflections]
  );

  return {
    ...result,
    loading: tasksLoading || goalsLoading || reflectionsLoading,
  };
}

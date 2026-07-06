"use client";

import { useCallback } from "react";

import type {
  CreateReflectionInput,
  UpdateReflectionInput,
} from "@/domain/types/reflection";
import { reflectionsRepository } from "@/infrastructure/repositories/reflections.repository";
import { useCollection } from "./use-collection";

export function useReflections() {
  const { data, loading, error, create, update, remove } =
    useCollection(reflectionsRepository);

  const createReflection = useCallback(
    (input: CreateReflectionInput) => create(input),
    [create]
  );

  const updateReflection = useCallback(
    (id: string, input: UpdateReflectionInput) => update(id, input),
    [update]
  );

  return {
    reflections: data,
    loading,
    error,
    createReflection,
    updateReflection,
    removeReflection: remove,
  };
}

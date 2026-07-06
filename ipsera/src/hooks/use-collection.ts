"use client";

import { useCallback, useEffect, useState } from "react";

import type { BaseEntity } from "@/domain/types/common";
import { useAuthStore } from "@/stores/auth-store";
import type { createUserScopedRepository } from "@/infrastructure/supabase/user-scoped-repository";

/**
 * Subscribes to a user-scoped Supabase table for as long as someone is
 * signed in. Shared by every feature hook (tasks/projects/goals/reflections)
 * since they all follow the same "list + create + update + remove" shape.
 */
export function useCollection<TEntity extends BaseEntity>(
  repository: ReturnType<typeof createUserScopedRepository<TEntity>>
) {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<TEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = repository.subscribe(
      user.id,
      (items) => {
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user, repository]);

  const create = useCallback(
    (input: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      return repository.create(user.id, input);
    },
    [user, repository]
  );

  const update = useCallback(
    (id: string, input: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      return repository.update(user.id, id, input);
    },
    [user, repository]
  );

  const remove = useCallback(
    (id: string) => {
      if (!user) throw new Error("Not authenticated");
      return repository.remove(user.id, id);
    },
    [user, repository]
  );

  return { data, loading, error, create, update, remove };
}

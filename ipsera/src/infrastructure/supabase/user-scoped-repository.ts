import type { BaseEntity } from "@/domain/types/common";
import { supabase } from "./client";
import { fromSupabaseRow, toSupabaseRow } from "./case";

/**
 * Every IPSERA table (tasks, projects, goals, reflections) is a flat,
 * per-user Postgres table locked down by the same RLS shape
 * (auth.uid() = user_id), so the CRUD + realtime subscription pattern is
 * factored out once here instead of copy-pasted per entity.
 */
export function createUserScopedRepository<TEntity extends BaseEntity>(
  table: string
) {
  function subscribe(
    uid: string,
    onChange: (items: TEntity[]) => void,
    onError?: (error: Error) => void
  ) {
    let cancelled = false;

    const refetch = async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        onError?.(new Error(error.message));
        return;
      }
      onChange((data ?? []).map((row) => fromSupabaseRow<TEntity>(row)));
    };

    refetch();

    const channel = supabase
      .channel(`${table}:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${uid}` },
        refetch
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }

  async function create(
    uid: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const { data: row, error } = await supabase
      .from(table)
      .insert(toSupabaseRow({ ...data, userId: uid }))
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return row.id as string;
  }

  async function update(
    uid: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase
      .from(table)
      .update(toSupabaseRow(data))
      .eq("id", id)
      .eq("user_id", uid);

    if (error) throw new Error(error.message);
  }

  async function remove(uid: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", uid);

    if (error) throw new Error(error.message);
  }

  return { subscribe, create, update, remove };
}

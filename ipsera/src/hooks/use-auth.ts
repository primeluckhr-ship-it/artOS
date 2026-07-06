"use client";

import { useCallback } from "react";

import { supabase } from "@/infrastructure/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      // Email confirmation is on by default: signUp succeeds without error but
      // returns no session until the user clicks the confirmation link.
      return { needsEmailConfirmation: data.session === null };
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) throw error;
    useAuthStore.setState({ user: data.user });
  }, []);

  return { user, loading, signIn, signUp, signOut, updateDisplayName };
}

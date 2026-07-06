import type { Reflection } from "@/domain/types/reflection";
import { createUserScopedRepository } from "../supabase/user-scoped-repository";

export const reflectionsRepository =
  createUserScopedRepository<Reflection>("reflections");

import type { Goal } from "@/domain/types/goal";
import { createUserScopedRepository } from "../supabase/user-scoped-repository";

export const goalsRepository = createUserScopedRepository<Goal>("goals");

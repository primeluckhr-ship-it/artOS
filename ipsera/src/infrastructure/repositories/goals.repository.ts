import type { Goal } from "@/domain/types/goal";
import { createUserScopedRepository } from "../firebase/user-scoped-repository";

export const goalsRepository = createUserScopedRepository<Goal>("goals");

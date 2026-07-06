import type { Task } from "@/domain/types/task";
import { createUserScopedRepository } from "../supabase/user-scoped-repository";

export const tasksRepository = createUserScopedRepository<Task>("tasks");

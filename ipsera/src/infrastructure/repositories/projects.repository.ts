import type { Project } from "@/domain/types/project";
import { createUserScopedRepository } from "../supabase/user-scoped-repository";

export const projectsRepository = createUserScopedRepository<Project>("projects");

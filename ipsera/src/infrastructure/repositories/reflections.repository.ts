import type { Reflection } from "@/domain/types/reflection";
import { createUserScopedRepository } from "../firebase/user-scoped-repository";

export const reflectionsRepository =
  createUserScopedRepository<Reflection>("reflections");

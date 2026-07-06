import { AuthError } from "@supabase/supabase-js";

const MESSAGE_PATTERNS: [RegExp, string][] = [
  [/invalid login credentials/i, "Incorrect email or password."],
  [/invalid email/i, "Enter a valid email address."],
  [/user already registered|already been registered/i, "An account with that email already exists."],
  [/password should be at least|weak password/i, "Choose a stronger password (at least 8 characters)."],
  [/rate limit|too many requests/i, "Too many attempts. Try again in a moment."],
  [/network/i, "Network error. Check your connection."],
];

export function friendlyAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    const match = MESSAGE_PATTERNS.find(([pattern]) => pattern.test(error.message));
    return match?.[1] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

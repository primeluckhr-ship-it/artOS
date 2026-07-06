"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { friendlyAuthError } from "@/lib/auth-error";
import { signUpSchema, type SignUpFormValues } from "@/lib/validators/auth.schema";

export function SignUpForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setFormError(null);
    try {
      const { needsEmailConfirmation } = await signUp(
        values.email,
        values.password,
        values.displayName
      );
      if (needsEmailConfirmation) {
        setAwaitingConfirmation(true);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      setFormError(friendlyAuthError(error));
    }
  };

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-muted-foreground text-sm">
          We sent you a confirmation link. Click it to finish creating your
          account, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" autoComplete="name" {...register("displayName")} />
        {errors.displayName && (
          <p className="text-destructive text-xs">{errors.displayName.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-xs">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {formError && <p className="text-destructive text-sm">{formError}</p>}
      <Button type="submit" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}

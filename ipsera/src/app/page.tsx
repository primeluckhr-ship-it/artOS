"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/sign-in");
  }, [loading, user, router]);

  return (
    <div className="bg-background flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading IPSERA…</p>
    </div>
  );
}

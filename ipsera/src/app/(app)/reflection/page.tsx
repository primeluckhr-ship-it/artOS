"use client";

import { Plus, BookOpen } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ReflectionFormDialog } from "@/components/reflection/reflection-form-dialog";
import { ReflectionCard } from "@/components/reflection/reflection-card";
import { useReflections } from "@/hooks/use-reflections";
import { todayLocalDate } from "@/lib/date";

export default function ReflectionPage() {
  const { reflections, loading } = useReflections();
  const today = todayLocalDate();
  const todaysReflection = reflections.find((r) => r.date === today);
  const history = reflections.filter((r) => r.id !== todaysReflection?.id);

  return (
    <div>
      <PageHeader
        title="Reflection"
        description="A quiet moment to notice how you're really doing."
        action={
          !todaysReflection && (
            <ReflectionFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" /> Reflect on today
                </Button>
              }
            />
          )
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : reflections.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No reflections yet"
          description="Take two minutes to check in with yourself — it's the fastest way to see your patterns."
          action={
            <ReflectionFormDialog
              trigger={<Button size="sm">Write your first reflection</Button>}
            />
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {todaysReflection && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Today
              </p>
              <ReflectionCard reflection={todaysReflection} />
            </div>
          )}
          {history.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Past reflections
              </p>
              <div className="flex flex-col gap-3">
                {history.map((reflection) => (
                  <ReflectionCard key={reflection.id} reflection={reflection} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScaleSelector } from "@/components/shared/scale-selector";
import { DIMENSION_LIST } from "@/domain/types/dimension";
import { useReflections } from "@/hooks/use-reflections";
import { todayLocalDate } from "@/lib/date";
import type { Reflection } from "@/domain/types/reflection";

const linesToArray = (text?: string) =>
  (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const reflectionFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().min(1).max(5),
  wins: z.string().optional(),
  challenges: z.string().optional(),
  gratitude: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  identity: z.number().min(1).max(5).optional(),
  physical: z.number().min(1).max(5).optional(),
  spiritual: z.number().min(1).max(5).optional(),
  economic: z.number().min(1).max(5).optional(),
  relationships: z.number().min(1).max(5).optional(),
  achievement: z.number().min(1).max(5).optional(),
});

type ReflectionFormShape = z.infer<typeof reflectionFormSchema>;

function toDefaultValues(reflection?: Reflection): ReflectionFormShape {
  return {
    date: reflection?.date ?? todayLocalDate(),
    mood: reflection?.mood ?? 3,
    wins: reflection?.wins.join("\n") ?? "",
    challenges: reflection?.challenges.join("\n") ?? "",
    gratitude: reflection?.gratitude.join("\n") ?? "",
    notes: reflection?.notes ?? "",
    identity: reflection?.dimensionCheckIns.identity,
    physical: reflection?.dimensionCheckIns.physical,
    spiritual: reflection?.dimensionCheckIns.spiritual,
    economic: reflection?.dimensionCheckIns.economic,
    relationships: reflection?.dimensionCheckIns.relationships,
    achievement: reflection?.dimensionCheckIns.achievement,
  };
}

export function ReflectionFormDialog({
  reflection,
  trigger,
}: {
  reflection?: Reflection;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { createReflection, updateReflection } = useReflections();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<ReflectionFormShape>({
    resolver: zodResolver(reflectionFormSchema),
    defaultValues: toDefaultValues(reflection),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(toDefaultValues(reflection));
  };

  const onSubmit = async (values: ReflectionFormShape) => {
    try {
      const payload = {
        type: "daily" as const,
        date: values.date,
        mood: values.mood,
        wins: linesToArray(values.wins),
        challenges: linesToArray(values.challenges),
        gratitude: linesToArray(values.gratitude),
        notes: values.notes || undefined,
        dimensionCheckIns: {
          identity: values.identity,
          physical: values.physical,
          spiritual: values.spiritual,
          economic: values.economic,
          relationships: values.relationships,
          achievement: values.achievement,
        },
      };
      if (reflection) {
        await updateReflection(reflection.id, payload);
        toast.success("Reflection updated");
      } else {
        await createReflection(payload);
        toast.success("Reflection saved");
      }
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reflection ? "Edit reflection" : "Daily reflection"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Overall mood</Label>
            <Controller
              control={control}
              name="mood"
              render={({ field }) => (
                <ScaleSelector
                  value={field.value}
                  onChange={field.onChange}
                  labels={["Struggling", "Thriving"]}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wins">Wins (one per line)</Label>
            <Textarea id="wins" rows={2} {...register("wins")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="challenges">Challenges (one per line)</Label>
            <Textarea id="challenges" rows={2} {...register("challenges")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gratitude">Grateful for (one per line)</Label>
            <Textarea id="gratitude" rows={2} {...register("gratitude")} />
          </div>

          <div className="flex flex-col gap-3">
            <Label>How&apos;s each dimension of life doing?</Label>
            {DIMENSION_LIST.map((meta) => (
              <div key={meta.id} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm">{meta.label}</span>
                <Controller
                  control={control}
                  name={meta.id}
                  render={({ field }) => (
                    <ScaleSelector value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Anything else on your mind?</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {reflection ? "Save changes" : "Save reflection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

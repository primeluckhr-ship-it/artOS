"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReflectionFormDialog } from "./reflection-form-dialog";
import { useReflections } from "@/hooks/use-reflections";
import { formatDisplayDate } from "@/lib/date";
import type { Reflection } from "@/domain/types/reflection";

const MOOD_LABEL = ["", "Struggling", "Low", "Steady", "Good", "Thriving"];

function ListSection({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <ul className="mt-1 list-inside list-disc text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const { removeReflection } = useReflections();

  const handleDelete = async () => {
    try {
      await removeReflection(reflection.id);
      toast.success("Reflection deleted");
    } catch {
      toast.error("Couldn't delete reflection. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">
            {formatDisplayDate(reflection.date)}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Mood: {MOOD_LABEL[reflection.mood]}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ReflectionFormDialog
              reflection={reflection}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ListSection label="Wins" items={reflection.wins} />
        <ListSection label="Challenges" items={reflection.challenges} />
        <ListSection label="Grateful for" items={reflection.gratitude} />
        {reflection.notes && (
          <div>
            <p className="text-muted-foreground text-xs font-medium">Notes</p>
            <p className="mt-1 text-sm">{reflection.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

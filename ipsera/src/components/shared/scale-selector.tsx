import { cn } from "@/lib/utils";

export function ScaleSelector({
  value,
  onChange,
  labels,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  labels?: [string, string];
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors",
              value === n
                ? "bg-primary text-primary-foreground border-transparent"
                : "text-muted-foreground border-input hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="text-muted-foreground flex justify-between text-[11px]">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

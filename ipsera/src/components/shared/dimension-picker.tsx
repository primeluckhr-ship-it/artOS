import { DIMENSION_LIST, type IpseraDimension } from "@/domain/types/dimension";
import { cn } from "@/lib/utils";

export function DimensionPicker({
  value,
  onChange,
}: {
  value: IpseraDimension[];
  onChange: (value: IpseraDimension[]) => void;
}) {
  const toggle = (dimension: IpseraDimension) => {
    onChange(
      value.includes(dimension)
        ? value.filter((d) => d !== dimension)
        : [...value, dimension]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DIMENSION_LIST.map((meta) => {
        const active = value.includes(meta.id);
        return (
          <button
            key={meta.id}
            type="button"
            onClick={() => toggle(meta.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-transparent text-white"
                : "text-muted-foreground hover:text-foreground border-input"
            )}
            style={active ? { backgroundColor: meta.colorVar } : undefined}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

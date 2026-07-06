import { DIMENSION_META, type IpseraDimension } from "@/domain/types/dimension";

export function DimensionBadges({ dimensions }: { dimensions: IpseraDimension[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {dimensions.map((dimension) => {
        const meta = DIMENSION_META[dimension];
        return (
          <span
            key={dimension}
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: meta.colorVar }}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

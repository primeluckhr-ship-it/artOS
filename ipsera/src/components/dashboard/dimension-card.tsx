import type { DimensionScoreBreakdown } from "@/domain/ipsera/scoring";
import { DIMENSION_META } from "@/domain/types/dimension";
import { Card, CardContent } from "@/components/ui/card";
import { DimensionRing } from "./dimension-ring";

export function DimensionCard({
  breakdown,
}: {
  breakdown: DimensionScoreBreakdown;
}) {
  const meta = DIMENSION_META[breakdown.dimension];

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <DimensionRing
          score={breakdown.score}
          color={meta.colorVar}
          hasData={breakdown.hasData}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">{meta.label}</p>
          <p className="text-muted-foreground truncate text-xs">
            {meta.question}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

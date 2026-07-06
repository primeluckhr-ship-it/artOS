import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function OverallScoreCard({
  overall,
  hasAnyData,
}: {
  overall: number;
  hasAnyData: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Your IPSERA score</p>
            <p className="text-3xl font-semibold tracking-tight">
              {hasAnyData ? overall : "–"}
              <span className="text-muted-foreground text-base font-normal"> / 100</span>
            </p>
          </div>
        </div>
        <Progress value={hasAnyData ? overall : 0} className="mt-4" />
        {!hasAnyData && (
          <p className="text-muted-foreground mt-3 text-xs">
            Add a task, goal, or reflection to start seeing your score.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

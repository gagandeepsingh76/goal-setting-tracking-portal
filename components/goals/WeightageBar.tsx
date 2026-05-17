import { cn } from "@/lib/utils";

export function WeightageBar({ total }: { total: number }) {
  const isComplete = total === 100;
  const isOver = total > 100;
  return (
    <div className="rounded-lg border bg-card/90 p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Total Weightage: {total}% / 100%</span>
        <span className={cn("font-medium", isComplete ? "text-success" : isOver ? "text-danger" : "text-warning")}>
          {isComplete ? "Ready to submit" : isOver ? "Over limit" : "Needs adjustment"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-500", isComplete ? "bg-emerald-600" : isOver ? "bg-red-600" : "bg-amber-500")}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>
    </div>
  );
}

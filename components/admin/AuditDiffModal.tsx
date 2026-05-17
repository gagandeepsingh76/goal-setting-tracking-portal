"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function formatValue(value: unknown) {
  if (value == null) return "-";
  if (value instanceof Date) return value.toLocaleString("en-IN");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AuditDiffModal({ previousValue, newValue }: { previousValue: unknown; newValue: unknown }) {
  const previous = asRecord(previousValue);
  const next = asRecord(newValue);
  const keys = Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]));
  if (keys.length === 0) return <span className="text-sm text-muted-foreground">-</span>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Diff</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Audit Diff</DialogTitle></DialogHeader>
        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[160px_1fr_1fr] bg-muted text-sm font-medium">
            <div className="p-2">Field</div>
            <div className="p-2">Previous</div>
            <div className="p-2">New</div>
          </div>
          {keys.map((key) => {
            const hasPrevious = Object.prototype.hasOwnProperty.call(previous, key);
            const hasNext = Object.prototype.hasOwnProperty.call(next, key);
            const changed = JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[160px_1fr_1fr] border-t text-sm",
                  !hasPrevious && "bg-emerald-50 dark:bg-emerald-500/10",
                  !hasNext && "bg-red-50 dark:bg-red-500/10",
                  hasPrevious && hasNext && changed && "bg-amber-50 dark:bg-amber-500/10",
                  hasPrevious && hasNext && !changed && "bg-muted/35"
                )}
              >
                <div className="p-2 font-medium">{key}</div>
                <div className="break-all p-2">{hasPrevious ? formatValue(previous[key]) : "-"}</div>
                <div className="break-all p-2">{hasNext ? formatValue(next[key]) : "-"}</div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActualStatus, Quarter, UomType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ScoreDisplay } from "@/components/goals/ScoreDisplay";
import { toDateInputValue } from "@/lib/utils";

export function ActualEntryForm({
  goal,
  quarter,
  open
}: {
  goal: {
    id: string;
    uomType: UomType;
    quarterlyActuals: Array<{
      quarter: Quarter;
      actualValue: number | null;
      actualDate: string | Date | null;
      status: ActualStatus;
      progressScore: number | null;
    }>;
  };
  quarter: Quarter;
  open: boolean;
}) {
  const router = useRouter();
  const current = goal.quarterlyActuals.find((item) => item.quarter === quarter);
  const [value, setValue] = useState(current?.actualValue?.toString() || "");
  const [date, setDate] = useState(toDateInputValue(current?.actualDate));
  const [zeroAchieved, setZeroAchieved] = useState((current?.actualValue ?? 1) === 0);
  const [status, setStatus] = useState<ActualStatus>(current?.status || "NOT_STARTED");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    const actualValue = goal.uomType === "ZERO_BASED" ? (zeroAchieved ? 0 : 1) : value ? Number(value) : null;
    startTransition(async () => {
      const response = await fetch("/api/actuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
          quarter,
          actualValue,
          actualDate: goal.uomType === "TIMELINE" ? date : null,
          status
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to save actual.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-md border bg-muted/35 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">{quarter} Achievement</p>
        <ScoreDisplay score={current?.progressScore} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {goal.uomType === "TIMELINE" ? (
          <div className="space-y-1">
            <Label>Actual Date</Label>
            <Input type="date" value={date} disabled={!open} onChange={(event) => setDate(event.target.value)} />
          </div>
        ) : goal.uomType === "ZERO_BASED" ? (
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input type="checkbox" disabled={!open} checked={zeroAchieved} onChange={(event) => setZeroAchieved(event.target.checked)} />
            Achieved Zero?
          </label>
        ) : (
          <div className="space-y-1">
            <Label>Actual Achievement</Label>
            <Input type="number" step="0.1" value={value} disabled={!open} onChange={(event) => setValue(event.target.value)} />
          </div>
        )}
        <div className="space-y-1">
          <Label>Status</Label>
          <Select disabled={!open} value={status} onChange={(event) => setStatus(event.target.value as ActualStatus)}>
            <option value="NOT_STARTED">Not Started</option>
            <option value="ON_TRACK">On Track</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" disabled={!open || pending} onClick={submit}>
            {pending ? "Saving..." : "Save Achievement"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {!open ? <p className="mt-2 text-xs text-muted-foreground">This quarter window is closed. Actuals are read-only.</p> : null}
    </div>
  );
}

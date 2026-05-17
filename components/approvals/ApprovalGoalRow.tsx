"use client";

import { useState, useTransition } from "react";
import type { KeyboardEvent } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import type { UomType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, toDateInputValue } from "@/lib/utils";

export function ApprovalGoalRow({
  goal,
  onSaved
}: {
  goal: {
    id: string;
    title: string;
    uomType: UomType;
    target: number;
    targetDate?: Date | string | null;
    weightage: number;
    thrustArea: { name: string };
  };
  onSaved: (goalId: string, values: { target: number; targetDate: string | null; weightage: number }) => void;
}) {
  const [target, setTarget] = useState(goal.uomType === "TIMELINE" ? toDateInputValue(goal.targetDate) : String(goal.target));
  const [weightage, setWeightage] = useState(String(goal.weightage));
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingWeightage, setEditingWeightage] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function displayTarget() {
    if (goal.uomType === "TIMELINE") return formatDate(target);
    if (goal.uomType === "ZERO_BASED") return "0";
    return target;
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const payload = {
        target: goal.uomType === "TIMELINE" ? undefined : Number(target),
        targetDate: goal.uomType === "TIMELINE" ? target : null,
        weightage: Number(weightage)
      };
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Save failed");
        return;
      }
      setEditingTarget(false);
      setEditingWeightage(false);
      setMessage("Saved");
      onSaved(goal.id, { target: Number(data.goal.target), targetDate: data.goal.targetDate, weightage: Number(data.goal.weightage) });
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") save();
  }

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{goal.title}</p>
        <p className="text-xs text-muted-foreground">{goal.thrustArea.name}</p>
      </TableCell>
      <TableCell>{goal.uomType}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {editingTarget ? (
            goal.uomType === "TIMELINE" ? (
              <Input type="date" value={target} onBlur={save} onKeyDown={onKeyDown} onChange={(event) => setTarget(event.target.value)} />
            ) : (
              <Input type="number" step="0.1" value={target} onBlur={save} onKeyDown={onKeyDown} onChange={(event) => setTarget(event.target.value)} />
            )
          ) : (
            <span className="font-medium">{displayTarget()}</span>
          )}
          <Button type="button" variant="outline" size="sm" disabled={pending || goal.uomType === "ZERO_BASED"} onClick={() => setEditingTarget(true)}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit target</span>
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {editingWeightage ? (
            <Input
              type="number"
              min="10"
              max="90"
              step="0.1"
              value={weightage}
              onBlur={save}
              onKeyDown={onKeyDown}
              onChange={(event) => setWeightage(event.target.value)}
            />
          ) : (
            <span className="font-medium">{weightage}%</span>
          )}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setEditingWeightage(true)}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit weightage</span>
          </Button>
        </div>
      </TableCell>
      <TableCell>
        {message === "Saved" ? (
          <p className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </p>
        ) : message ? (
          <p className="text-xs text-danger">{message}</p>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

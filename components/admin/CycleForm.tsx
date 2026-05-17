"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cycleInputSchema } from "@/lib/validators";
import { toDateInputValue } from "@/lib/utils";

type FormValues = z.infer<typeof cycleInputSchema>;

const fields: Array<[keyof FormValues, string]> = [
  ["goalSettingOpensAt", "Goal Setting Opens"],
  ["goalSettingClosesAt", "Goal Setting Closes"],
  ["q1OpensAt", "Q1 Opens"],
  ["q1ClosesAt", "Q1 Closes"],
  ["q2OpensAt", "Q2 Opens"],
  ["q2ClosesAt", "Q2 Closes"],
  ["q3OpensAt", "Q3 Opens"],
  ["q3ClosesAt", "Q3 Closes"],
  ["q4OpensAt", "Q4 Opens"],
  ["q4ClosesAt", "Q4 Closes"]
];

export function CycleForm({
  cycle,
  hasGoalSheets
}: {
  cycle?: Record<string, any>;
  hasGoalSheets?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(cycleInputSchema),
    defaultValues: {
      year: cycle?.year ?? new Date().getFullYear(),
      name: cycle?.name || "",
      goalSettingOpensAt: toDateInputValue(cycle?.goalSettingOpensAt),
      goalSettingClosesAt: toDateInputValue(cycle?.goalSettingClosesAt),
      q1OpensAt: toDateInputValue(cycle?.q1OpensAt),
      q1ClosesAt: toDateInputValue(cycle?.q1ClosesAt),
      q2OpensAt: toDateInputValue(cycle?.q2OpensAt),
      q2ClosesAt: toDateInputValue(cycle?.q2ClosesAt),
      q3OpensAt: toDateInputValue(cycle?.q3OpensAt),
      q3ClosesAt: toDateInputValue(cycle?.q3ClosesAt),
      q4OpensAt: toDateInputValue(cycle?.q4OpensAt),
      q4ClosesAt: toDateInputValue(cycle?.q4ClosesAt),
      isActive: cycle?.isActive ?? false
    }
  });

  function submit(values: FormValues) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(cycle ? `/api/cycles/${cycle.id}` : "/api/cycles", {
        method: cycle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to save cycle.");
        return;
      }
      router.push("/admin/cycles");
      router.refresh();
    });
  }

  return (
    <Card className="focus-card">
      <CardHeader>
        <CardTitle>{cycle ? "Edit Cycle" : "New Cycle"}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasGoalSheets ? (
          <p className="alert-warning mb-4 rounded-md border p-3 text-sm">
            This cycle already has goal sheets, so date edits are restricted by the API.
          </p>
        ) : null}
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" {...form.register("year")} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
              <p className="field-hint">Use a readable business label, for example FY 2026-27.</p>
            </div>
            {fields.map(([name, label]) => (
              <div key={name} className="space-y-2">
                <Label>{label}</Label>
                <Input type="date" {...form.register(name)} />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("isActive")} />
            Set as active cycle
          </label>
          <Button disabled={pending}>{pending ? "Saving..." : "Save Cycle"}</Button>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

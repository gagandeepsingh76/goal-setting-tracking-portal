"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WeightageBar } from "@/components/goals/WeightageBar";
import { goalInputSchema } from "@/lib/validators";
import { toDateInputValue } from "@/lib/utils";

type FormValues = z.infer<typeof goalInputSchema>;

export function GoalForm({
  mode,
  goalSheetId,
  goal,
  thrustAreas,
  currentTotal,
  goalCount = 0
}: {
  mode: "create" | "edit";
  goalSheetId: string;
  currentTotal: number;
  goalCount?: number;
  thrustAreas: Array<{ id: string; name: string }>;
  goal?: {
    id: string;
    thrustAreaId: string;
    title: string;
    description?: string | null;
    uomType: FormValues["uomType"];
    target: number;
    targetDate?: string | Date | null;
    weightage: number;
    isShared: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const readOnlyShared = Boolean(goal?.isShared);
  const form = useForm<FormValues>({
    resolver: zodResolver(goalInputSchema),
    defaultValues: {
      goalSheetId,
      thrustAreaId: goal?.thrustAreaId || thrustAreas[0]?.id || "",
      title: goal?.title || "",
      description: goal?.description || "",
      uomType: goal?.uomType || "NUMERIC_MIN",
      target: goal?.uomType === "TIMELINE" ? undefined : goal?.target ?? 0,
      targetDate: toDateInputValue(goal?.targetDate),
      weightage: goal?.weightage ?? 10
    }
  });

  const uomType = form.watch("uomType");
  const weightage = Number(form.watch("weightage") || 0);
  const projectedTotal = useMemo(() => {
    const previous = mode === "edit" ? goal?.weightage ?? 0 : 0;
    return Number((currentTotal - previous + weightage).toFixed(1));
  }, [currentTotal, goal?.weightage, mode, weightage]);

  function onSubmit(values: FormValues) {
    setError("");
    if (projectedTotal > 100) {
      setError(`Adding this weightage would exceed 100%. Remaining: ${Math.max(0, 100 - (currentTotal - (mode === "edit" ? goal?.weightage ?? 0 : 0)))}%.`);
      return;
    }
    startTransition(async () => {
      const response = await fetch(mode === "create" ? "/api/goals" : `/api/goals/${goal?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, goalSheetId })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to save goal.");
        return;
      }
      router.push("/goals");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <WeightageBar total={projectedTotal} />
      {mode === "create" && goalCount >= 8 ? (
        <Alert className="alert-warning">
          <AlertDescription className="text-inherit">You have reached the maximum of 8 goals.</AlertDescription>
        </Alert>
      ) : null}
      {projectedTotal > 100 ? (
        <Alert className="alert-danger">
          <AlertDescription className="text-inherit">
            Adding this weightage would exceed 100%. Remaining: {Math.max(0, 100 - (currentTotal - (mode === "edit" ? goal?.weightage ?? 0 : 0)))}%.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card className="focus-card">
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Goal" : "Edit Goal"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            {error ? (
              <Alert className="alert-danger">
                <AlertDescription className="text-inherit">{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Thrust Area</Label>
                <Select disabled={readOnlyShared} {...form.register("thrustAreaId")}>
                  {thrustAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit of Measurement</Label>
                <Select disabled={readOnlyShared} {...form.register("uomType")}>
                  <option value="NUMERIC_MIN">Numeric (Higher is better)</option>
                  <option value="NUMERIC_MAX">Numeric (Lower is better)</option>
                  <option value="PERCENT_MIN">Percentage (Higher is better)</option>
                  <option value="PERCENT_MAX">Percentage (Lower is better)</option>
                  <option value="TIMELINE">Timeline (Date-based)</option>
                  <option value="ZERO_BASED">Zero-Based (0 = Success)</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input disabled={readOnlyShared} {...form.register("title")} />
              {form.formState.errors.title ? <p className="text-sm text-danger">{form.formState.errors.title.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea disabled={readOnlyShared} {...form.register("description")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {uomType === "TIMELINE" ? (
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input type="date" disabled={readOnlyShared} {...form.register("targetDate")} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    step="0.1"
                    disabled={readOnlyShared || uomType === "ZERO_BASED"}
                    {...form.register("target")}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Weightage (%)</Label>
                <Input type="number" step="0.1" min="10" max="90" {...form.register("weightage")} />
                <p className="field-hint">Each goal must be between 10% and 90%.</p>
                {form.formState.errors.weightage ? (
                  <p className="text-sm text-danger">{form.formState.errors.weightage.message}</p>
                ) : null}
              </div>
            </div>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Saving..." : "Save Goal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

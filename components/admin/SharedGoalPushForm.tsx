"use client";

import { useState, useTransition } from "react";
import type { UomType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SharedGoalPushForm({
  thrustAreas,
  employees
}: {
  thrustAreas: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string; department: string }>;
}) {
  const [thrustAreaId, setThrustAreaId] = useState(thrustAreas[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uomType, setUomType] = useState<UomType>("NUMERIC_MIN");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [weightage, setWeightage] = useState("10");
  const [department, setDepartment] = useState("All");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const departments = ["All", ...Array.from(new Set(employees.map((employee) => employee.department)))];
  const visibleEmployees = department === "All" ? employees : employees.filter((employee) => employee.department === department);

  function toggleEmployee(id: string) {
    setEmployeeIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/shared-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thrustAreaId,
          title,
          description,
          uomType,
          target: target ? Number(target) : undefined,
          targetDate,
          weightage: Number(weightage),
          employeeIds
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to push shared goal.");
        return;
      }
      setMessage(`Created for ${data.created.length} employee(s). Skipped: ${data.skipped.length ? data.skipped.join(", ") : "none"}.`);
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Push Departmental KPI</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Thrust Area</Label>
            <Select value={thrustAreaId} onChange={(event) => setThrustAreaId(event.target.value)}>
              {thrustAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>UoM</Label>
            <Select value={uomType} onChange={(event) => setUomType(event.target.value as UomType)}>
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
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {uomType === "TIMELINE" ? (
            <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>
          ) : (
            <div className="space-y-2"><Label>Target</Label><Input type="number" disabled={uomType === "ZERO_BASED"} value={uomType === "ZERO_BASED" ? "0" : target} onChange={(event) => setTarget(event.target.value)} /></div>
          )}
          <div className="space-y-2"><Label>Weightage</Label><Input type="number" min="10" max="90" step="0.1" value={weightage} onChange={(event) => setWeightage(event.target.value)} /></div>
          <div className="space-y-2"><Label>Department Filter</Label><Select value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</Select></div>
        </div>
        <div className="rounded-md border bg-card/70">
          <div className="border-b bg-muted/35 p-3 text-sm font-medium">Target Employees</div>
          <div className="grid max-h-64 gap-2 overflow-auto p-3 sm:grid-cols-2">
            {visibleEmployees.map((employee) => (
              <label key={employee.id} className="flex items-center gap-2 rounded-md border bg-background/60 p-2 text-sm transition-colors hover:border-primary/30 hover:bg-secondary/60">
                <input type="checkbox" checked={employeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
                <span>{employee.name} <span className="text-muted-foreground">({employee.department})</span></span>
              </label>
            ))}
          </div>
        </div>
        <Button disabled={pending} onClick={submit}>{pending ? "Pushing..." : "Push to Selected Employees"}</Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

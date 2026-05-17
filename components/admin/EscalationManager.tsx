"use client";

import { useState, useTransition } from "react";
import type { EscalationTriggerType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function EscalationManager({
  initialRules
}: {
  initialRules: Array<{ id: string; name: string; triggerType: EscalationTriggerType; daysAfterTrigger: number; isActive: boolean }>;
}) {
  const [rules, setRules] = useState(initialRules);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<EscalationTriggerType>("GOAL_NOT_SUBMITTED");
  const [daysAfterTrigger, setDaysAfterTrigger] = useState("1");
  const [message, setMessage] = useState("");
  const [runResult, setRunResult] = useState<{ employeesNotified: number; managersNotified: number; log: string[] } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const response = await fetch("/api/escalation-rules");
    const data = await response.json();
    setRules(data.rules || []);
  }

  function save(id?: string, active?: boolean) {
    startTransition(async () => {
      const body = id
        ? { ...rules.find((rule) => rule.id === id), isActive: active }
        : { name, triggerType, daysAfterTrigger: Number(daysAfterTrigger), isActive: true };
      await fetch("/api/escalation-rules", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      setName("");
      setDaysAfterTrigger("1");
      await refresh();
    });
  }

  function runNow() {
    setMessage("");
    setError("");
    setRunResult(null);
    startTransition(async () => {
      const response = await fetch("/api/escalation/run", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Escalation run failed.");
        return;
      }
      setRunResult(data);
      setMessage(data.summary || "Escalation run complete.");
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>New Escalation Rule</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
          <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Select value={triggerType} onChange={(event) => setTriggerType(event.target.value as EscalationTriggerType)}>
            <option value="GOAL_NOT_SUBMITTED">Goal Not Submitted</option>
            <option value="GOAL_NOT_APPROVED">Goal Not Approved</option>
            <option value="CHECKIN_NOT_COMPLETED">Check-in Not Completed</option>
          </Select>
          <Input type="number" min="1" value={daysAfterTrigger} onChange={(event) => setDaysAfterTrigger(event.target.value)} />
          <Button disabled={pending} onClick={() => save()}>Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Rules</CardTitle>
          <Button disabled={pending} onClick={runNow}>Run Escalation Check Now</Button>
        </CardHeader>
        <CardContent>
          {pending ? <p className="mb-3 text-sm text-muted-foreground">Running escalation check...</p> : null}
          {error ? <Alert className="alert-danger mb-3"><AlertDescription className="text-inherit">{error}</AlertDescription></Alert> : null}
          {runResult ? (
            <div className="alert-success mb-3 rounded-md border p-3 text-sm">
              <p>Escalation run complete. Employees notified: {runResult.employeesNotified} | Managers notified: {runResult.managersNotified}</p>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">View log</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {runResult.log.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </details>
            </div>
          ) : message ? <p className="mb-3 rounded-md border bg-muted/35 p-3 text-sm">{message}</p> : null}
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Trigger</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{rule.triggerType}</TableCell>
                  <TableCell>{rule.daysAfterTrigger}</TableCell>
                  <TableCell><Badge variant={rule.isActive ? "success" : "secondary"}>{rule.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => save(rule.id, !rule.isActive)}>Toggle</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

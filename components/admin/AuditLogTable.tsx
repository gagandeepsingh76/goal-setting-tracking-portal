"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils";
import { AuditDiffModal } from "@/components/admin/AuditDiffModal";

export function AuditLogTable({
  logs
}: {
  logs: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    description: string;
    createdAt: Date | string;
    previousValue: unknown;
    newValue: unknown;
    changedBy: { name: string };
  }>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Changed By</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Diff</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatDateTime(log.createdAt)}</TableCell>
            <TableCell>{log.changedBy?.name ?? "Unknown Employee"}</TableCell>
            <TableCell>{log.entityType}<br /><span className="text-xs text-muted-foreground">{log.entityId}</span></TableCell>
            <TableCell>{log.action}</TableCell>
            <TableCell>{log.description}</TableCell>
            <TableCell><AuditDiffModal previousValue={log.previousValue} newValue={log.newValue} /></TableCell>
            <TableCell>{log.entityType === "GoalSheet" ? <UnlockSheetButton sheetId={log.entityId} /> : null}</TableCell>
          </TableRow>
        ))}
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7}>
              <EmptyState icon={History} title="No audit entries found" description="Adjust the filters or wait for workflow activity to create audit records." />
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

function UnlockSheetButton({ sheetId }: { sheetId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Unlock className="h-4 w-4" />
          Unlock Sheet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Goal Sheet</DialogTitle>
          <DialogDescription>Enter a reason for audit history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason for Unlock</Label>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          {message ? <p className={message.startsWith("Goal") ? "text-sm text-success" : "text-sm text-danger"}>{message}</p> : null}
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (reason.trim().length < 10) {
                  setMessage("Reason must be at least 10 characters.");
                  return;
                }
                const response = await fetch(`/api/goal-sheets/${sheetId}/unlock`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reason })
                });
                const data = await response.json();
                if (!response.ok) {
                  setMessage(data.error || "Unable to unlock sheet.");
                  return;
                }
                setMessage("Goal sheet unlocked successfully.");
                router.refresh();
              })
            }
          >
            Confirm Unlock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ApprovalActions({
  sheetId,
  canUnlock,
  totalWeightage
}: {
  sheetId: string;
  canUnlock: boolean;
  totalWeightage: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [returnComment, setReturnComment] = useState("");
  const [returnError, setReturnError] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [pending, startTransition] = useTransition();

  async function post(path: string, body?: unknown, method = "POST") {
    setMessage("");
    setSuccess("");
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Action failed");
      return false;
    }
    return true;
  }

  return (
    <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card/95 p-4 shadow-elevated backdrop-blur">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const ok = await post(`/api/goal-sheets/${sheetId}/approve`);
            if (ok) {
              setSuccess("Sheet approved.");
              router.push("/approvals");
              router.refresh();
            }
          })
        }
      >
        <Check className="h-4 w-4" />
        Approve Goals
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <RotateCcw className="h-4 w-4" />
            Return for Rework
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for Rework</DialogTitle>
            <DialogDescription>Enter a clear comment for the employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason for Return</Label>
            <Textarea
              minLength={20}
              placeholder="Explain what needs to be corrected..."
              value={returnComment}
              onChange={(event) => {
                setReturnComment(event.target.value);
                setReturnError("");
              }}
            />
            {returnError ? <p className="text-sm text-danger">{returnError}</p> : null}
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (returnComment.trim().length < 20) {
                    setReturnError("Comment must be at least 20 characters.");
                    return;
                  }
                  const ok = await post(`/api/goal-sheets/${sheetId}/return`, { managerComment: returnComment }, "PATCH");
                  if (ok) {
                    setSuccess("Sheet returned to employee.");
                    router.push("/approvals");
                    router.refresh();
                  }
                })
              }
            >
              Return Sheet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {canUnlock ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">
              <Unlock className="h-4 w-4" />
              Unlock Sheet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlock Goal Sheet</DialogTitle>
              <DialogDescription>Admin unlock requires a reason for audit history.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason for Unlock</Label>
              <Textarea
                value={unlockReason}
                onChange={(event) => {
                  setUnlockReason(event.target.value);
                  setUnlockError("");
                }}
              />
              {unlockError ? <p className="text-sm text-danger">{unlockError}</p> : null}
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (unlockReason.trim().length < 10) {
                      setUnlockError("Reason must be at least 10 characters.");
                      return;
                    }
                    const ok = await post(`/api/goal-sheets/${sheetId}/unlock`, { reason: unlockReason });
                    if (ok) {
                      setSuccess("Goal sheet unlocked successfully.");
                      router.refresh();
                    }
                  })
                }
              >
                Confirm Unlock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      {success ? <p className="text-sm text-success">{success}</p> : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Quarter } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CheckInForm({ goalSheetId, quarter }: { goalSheetId: string; quarter: Quarter }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalSheetId, quarter, comment })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to complete check-in.");
        return;
      }
      setSaved(true);
      setMessage(`Check-in recorded for ${quarter}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card/90 p-4 shadow-card">
      <div className="space-y-2">
        <Label>Check-in Comment</Label>
        <Textarea
          placeholder="Summarise the discussion, key observations, and agreed actions."
          value={comment}
          disabled={saved}
          onChange={(event) => setComment(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{comment.trim().length}/30 characters</p>
      </div>
      <Button disabled={pending || saved || comment.trim().length < 30} onClick={submit}>
        {pending ? "Completing..." : "Complete Check-in"}
      </Button>
      {message ? <p className={saved ? "text-sm text-success" : "text-sm text-danger"}>{message}</p> : null}
    </div>
  );
}

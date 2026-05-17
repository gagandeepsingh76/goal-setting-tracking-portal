"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SubmitGoalSheetButton({ goalSheetId, totalWeightage }: { goalSheetId: string; totalWeightage: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {error ? (
        <Alert className="alert-danger">
          <AlertDescription className="text-inherit">{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            if (totalWeightage !== 100) {
              setError(`Total weightage must equal 100%. Current total: ${totalWeightage}%.`);
              return;
            }
            const response = await fetch(`/api/goal-sheets/${goalSheetId}/submit`, { method: "POST" });
            const data = await response.json();
            if (!response.ok) {
              setError(data.error || "Unable to submit goal sheet.");
              return;
            }
            router.refresh();
          })
        }
      >
        <Send className="h-4 w-4" />
        {pending ? "Submitting..." : "Submit for Approval"}
      </Button>
    </div>
  );
}

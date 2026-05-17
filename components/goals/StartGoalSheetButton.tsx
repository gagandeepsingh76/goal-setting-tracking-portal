"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartGoalSheetButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const response = await fetch("/api/goal-sheets", { method: "POST" });
            const data = await response.json();
            if (!response.ok) {
              setError(data.error || "Unable to start goal setting.");
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? "Starting..." : "Start Goal Setting"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

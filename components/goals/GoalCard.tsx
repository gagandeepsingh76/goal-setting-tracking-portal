import Link from "next/link";
import { Lock, Pencil } from "lucide-react";
import type { GoalSheetStatus, UomType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";

function targetLabel(uomType: UomType, target: number, targetDate?: Date | string | null) {
  if (uomType === "TIMELINE") return formatDate(targetDate);
  if (uomType === "ZERO_BASED") return "0";
  return formatNumber(target);
}

export function GoalCard({
  goal,
  sheetStatus
}: {
  goal: {
    id: string;
    title: string;
    description?: string | null;
    uomType: UomType;
    target: number;
    targetDate?: Date | string | null;
    weightage: number;
    isShared: boolean;
    thrustArea: { name: string };
  };
  sheetStatus: GoalSheetStatus;
}) {
  const editable = ["DRAFT", "RETURNED"].includes(sheetStatus);
  return (
    <Card className="focus-card">
      <CardHeader className="flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">{goal.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{goal.thrustArea.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {goal.isShared ? <Badge variant="purple">Shared</Badge> : null}
          <Badge variant="outline">{goal.weightage}%</Badge>
          {editable ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/goals/${goal.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : (
            <Badge variant="secondary">
              <Lock className="mr-1 h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {goal.description ? <p className="mb-3 text-sm text-muted-foreground">{goal.description}</p> : null}
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">UoM</p>
            <p className="font-medium">{goal.uomType}</p>
          </div>
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="font-medium">{targetLabel(goal.uomType, goal.target, goal.targetDate)}</p>
          </div>
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">Weightage</p>
            <p className="font-medium">{goal.weightage}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

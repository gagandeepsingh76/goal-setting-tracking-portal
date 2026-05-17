import type { GoalSheetStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function statusVariant(status?: GoalSheetStatus | "NOT_STARTED") {
  if (status === "LOCKED" || status === "APPROVED") return "success";
  if (status === "SUBMITTED") return "warning";
  if (status === "RETURNED") return "danger";
  return "secondary";
}

export function GoalSheetSummary({
  status,
  submittedAt,
  approvedAt,
  cycleName
}: {
  status?: GoalSheetStatus | "NOT_STARTED";
  submittedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  cycleName?: string;
}) {
  return (
    <Card className="focus-card">
      <CardHeader>
        <CardTitle>Goal Sheet</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Cycle</p>
          <p className="font-medium">{cycleName || "N/A"}</p>
        </div>
        <div className="rounded-md border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={statusVariant(status)}>{status || "NOT_STARTED"}</Badge>
        </div>
        <div className="rounded-md border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="font-medium">{formatDate(submittedAt)}</p>
        </div>
        <div className="rounded-md border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="font-medium">{formatDate(approvedAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { UomType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WeightageBar } from "@/components/goals/WeightageBar";
import { ApprovalGoalRow } from "@/components/approvals/ApprovalGoalRow";
import { ApprovalActions } from "@/components/approvals/ApprovalActions";

type Goal = {
  id: string;
  title: string;
  uomType: UomType;
  target: number;
  targetDate?: Date | string | null;
  weightage: number;
  thrustArea: { name: string };
};

export function ApprovalReviewClient({
  sheetId,
  goals,
  canUnlock
}: {
  sheetId: string;
  goals: Goal[];
  canUnlock: boolean;
}) {
  const [rows, setRows] = useState(goals);
  const total = useMemo(() => Number(rows.reduce((sum, goal) => sum + Number(goal.weightage), 0).toFixed(1)), [rows]);

  return (
    <div className="space-y-5">
      <WeightageBar total={total} />
      {total !== 100 ? (
        <Alert className="alert-danger">
          <AlertDescription className="text-inherit">Total weightage is {total}%. Adjust before approving.</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Goal</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Weightage</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((goal) => (
                <ApprovalGoalRow
                  key={goal.id}
                  goal={goal}
                  onSaved={(goalId, values) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === goalId ? { ...item, target: values.target, targetDate: values.targetDate, weightage: values.weightage } : item
                      )
                    )
                  }
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ApprovalActions sheetId={sheetId} canUnlock={canUnlock} totalWeightage={total} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveQuarter, isQuarterOpen } from "@/lib/cycle-utils";
import { computeWeightedScore } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import { ScoreDisplay } from "@/components/goals/ScoreDisplay";
import { CheckInForm } from "@/components/check-ins/CheckInForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function CheckInPage({ params }: { params: { sheetId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: params.sheetId },
    include: {
      employee: true,
      cycle: true,
      goals: { include: { thrustArea: true, quarterlyActuals: true } },
      checkIns: { include: { manager: true }, orderBy: { completedAt: "desc" } }
    }
  });
  if (!sheet) return <Alert><AlertDescription>Goal sheet not found.</AlertDescription></Alert>;
  if (session.user.role !== "ADMIN" && sheet.managerId !== session.user.id) {
    return <Alert><AlertDescription>You do not have access to this team member.</AlertDescription></Alert>;
  }
  const activeQuarter = getActiveQuarter(sheet.cycle, new Date());
  const open = activeQuarter ? isQuarterOpen(sheet.cycle, activeQuarter, new Date()) : false;
  const weightedScore = activeQuarter ? computeWeightedScore(sheet.goals, activeQuarter) : null;
  const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">{sheet.employee.name}</h1>
        <p className="page-subtitle">{sheet.cycle.name} check-in</p>
      </div>
      {activeQuarter && open ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{activeQuarter} Planned vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Goal</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>{activeQuarter} Actual & Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.goals.map((goal) => {
                    const actual = goal.quarterlyActuals.find((item) => item.quarter === activeQuarter);
                    return (
                      <TableRow key={goal.id}>
                        <TableCell>
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">{goal.thrustArea.name}</p>
                        </TableCell>
                        <TableCell>{goal.uomType === "TIMELINE" ? formatDate(goal.targetDate) : goal.target}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{goal.uomType === "TIMELINE" ? formatDate(actual?.actualDate) : (actual?.actualValue ?? "N/A")}</span>
                            <ScoreDisplay score={actual?.progressScore} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 rounded-md border bg-muted/35 p-3">
                <p className="text-sm text-muted-foreground">Weighted Average Score</p>
                <p className="text-xl font-semibold">{weightedScore != null ? `${(weightedScore * 100).toFixed(1)}%` : "N/A"}</p>
              </div>
            </CardContent>
          </Card>
          <CheckInForm goalSheetId={sheet.id} quarter={activeQuarter} />
        </>
      ) : (
        <Alert>
          <AlertTitle>No active check-in window</AlertTitle>
          <AlertDescription>Historical check-in comments are shown below.</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Check-in History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quarters.map((quarter) => {
            const checkIn = sheet.checkIns.find((item) => item.quarter === quarter);
            if (!checkIn) return <p key={quarter} className="text-sm text-muted-foreground">No check-in recorded for {quarter}.</p>;
            return (
              <details key={checkIn.id} className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {quarter} Check-in - {formatDate(checkIn.completedAt)} - by {checkIn.manager?.name ?? "No Manager Assigned"}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{checkIn.comment}</p>
              </details>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

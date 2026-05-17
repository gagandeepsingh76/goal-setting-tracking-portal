import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import type { Quarter } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveQuarter, isGoalSettingOpen, isQuarterOpen } from "@/lib/cycle-utils";
import { totalWeightage } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalSheetSummary } from "@/components/goals/GoalSheetSummary";
import { WeightageBar } from "@/components/goals/WeightageBar";
import { GoalCard } from "@/components/goals/GoalCard";
import { StartGoalSheetButton } from "@/components/goals/StartGoalSheetButton";
import { SubmitGoalSheetButton } from "@/components/goals/SubmitGoalSheetButton";
import { ActualEntryForm } from "@/components/actuals/ActualEntryForm";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return <Alert><AlertTitle>No active cycle</AlertTitle><AlertDescription>An administrator must configure a cycle.</AlertDescription></Alert>;
  }

  const sheet = await prisma.goalSheet.findUnique({
    where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
    include: {
      cycle: true,
      goals: {
        include: { thrustArea: true, quarterlyActuals: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  const activeQuarter = getActiveQuarter(cycle, new Date()) || "Q1";
  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

  if (!sheet) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-title">My Goals</h1>
          <p className="page-subtitle">Start your goal sheet for the active cycle and build toward a balanced 100% plan.</p>
        </div>
        <GoalSheetSummary status="NOT_STARTED" cycleName={cycle.name} />
        {isGoalSettingOpen(cycle, new Date()) ? (
          <StartGoalSheetButton />
        ) : (
          <Alert className="alert-warning">
            <AlertTitle>Goal setting window is closed</AlertTitle>
            <AlertDescription>
              Goal setting for {cycle.name} opens on {formatDate(cycle.goalSettingOpensAt)} and closes on{" "}
              {formatDate(cycle.goalSettingClosesAt)}.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  const total = totalWeightage(sheet.goals);
  const editable = ["DRAFT", "RETURNED"].includes(sheet.status);
  const approved = ["APPROVED", "LOCKED"].includes(sheet.status);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">My Goals</h1>
          <p className="page-subtitle">Manage goal definitions, weightage, quarterly actuals, and achievement status.</p>
        </div>
        {editable && sheet.goals.length < 8 ? (
          <Button asChild>
            <Link href="/goals/new">
              <Plus className="h-4 w-4" />
              Add Goal
            </Link>
          </Button>
        ) : null}
      </div>
      {editable && sheet.goals.length >= 8 ? (
        <Alert className="alert-warning">
          <AlertDescription className="text-inherit">You have reached the maximum of 8 goals.</AlertDescription>
        </Alert>
      ) : null}
      <GoalSheetSummary status={sheet.status} cycleName={cycle.name} submittedAt={sheet.submittedAt} approvedAt={sheet.approvedAt} />
      {sheet.status === "RETURNED" && sheet.managerComment ? (
        <Alert className="alert-warning">
          <AlertTitle>Your goals were returned for rework</AlertTitle>
          <AlertDescription>{sheet.managerComment}</AlertDescription>
        </Alert>
      ) : null}
      <WeightageBar total={total} />
      {editable ? (
        <SubmitGoalSheetButton goalSheetId={sheet.id} totalWeightage={total} />
      ) : sheet.status === "SUBMITTED" ? (
        <Alert><AlertDescription>Awaiting Manager Approval</AlertDescription></Alert>
      ) : null}
      {approved ? (
        <Tabs defaultValue={activeQuarter}>
          <TabsList>
            {quarters.map((quarter) => (
              <TabsTrigger key={quarter} value={quarter}>
                {quarter}
              </TabsTrigger>
            ))}
          </TabsList>
          {quarters.map((quarter) => (
            <TabsContent key={quarter} value={quarter} className="space-y-4">
              {sheet.goals.map((goal) => (
                <div key={`${goal.id}-${quarter}`} className="rounded-lg border bg-card/90 p-4 shadow-card">
                  <GoalCard goal={goal} sheetStatus={sheet.status} />
                  <ActualEntryForm goal={goal} quarter={quarter} open={isQuarterOpen(cycle, quarter, new Date())} />
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-3">
          {sheet.goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} sheetStatus={sheet.status} />
          ))}
        </div>
      )}
    </div>
  );
}

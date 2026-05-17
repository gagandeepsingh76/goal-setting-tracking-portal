import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGoalSettingOpen } from "@/lib/cycle-utils";
import { totalWeightage } from "@/lib/calculations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoalForm } from "@/components/goals/GoalForm";

export default async function NewGoalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle || !isGoalSettingOpen(cycle, new Date())) {
    return <Alert><AlertDescription>Goal setting is not currently open.</AlertDescription></Alert>;
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.managerId) return <Alert><AlertDescription>You need a manager before creating goals.</AlertDescription></Alert>;
  const sheet = await prisma.goalSheet.upsert({
    where: { employeeId_cycleId: { employeeId: session.user.id, cycleId: cycle.id } },
    update: {},
    create: { employeeId: session.user.id, managerId: user.managerId, cycleId: cycle.id },
    include: { goals: true }
  });
  const thrustAreas = await prisma.thrustArea.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Create Goal</h1>
        <p className="page-subtitle">Add a clear, measurable goal with a target and approved weightage range.</p>
      </div>
      <GoalForm
        mode="create"
        goalSheetId={sheet.id}
        thrustAreas={thrustAreas}
        currentTotal={totalWeightage(sheet.goals)}
        goalCount={sheet.goals.length}
      />
    </div>
  );
}

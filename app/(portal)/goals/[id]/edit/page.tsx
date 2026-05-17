import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { totalWeightage } from "@/lib/calculations";
import { GoalForm } from "@/components/goals/GoalForm";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function EditGoalPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const goal = await prisma.goal.findUnique({
    where: { id: params.id },
    include: { goalSheet: { include: { goals: true } } }
  });
  if (!goal || goal.goalSheet.employeeId !== session.user.id) {
    return <Alert><AlertDescription>Goal not found or inaccessible.</AlertDescription></Alert>;
  }
  const thrustAreas = await prisma.thrustArea.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Edit Goal</h1>
        <p className="page-subtitle">Refine target details and weightage while preserving the workflow controls.</p>
      </div>
      <GoalForm
        mode="edit"
        goalSheetId={goal.goalSheetId}
        goal={goal}
        thrustAreas={thrustAreas}
        currentTotal={totalWeightage(goal.goalSheet.goals)}
        goalCount={goal.goalSheet.goals.length}
      />
    </div>
  );
}

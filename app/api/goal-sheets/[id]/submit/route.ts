import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, requireUser } from "@/lib/api";
import { totalWeightage } from "@/lib/calculations";
import { isGoalSettingOpen } from "@/lib/cycle-utils";
import { goalSheetAuditValue, writeAuditLog } from "@/lib/audit";
import { sendGoalSubmittedEmail } from "@/lib/mailer";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["EMPLOYEE", "MANAGER"]);
    const goalSheet = await prisma.goalSheet.findUnique({
      where: { id: params.id },
      include: { goals: true, cycle: true, manager: true, employee: true }
    });
    if (!goalSheet) throw new ApiError("Goal sheet not found.", 404);
    if (goalSheet.employeeId !== user.id) throw new ApiError("Only the goal sheet owner can submit goals.", 403);
    if (goalSheet.status !== GoalSheetStatus.DRAFT && goalSheet.status !== GoalSheetStatus.RETURNED) {
      throw new ApiError("Only draft or returned goal sheets can be submitted.", 400);
    }
    if (!isGoalSettingOpen(goalSheet.cycle, new Date())) {
      throw new ApiError(
        `Goal submission is closed. Window: ${goalSheet.cycle.goalSettingOpensAt.toDateString()} - ${goalSheet.cycle.goalSettingClosesAt.toDateString()}`,
        400
      );
    }
    if (goalSheet.goals.length < 1) throw new ApiError("You must add at least one goal before submitting.", 400);
    if (goalSheet.goals.length > 8) throw new ApiError("Maximum 8 goals allowed.", 400);
    const total = totalWeightage(goalSheet.goals);
    if (total !== 100) throw new ApiError(`Total weightage must equal 100%. Current total: ${total}%.`, 400);

    const updated = await prisma.goalSheet.update({
      where: { id: goalSheet.id },
      data: {
        status: GoalSheetStatus.SUBMITTED,
        submittedAt: new Date(),
        managerComment: null
      }
    });
    await writeAuditLog(prisma, {
      entityType: "GoalSheet",
      entityId: goalSheet.id,
      action: "SUBMITTED",
      changedById: user.id,
      description: `${goalSheet.employee.name} submitted goals for ${goalSheet.cycle.name}.`,
      previousValue: goalSheetAuditValue(goalSheet),
      newValue: goalSheetAuditValue(updated)
    });
    await sendGoalSubmittedEmail(goalSheet.manager, goalSheet.employee, goalSheet.cycle.year, goalSheet.id);
    return jsonOk({ goalSheet: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

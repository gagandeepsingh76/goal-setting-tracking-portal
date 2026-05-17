import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, requireUser } from "@/lib/api";
import { totalWeightage } from "@/lib/calculations";
import { canReviewSheet } from "@/lib/permissions";
import { goalSheetAuditValue, writeAuditLog } from "@/lib/audit";
import { sendGoalApprovedEmail } from "@/lib/mailer";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["MANAGER", "ADMIN"]);
    const goalSheet = await prisma.goalSheet.findUnique({
      where: { id: params.id },
      include: { goals: true, cycle: true, employee: true, manager: true }
    });
    if (!goalSheet) throw new ApiError("Goal sheet not found.", 404);
    if (!canReviewSheet(user, goalSheet.managerId)) throw new ApiError("You cannot approve this goal sheet.", 403);
    if (goalSheet.status !== GoalSheetStatus.SUBMITTED) {
      throw new ApiError("Only submitted goal sheets can be approved.", 400);
    }
    const total = totalWeightage(goalSheet.goals);
    if (total !== 100) {
      throw new ApiError(`Cannot approve: total weightage is ${total}%. Please adjust before approving.`, 400);
    }

    const now = new Date();
    const updated = await prisma.goalSheet.update({
      where: { id: goalSheet.id },
      data: {
        status: GoalSheetStatus.LOCKED,
        approvedAt: now,
        lockedAt: now,
        managerComment: null,
        goals: {
          updateMany: {
            where: { isShared: false },
            data: { weightageEditable: false }
          }
        }
      }
    });
    await writeAuditLog(prisma, {
      entityType: "GoalSheet",
      entityId: goalSheet.id,
      action: "APPROVED",
      changedById: user.id,
      description: `${goalSheet.employee.name}'s goals were approved and locked.`,
      previousValue: goalSheetAuditValue(goalSheet),
      newValue: goalSheetAuditValue(updated)
    });
    await sendGoalApprovedEmail(goalSheet.employee, goalSheet.cycle.year);
    return jsonOk({ goalSheet: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

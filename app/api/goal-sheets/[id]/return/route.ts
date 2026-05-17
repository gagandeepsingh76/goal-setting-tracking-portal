import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { canReviewSheet } from "@/lib/permissions";
import { returnSheetSchema } from "@/lib/validators";
import { goalSheetAuditValue, writeAuditLog } from "@/lib/audit";
import { sendGoalReturnedEmail } from "@/lib/mailer";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["MANAGER", "ADMIN"]);
    const body = await parseRequestBody(request, returnSheetSchema);
    const goalSheet = await prisma.goalSheet.findUnique({
      where: { id: params.id },
      include: { cycle: true, employee: true, manager: true, goals: true }
    });
    if (!goalSheet) throw new ApiError("Goal sheet not found.", 404);
    if (!canReviewSheet(user, goalSheet.managerId)) throw new ApiError("You cannot return this goal sheet.", 403);
    if (goalSheet.status !== GoalSheetStatus.SUBMITTED) {
      throw new ApiError("Only submitted goal sheets can be returned for rework.", 400);
    }

    const updated = await prisma.goalSheet.update({
      where: { id: goalSheet.id },
      data: {
        status: GoalSheetStatus.RETURNED,
        managerComment: body.managerComment
      }
    });
    await writeAuditLog(prisma, {
      entityType: "GoalSheet",
      entityId: goalSheet.id,
      action: "RETURNED",
      changedById: user.id,
      description: `${goalSheet.employee.name}'s goals were returned for rework.`,
      previousValue: goalSheetAuditValue(goalSheet),
      newValue: goalSheetAuditValue(updated)
    });
    await sendGoalReturnedEmail(goalSheet.employee, goalSheet.cycle.year, body.managerComment);
    return jsonOk({ goalSheet: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return POST(request, context);
}

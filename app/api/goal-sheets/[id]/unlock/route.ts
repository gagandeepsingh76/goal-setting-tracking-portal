import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { unlockSheetSchema } from "@/lib/validators";
import { goalSheetAuditValue, writeAuditLog } from "@/lib/audit";
import { sendGoalSheetUnlockedEmail } from "@/lib/mailer";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["ADMIN"]);
    const body = await parseRequestBody(request, unlockSheetSchema);
    const goalSheet = await prisma.goalSheet.findUnique({
      where: { id: params.id },
      include: { employee: true, goals: true, cycle: true }
    });
    if (!goalSheet) throw new ApiError("Goal sheet not found.", 404);
    if (goalSheet.status !== GoalSheetStatus.LOCKED && goalSheet.status !== GoalSheetStatus.APPROVED) {
      throw new ApiError("Only locked or approved goal sheets can be unlocked.", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sheet = await tx.goalSheet.update({
        where: { id: goalSheet.id },
        data: {
          status: GoalSheetStatus.DRAFT,
          lockedAt: null,
          goals: {
            updateMany: {
              where: {},
              data: { weightageEditable: true }
            }
          }
        }
      });
      await writeAuditLog(tx, {
        entityType: "GoalSheet",
        entityId: goalSheet.id,
        action: "UNLOCKED",
        changedById: user.id,
        description: `Admin unlocked goal sheet. Reason: ${body.reason}`,
        previousValue: goalSheetAuditValue(goalSheet),
        newValue: goalSheetAuditValue(sheet)
      });
      return sheet;
    });
    await sendGoalSheetUnlockedEmail(goalSheet.employee.email, goalSheet.employee.name);
    return jsonOk({ goalSheet: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

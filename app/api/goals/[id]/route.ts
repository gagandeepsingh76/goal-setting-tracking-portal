import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { canReviewSheet } from "@/lib/permissions";
import { goalInputSchema, managerGoalEditSchema } from "@/lib/validators";
import { goalAuditValue, writeAuditLog } from "@/lib/audit";

function normalizeTimeline(uomType: string, target?: number, targetDate?: string | null) {
  const date = uomType === "TIMELINE" && targetDate ? new Date(targetDate) : null;
  return {
    target: uomType === "ZERO_BASED" ? 0 : uomType === "TIMELINE" ? Number(date?.getTime() ?? 0) : Number(target),
    targetDate: date
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: { thrustArea: true, quarterlyActuals: true, goalSheet: true }
    });
    if (!goal) throw new ApiError("Goal not found.", 404);
    const canAccess =
      user.role === "ADMIN" ||
      goal.goalSheet.employeeId === user.id ||
      (user.role === "MANAGER" && goal.goalSheet.managerId === user.id);
    if (!canAccess) throw new ApiError("You do not have access to this goal.", 403);
    return jsonOk({ goal });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.goal.findUnique({
      where: { id: params.id },
      include: { goalSheet: { include: { goals: true } }, thrustArea: true }
    });
    if (!existing) throw new ApiError("Goal not found.", 404);

    const isManagerEdit = user.role !== "EMPLOYEE" && canReviewSheet(user, existing.goalSheet.managerId);
    const isOwnerEdit = user.role === "EMPLOYEE" && existing.goalSheet.employeeId === user.id;

    if (!isManagerEdit && !isOwnerEdit) throw new ApiError("You cannot edit this goal.", 403);

    if (isManagerEdit) {
      if (existing.goalSheet.status !== GoalSheetStatus.SUBMITTED) {
        throw new ApiError("Manager edits are only allowed while a sheet is submitted.", 400);
      }
      const input = await parseRequestBody(request, managerGoalEditSchema);
      const normalized = normalizeTimeline(existing.uomType, input.target, input.targetDate);
      const updated = await prisma.goal.update({
        where: { id: existing.id },
        data: {
          weightage: input.weightage,
          target: normalized.target,
          targetDate: normalized.targetDate
        },
        include: { thrustArea: true, goalSheet: true }
      });
      await writeAuditLog(prisma, {
        entityType: "Goal",
        entityId: updated.id,
        action: "UPDATED",
        changedById: user.id,
        description: `Manager updated target/weightage for ${updated.title}.`,
        previousValue: goalAuditValue(existing),
        newValue: goalAuditValue(updated)
      });
      return jsonOk({ goal: updated });
    }

    if (existing.goalSheet.status !== GoalSheetStatus.DRAFT && existing.goalSheet.status !== GoalSheetStatus.RETURNED) {
      throw new ApiError("Goals can only be edited while the sheet is draft or returned.", 400);
    }

    const input = await parseRequestBody(request, goalInputSchema);
    const normalized = normalizeTimeline(input.uomType, input.target, input.targetDate);
    const data = existing.isShared
      ? { weightage: input.weightage }
      : {
          thrustAreaId: input.thrustAreaId,
          title: input.title,
          description: input.description || null,
          uomType: input.uomType,
          weightage: input.weightage,
          target: normalized.target,
          targetDate: normalized.targetDate
        };

    const updated = await prisma.goal.update({
      where: { id: existing.id },
      data,
      include: { thrustArea: true, goalSheet: true }
    });
    await writeAuditLog(prisma, {
      entityType: "Goal",
      entityId: updated.id,
      action: "UPDATED",
      changedById: user.id,
      description: `Goal updated: ${updated.title}`,
      previousValue: goalAuditValue(existing),
      newValue: goalAuditValue(updated)
    });
    return jsonOk({ goal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["EMPLOYEE", "ADMIN"]);
    const existing = await prisma.goal.findUnique({
      where: { id: params.id },
      include: { goalSheet: true }
    });
    if (!existing) throw new ApiError("Goal not found.", 404);
    if (user.role !== "ADMIN" && existing.goalSheet.employeeId !== user.id) {
      throw new ApiError("You can only delete your own goals.", 403);
    }
    if (
      user.role !== "ADMIN" &&
      existing.goalSheet.status !== GoalSheetStatus.DRAFT &&
      existing.goalSheet.status !== GoalSheetStatus.RETURNED
    ) {
      throw new ApiError("Goals can only be deleted while the sheet is draft or returned.", 400);
    }
    if (existing.isShared && user.role !== "ADMIN") {
      throw new ApiError("Shared goals cannot be deleted by employees.", 400);
    }

    await prisma.goal.delete({ where: { id: existing.id } });
    await writeAuditLog(prisma, {
      entityType: "Goal",
      entityId: existing.id,
      action: "DELETED",
      changedById: user.id,
      description: `Goal deleted: ${existing.title}`,
      previousValue: goalAuditValue(existing)
    });
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return PUT(request, context);
}

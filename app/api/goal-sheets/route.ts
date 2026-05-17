import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, requireUser } from "@/lib/api";
import { isGoalSettingOpen } from "@/lib/cycle-utils";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } });
    if (!activeCycle) throw new ApiError("No active cycle is configured.", 404);

    const where =
      user.role === "ADMIN"
        ? { cycleId: activeCycle.id }
        : user.role === "MANAGER"
          ? { cycleId: activeCycle.id, managerId: user.id }
          : { cycleId: activeCycle.id, employeeId: user.id };

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        employee: true,
        manager: true,
        cycle: true,
        goals: { include: { thrustArea: true, quarterlyActuals: true } },
        checkIns: true
      },
      orderBy: { updatedAt: "desc" }
    });
    return jsonOk({ sheets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    const user = await requireUser(["EMPLOYEE", "MANAGER"]);
    const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!currentUser?.managerId) throw new ApiError("You need a direct manager before starting a goal sheet.", 400);

    const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
    if (!cycle) throw new ApiError("No active cycle is configured.", 404);
    if (!isGoalSettingOpen(cycle, new Date())) {
      throw new ApiError(
        `Goal setting is closed for ${cycle.name}. It opens on ${cycle.goalSettingOpensAt.toLocaleDateString("en-IN")}.`,
        400
      );
    }

    const existing = await prisma.goalSheet.findUnique({
      where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } }
    });
    if (existing) return jsonOk({ goalSheet: existing });

    const goalSheet = await prisma.goalSheet.create({
      data: {
        employeeId: user.id,
        managerId: currentUser.managerId,
        cycleId: cycle.id,
        status: GoalSheetStatus.DRAFT
      }
    });
    await writeAuditLog(prisma, {
      entityType: "GoalSheet",
      entityId: goalSheet.id,
      action: "CREATED",
      changedById: user.id,
      description: `${user.name} started a goal sheet for ${cycle.name}.`,
      newValue: goalSheet
    });
    return jsonOk({ goalSheet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

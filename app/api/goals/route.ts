import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { isGoalSettingOpen } from "@/lib/cycle-utils";
import { goalInputSchema } from "@/lib/validators";
import { goalAuditValue, writeAuditLog } from "@/lib/audit";

function normalizeGoalInput(input: ReturnType<typeof goalInputSchema.parse>) {
  const targetDate = input.uomType === "TIMELINE" && input.targetDate ? new Date(input.targetDate) : null;
  return {
    thrustAreaId: input.thrustAreaId,
    title: input.title,
    description: input.description || null,
    uomType: input.uomType,
    target: input.uomType === "ZERO_BASED" ? 0 : input.uomType === "TIMELINE" ? Number(targetDate?.getTime() ?? 0) : Number(input.target),
    targetDate,
    weightage: input.weightage
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const goals = await prisma.goal.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : user.role === "MANAGER"
            ? { goalSheet: { OR: [{ employeeId: user.id }, { managerId: user.id }] } }
            : { goalSheet: { employeeId: user.id } },
      include: { thrustArea: true, goalSheet: { include: { employee: true, cycle: true } }, quarterlyActuals: true },
      orderBy: { createdAt: "desc" }
    });
    return jsonOk({ goals });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["EMPLOYEE", "MANAGER"]);
    const input = await parseRequestBody(request, goalInputSchema);
    const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
    if (!cycle) throw new ApiError("No active cycle is configured.", 404);
    if (!isGoalSettingOpen(cycle, new Date())) {
      throw new ApiError(
        `Goal setting is closed for ${cycle.name}. It opens on ${cycle.goalSettingOpensAt.toLocaleDateString("en-IN")}.`,
        400
      );
    }

    const employee = await prisma.user.findUnique({ where: { id: user.id } });
    if (!employee?.managerId) throw new ApiError("You need a direct manager before creating goals.", 400);

    const goalSheet =
      (input.goalSheetId
        ? await prisma.goalSheet.findUnique({ where: { id: input.goalSheetId }, include: { goals: true } })
        : null) ??
      (await prisma.goalSheet.upsert({
        where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
        update: {},
        create: {
          employeeId: user.id,
          managerId: employee.managerId,
          cycleId: cycle.id,
          status: GoalSheetStatus.DRAFT
        },
        include: { goals: true }
      }));

    if (goalSheet.employeeId !== user.id) throw new ApiError("You can only add goals to your own sheet.", 403);
    if (goalSheet.status !== GoalSheetStatus.DRAFT && goalSheet.status !== GoalSheetStatus.RETURNED) {
      throw new ApiError("Goals can only be added while the sheet is draft or returned.", 400);
    }
    if (goalSheet.goals.length >= 8) throw new ApiError("Maximum 8 goals allowed.", 400);

    const goal = await prisma.goal.create({
      data: {
        goalSheetId: goalSheet.id,
        ...normalizeGoalInput(input)
      },
      include: { thrustArea: true }
    });
    await writeAuditLog(prisma, {
      entityType: "Goal",
      entityId: goal.id,
      action: "CREATED",
      changedById: user.id,
      description: `Goal created: ${goal.title}`,
      newValue: goalAuditValue(goal)
    });
    return jsonOk({ goal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { GoalSheetStatus, type Goal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { sharedGoalInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";
import { sendSharedGoalPushedEmail } from "@/lib/mailer";

function sharedGoalData(input: ReturnType<typeof sharedGoalInputSchema.parse>) {
  const targetDate = input.uomType === "TIMELINE" && input.targetDate ? new Date(input.targetDate) : null;
  return {
    thrustAreaId: input.thrustAreaId,
    title: input.title,
    description: input.description || null,
    uomType: input.uomType,
    target: input.uomType === "ZERO_BASED" ? 0 : input.uomType === "TIMELINE" ? Number(targetDate?.getTime() ?? 0) : Number(input.target),
    targetDate,
    weightage: input.weightage,
    isShared: true,
    weightageEditable: true
  };
}

export async function GET() {
  try {
    const user = await requireUser(["ADMIN", "MANAGER"]);
    const goals = await prisma.goal.findMany({
      where:
        user.role === "ADMIN"
          ? { isShared: true }
          : { isShared: true, goalSheet: { managerId: user.id } },
      include: {
        thrustArea: true,
        goalSheet: { include: { employee: true, cycle: true } },
        sharedChildren: true
      },
      orderBy: { createdAt: "desc" }
    });
    return jsonOk({ goals });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "MANAGER"]);
    const input = await parseRequestBody(request, sharedGoalInputSchema);
    const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
    if (!cycle) throw new ApiError("No active cycle is configured.", 404);

    const employees = await prisma.user.findMany({
      where: {
        id: { in: input.employeeIds },
        role: "EMPLOYEE",
        isActive: true,
        ...(user.role === "MANAGER" ? { managerId: user.id } : {})
      }
    });
    if (employees.length === 0) throw new ApiError("No valid employees were selected.", 400);

    type SelectedEmployee = (typeof employees)[number];
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
    const seenEmployeeIds = new Set<string>();
    const orderedEmployees = input.employeeIds
      .map((id) => employeeById.get(id))
      .filter((employee): employee is SelectedEmployee => Boolean(employee))
      .filter((employee) => {
        if (seenEmployeeIds.has(employee.id)) return false;
        seenEmployeeIds.add(employee.id);
        return true;
      });

    const skipped: string[] = [];
    const pushCandidates = orderedEmployees.filter((employee) => {
      if (!employee.managerId) {
        skipped.push(`${employee.name}: no manager assigned`);
        return false;
      }
      return true;
    });

    const existingSheets =
      pushCandidates.length > 0
        ? await prisma.goalSheet.findMany({
            where: { cycleId: cycle.id, employeeId: { in: pushCandidates.map((employee) => employee.id) } }
          })
        : [];
    const lockedSheet = existingSheets.find(
      (sheet) => sheet.status === GoalSheetStatus.LOCKED || sheet.status === GoalSheetStatus.APPROVED
    );
    if (lockedSheet) throw new ApiError("Cannot push shared goals to locked goal sheets.", 400);

    const blockedSheet = existingSheets.find(
      (sheet) => sheet.status !== GoalSheetStatus.DRAFT && sheet.status !== GoalSheetStatus.RETURNED
    );
    if (blockedSheet) throw new ApiError("Shared goals can only be pushed to draft or returned goal sheets.", 400);

    const result = await prisma.$transaction(async (tx) => {
      const created: string[] = [];
      const transactionSkipped = [...skipped];
      const employeesToNotify: Array<{ email: string; name: string }> = [];
      let masterGoalId: string | null = null;

      for (const employee of pushCandidates) {
        let sheet = await tx.goalSheet.findUnique({
          where: { employeeId_cycleId: { employeeId: employee.id, cycleId: cycle.id } },
          include: { goals: true }
        });

        if (sheet?.status === GoalSheetStatus.LOCKED || sheet?.status === GoalSheetStatus.APPROVED) {
          throw new ApiError("Cannot push shared goals to locked goal sheets.", 400);
        }
        if (sheet && sheet.status !== GoalSheetStatus.DRAFT && sheet.status !== GoalSheetStatus.RETURNED) {
          throw new ApiError("Shared goals can only be pushed to draft or returned goal sheets.", 400);
        }

        sheet ??= await tx.goalSheet.create({
          data: {
            employeeId: employee.id,
            managerId: employee.managerId!,
            cycleId: cycle.id,
            status: GoalSheetStatus.DRAFT
          },
          include: { goals: true }
        });

        if (sheet.goals.length >= 8) {
          transactionSkipped.push(`${employee.name}: maximum of 8 goals reached`);
          continue;
        }

        const goal: Goal = await tx.goal.create({
          data: {
            goalSheetId: sheet.id,
            ...sharedGoalData(input),
            sharedFromGoalId: masterGoalId
          }
        });
        if (!masterGoalId) masterGoalId = goal.id;
        created.push(employee.name);
        employeesToNotify.push({ email: employee.email, name: employee.name });
      }

      await writeAuditLog(tx, {
        entityType: "Goal",
        entityId: masterGoalId || "none",
        action: "SHARED_GOAL_PUSHED",
        changedById: user.id,
        description: `Shared goal "${input.title}" pushed to ${created.length} employee(s).`,
        newValue: { input, created, skipped: transactionSkipped, masterGoalId }
      });

      return { created, skipped: transactionSkipped, masterGoalId, employeesToNotify };
    });

    await Promise.all(result.employeesToNotify.map((employee) => sendSharedGoalPushedEmail(employee, input.title, cycle.year)));

    return jsonOk({ created: result.created, skipped: result.skipped, masterGoalId: result.masterGoalId });
  } catch (error) {
    return handleApiError(error);
  }
}

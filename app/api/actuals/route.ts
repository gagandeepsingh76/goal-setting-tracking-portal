import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { computeProgressScore } from "@/lib/calculations";
import { isQuarterOpen } from "@/lib/cycle-utils";
import { actualInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    const actuals = await prisma.quarterlyActual.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : user.role === "MANAGER"
            ? { goal: { goalSheet: { managerId: user.id } } }
            : { goal: { goalSheet: { employeeId: user.id } } },
      include: { goal: { include: { goalSheet: { include: { employee: true } }, thrustArea: true } } },
      orderBy: { updatedAt: "desc" }
    });
    return jsonOk({ actuals });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["EMPLOYEE", "MANAGER"]);
    const input = await parseRequestBody(request, actualInputSchema);
    const goal = await prisma.goal.findUnique({
      where: { id: input.goalId },
      include: {
        goalSheet: { include: { cycle: true, employee: true } },
        sharedChildren: true
      }
    });
    if (!goal) throw new ApiError("Goal not found.", 404);
    if (goal.goalSheet.employeeId !== user.id) {
      throw new ApiError("Only the goal owner can update achievement actuals.", 403);
    }
    if (goal.goalSheet.status !== "APPROVED" && goal.goalSheet.status !== "LOCKED") {
      throw new ApiError("Actuals can only be updated after goals are approved.", 400);
    }
    if (!isQuarterOpen(goal.goalSheet.cycle, input.quarter, new Date())) {
      const window = {
        Q1: goal.goalSheet.cycle.q1OpensAt,
        Q2: goal.goalSheet.cycle.q2OpensAt,
        Q3: goal.goalSheet.cycle.q3OpensAt,
        Q4: goal.goalSheet.cycle.q4OpensAt
      }[input.quarter];
      throw new ApiError(`${input.quarter} update window is closed.`, 400);
    }

    const actualValue = goal.uomType === "TIMELINE" ? null : input.actualValue ?? null;
    const actualDate = goal.uomType === "TIMELINE" && input.actualDate ? new Date(input.actualDate) : null;
    const numericActual = goal.uomType === "TIMELINE" ? 0 : Number(actualValue ?? 0);
    const progressScore = computeProgressScore(goal.uomType, goal.target, numericActual, goal.targetDate, actualDate);

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.quarterlyActual.findUnique({
        where: { goalId_quarter: { goalId: goal.id, quarter: input.quarter } }
      });
      const actual = await tx.quarterlyActual.upsert({
        where: { goalId_quarter: { goalId: goal.id, quarter: input.quarter } },
        update: {
          actualValue,
          actualDate,
          status: input.status,
          progressScore
        },
        create: {
          goalId: goal.id,
          quarter: input.quarter,
          actualValue,
          actualDate,
          status: input.status,
          progressScore
        }
      });
      const childGoals =
        goal.sharedFromGoalId === null
          ? await tx.goal.findMany({ where: { sharedFromGoalId: goal.id }, select: { id: true } })
          : [];
      for (const child of childGoals) {
        await tx.quarterlyActual.upsert({
          where: { goalId_quarter: { goalId: child.id, quarter: input.quarter } },
          update: { actualValue, actualDate, status: input.status, progressScore },
          create: {
            goalId: child.id,
            quarter: input.quarter,
            actualValue,
            actualDate,
            status: input.status,
            progressScore
          }
        });
      }
      await writeAuditLog(tx, {
        entityType: "QuarterlyActual",
        entityId: actual.id,
        action: "UPDATED",
        changedById: user.id,
        description:
          childGoals.length > 0
            ? `Shared goal actual synced to ${childGoals.length} child goals.`
            : `${goal.goalSheet.employee.name} updated ${input.quarter} actuals for ${goal.title}.`,
        previousValue: previous
          ? {
              actualValue: previous.actualValue,
              actualDate: previous.actualDate,
              status: previous.status,
              progressScore: previous.progressScore
            }
          : undefined,
        newValue: { actualValue, actualDate, status: input.status, progressScore }
      });
      return { actual, syncedChildren: childGoals.length };
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}

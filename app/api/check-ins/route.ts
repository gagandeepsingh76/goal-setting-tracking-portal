import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { isQuarterOpen } from "@/lib/cycle-utils";
import { checkInInputSchema } from "@/lib/validators";
import { checkInAuditValue, writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    const checkIns = await prisma.checkIn.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : user.role === "MANAGER"
            ? { managerId: user.id }
            : { goalSheet: { employeeId: user.id } },
      include: {
        manager: true,
        goalSheet: { include: { employee: true, cycle: true } }
      },
      orderBy: { completedAt: "desc" }
    });
    return jsonOk({ checkIns });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["MANAGER", "ADMIN"]);
    const input = await parseRequestBody(request, checkInInputSchema);
    const goalSheet = await prisma.goalSheet.findUnique({
      where: { id: input.goalSheetId },
      include: { cycle: true, employee: true, goals: true }
    });
    if (!goalSheet) throw new ApiError("Goal sheet not found.", 404);
    if (user.role !== "ADMIN" && goalSheet.managerId !== user.id) {
      throw new ApiError("You can only complete check-ins for your direct subordinates.", 403);
    }
    if (!isQuarterOpen(goalSheet.cycle, input.quarter, new Date())) {
      throw new ApiError(`${input.quarter} check-in window is not currently open.`, 400);
    }

    const previous = await prisma.checkIn.findUnique({
      where: { goalSheetId_quarter: { goalSheetId: goalSheet.id, quarter: input.quarter } }
    });
    const checkIn = await prisma.checkIn.upsert({
      where: { goalSheetId_quarter: { goalSheetId: goalSheet.id, quarter: input.quarter } },
      update: { comment: input.comment, managerId: user.id, completedAt: new Date() },
      create: {
        goalSheetId: goalSheet.id,
        quarter: input.quarter,
        managerId: user.id,
        comment: input.comment,
        completedAt: new Date()
      }
    });
    await writeAuditLog(prisma, {
      entityType: "CheckIn",
      entityId: checkIn.id,
      action: "COMPLETED",
      changedById: user.id,
      description: `${input.quarter} check-in completed for ${goalSheet.employee.name}.`,
      previousValue: previous ? checkInAuditValue(previous) : undefined,
      newValue: checkInAuditValue(checkIn)
    });
    return jsonOk({ checkIn });
  } catch (error) {
    return handleApiError(error);
  }
}

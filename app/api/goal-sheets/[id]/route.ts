import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, requireUser } from "@/lib/api";
import { canManageEmployee } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const goalSheet = await prisma.goalSheet.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        manager: true,
        cycle: true,
        goals: {
          include: {
            thrustArea: true,
            quarterlyActuals: true,
            sharedChildren: true
          },
          orderBy: { createdAt: "asc" }
        },
        checkIns: { include: { manager: true }, orderBy: { completedAt: "desc" } }
      }
    });
    if (!goalSheet) throw new ApiError("Goal sheet not found.", 404);
    if (!canManageEmployee(user, goalSheet.employeeId, goalSheet.managerId)) {
      throw new ApiError("You do not have access to this goal sheet.", 403);
    }
    return jsonOk({ goalSheet });
  } catch (error) {
    return handleApiError(error);
  }
}

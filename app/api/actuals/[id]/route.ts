import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, requireUser } from "@/lib/api";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const actual = await prisma.quarterlyActual.findUnique({
      where: { id: params.id },
      include: { goal: { include: { goalSheet: true, thrustArea: true } } }
    });
    if (!actual) throw new ApiError("Actual record not found.", 404);
    const canAccess =
      user.role === "ADMIN" ||
      actual.goal.goalSheet.employeeId === user.id ||
      (user.role === "MANAGER" && actual.goal.goalSheet.managerId === user.id);
    if (!canAccess) throw new ApiError("You do not have access to this actual record.", 403);
    return jsonOk({ actual });
  } catch (error) {
    return handleApiError(error);
  }
}

import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { cycleInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

function cycleData(input: ReturnType<typeof cycleInputSchema.parse>) {
  return {
    year: input.year,
    name: input.name,
    goalSettingOpensAt: new Date(input.goalSettingOpensAt),
    goalSettingClosesAt: new Date(input.goalSettingClosesAt),
    q1OpensAt: new Date(input.q1OpensAt),
    q1ClosesAt: new Date(input.q1ClosesAt),
    q2OpensAt: new Date(input.q2OpensAt),
    q2ClosesAt: new Date(input.q2ClosesAt),
    q3OpensAt: new Date(input.q3OpensAt),
    q3ClosesAt: new Date(input.q3ClosesAt),
    q4OpensAt: new Date(input.q4OpensAt),
    q4ClosesAt: new Date(input.q4ClosesAt),
    isActive: input.isActive ?? false
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const cycle = await prisma.cycle.findUnique({
      where: { id: params.id },
      include: { _count: { select: { goalSheets: true } } }
    });
    if (!cycle) throw new ApiError("Cycle not found.", 404);
    return jsonOk({ cycle });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, cycleInputSchema);
    const previous = await prisma.cycle.findUnique({
      where: { id: params.id },
      include: { goalSheets: true }
    });
    if (!previous) throw new ApiError("Cycle not found.", 404);
    if (previous.goalSheets.length > 0 && !input.isActive) {
      throw new ApiError("Cycle dates cannot be edited after goal sheets have been created.", 400);
    }

    const data = cycleData(input);
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isActive) await tx.cycle.updateMany({ where: { isActive: true, id: { not: params.id } }, data: { isActive: false } });
      return tx.cycle.update({ where: { id: params.id }, data });
    });
    await writeAuditLog(prisma, {
      entityType: "Cycle",
      entityId: updated.id,
      action: data.isActive ? "ACTIVATED" : "UPDATED",
      changedById: user.id,
      description: data.isActive ? `Cycle activated: ${updated.name}` : `Cycle updated: ${updated.name}`,
      previousValue: previous,
      newValue: updated
    });
    return jsonOk({ cycle: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

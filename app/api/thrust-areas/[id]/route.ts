import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { thrustAreaInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, thrustAreaInputSchema);
    const previous = await prisma.thrustArea.findUnique({ where: { id: params.id } });
    if (!previous) throw new ApiError("Thrust area not found.", 404);
    const updated = await prisma.thrustArea.update({
      where: { id: params.id },
      data: {
        name: input.name,
        description: input.description || null,
        isActive: input.isActive ?? previous.isActive
      }
    });
    await writeAuditLog(prisma, {
      entityType: "ThrustArea",
      entityId: updated.id,
      action: "UPDATED",
      changedById: user.id,
      description: `Thrust area updated: ${updated.name}`,
      previousValue: previous,
      newValue: updated
    });
    return jsonOk({ thrustArea: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(["ADMIN"]);
    const previous = await prisma.thrustArea.findUnique({
      where: { id: params.id },
      include: { goals: true }
    });
    if (!previous) throw new ApiError("Thrust area not found.", 404);
    const updated = await prisma.thrustArea.update({
      where: { id: params.id },
      data: { isActive: false }
    });
    await writeAuditLog(prisma, {
      entityType: "ThrustArea",
      entityId: updated.id,
      action: previous.goals.length > 0 ? "DEACTIVATED" : "DELETED",
      changedById: user.id,
      description: `Thrust area deactivated: ${updated.name}`,
      previousValue: previous,
      newValue: updated
    });
    return jsonOk({ thrustArea: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

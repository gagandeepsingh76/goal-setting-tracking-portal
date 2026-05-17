import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { userInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(["ADMIN"]);
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { manager: true, _count: { select: { goalSheets: true } } }
    });
    if (!user) throw new ApiError("User not found.", 404);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, userInputSchema);
    const previous = await prisma.user.findUnique({ where: { id: params.id } });
    if (!previous) throw new ApiError("User not found.", 404);

    const data: Record<string, unknown> = {
      name: input.name,
      role: input.role,
      department: input.department,
      managerId: input.managerId || null,
      isActive: input.isActive ?? previous.isActive
    };
    if (input.password) data.password = await bcrypt.hash(input.password, 12);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data
    });
    await writeAuditLog(prisma, {
      entityType: "User",
      entityId: updated.id,
      action: "UPDATED",
      changedById: actor.id,
      description: `User updated: ${updated.email}`,
      previousValue: { ...previous, password: "[redacted]" },
      newValue: { ...updated, password: "[redacted]" }
    });
    return jsonOk({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser(["ADMIN"]);
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { goalSheets: { include: { cycle: true } } }
    });
    if (!user) throw new ApiError("User not found.", 404);
    if (user.goalSheets.length > 0) {
      const cycleName = user.goalSheets[0]?.cycle.name || "an active cycle";
      throw new ApiError(
        `Cannot delete user: they have existing goal data for ${cycleName}. You can deactivate the account instead.`,
        400
      );
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await writeAuditLog(prisma, {
      entityType: "User",
      entityId: user.id,
      action: "DEACTIVATED",
      changedById: actor.id,
      description: `User deactivated: ${user.email}`,
      previousValue: { ...user, password: "[redacted]" },
      newValue: { ...updated, password: "[redacted]" }
    });
    return jsonOk({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

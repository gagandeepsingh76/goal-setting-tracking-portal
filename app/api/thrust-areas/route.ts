import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { thrustAreaInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireUser();
    const thrustAreas = await prisma.thrustArea.findMany({
      where: { isActive: true },
      include: { _count: { select: { goals: true } } },
      orderBy: { name: "asc" }
    });
    return jsonOk({ thrustAreas });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, thrustAreaInputSchema);
    const created = await prisma.thrustArea.create({
      data: {
        name: input.name,
        description: input.description || null,
        isActive: input.isActive ?? true
      }
    });
    await writeAuditLog(prisma, {
      entityType: "ThrustArea",
      entityId: created.id,
      action: "CREATED",
      changedById: user.id,
      description: `Thrust area created: ${created.name}`,
      newValue: created
    });
    return jsonOk({ thrustArea: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

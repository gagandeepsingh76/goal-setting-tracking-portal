import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
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

export async function GET() {
  try {
    await requireUser();
    const cycles = await prisma.cycle.findMany({
      include: { _count: { select: { goalSheets: true } } },
      orderBy: { year: "desc" }
    });
    return jsonOk({ cycles });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, cycleInputSchema);
    const data = cycleData(input);
    const created = await prisma.$transaction(async (tx) => {
      if (data.isActive) await tx.cycle.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.cycle.create({ data });
    });
    await writeAuditLog(prisma, {
      entityType: "Cycle",
      entityId: created.id,
      action: "CREATED",
      changedById: user.id,
      description: `Cycle created: ${created.name}`,
      newValue: created
    });
    return jsonOk({ cycle: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

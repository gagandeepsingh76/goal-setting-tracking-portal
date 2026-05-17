import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, requireUser } from "@/lib/api";
import { escalationRuleInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireUser(["ADMIN"]);
    const rules = await prisma.escalationRule.findMany({ orderBy: { createdAt: "desc" } });
    return jsonOk({ rules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, escalationRuleInputSchema);
    const created = await prisma.escalationRule.create({
      data: {
        name: input.name,
        triggerType: input.triggerType,
        daysAfterTrigger: input.daysAfterTrigger,
        isActive: input.isActive ?? true
      }
    });
    await writeAuditLog(prisma, {
      entityType: "EscalationRule",
      entityId: created.id,
      action: "CREATED",
      changedById: user.id,
      description: `Escalation rule created: ${created.name}`,
      newValue: created
    });
    return jsonOk({ rule: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, escalationRuleInputSchema);
    if (!input.id) throw new ApiError("Rule id is required.", 400);
    const previous = await prisma.escalationRule.findUnique({ where: { id: input.id } });
    if (!previous) throw new ApiError("Escalation rule not found.", 404);
    const updated = await prisma.escalationRule.update({
      where: { id: input.id },
      data: {
        name: input.name,
        triggerType: input.triggerType,
        daysAfterTrigger: input.daysAfterTrigger,
        isActive: input.isActive ?? previous.isActive
      }
    });
    await writeAuditLog(prisma, {
      entityType: "EscalationRule",
      entityId: updated.id,
      action: "UPDATED",
      changedById: user.id,
      description: `Escalation rule updated: ${updated.name}`,
      previousValue: previous,
      newValue: updated
    });
    return jsonOk({ rule: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

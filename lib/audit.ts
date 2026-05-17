import type { Prisma, PrismaClient } from "@prisma/client";

export async function writeAuditLog(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    entityType: string;
    entityId: string;
    action: string;
    changedById: string;
    description: string;
    previousValue?: object | null;
    newValue?: object | null;
  }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changedById: params.changedById,
      description: params.description,
      previousValue: params.previousValue ?? undefined,
      newValue: params.newValue ?? undefined
    }
  });
}

export function goalSheetAuditValue(sheet: { status: string; updatedAt: Date; lockedAt?: Date | null }) {
  return { status: sheet.status, updatedAt: sheet.updatedAt, lockedAt: sheet.lockedAt ?? null };
}

export function goalAuditValue(goal: { title: string; target: number; weightage: number; uomType: string }) {
  return { title: goal.title, target: goal.target, weightage: goal.weightage, uomType: goal.uomType };
}

export function userAuditValue(user: { name: string; role: string; department: string }) {
  return { name: user.name, role: user.role, department: user.department };
}

export function checkInAuditValue(checkIn: { quarter: string; comment: string; completedAt: Date }) {
  return { quarter: checkIn.quarter, comment: checkIn.comment, completedAt: checkIn.completedAt };
}

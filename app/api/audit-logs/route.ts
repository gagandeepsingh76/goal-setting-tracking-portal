import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk, parseSearchParams, requireUser } from "@/lib/api";
import { rowsToWorkbookBuffer, workbookResponse } from "@/lib/export";
import { formatDateTime } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireUser(["ADMIN"]);
    const searchParams = parseSearchParams(request);
    const where = {
      entityType: searchParams.get("entityType") || undefined,
      action: searchParams.get("action") || undefined,
      changedById: searchParams.get("userId") || undefined,
      createdAt: {
        gte: searchParams.get("from") ? new Date(String(searchParams.get("from"))) : undefined,
        lte: searchParams.get("to") ? new Date(String(searchParams.get("to"))) : undefined
      }
    };
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 50);
    const logs = await prisma.auditLog.findMany({
      where,
      include: { changedBy: true },
      orderBy: { createdAt: "desc" },
      skip: searchParams.get("format") === "xlsx" ? undefined : (page - 1) * pageSize,
      take: searchParams.get("format") === "xlsx" ? undefined : pageSize
    });

    if (searchParams.get("format") === "xlsx") {
      const rows = logs.map((log) => ({
        Timestamp: formatDateTime(log.createdAt),
        "Changed By": log.changedBy.name,
        "Entity Type": log.entityType,
        "Entity ID": log.entityId,
        Action: log.action,
        Description: log.description
      }));
      return workbookResponse("audit-logs.xlsx", rowsToWorkbookBuffer("Audit Logs", rows));
    }

    const total = await prisma.auditLog.count({ where });
    return jsonOk({ logs, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

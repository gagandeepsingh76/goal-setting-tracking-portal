import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, jsonOk, parseRequestBody, parseSearchParams, requireUser } from "@/lib/api";
import { userInputSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    await requireUser(["ADMIN"]);
    const searchParams = parseSearchParams(request);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 25);
    const [users, total, managers] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: searchParams.get("all") === "true" ? undefined : true },
        include: { manager: true, _count: { select: { goalSheets: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.user.count({ where: { isActive: searchParams.get("all") === "true" ? undefined : true } }),
      prisma.user.findMany({ where: { role: "MANAGER", isActive: true }, orderBy: { name: "asc" } })
    ]);
    return jsonOk({ users, managers, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN"]);
    const input = await parseRequestBody(request, userInputSchema.extend({ email: userInputSchema.shape.email.unwrap() }));
    if (!input.password) throw new ApiError("Password is required when creating a user.", 400);
    const hashed = await bcrypt.hash(input.password, 12);
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashed,
        role: input.role,
        department: input.department,
        managerId: input.managerId || null,
        isActive: input.isActive ?? true
      }
    });
    await writeAuditLog(prisma, {
      entityType: "User",
      entityId: created.id,
      action: "CREATED",
      changedById: user.id,
      description: `User created: ${created.email}`,
      newValue: { ...created, password: "[redacted]" }
    });
    return jsonOk({ user: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

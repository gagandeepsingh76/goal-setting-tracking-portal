import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { auth } from "@/lib/auth";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(roles?: Array<"EMPLOYEE" | "MANAGER" | "ADMIN">) {
  const session = await auth();
  if (!session?.user) throw new ApiError("You must be signed in to access this resource.", 401);
  if (roles && !roles.includes(session.user.role)) {
    throw new ApiError("You do not have permission to perform this action.", 403);
  }
  return session.user;
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function zodMessage(error: ZodError) {
  return error.issues[0]?.message || "Invalid request payload.";
}

export async function parseRequestBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("Invalid JSON payload.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(zodMessage(parsed.error), 400);
  }
  return parsed.data;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return jsonError(error.message, error.status);
  if (error instanceof ZodError) return jsonError(zodMessage(error), 400);
  if (error instanceof Error) return jsonError(error.message, 500);
  return jsonError("Unexpected server error.", 500);
}

export function parseSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}

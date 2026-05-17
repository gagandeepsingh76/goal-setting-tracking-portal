import type { Session } from "next-auth";

type User = Session["user"];

export function canManageEmployee(user: User, employeeId: string, managerId?: string | null) {
  return user.role === "ADMIN" || (user.role === "MANAGER" && managerId === user.id) || employeeId === user.id;
}

export function canReviewSheet(user: User, managerId: string) {
  return user.role === "ADMIN" || (user.role === "MANAGER" && managerId === user.id);
}

export function canEditOwnGoals(user: User, employeeId: string) {
  return user.role === "EMPLOYEE" && employeeId === user.id;
}

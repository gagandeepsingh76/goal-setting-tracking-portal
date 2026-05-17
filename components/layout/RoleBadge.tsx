import { Badge } from "@/components/ui/badge";

export function RoleBadge({ role }: { role: "EMPLOYEE" | "MANAGER" | "ADMIN" }) {
  if (role === "ADMIN") return <Badge variant="danger">Admin</Badge>;
  if (role === "MANAGER") return <Badge variant="purple">Manager</Badge>;
  return <Badge variant="default">Employee</Badge>;
}

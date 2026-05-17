import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AuditLogTable } from "@/components/admin/AuditLogTable";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams: { entityType?: string; action?: string; userId?: string; from?: string; to?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const where = {
    entityType: searchParams.entityType || undefined,
    action: searchParams.action || undefined,
    changedById: searchParams.userId || undefined,
    createdAt: {
      gte: searchParams.from ? new Date(searchParams.from) : undefined,
      lte: searchParams.to ? new Date(searchParams.to) : undefined
    }
  };
  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { changedBy: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({ orderBy: { name: "asc" } })
  ]);
  const query = new URLSearchParams(Object.entries(searchParams).filter(([, value]) => value) as string[][]);
  query.set("format", "xlsx");

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Review workflow changes, compare before and after values, and export evidence for governance.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/api/audit-logs?${query.toString()}`}>
            <Download className="h-4 w-4" />
            Export to Excel
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <Input name="entityType" placeholder="Entity type" defaultValue={searchParams.entityType || ""} />
            <Input name="action" placeholder="Action" defaultValue={searchParams.action || ""} />
            <Select name="userId" defaultValue={searchParams.userId || ""}>
              <option value="">All users</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </Select>
            <Input type="date" name="from" defaultValue={searchParams.from || ""} />
            <Button>Apply</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent Changes</CardTitle></CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}

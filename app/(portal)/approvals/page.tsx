import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { totalWeightage } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  const sheets = activeCycle
    ? await prisma.goalSheet.findMany({
        where: {
          cycleId: activeCycle.id,
          status: "SUBMITTED",
          ...(user.role === "ADMIN" ? {} : { managerId: user.id })
        },
        include: { employee: true, goals: true },
        orderBy: { submittedAt: "asc" }
      })
    : [];

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="page-subtitle">Review submitted goal sheets, tune manager-owned targets, and complete approval decisions.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Submitted Goal Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead>Total Weightage</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell>{sheet.employee.name}</TableCell>
                  <TableCell>{formatDate(sheet.submittedAt)}</TableCell>
                  <TableCell>{sheet.goals.length}</TableCell>
                  <TableCell>{totalWeightage(sheet.goals)}%</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/approvals/${sheet.id}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState icon={ClipboardCheck} title="No pending approvals" description="Submitted goal sheets will appear here as soon as employees send them for review." />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

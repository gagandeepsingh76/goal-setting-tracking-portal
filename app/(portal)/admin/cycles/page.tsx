import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const cycles = await prisma.cycle.findMany({ include: { _count: { select: { goalSheets: true } } }, orderBy: { year: "desc" } });
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Cycles</h1>
          <p className="page-subtitle">Configure the yearly goal-setting and quarterly achievement windows.</p>
        </div>
        <Button asChild>
          <Link href="/admin/cycles/new">
            <Plus className="h-4 w-4" />
            New Cycle
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Cycle Windows</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Goal Setting</TableHead>
                <TableHead>Q1</TableHead>
                <TableHead>Q2</TableHead>
                <TableHead>Q3</TableHead>
                <TableHead>Q4</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell><Link className="font-medium text-primary" href={`/admin/cycles/${cycle.id}`}>{cycle.name}</Link></TableCell>
                  <TableCell>{formatDate(cycle.goalSettingOpensAt)} - {formatDate(cycle.goalSettingClosesAt)}</TableCell>
                  <TableCell>{formatDate(cycle.q1OpensAt)} - {formatDate(cycle.q1ClosesAt)}</TableCell>
                  <TableCell>{formatDate(cycle.q2OpensAt)} - {formatDate(cycle.q2ClosesAt)}</TableCell>
                  <TableCell>{formatDate(cycle.q3OpensAt)} - {formatDate(cycle.q3ClosesAt)}</TableCell>
                  <TableCell>{formatDate(cycle.q4OpensAt)} - {formatDate(cycle.q4ClosesAt)}</TableCell>
                  <TableCell><Badge variant={cycle.isActive ? "success" : "secondary"}>{cycle.isActive ? "Active" : `${cycle._count.goalSheets} sheets`}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

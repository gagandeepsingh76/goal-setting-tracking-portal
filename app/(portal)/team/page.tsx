import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import type { Quarter } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveQuarter } from "@/lib/cycle-utils";
import { weightedAverageForQuarter } from "@/lib/calculations";
import { roundScore } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  const activeQuarter = cycle ? getActiveQuarter(cycle, new Date()) : null;
  const sheets = cycle
    ? await prisma.goalSheet.findMany({
        where: {
          cycleId: cycle.id,
          ...(user.role === "ADMIN" ? {} : { managerId: user.id })
        },
        include: {
          employee: true,
          goals: { include: { quarterlyActuals: true } },
          checkIns: true
        },
        orderBy: { employee: { name: "asc" } }
      })
    : [];
  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">My Team</h1>
          <p className="page-subtitle">Track team achievement, quarter scores, and current check-in completion in one place.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Team Check-in Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Goals</TableHead>
                {quarters.map((quarter) => (
                  <TableHead key={quarter}>{quarter} Score</TableHead>
                ))}
                <TableHead>Current Check-in</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.map((sheet) => {
                const done = activeQuarter ? sheet.checkIns.some((checkIn) => checkIn.quarter === activeQuarter) : false;
                return (
                  <TableRow key={sheet.id}>
                    <TableCell>{sheet.employee.name}</TableCell>
                    <TableCell>{sheet.goals.length}</TableCell>
                    {quarters.map((quarter) => (
                      <TableCell key={quarter}>{roundScore(weightedAverageForQuarter(sheet.goals, quarter))}</TableCell>
                    ))}
                    <TableCell>
                      <Badge variant={done ? "success" : "warning"}>{done ? "Done" : "Not Done"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/team/${sheet.id}/checkin`}>Check-in</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState icon={Users} title="No team goal sheets found" description="Team members with active-cycle goal sheets will appear here." />
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

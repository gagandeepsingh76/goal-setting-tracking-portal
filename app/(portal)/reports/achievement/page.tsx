import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AchievementTable } from "@/components/reports/AchievementTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AchievementReportPage({
  searchParams
}: {
  searchParams: { cycleId?: string; department?: string; quarter?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [cycles, users] = await Promise.all([
    prisma.cycle.findMany({ orderBy: { year: "desc" } }),
    prisma.user.findMany({ where: { role: "EMPLOYEE" }, select: { department: true } })
  ]);
  const query = new URLSearchParams();
  if (searchParams.cycleId) query.set("cycleId", searchParams.cycleId);
  if (searchParams.department) query.set("department", searchParams.department);
  if (searchParams.quarter) query.set("quarter", searchParams.quarter);
  const departments = Array.from(new Set(users.map((user) => user.department)));
  query.set("format", "xlsx");

  // Server-side fetch cannot forward auth cookies here, so query Prisma directly through the API logic's result shape.
  const directQuery = new URLSearchParams(Object.entries(searchParams).filter(([, value]) => value) as string[][]);
  const apiRows = await getAchievementRows(session.user, directQuery);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Achievement Report</h1>
          <p className="page-subtitle">Analyze goals, quarter actuals, and weighted scores across cycles and departments.</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4">
            <Select name="cycleId" defaultValue={searchParams.cycleId || ""}>
              <option value="">Active Cycle</option>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
            </Select>
            <Select name="department" defaultValue={searchParams.department || ""}>
              <option value="">All Departments</option>
              {departments.map((department) => <option key={department}>{department}</option>)}
            </Select>
            <Select name="quarter" defaultValue={searchParams.quarter || "All"}>
              <option value="All">All Quarters</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </Select>
            <Button>Apply</Button>
          </form>
        </CardContent>
      </Card>
      <AchievementTable rows={apiRows} exportUrl={`/api/reports/achievement?${query.toString()}`} />
    </div>
  );
}

async function getAchievementRows(user: any, params: URLSearchParams) {
  const { formatDate, roundScore } = await import("@/lib/utils");
  const cycleId = params.get("cycleId") || undefined;
  const department = params.get("department") || undefined;
  const quarter = params.get("quarter") as any;
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  const finalCycleId = cycleId || activeCycle?.id;
  const sheets = await prisma.goalSheet.findMany({
    where: {
      cycleId: finalCycleId,
      employee: { department },
      ...(user.role === "EMPLOYEE" ? { employeeId: user.id } : {}),
      ...(user.role === "MANAGER" ? { OR: [{ employeeId: user.id }, { managerId: user.id }] } : {})
    },
    include: {
      employee: true,
      manager: true,
      goals: { include: { thrustArea: true, quarterlyActuals: true }, orderBy: { createdAt: "asc" } }
    }
  });
  const quarters = quarter && quarter !== "All" ? [quarter] : ["Q1", "Q2", "Q3", "Q4"];
  return sheets.flatMap((sheet) =>
    sheet.goals.map((goal) => {
      const weightedAverage = quarters.reduce((sum: number, currentQuarter: any) => {
        const actual = goal.quarterlyActuals.find((item) => item.quarter === currentQuarter);
        return sum + (actual?.progressScore ?? 0) * (goal.weightage / 100);
      }, 0);
      const actualDisplay = (q: any) => {
        const actual = goal.quarterlyActuals.find((item) => item.quarter === q);
        if (!actual) return "";
        return goal.uomType === "TIMELINE" ? formatDate(actual.actualDate) : actual.actualValue ?? "";
      };
      const score = (q: any) => roundScore(goal.quarterlyActuals.find((item) => item.quarter === q)?.progressScore);
      return {
        "Employee Name": sheet.employee.name,
        Department: sheet.employee.department,
        Manager: sheet.manager.name,
        "Goal Title": goal.title,
        "Thrust Area": goal.thrustArea.name,
        UoM: goal.uomType,
        Target: goal.uomType === "TIMELINE" ? formatDate(goal.targetDate) : goal.target,
        "Q1 Actual": actualDisplay("Q1"),
        "Q1 Score": score("Q1"),
        "Q2 Actual": actualDisplay("Q2"),
        "Q2 Score": score("Q2"),
        "Q3 Actual": actualDisplay("Q3"),
        "Q3 Score": score("Q3"),
        "Q4 Actual": actualDisplay("Q4"),
        "Q4 Score": score("Q4"),
        "Weighted Average Score": roundScore(weightedAverage)
      };
    })
  );
}

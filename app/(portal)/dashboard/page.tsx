import { redirect } from "next/navigation";
import { Activity, CalendarDays, CheckCircle2, ClipboardCheck, Gauge, Target, Trophy, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveQuarter } from "@/lib/cycle-utils";
import { weightedAverageForQuarter } from "@/lib/calculations";
import { Card, CardContent } from "@/components/ui/card";
import { roundScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  const activeQuarter = activeCycle ? getActiveQuarter(activeCycle, new Date()) : null;

  if (user.role === "ADMIN") {
    const [totalUsers, pendingApprovals, approvedSheets, employeeCount] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      activeCycle ? prisma.goalSheet.count({ where: { cycleId: activeCycle.id, status: "SUBMITTED" } }) : 0,
      activeCycle ? prisma.goalSheet.count({ where: { cycleId: activeCycle.id, status: { in: ["APPROVED", "LOCKED"] } } }) : 0,
      prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } })
    ]);
    return (
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Portfolio-wide goal readiness, cycle health, and approval throughput.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Total Users" value={String(totalUsers)} icon={Users} tone="blue" />
          <Metric title="Active Cycle" value={activeCycle?.name || "Not set"} icon={CalendarDays} tone="teal" />
          <Metric title="Completion Rate" value={`${employeeCount ? Math.round((approvedSheets / employeeCount) * 100) : 0}%`} icon={CheckCircle2} tone="emerald" />
          <Metric title="Pending Approvals" value={String(pendingApprovals)} icon={ClipboardCheck} tone="amber" />
        </div>
      </div>
    );
  }

  if (user.role === "MANAGER") {
    const sheets = activeCycle
      ? await prisma.goalSheet.findMany({
          where: { cycleId: activeCycle.id, managerId: user.id },
          include: { goals: { include: { quarterlyActuals: true } }, checkIns: true }
        })
      : [];
    const pending = sheets.filter((sheet) => sheet.status === "SUBMITTED").length;
    const checkInsDone = activeQuarter
      ? sheets.filter((sheet) => sheet.checkIns.some((checkIn) => checkIn.quarter === activeQuarter)).length
      : 0;
    const average =
      activeQuarter && sheets.length
        ? sheets.reduce((sum, sheet) => sum + weightedAverageForQuarter(sheet.goals, activeQuarter), 0) / sheets.length
        : null;
    return (
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <h1 className="page-title">Manager Dashboard</h1>
            <p className="page-subtitle">A focused view of approvals, check-ins, and current quarter team achievement.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Pending Approvals" value={String(pending)} icon={ClipboardCheck} tone="amber" />
          <Metric title="Current Quarter" value={activeQuarter || "Closed"} icon={CalendarDays} tone="blue" />
          <Metric title="Check-ins Done" value={activeQuarter ? `${checkInsDone}/${sheets.length}` : "N/A"} icon={CheckCircle2} tone="emerald" />
          <Metric title="Team Average Score" value={average == null ? "N/A" : roundScore(average)} icon={Trophy} tone="teal" />
        </div>
      </div>
    );
  }

  const sheet = activeCycle
    ? await prisma.goalSheet.findUnique({
        where: { employeeId_cycleId: { employeeId: user.id, cycleId: activeCycle.id } },
        include: { goals: { include: { quarterlyActuals: true } } }
      })
    : null;
  const score = sheet && activeQuarter ? weightedAverageForQuarter(sheet.goals, activeQuarter) : null;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Employee Dashboard</h1>
          <p className="page-subtitle">Your goal sheet status, quarter window, and latest weighted performance signal.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Goal Sheet Status" value={sheet?.status || "NOT_STARTED"} icon={Target} tone="blue" />
        <Metric title="Current Quarter" value={activeQuarter || "Closed"} icon={CalendarDays} tone="amber" />
        <Metric title="Weighted Score" value={score == null ? "N/A" : roundScore(score)} icon={Gauge} tone="emerald" />
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon = Activity,
  tone = "blue"
}: {
  title: string;
  value: string;
  icon?: typeof Activity;
  tone?: "blue" | "teal" | "emerald" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/12 dark:text-teal-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300"
  };
  return (
    <Card className="focus-card overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 truncate text-2xl font-semibold tracking-normal">{value}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

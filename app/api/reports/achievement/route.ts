import { Quarter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk, parseSearchParams, requireUser } from "@/lib/api";
import { rowsToWorkbookBuffer, workbookResponse } from "@/lib/export";
import { formatDate, roundScore } from "@/lib/utils";

function actualDisplay(goal: { uomType: string; quarterlyActuals: Array<{ quarter: Quarter; actualValue: number | null; actualDate: Date | null }> }, quarter: Quarter) {
  const actual = goal.quarterlyActuals.find((item) => item.quarter === quarter);
  if (!actual) return "";
  if (goal.uomType === "TIMELINE") return formatDate(actual.actualDate);
  return actual.actualValue ?? "";
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const searchParams = parseSearchParams(request);
    const cycleId = searchParams.get("cycleId") || undefined;
    const department = searchParams.get("department") || undefined;
    const quarter = searchParams.get("quarter") as Quarter | "All" | null;
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
        cycle: true,
        goals: {
          include: {
            thrustArea: true,
            quarterlyActuals: true
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { employee: { name: "asc" } }
    });

    const quarters: Quarter[] = quarter && quarter !== "All" ? [quarter] : ["Q1", "Q2", "Q3", "Q4"];
    const rows = sheets.flatMap((sheet) =>
      sheet.goals.map((goal) => {
        const weightedAverage = quarters.reduce((sum, currentQuarter) => {
          const actual = goal.quarterlyActuals.find((item) => item.quarter === currentQuarter);
          return sum + (actual?.progressScore ?? 0) * (goal.weightage / 100);
        }, 0);
        return {
          "Employee Name": sheet.employee.name,
          Department: sheet.employee.department,
          Manager: sheet.manager.name,
          "Goal Title": goal.title,
          "Thrust Area": goal.thrustArea.name,
          UoM: goal.uomType,
          Target: goal.uomType === "TIMELINE" ? formatDate(goal.targetDate) : goal.target,
          "Q1 Actual": actualDisplay(goal, "Q1"),
          "Q1 Score": roundScore(goal.quarterlyActuals.find((item) => item.quarter === "Q1")?.progressScore),
          "Q2 Actual": actualDisplay(goal, "Q2"),
          "Q2 Score": roundScore(goal.quarterlyActuals.find((item) => item.quarter === "Q2")?.progressScore),
          "Q3 Actual": actualDisplay(goal, "Q3"),
          "Q3 Score": roundScore(goal.quarterlyActuals.find((item) => item.quarter === "Q3")?.progressScore),
          "Q4 Actual": actualDisplay(goal, "Q4"),
          "Q4 Score": roundScore(goal.quarterlyActuals.find((item) => item.quarter === "Q4")?.progressScore),
          "Weighted Average Score": roundScore(weightedAverage)
        };
      })
    );

    if (searchParams.get("format") === "xlsx") {
      return workbookResponse("achievement-report.xlsx", rowsToWorkbookBuffer("Achievement", rows));
    }
    return jsonOk({ rows });
  } catch (error) {
    return handleApiError(error);
  }
}

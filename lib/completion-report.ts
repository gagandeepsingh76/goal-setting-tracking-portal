import type { Quarter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export async function getCompletionReport(user: { id: string; role: "EMPLOYEE" | "MANAGER" | "ADMIN" }) {
  if (user.role === "EMPLOYEE") throw new ApiError("You do not have permission to perform this action.", 403);
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!activeCycle) throw new ApiError("No active cycle", 400);

  const employees = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
      isActive: true,
      ...(user.role === "MANAGER" ? { managerId: user.id } : {})
    },
    include: {
      manager: true,
      goalSheets: {
        where: { cycleId: activeCycle.id },
        include: {
          employee: { select: { id: true, name: true, email: true, department: true } },
          manager: { select: { id: true, name: true, email: true } },
          goals: { include: { thrustArea: true, quarterlyActuals: true } },
          checkIns: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  const goalSetting = employees.map((employee) => {
    const sheet = employee.goalSheets[0];
    return {
      employeeId: employee.id,
      employeeName: employee.name ?? "Unknown Employee",
      department: employee.department ?? "-",
      managerName: employee.manager?.name ?? "No Manager Assigned",
      status: sheet?.status ?? "NOT_STARTED",
      submittedAt: sheet?.submittedAt ?? null,
      approvedAt: sheet?.approvedAt ?? null
    };
  });

  const approvedSheets = await prisma.goalSheet.findMany({
    where: {
      cycleId: activeCycle.id,
      status: { in: ["LOCKED", "APPROVED"] },
      ...(user.role === "MANAGER" ? { managerId: user.id } : {})
    },
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      manager: { select: { id: true, name: true, email: true } },
      goals: { include: { thrustArea: true, quarterlyActuals: true } },
      checkIns: true
    },
    orderBy: { employee: { name: "asc" } }
  });

  const checkIns = Object.fromEntries(
    quarters.map((quarter) => {
      const groups = new Map<
        string,
        {
          managerId: string;
          managerName: string;
          total: number;
          completed: number;
          pending: number;
          sheets: Array<{ sheetId: string; employeeId: string; employeeName: string; done: boolean }>;
        }
      >();
      for (const sheet of approvedSheets) {
        const group =
          groups.get(sheet.managerId) ??
          {
            managerId: sheet.managerId,
            managerName: sheet.manager?.name ?? "No Manager Assigned",
            total: 0,
            completed: 0,
            pending: 0,
            sheets: []
          };
        const done = sheet.checkIns.some((checkIn) => checkIn.quarter === quarter);
        group.total++;
        if (done) group.completed++;
        else group.pending++;
        group.sheets.push({
          sheetId: sheet.id,
          employeeId: sheet.employeeId,
          employeeName: sheet.employee?.name ?? "Unknown Employee",
          done
        });
        groups.set(sheet.managerId, group);
      }
      return [quarter, Array.from(groups.values())];
    })
  );

  return { cycle: activeCycle, goalSetting, checkIns };
}

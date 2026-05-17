import { prisma } from "@/lib/prisma";
import { getActiveQuarter, getQuarterOpenDate } from "@/lib/cycle-utils";
import { sendEscalationEmail } from "@/lib/mailer";
import { writeAuditLog } from "@/lib/audit";

export async function runEscalationCheck(changedById: string, now = new Date()) {
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!activeCycle) return { error: "No active cycle", employeesNotified: 0, managersNotified: 0, log: [] };

  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } });
  let employeesNotified = 0;
  let managersNotified = 0;
  const log: string[] = [];

  for (const rule of rules) {
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() - rule.daysAfterTrigger);

    if (rule.triggerType === "GOAL_NOT_SUBMITTED") {
      if (activeCycle.goalSettingOpensAt > thresholdDate) continue;
      const employeesWithoutSubmission = await prisma.user.findMany({
        where: {
          role: "EMPLOYEE",
          isActive: true,
          OR: [
            { goalSheets: { none: { cycleId: activeCycle.id } } },
            { goalSheets: { some: { cycleId: activeCycle.id, status: "DRAFT" } } },
            { goalSheets: { some: { cycleId: activeCycle.id, status: "RETURNED" } } }
          ]
        },
        include: { manager: true }
      });
      for (const emp of employeesWithoutSubmission) {
        await sendEscalationEmail(
          emp.email,
          "Goal Submission Reminder",
          `Dear ${emp.name}, you have not submitted your goals for ${activeCycle.name}. Please submit immediately.`
        );
        if (emp.manager) {
          await sendEscalationEmail(
            emp.manager.email,
            "Team Member Goal Not Submitted",
            `${emp.name} has not submitted goals. Please follow up.`
          );
          managersNotified++;
        }
        await writeAuditLog(prisma, {
          entityType: "User",
          entityId: emp.id,
          action: "ESCALATION_TRIGGERED",
          changedById,
          description: `Escalation: goal not submitted by ${emp.name}`,
          newValue: { triggerType: rule.triggerType, cycleId: activeCycle.id, userId: emp.id }
        });
        employeesNotified++;
        log.push(`GOAL_NOT_SUBMITTED: ${emp.name} (${emp.email})`);
      }
    }

    if (rule.triggerType === "GOAL_NOT_APPROVED") {
      const pendingSheets = await prisma.goalSheet.findMany({
        where: {
          cycleId: activeCycle.id,
          status: "SUBMITTED",
          submittedAt: { lte: thresholdDate }
        },
        include: { employee: true, manager: true }
      });
      for (const sheet of pendingSheets) {
        await sendEscalationEmail(
          sheet.manager.email,
          "Pending Goal Approval Reminder",
          `${sheet.employee.name} submitted goals on ${sheet.submittedAt?.toDateString()} and is awaiting your approval.`
        );
        await writeAuditLog(prisma, {
          entityType: "GoalSheet",
          entityId: sheet.id,
          action: "ESCALATION_TRIGGERED",
          changedById,
          description: `Escalation: goal approval overdue for ${sheet.employee.name}`,
          newValue: { triggerType: rule.triggerType, goalSheetId: sheet.id }
        });
        managersNotified++;
        log.push(`GOAL_NOT_APPROVED: manager ${sheet.manager.email} for employee ${sheet.employee.name}`);
      }
    }

    if (rule.triggerType === "CHECKIN_NOT_COMPLETED") {
      const activeQuarter = getActiveQuarter(activeCycle, now);
      if (!activeQuarter) continue;
      const quarterOpens = getQuarterOpenDate(activeCycle, activeQuarter);
      if (quarterOpens > thresholdDate) continue;

      const approvedSheets = await prisma.goalSheet.findMany({
        where: { cycleId: activeCycle.id, status: { in: ["APPROVED", "LOCKED"] } },
        include: {
          employee: { include: { manager: true } },
          checkIns: { where: { quarter: activeQuarter } }
        }
      });
      const sheetsWithoutCheckIn = approvedSheets.filter((sheet) => sheet.checkIns.length === 0);
      const managerIds = [...new Set(sheetsWithoutCheckIn.map((sheet) => sheet.employee.managerId).filter(Boolean))];
      for (const managerId of managerIds) {
        const manager = await prisma.user.findUnique({ where: { id: managerId as string } });
        if (!manager) continue;
        const count = sheetsWithoutCheckIn.filter((sheet) => sheet.employee.managerId === managerId).length;
        await sendEscalationEmail(
          manager.email,
          "Check-in Reminder",
          `You have ${count} team member(s) with incomplete ${activeQuarter} check-ins.`
        );
        await writeAuditLog(prisma, {
          entityType: "User",
          entityId: managerId as string,
          action: "ESCALATION_TRIGGERED",
          changedById,
          description: `Escalation: ${count} check-ins overdue for manager ${manager.name}`,
          newValue: { triggerType: rule.triggerType, managerId, count, quarter: activeQuarter }
        });
        managersNotified++;
        log.push(`CHECKIN_NOT_COMPLETED: manager ${manager.email}, ${count} pending check-ins`);
      }
    }
  }

  return {
    employeesNotified,
    managersNotified,
    log,
    summary: `Escalation run complete. Employees notified: ${employeesNotified} | Managers notified: ${managersNotified}`
  };
}

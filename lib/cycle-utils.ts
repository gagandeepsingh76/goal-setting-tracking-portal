import type { Cycle } from "@prisma/client";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type CyclePhase = "GOAL_SETTING" | Quarter | "CLOSED" | null;

export function isGoalSettingOpen(cycle: Cycle, now: Date): boolean {
  return now >= cycle.goalSettingOpensAt && now <= cycle.goalSettingClosesAt;
}

export function isQuarterOpen(cycle: Cycle, quarter: Quarter, now: Date): boolean {
  const map = {
    Q1: { open: cycle.q1OpensAt, close: cycle.q1ClosesAt },
    Q2: { open: cycle.q2OpensAt, close: cycle.q2ClosesAt },
    Q3: { open: cycle.q3OpensAt, close: cycle.q3ClosesAt },
    Q4: { open: cycle.q4OpensAt, close: cycle.q4ClosesAt }
  };
  const { open, close } = map[quarter];
  return now >= open && now <= close;
}

export function getActiveQuarter(cycle: Cycle, now: Date): Quarter | null {
  for (const q of ["Q1", "Q2", "Q3", "Q4"] as Quarter[]) {
    if (isQuarterOpen(cycle, q, now)) return q;
  }
  return null;
}

export function getQuarterOpenDate(cycle: Cycle, quarter: Quarter): Date {
  return { Q1: cycle.q1OpensAt, Q2: cycle.q2OpensAt, Q3: cycle.q3OpensAt, Q4: cycle.q4OpensAt }[quarter];
}

export function getQuarterWindow(cycle: Cycle, quarter: Quarter) {
  return {
    opensAt: getQuarterOpenDate(cycle, quarter),
    closesAt: { Q1: cycle.q1ClosesAt, Q2: cycle.q2ClosesAt, Q3: cycle.q3ClosesAt, Q4: cycle.q4ClosesAt }[quarter]
  };
}

export function isGoalSheetEditable(status: string): boolean {
  return status === "DRAFT" || status === "RETURNED";
}

export function getActiveCyclePhase(cycle: Cycle, now: Date): CyclePhase {
  if (isGoalSettingOpen(cycle, now)) return "GOAL_SETTING";
  const quarter = getActiveQuarter(cycle, now);
  if (quarter) return quarter;
  if (now > cycle.q4ClosesAt) return "CLOSED";
  return null;
}

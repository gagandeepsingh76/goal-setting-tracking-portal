import type { UomType } from "@prisma/client";

export function computeProgressScore(
  uomType: UomType,
  target: number,
  actual: number,
  targetDate?: Date | null,
  actualDate?: Date | null
): number {
  switch (uomType) {
    case "NUMERIC_MIN":
    case "PERCENT_MIN":
      if (target === 0) return actual === 0 ? 1.0 : 0;
      return Math.min(actual / target, 1.5);

    case "NUMERIC_MAX":
    case "PERCENT_MAX":
      if (actual === 0) return 1.5;
      return Math.min(target / actual, 1.5);

    case "TIMELINE":
      if (!targetDate || !actualDate) return 0;
      if (actualDate <= targetDate) return 1.0;
      {
        const overdueDays =
          (actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
        const penalty = overdueDays / 30;
        return Math.max(0, 1.0 - penalty * 0.2);
      }

    case "ZERO_BASED":
      return actual === 0 ? 1.0 : 0;

    default:
      return 0;
  }
}

export function weightedAverageScore(
  goals: Array<{ weightage: number; quarterlyActuals: Array<{ progressScore: number | null }> }>
) {
  const total = goals.reduce((sum, goal) => {
    const score = goal.quarterlyActuals[0]?.progressScore;
    return sum + (score ?? 0) * (goal.weightage / 100);
  }, 0);
  return total;
}

export function weightedAverageForQuarter<
  T extends { weightage: number; quarterlyActuals: Array<{ quarter: string; progressScore: number | null }> }
>(goals: T[], quarter: string) {
  return goals.reduce((sum, goal) => {
    const score = goal.quarterlyActuals.find((actual) => actual.quarter === quarter)?.progressScore;
    return sum + (score ?? 0) * (goal.weightage / 100);
  }, 0);
}

export function computeWeightedScore(
  goals: Array<{ weightage: number; quarterlyActuals: Array<{ progressScore: number | null; quarter: string }> }>,
  quarter: string
): number | null {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const goal of goals) {
    const actual = goal.quarterlyActuals.find((item) => item.quarter === quarter);
    if (actual?.progressScore != null) {
      weightedSum += (goal.weightage / 100) * actual.progressScore;
      totalWeight += goal.weightage / 100;
    }
  }
  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

export function totalWeightage(goals: Array<{ weightage: number }>) {
  return Number(goals.reduce((sum, goal) => sum + goal.weightage, 0).toFixed(1));
}

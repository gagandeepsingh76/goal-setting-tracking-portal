import { z } from "zod";

const oneDecimal = (value: number) => Number.isInteger(value * 10);

export const goalInputSchema = z
  .object({
    goalSheetId: z.string().optional(),
    thrustAreaId: z.string().min(1, "Thrust area is required."),
    title: z.string().min(1, "Goal title is required.").max(150, "Goal title must be 150 characters or less."),
    description: z.string().max(500, "Description must be 500 characters or less.").optional().nullable(),
    uomType: z.enum(["NUMERIC_MIN", "NUMERIC_MAX", "PERCENT_MIN", "PERCENT_MAX", "TIMELINE", "ZERO_BASED"]),
    target: z.coerce.number().optional(),
    targetDate: z.string().optional().nullable(),
    weightage: z.coerce
      .number()
      .min(10, "Minimum weightage per goal is 10%.")
      .max(90, "Maximum weightage per goal is 90%.")
      .refine(oneDecimal, "Weightage can have at most one decimal place.")
  })
  .superRefine((data, ctx) => {
    if (data.uomType === "TIMELINE") {
      if (!data.targetDate) {
        ctx.addIssue({ code: "custom", path: ["targetDate"], message: "Target date is required for timeline goals." });
      }
      return;
    }
    if (data.uomType === "ZERO_BASED") return;
    if (data.target == null || Number.isNaN(data.target)) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "Target value is required." });
    }
  });

export const managerGoalEditSchema = z.object({
  target: z.coerce.number().optional(),
  targetDate: z.string().optional().nullable(),
  weightage: z.coerce
    .number()
    .min(10, "Minimum weightage per goal is 10%.")
    .max(90, "Maximum weightage per goal is 90%.")
    .refine(oneDecimal, "Weightage can have at most one decimal place.")
});

export const submitSheetSchema = z.object({ id: z.string() });

export const returnSheetSchema = z.object({
  managerComment: z.string().min(20, "Comment must be at least 20 characters.")
});

export const unlockSheetSchema = z.object({
  reason: z.string().min(10, "Unlock reason must be at least 10 characters.")
});

export const actualInputSchema = z.object({
  goalId: z.string().min(1),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  actualValue: z.coerce.number().optional().nullable(),
  actualDate: z.string().optional().nullable(),
  status: z.enum(["NOT_STARTED", "ON_TRACK", "COMPLETED"])
});

export const checkInInputSchema = z.object({
  goalSheetId: z.string().min(1),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  comment: z.string().min(30, "Check-in comment must be at least 30 characters.")
});

export const userInputSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("A valid email is required.").optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
  department: z.string().min(1, "Department is required."),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const cycleInputSchema = z.object({
  year: z.coerce.number().int(),
  name: z.string().min(1),
  goalSettingOpensAt: z.string().min(1),
  goalSettingClosesAt: z.string().min(1),
  q1OpensAt: z.string().min(1),
  q1ClosesAt: z.string().min(1),
  q2OpensAt: z.string().min(1),
  q2ClosesAt: z.string().min(1),
  q3OpensAt: z.string().min(1),
  q3ClosesAt: z.string().min(1),
  q4OpensAt: z.string().min(1),
  q4ClosesAt: z.string().min(1),
  isActive: z.boolean().optional()
});

export const thrustAreaInputSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const sharedGoalInputSchema = z.object({
  thrustAreaId: z.string().min(1),
  title: z.string().min(1).max(150),
  description: z.string().max(500).optional().nullable(),
  uomType: z.enum(["NUMERIC_MIN", "NUMERIC_MAX", "PERCENT_MIN", "PERCENT_MAX", "TIMELINE", "ZERO_BASED"]),
  target: z.coerce.number().optional(),
  targetDate: z.string().optional().nullable(),
  weightage: z.coerce
    .number()
    .min(10, "Minimum weightage per goal is 10%.")
    .max(90, "Maximum weightage per goal is 90%.")
    .refine(oneDecimal, "Weightage can have at most one decimal place."),
  employeeIds: z.array(z.string()).min(1, "Select at least one employee.")
});

export const escalationRuleInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  triggerType: z.enum(["GOAL_NOT_SUBMITTED", "GOAL_NOT_APPROVED", "CHECKIN_NOT_COMPLETED"]),
  daysAfterTrigger: z.coerce.number().int().min(1),
  isActive: z.boolean().optional()
});

import { PrismaClient, GoalSheetStatus, UomType, ActualStatus, Quarter } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const password = "Password@123";

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.quarterlyActual.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.goalSheet.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.thrustArea.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash(password, 12);

  const cycle = await prisma.cycle.create({
    data: {
      year: 2025,
      name: "FY 2025-26",
      goalSettingOpensAt: utcDate("2025-05-01"),
      goalSettingClosesAt: utcDate("2025-06-30"),
      q1OpensAt: utcDate("2025-07-01"),
      q1ClosesAt: utcDate("2025-09-30"),
      q2OpensAt: utcDate("2025-10-01"),
      q2ClosesAt: utcDate("2025-12-31"),
      q3OpensAt: utcDate("2026-01-01"),
      q3ClosesAt: utcDate("2026-02-28"),
      q4OpensAt: utcDate("2026-03-01"),
      q4ClosesAt: utcDate("2026-04-30"),
      isActive: true
    }
  });

  const thrustAreas = await Promise.all(
    [
      "Revenue Growth",
      "Customer Satisfaction",
      "Operational Excellence",
      "People Development",
      "Digital Transformation",
      "Cost Optimisation"
    ].map((name) =>
      prisma.thrustArea.create({
        data: { name, description: `${name} objectives for FY 2025-26` }
      })
    )
  );

  const [admin, manager] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@company.com",
        password: hashedPassword,
        role: "ADMIN",
        department: "HR"
      }
    }),
    prisma.user.create({
      data: {
        name: "Sales Manager",
        email: "manager@company.com",
        password: hashedPassword,
        role: "MANAGER",
        department: "Sales"
      }
    })
  ]);

  const [alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Mehta",
        email: "alice@company.com",
        password: hashedPassword,
        role: "EMPLOYEE",
        department: "Sales",
        managerId: manager.id
      }
    }),
    prisma.user.create({
      data: {
        name: "Bob Sharma",
        email: "bob@company.com",
        password: hashedPassword,
        role: "EMPLOYEE",
        department: "Sales",
        managerId: manager.id
      }
    }),
    prisma.user.create({
      data: {
        name: "Carol Iyer",
        email: "carol@company.com",
        password: hashedPassword,
        role: "EMPLOYEE",
        department: "Operations",
        managerId: manager.id
      }
    })
  ]);

  const aliceSheet = await prisma.goalSheet.create({
    data: {
      employeeId: alice.id,
      managerId: manager.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.APPROVED,
      submittedAt: utcDate("2025-06-15"),
      approvedAt: utcDate("2025-06-20"),
      lockedAt: utcDate("2025-06-20")
    }
  });

  const aliceGoals = await Promise.all([
    prisma.goal.create({
      data: {
        goalSheetId: aliceSheet.id,
        thrustAreaId: thrustAreas[0].id,
        title: "Grow enterprise pipeline",
        description: "Build qualified enterprise sales pipeline for strategic accounts.",
        uomType: UomType.NUMERIC_MIN,
        target: 1200000,
        weightage: 30,
        weightageEditable: false
      }
    }),
    prisma.goal.create({
      data: {
        goalSheetId: aliceSheet.id,
        thrustAreaId: thrustAreas[1].id,
        title: "Improve customer satisfaction score",
        description: "Lift CSAT for managed accounts through faster resolution and proactive follow-ups.",
        uomType: UomType.PERCENT_MIN,
        target: 90,
        weightage: 25,
        weightageEditable: false
      }
    }),
    prisma.goal.create({
      data: {
        goalSheetId: aliceSheet.id,
        thrustAreaId: thrustAreas[4].id,
        title: "Launch account insights dashboard",
        description: "Deliver dashboard for weekly pipeline and account health insights.",
        uomType: UomType.TIMELINE,
        target: utcDate("2025-11-30").getTime(),
        targetDate: utcDate("2025-11-30"),
        weightage: 25,
        weightageEditable: false
      }
    }),
    prisma.goal.create({
      data: {
        goalSheetId: aliceSheet.id,
        thrustAreaId: thrustAreas[2].id,
        title: "Reduce escalations to zero",
        description: "Ensure no avoidable account escalations are open at quarter end.",
        uomType: UomType.ZERO_BASED,
        target: 0,
        weightage: 20,
        weightageEditable: false
      }
    })
  ]);

  const actuals = [
    [aliceGoals[0].id, Quarter.Q1, 330000, null, ActualStatus.ON_TRACK, 0.275],
    [aliceGoals[0].id, Quarter.Q2, 690000, null, ActualStatus.ON_TRACK, 0.575],
    [aliceGoals[1].id, Quarter.Q1, 86, null, ActualStatus.ON_TRACK, 0.9555555556],
    [aliceGoals[1].id, Quarter.Q2, 91, null, ActualStatus.COMPLETED, 1.0111111111],
    [aliceGoals[2].id, Quarter.Q1, null, utcDate("2025-09-15"), ActualStatus.ON_TRACK, 1.0],
    [aliceGoals[2].id, Quarter.Q2, null, utcDate("2025-11-25"), ActualStatus.COMPLETED, 1.0],
    [aliceGoals[3].id, Quarter.Q1, 0, null, ActualStatus.COMPLETED, 1.0],
    [aliceGoals[3].id, Quarter.Q2, 1, null, ActualStatus.ON_TRACK, 0.0]
  ] as const;

  for (const [goalId, quarter, actualValue, actualDate, status, progressScore] of actuals) {
    await prisma.quarterlyActual.create({
      data: {
        goalId,
        quarter,
        actualValue,
        actualDate,
        status,
        progressScore
      }
    });
  }

  const bobSheet = await prisma.goalSheet.create({
    data: {
      employeeId: bob.id,
      managerId: manager.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.SUBMITTED,
      submittedAt: utcDate("2025-06-18")
    }
  });

  await Promise.all([
    prisma.goal.create({
      data: {
        goalSheetId: bobSheet.id,
        thrustAreaId: thrustAreas[0].id,
        title: "Increase partner channel revenue",
        description: "Close new channel-led revenue for the West region.",
        uomType: UomType.NUMERIC_MIN,
        target: 850000,
        weightage: 35
      }
    }),
    prisma.goal.create({
      data: {
        goalSheetId: bobSheet.id,
        thrustAreaId: thrustAreas[2].id,
        title: "Reduce proposal turnaround time",
        description: "Lower average proposal turnaround time in days.",
        uomType: UomType.NUMERIC_MAX,
        target: 3,
        weightage: 25
      }
    }),
    prisma.goal.create({
      data: {
        goalSheetId: bobSheet.id,
        thrustAreaId: thrustAreas[3].id,
        title: "Complete sales mentorship program",
        description: "Mentor two junior sellers and complete monthly coaching sessions.",
        uomType: UomType.PERCENT_MIN,
        target: 100,
        weightage: 20
      }
    }),
    prisma.goal.create({
      data: {
        goalSheetId: bobSheet.id,
        thrustAreaId: thrustAreas[5].id,
        title: "Keep discount leakage at or below target",
        description: "Maintain average discount leakage below the agreed threshold.",
        uomType: UomType.PERCENT_MAX,
        target: 6,
        weightage: 20
      }
    })
  ]);

  await prisma.escalationRule.createMany({
    data: [
      {
        name: "Goal submission reminder",
        triggerType: "GOAL_NOT_SUBMITTED",
        daysAfterTrigger: 10,
        isActive: true
      },
      {
        name: "Pending approval reminder",
        triggerType: "GOAL_NOT_APPROVED",
        daysAfterTrigger: 5,
        isActive: true
      },
      {
        name: "Check-in completion reminder",
        triggerType: "CHECKIN_NOT_COMPLETED",
        daysAfterTrigger: 7,
        isActive: true
      }
    ]
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Seed",
      entityId: cycle.id,
      action: "SEEDED",
      changedById: admin.id,
      description: "Seeded FY 2025-26 demo data."
    }
  });

  console.log("Seed data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SharedGoalPushForm } from "@/components/admin/SharedGoalPushForm";

export default async function SharedGoalsPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) redirect("/dashboard");
  const [thrustAreas, employees] = await Promise.all([
    prisma.thrustArea.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true, ...(session.user.role === "MANAGER" ? { managerId: session.user.id } : {}) },
      orderBy: { name: "asc" }
    })
  ]);
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Shared Goals</h1>
          <p className="page-subtitle">Push standardized departmental KPIs into eligible draft or returned goal sheets.</p>
        </div>
      </div>
      <SharedGoalPushForm thrustAreas={thrustAreas} employees={employees} />
    </div>
  );
}

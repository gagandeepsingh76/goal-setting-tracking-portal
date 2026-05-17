import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EscalationManager } from "@/components/admin/EscalationManager";

export default async function EscalationPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const rules = await prisma.escalationRule.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Escalation Rules</h1>
          <p className="page-subtitle">Configure reminder logic and run operational escalation checks from one console.</p>
        </div>
      </div>
      <EscalationManager initialRules={rules} />
    </div>
  );
}

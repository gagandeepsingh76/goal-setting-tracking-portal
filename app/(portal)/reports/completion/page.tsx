import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCompletionReport } from "@/lib/completion-report";
import { CompletionDashboard } from "@/components/reports/CompletionDashboard";

export const dynamic = "force-dynamic";

export default async function CompletionReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const data = await getCompletionReport(session.user);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Completion Dashboard</h1>
          <p className="page-subtitle">Monitor goal setting and check-in completion health across the organization.</p>
        </div>
      </div>
      <CompletionDashboard data={data} />
    </div>
  );
}

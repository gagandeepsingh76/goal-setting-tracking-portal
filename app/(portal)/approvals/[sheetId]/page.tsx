import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ApprovalReviewClient } from "@/components/approvals/ApprovalReviewClient";

export default async function ApprovalReviewPage({ params }: { params: { sheetId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: params.sheetId },
    include: {
      employee: true,
      manager: true,
      cycle: true,
      goals: { include: { thrustArea: true }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!sheet) return <Alert><AlertDescription>Goal sheet not found.</AlertDescription></Alert>;
  if (session.user.role !== "ADMIN" && sheet.managerId !== session.user.id) {
    return <Alert><AlertDescription>You do not have access to this approval.</AlertDescription></Alert>;
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">{sheet.employee.name}</h1>
          <p className="page-subtitle">{sheet.cycle.name} goal review</p>
        </div>
        <Badge variant={sheet.status === "LOCKED" || sheet.status === "APPROVED" ? "success" : "warning"}>{sheet.status}</Badge>
      </div>
      <ApprovalReviewClient sheetId={sheet.id} goals={sheet.goals} canUnlock={session.user.role === "ADMIN"} />
    </div>
  );
}

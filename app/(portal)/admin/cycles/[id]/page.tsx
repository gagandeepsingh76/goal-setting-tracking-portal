import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CycleForm } from "@/components/admin/CycleForm";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function EditCyclePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const cycle = await prisma.cycle.findUnique({ where: { id: params.id }, include: { _count: { select: { goalSheets: true } } } });
  if (!cycle) return <Alert><AlertDescription>Cycle not found.</AlertDescription></Alert>;
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Edit Cycle</h1>
        <p className="page-subtitle">Adjust cycle metadata while respecting existing goal sheet restrictions.</p>
      </div>
      <CycleForm cycle={cycle} hasGoalSheets={cycle._count.goalSheets > 0} />
    </div>
  );
}

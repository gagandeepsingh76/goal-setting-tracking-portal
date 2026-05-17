import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ThrustAreasManager } from "@/components/admin/ThrustAreasManager";

export default async function ThrustAreasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const areas = await prisma.thrustArea.findMany({
    where: { isActive: true },
    include: { _count: { select: { goals: true } } },
    orderBy: { name: "asc" }
  });
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1 className="page-title">Thrust Areas</h1>
          <p className="page-subtitle">Maintain the strategic categories employees use when defining goals.</p>
        </div>
      </div>
      <ThrustAreasManager initialAreas={areas} />
    </div>
  );
}

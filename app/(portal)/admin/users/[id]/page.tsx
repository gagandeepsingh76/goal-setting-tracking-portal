import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/admin/UserForm";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const [user, managers] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id } }),
    prisma.user.findMany({ where: { role: "MANAGER", isActive: true }, orderBy: { name: "asc" } })
  ]);
  if (!user) return <Alert><AlertDescription>User not found.</AlertDescription></Alert>;
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Edit User</h1>
        <p className="page-subtitle">Update role, reporting structure, department, and account status.</p>
      </div>
      <UserForm user={user} managers={managers} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/admin/UserForm";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  const managers = await prisma.user.findMany({ where: { role: "MANAGER", isActive: true }, orderBy: { name: "asc" } });
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Add User</h1>
        <p className="page-subtitle">Create an account and assign the correct role, department, and manager.</p>
      </div>
      <UserForm managers={managers} />
    </div>
  );
}

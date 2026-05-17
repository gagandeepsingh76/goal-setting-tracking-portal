import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar role={session.user.role} />
      <div className="min-w-0 flex-1">
        <Header user={session.user} />
        <main className="animate-fade-up p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

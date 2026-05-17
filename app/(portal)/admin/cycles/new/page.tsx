import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CycleForm } from "@/components/admin/CycleForm";

export default async function NewCyclePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">New Cycle</h1>
        <p className="page-subtitle">Define goal-setting and quarterly check-in windows for a new performance cycle.</p>
      </div>
      <CycleForm />
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { userInputSchema } from "@/lib/validators";

type FormValues = z.infer<typeof userInputSchema>;

export function UserForm({
  user,
  managers
}: {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "EMPLOYEE" | "MANAGER" | "ADMIN";
    department: string;
    managerId?: string | null;
    isActive: boolean;
  };
  managers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(userInputSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.role || "EMPLOYEE",
      department: user?.department || "",
      managerId: user?.managerId || "",
      isActive: user?.isActive ?? true
    }
  });

  function submit(values: FormValues) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
        method: user ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to save user.");
        return;
      }
      router.push("/admin/users");
      router.refresh();
    });
  }

  function deactivate() {
    if (!user) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await response.json();
      setMessage(response.ok ? "User deactivated." : data.error || "Unable to deactivate user.");
      router.refresh();
    });
  }

  return (
    <Card className="focus-card">
      <CardHeader>
        <CardTitle>{user ? "Edit User" : "Add User"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input disabled={Boolean(user)} {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>{user ? "Reset Password" : "Password"}</Label>
              <Input type="password" {...form.register("password")} />
              <p className="field-hint">{user ? "Leave blank to keep the current password." : "Minimum 8 characters."}</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select {...form.register("role")}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input {...form.register("department")} />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select {...form.register("managerId")}>
                <option value="">None</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </Select>
              <p className="field-hint">Required for employee goal sheet creation.</p>
            </div>
          </div>
          {user ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("isActive")} />
              Active
            </label>
          ) : null}
          <div className="flex gap-3">
            <Button disabled={pending}>{pending ? "Saving..." : "Save User"}</Button>
            {user ? (
              <Button type="button" variant="destructive" disabled={pending} onClick={deactivate}>
                Deactivate
              </Button>
            ) : null}
          </div>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

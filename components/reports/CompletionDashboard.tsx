"use client";

import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type GoalSettingRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  managerName: string;
  status: string;
  submittedAt: string | Date | null;
  approvedAt: string | Date | null;
};

type CheckInManager = {
  managerId: string;
  managerName: string;
  total: number;
  completed: number;
  pending: number;
  sheets: Array<{ sheetId: string; employeeId: string; employeeName: string; done: boolean }>;
};

function statusBadge(status: string) {
  if (["APPROVED", "LOCKED"].includes(status)) return <Badge variant="success">{status}</Badge>;
  if (status === "SUBMITTED") return <Badge variant="warning">{status}</Badge>;
  if (status === "RETURNED") return <Badge variant="purple">{status}</Badge>;
  if (status === "DRAFT") return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="danger">NOT_STARTED</Badge>;
}

export function CompletionDashboard({
  data
}: {
  data: {
    goalSetting: GoalSettingRow[];
    checkIns: Record<string, CheckInManager[]>;
  };
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const summary = useMemo(() => {
    const total = data.goalSetting.length;
    const approved = data.goalSetting.filter((row) => ["APPROVED", "LOCKED"].includes(row.status)).length;
    const submitted = data.goalSetting.filter((row) => row.status === "SUBMITTED").length;
    const notStarted = data.goalSetting.filter((row) => row.status === "NOT_STARTED").length;
    return { total, approved, submitted, notStarted };
  }, [data.goalSetting]);

  return (
    <Tabs defaultValue="goal-setting">
      <TabsList>
        <TabsTrigger value="goal-setting">Goal Setting</TabsTrigger>
        <TabsTrigger value="check-ins">Check-in Completion</TabsTrigger>
      </TabsList>
      <TabsContent value="goal-setting" className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard title="Total Employees" value={summary.total} />
          <SummaryCard title="Approved" value={`${summary.approved} (${summary.total ? Math.round((summary.approved / summary.total) * 100) : 0}%)`} />
          <SummaryCard title="Submitted" value={`${summary.submitted} (${summary.total ? Math.round((summary.submitted / summary.total) * 100) : 0}%)`} />
          <SummaryCard title="Not Started" value={summary.notStarted} />
        </div>
        <Card>
          <CardHeader><CardTitle>Goal Setting Completion</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Manager</TableHead><TableHead>Status</TableHead><TableHead>Submitted On</TableHead><TableHead>Approved On</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.goalSetting.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>{row.employeeName ?? "Unknown Employee"}</TableCell>
                    <TableCell>{row.department ?? "-"}</TableCell>
                    <TableCell>{row.managerName ?? "No Manager Assigned"}</TableCell>
                    <TableCell>{statusBadge(row.status ?? "NOT_STARTED")}</TableCell>
                    <TableCell>{formatDate(row.submittedAt)}</TableCell>
                    <TableCell>{formatDate(row.approvedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="check-ins">
        <Tabs defaultValue="Q1">
          <TabsList>
            {["Q1", "Q2", "Q3", "Q4"].map((quarter) => <TabsTrigger key={quarter} value={quarter}>{quarter}</TabsTrigger>)}
          </TabsList>
          {["Q1", "Q2", "Q3", "Q4"].map((quarter) => (
            <TabsContent key={quarter} value={quarter}>
              <Card>
                <CardHeader><CardTitle>{quarter} Check-in Completion</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Manager Name</TableHead><TableHead>Total Reports</TableHead><TableHead>Completed</TableHead><TableHead>Pending</TableHead><TableHead>Completion %</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(data.checkIns[quarter] ?? []).map((manager) => {
                        const key = `${quarter}-${manager.managerId}`;
                        return (
                          <Fragment key={key}>
                            <TableRow key={key} className="cursor-pointer" onClick={() => setExpanded(expanded === key ? null : key)}>
                              <TableCell>{manager.managerName ?? "No Manager Assigned"}</TableCell>
                              <TableCell>{manager.total}</TableCell>
                              <TableCell><Badge variant="success">{manager.completed}</Badge></TableCell>
                              <TableCell><Badge variant={manager.pending ? "danger" : "success"}>{manager.pending}</Badge></TableCell>
                              <TableCell>{manager.total ? `${Math.round((manager.completed / manager.total) * 100)}%` : "N/A"}</TableCell>
                            </TableRow>
                            {expanded === key ? (
                              <TableRow key={`${key}-details`}>
                                <TableCell colSpan={5} className="bg-muted/35">
                                  <div className="grid gap-2 text-sm">
                                    {manager.sheets.map((sheet) => (
                                      <div key={sheet.sheetId} className="flex items-center justify-between rounded-md border bg-card p-2 shadow-soft">
                                        <span>{sheet.employeeName ?? "Unknown Employee"}</span>
                                        <Badge variant={sheet.done ? "success" : "danger"}>{sheet.done ? "Done" : "Not Done"}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="focus-card">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

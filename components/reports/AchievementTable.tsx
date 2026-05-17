"use client";

import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = Record<string, string | number>;

export function AchievementTable({ rows, exportUrl }: { rows: Row[]; exportUrl: string }) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Achievement Report</CardTitle>
        <Button asChild variant="outline">
          <Link href={exportUrl}>
            <Download className="h-4 w-4" />
            Export to Excel
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {headers.map((header) => <TableCell key={header}>{row[header]}</TableCell>)}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length || 1}>
                  <EmptyState icon={FileSpreadsheet} title="No report rows" description="Try a different cycle, department, or quarter filter." />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

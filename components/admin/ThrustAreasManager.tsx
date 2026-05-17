"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ThrustAreasManager({
  initialAreas
}: {
  initialAreas: Array<{ id: string; name: string; description: string | null; _count?: { goals: number } }>;
}) {
  const [areas, setAreas] = useState(initialAreas);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const response = await fetch("/api/thrust-areas");
    const data = await response.json();
    setAreas(data.thrustAreas || []);
  }

  function create() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/thrust-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      });
      const data = await response.json();
      if (!response.ok) setMessage(data.error || "Unable to create thrust area.");
      setName("");
      setDescription("");
      await refresh();
    });
  }

  function update(area: (typeof areas)[number], nextName: string, nextDescription: string | null) {
    startTransition(async () => {
      await fetch(`/api/thrust-areas/${area.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, description: nextDescription, isActive: true })
      });
      await refresh();
    });
  }

  function remove(area: (typeof areas)[number]) {
    startTransition(async () => {
      await fetch(`/api/thrust-areas/${area.id}`, { method: "DELETE" });
      await refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Add Thrust Area</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button disabled={pending} onClick={create}>Add</Button>
          {message ? <p className="text-sm text-danger sm:col-span-3">{message}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Thrust Areas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => (
                <EditableArea key={area.id} area={area} onSave={update} onDelete={remove} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EditableArea({
  area,
  onSave,
  onDelete
}: {
  area: { id: string; name: string; description: string | null; _count?: { goals: number } };
  onSave: (area: any, name: string, description: string | null) => void;
  onDelete: (area: any) => void;
}) {
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description || "");
  return (
    <TableRow>
      <TableCell><Input value={name} onChange={(event) => setName(event.target.value)} /></TableCell>
      <TableCell><Input value={description} onChange={(event) => setDescription(event.target.value)} /></TableCell>
      <TableCell>{area._count?.goals ?? 0}</TableCell>
      <TableCell className="space-x-2 text-right">
        <Button size="sm" variant="outline" onClick={() => onSave(area, name, description)}>Save</Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(area)}>Deactivate</Button>
      </TableCell>
    </TableRow>
  );
}

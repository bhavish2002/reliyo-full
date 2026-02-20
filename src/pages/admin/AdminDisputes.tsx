import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminLayout from "@/components/AdminLayout";
import { AlertTriangle, Eye, Clock, CheckCircle2, XCircle } from "lucide-react";

const DEMO_DISPUTES = [
  { id: "DSP-001", taskId: "RLY-TSK-2026-B5W8Q3", title: "Build landing page for SaaS", requestor: "Meera Joshi", acceptor: "Arjun M.", disputeCount: 2, raisedAt: "2026-02-14", status: "open" },
  { id: "DSP-002", taskId: "RLY-TSK-2026-X4M2K8", title: "Mobile app UI redesign", requestor: "Ravi Kumar", acceptor: "Priya K.", disputeCount: 1, raisedAt: "2026-02-13", status: "open" },
  { id: "DSP-003", taskId: "RLY-TSK-2026-W7N5P1", title: "Data entry for inventory", requestor: "Sneha P.", acceptor: "Rohan J.", disputeCount: 3, raisedAt: "2026-02-12", status: "escalated" },
  { id: "DSP-004", taskId: "RLY-TSK-2026-Y9L3T6", title: "Content writing for blog", requestor: "Rajesh S.", acceptor: "Amit T.", disputeCount: 1, raisedAt: "2026-02-10", status: "resolved" },
];

const statusIcon = (s: string) => {
  if (s === "open") return <Clock className="h-3.5 w-3.5 text-primary" />;
  if (s === "escalated") return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
  if (s === "resolved") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  return null;
};

const statusBadge = (s: string) => {
  const colors: Record<string, string> = {
    open: "bg-primary/10 text-primary border-primary/20",
    escalated: "bg-destructive/10 text-destructive border-destructive/20",
    resolved: "bg-success/10 text-success border-success/20",
  };
  return colors[s] || "bg-muted text-muted-foreground";
};

const AdminDisputes = () => {
  const active = DEMO_DISPUTES.filter((d) => d.status !== "resolved").length;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
        <p className="text-sm text-muted-foreground">Monitor and arbitrate task disputes</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{DEMO_DISPUTES.length}</p>
            <p className="text-xs text-muted-foreground">Total Disputes</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{DEMO_DISPUTES.length - active}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Dispute ID</TableHead>
              <TableHead className="text-xs">Task</TableHead>
              <TableHead className="text-xs">Requestor</TableHead>
              <TableHead className="text-xs">Acceptor</TableHead>
              <TableHead className="text-xs text-center">Count</TableHead>
              <TableHead className="text-xs">Raised</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              <TableHead className="text-xs w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_DISPUTES.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[180px]">{d.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{d.taskId}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{d.requestor}</TableCell>
                <TableCell className="text-sm">{d.acceptor}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-xs ${d.disputeCount >= 3 ? "border-destructive text-destructive" : ""}`}>
                    {d.disputeCount}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.raisedAt}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-[10px] gap-1 ${statusBadge(d.status)}`}>
                    {statusIcon(d.status)}
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <Eye className="h-3 w-3" /> Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AdminLayout>
  );
};

export default AdminDisputes;

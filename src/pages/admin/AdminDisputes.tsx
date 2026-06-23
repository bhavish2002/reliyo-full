import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/AdminLayout";
import AdminTaskDetailDialog from "@/components/AdminTaskDetailDialog";
import { AlertTriangle, Eye, Clock, CheckCircle2, XCircle, Shield, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  type AdminDispute, type Dsp4Status, DSP4_STATUS_LABELS,
} from "@/lib/adminData";
import { listAdminDisputes, resolveAdminDsp4 } from "@/lib/admin/api";
import { mapApiTaskToTask, type ApiTask } from "@/lib/tasks/api";
import { notifyTasksChanged } from "@/lib/tasks/events";
import { ApiClientError } from "@/lib/api/client";
import { DSP4_COMPLETION_DAYS } from "@/lib/taskTypes";

const DSP4_STATUS_COLORS: Record<Dsp4Status, string> = {
  open: "bg-primary/10 text-primary border-primary/20",
  resolved_valid: "bg-[hsl(35,90%,50%)]/10 text-[hsl(35,90%,50%)] border-[hsl(35,90%,50%)]/20",
  resolved_invalid: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  admin_closed: "bg-destructive/10 text-destructive border-destructive/20",
};

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [reviewDispute, setReviewDispute] = useState<AdminDispute | null>(null);
  const [viewTask, setViewTask] = useState<AdminDispute | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [tab, setTab] = useState("disputes");

  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setLoadError(null);
      const rows = await listAdminDisputes();
      setDisputes(
        rows.map((r) => ({
          disputeId: r.disputeId,
          disputeNumber: r.disputeNumber,
          taskId: r.taskId,
          taskDisplayId: r.taskDisplayId,
          taskTitle: r.taskTitle,
          requestor: r.requestor,
          acceptor: r.acceptor,
          escalated: r.escalated,
          createdAt: r.raised,
          dsp4Status: (r.dsp4Status ?? "open") as Dsp4Status,
          task: mapApiTaskToTask(r.task as ApiTask),
        })),
      );
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : "Could not load disputes.");
      setDisputes([]);
    }
  };
  useEffect(() => {
    void reload();
  }, []);
  useEffect(() => {
    const interval = setInterval(() => void reload(), 10000);
    return () => clearInterval(interval);
  }, []);

  const normalDisputes = disputes.filter((d) => !d.escalated);
  const escalatedDisputes = disputes.filter((d) => d.escalated);

  const activeNormal = normalDisputes.filter((d) => d.task.status === "disputed").length;
  const activeEscalated = escalatedDisputes.filter((d) => d.dsp4Status === "open" || d.dsp4Status === "resolved_valid").length;

  // ── DSP4 Actions (mandatory comment) ──────────────────────────────────────

  const validateComment = () => {
    if (!adminComment.trim()) {
      toast({ title: "Comment Required", description: "Admin comment is mandatory for dispute resolution.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const applyDsp4 = async (
    d: AdminDispute,
    status: "resolved_valid" | "resolved_invalid" | "admin_closed",
    successTitle: string,
    successDescription: string,
  ) => {
    if (!validateComment()) return;
    try {
      await resolveAdminDsp4(d.taskId, status, adminComment.trim());
      notifyTasksChanged();
      setReviewDispute(null);
      setAdminComment("");
      await reload();
      toast({ title: successTitle, description: successDescription });
    } catch (err) {
      toast({
        title: "DSP4 action failed",
        description: err instanceof ApiClientError ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleResolveValid = (d: AdminDispute) => {
    void applyDsp4(
      d,
      "resolved_valid",
      "Dispute Resolved Valid",
      "Acceptor may mark done within the server-computed rework window.",
    );
  };

  const handleResolveInvalid = (d: AdminDispute) => {
    void applyDsp4(
      d,
      "resolved_invalid",
      "Dispute Resolved Invalid",
      "Task closed. Settlement completed per policy.",
    );
  };

  const handleAdminClose = (d: AdminDispute) => {
    void applyDsp4(
      d,
      "admin_closed",
      "Task Force-Closed",
      "Reward refunded to requestor. Penalty applied to acceptor trust deposit.",
    );
  };

  // ── Render dispute row ────────────────────────────────────────────────────

  const renderRow = (d: AdminDispute) => (
    <TableRow key={`${d.disputeId}-${d.taskId}`}>
      <TableCell className="font-mono text-xs text-muted-foreground">{d.disputeId}</TableCell>
      <TableCell>
        <div>
          <p className="text-sm font-medium truncate max-w-[180px]">{d.taskTitle}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{d.taskDisplayId}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm">{d.requestor}</TableCell>
      <TableCell className="text-sm">{d.acceptor}</TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className={`text-xs ${d.disputeNumber >= 4 ? "border-destructive text-destructive" : ""}`}>
          DSP{d.disputeNumber}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</TableCell>
      <TableCell className="text-center">
        {d.escalated ? (
          <Badge variant="outline" className={`text-[10px] gap-1 ${DSP4_STATUS_COLORS[d.dsp4Status ?? "open"]}`}>
            {(d.dsp4Status ?? "open") === "open" && <Clock className="h-3 w-3" />}
            {d.dsp4Status === "resolved_valid" && <AlertTriangle className="h-3 w-3" />}
            {d.dsp4Status === "resolved_invalid" && <CheckCircle2 className="h-3 w-3" />}
            {d.dsp4Status === "admin_closed" && <XCircle className="h-3 w-3" />}
            {DSP4_STATUS_LABELS[d.dsp4Status ?? "open"]}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
            <MessageSquare className="h-3 w-3" />
            Between parties
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewTask(d)}>
            <Eye className="h-3 w-3" /> View
          </Button>
          {/* Show Review button for open AND resolved_valid (allows second review) */}
          {d.escalated && (d.dsp4Status === "open" || d.dsp4Status === "resolved_valid") && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-destructive/30 text-destructive" onClick={() => { setReviewDispute(d); setAdminComment(""); }}>
              <Shield className="h-3 w-3" /> Review
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
        <p className="text-sm text-muted-foreground">Monitor and arbitrate task disputes — live data</p>
        {loadError && (
          <p className="text-sm text-destructive mt-2">{loadError}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{disputes.length}</p>
            <p className="text-xs text-muted-foreground">Total Disputes</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeNormal}</p>
            <p className="text-xs text-muted-foreground">Active Normal</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{activeEscalated}</p>
            <p className="text-xs text-muted-foreground">Escalated (DSP4)</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[hsl(var(--success))]">
              {disputes.filter((d) => d.dsp4Status === "resolved_invalid" || d.dsp4Status === "admin_closed" || (!d.escalated && d.task.status !== "disputed")).length}
            </p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed bins */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="disputes" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Disputes ({normalDisputes.length})
          </TabsTrigger>
          <TabsTrigger value="escalated" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Escalated ({escalatedDisputes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputes">
          <Card className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Dispute ID</TableHead>
                  <TableHead className="text-xs">Task</TableHead>
                  <TableHead className="text-xs">Requestor</TableHead>
                  <TableHead className="text-xs">Acceptor</TableHead>
                  <TableHead className="text-xs text-center">Level</TableHead>
                  <TableHead className="text-xs">Raised</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalDisputes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No normal disputes</TableCell></TableRow>
                ) : normalDisputes.map(renderRow)}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="escalated">
          {escalatedDisputes.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No escalated disputes</p>
                <p className="text-sm mt-1">Disputes reaching DSP4 will appear here for admin resolution.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Dispute ID</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs">Requestor</TableHead>
                    <TableHead className="text-xs">Acceptor</TableHead>
                    <TableHead className="text-xs text-center">Level</TableHead>
                    <TableHead className="text-xs">Raised</TableHead>
                    <TableHead className="text-xs text-center">DSP4 Status</TableHead>
                    <TableHead className="text-xs w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalatedDisputes.map(renderRow)}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DSP4 Review Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!reviewDispute} onOpenChange={() => setReviewDispute(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Review Escalated Dispute
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold">{reviewDispute?.disputeId}</span> — {reviewDispute?.taskTitle}
              {reviewDispute?.dsp4Status === "resolved_valid" && (
                <span className="block mt-1 text-xs text-[hsl(35,90%,50%)]">Previously resolved as VALID. You can take further action.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Task</p>
                  <p className="font-medium">{reviewDispute?.taskTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispute Level</p>
                  <p className="font-medium text-destructive">DSP{reviewDispute?.disputeNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requestor</p>
                  <p className="font-medium">{reviewDispute?.requestor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Acceptor</p>
                  <p className="font-medium">{reviewDispute?.acceptor}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Review the task's Activity & Comments thread before making a decision.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-1">Admin Comment <span className="text-destructive">*</span></p>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Enter your reasoning for the resolution (mandatory)..."
                className="min-h-[60px]"
              />
              {!adminComment.trim() && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Comment is required for all resolution actions
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Actions</p>

              {/* Only show Resolved Valid if not already resolved valid */}
              {reviewDispute?.dsp4Status !== "resolved_valid" && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-auto py-3"
                  disabled={!adminComment.trim()}
                  onClick={() => reviewDispute && handleResolveValid(reviewDispute)}
                >
                  <AlertTriangle className="h-4 w-4 text-[hsl(35,90%,50%)]" />
                  <div className="text-left">
                    <p className="font-medium">Resolved Valid</p>
                    <p className="text-xs text-muted-foreground">Acceptor gets {DSP4_COMPLETION_DAYS} days to complete. Task stays disputed.</p>
                  </div>
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3"
                disabled={!adminComment.trim()}
                onClick={() => reviewDispute && handleResolveInvalid(reviewDispute)}
              >
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                <div className="text-left">
                  <p className="font-medium">Resolved Invalid</p>
                  <p className="text-xs text-muted-foreground">No actual work pending. Close task; settle platform-held funds per policy.</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3 border-destructive/30"
                disabled={!adminComment.trim()}
                onClick={() => reviewDispute && handleAdminClose(reviewDispute)}
              >
                <XCircle className="h-4 w-4 text-destructive" />
                <div className="text-left">
                  <p className="font-medium text-destructive">Admin Closed (Force-Close)</p>
                  <p className="text-xs text-muted-foreground">Refund requestor fully. Deduct 3% PL fee from trust deposit as penalty.</p>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminTaskDetailDialog task={viewTask?.task || null} open={!!viewTask} onOpenChange={() => setViewTask(null)} />
    </AdminLayout>
  );
};

export default AdminDisputes;

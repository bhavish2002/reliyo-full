import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import AdminLayout from "@/components/AdminLayout";
import AdminTaskDetailDialog from "@/components/AdminTaskDetailDialog";
import { Eye, CheckCircle2, XCircle, FileX, Shield, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getAllForceCloseRequests, resolveForceCloseRequest,
  type ForceCloseRequest,
} from "@/lib/adminData";
import { STATUS_LABELS, STATUS_COLORS, type TaskStatus } from "@/lib/taskTypes";

const AdminCloseRequests = () => {
  const [requests, setRequests] = useState<ForceCloseRequest[]>([]);
  const [reviewReq, setReviewReq] = useState<ForceCloseRequest | null>(null);
  const [viewTask, setViewTask] = useState<ForceCloseRequest | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const reload = () => setRequests(getAllForceCloseRequests());
  useEffect(() => { reload(); }, []);
  useEffect(() => {
    const interval = setInterval(reload, 3000);
    return () => clearInterval(interval);
  }, []);

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  const handleApprove = (r: ForceCloseRequest) => {
    if (!adminComment.trim()) {
      toast({ title: "Comment Required", description: "Admin comment is mandatory for approving force-close requests.", variant: "destructive" });
      return;
    }
    resolveForceCloseRequest(r.id, "approved", adminComment.trim());
    setReviewReq(null);
    setAdminComment("");
    reload();
    toast({ title: "Request Approved", description: `Task "${r.taskTitle}" has been force-closed.` });
  };

  const handleReject = (r: ForceCloseRequest) => {
    if (!adminComment.trim()) {
      toast({ title: "Comment Required", description: "Admin comment is mandatory for rejecting force-close requests.", variant: "destructive" });
      return;
    }
    resolveForceCloseRequest(r.id, "rejected", adminComment.trim());
    setReviewReq(null);
    setAdminComment("");
    reload();
    toast({ title: "Request Rejected", description: `Task remains in its current status.` });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Close Requests</h1>
        <p className="text-sm text-muted-foreground">Review force-close requests from requestors</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{requests.length}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[hsl(35,90%,50%)]">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[hsl(var(--success))]">{resolved.length}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending requests */}
      <h2 className="text-sm font-bold text-foreground mb-2">Pending Requests</h2>
      <Card className="rounded-xl overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Task ID</TableHead>
              <TableHead className="text-xs">Title</TableHead>
              <TableHead className="text-xs">Requestor</TableHead>
              <TableHead className="text-xs">Acceptor</TableHead>
              <TableHead className="text-xs">Task Status</TableHead>
              <TableHead className="text-xs">Requested</TableHead>
              <TableHead className="text-xs w-40"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <FileX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No pending requests
                </TableCell>
              </TableRow>
            ) : pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.taskDisplayId}</TableCell>
                <TableCell className="text-sm font-medium max-w-[180px] truncate">{r.taskTitle}</TableCell>
                <TableCell className="text-sm">{r.requestor}</TableCell>
                <TableCell className="text-sm">{r.acceptor}</TableCell>
                <TableCell>
                  <Badge className={`${STATUS_COLORS[r.taskStatusAtRequest as TaskStatus] || "bg-muted"} text-[10px]`}>
                    {STATUS_LABELS[r.taskStatusAtRequest as TaskStatus] || r.taskStatusAtRequest}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewTask(r)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-primary/30 text-primary" onClick={() => { setReviewReq(r); setAdminComment(""); }}>
                      <Shield className="h-3 w-3" /> Review
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-foreground mb-2">Resolved Requests</h2>
          <Card className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Task ID</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Requestor</TableHead>
                  <TableHead className="text-xs">Result</TableHead>
                  <TableHead className="text-xs">Resolved</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolved.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.taskDisplayId}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[180px] truncate">{r.taskTitle}</TableCell>
                    <TableCell className="text-sm">{r.requestor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${r.status === "approved" ? "text-[hsl(var(--success))] border-[hsl(var(--success))]/30" : "text-destructive border-destructive/30"}`}>
                        {r.status === "approved" ? "APPROVED" : "REJECTED"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewTask(r)}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewReq} onOpenChange={() => setReviewReq(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Review Force-Close Request
            </DialogTitle>
            <DialogDescription>
              {reviewReq?.taskTitle} — requested by {reviewReq?.requestor}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Task</p>
                  <p className="font-medium text-sm">{reviewReq?.taskTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Task Status</p>
                  <p className="font-medium text-sm">{reviewReq ? STATUS_LABELS[reviewReq.taskStatusAtRequest as TaskStatus] || reviewReq.taskStatusAtRequest : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Requestor</p>
                  <p className="font-medium text-sm">{reviewReq?.requestor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Acceptor</p>
                  <p className="font-medium text-sm">{reviewReq?.acceptor}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Review the task details and activity before making a decision.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">Admin Comment <span className="text-destructive">*</span></p>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Enter your reasoning (mandatory)..."
                className="min-h-[70px]"
              />
              {!adminComment.trim() && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Comment is required to approve or reject
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3"
                disabled={!adminComment.trim()}
                onClick={() => reviewReq && handleApprove(reviewReq)}
              >
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                <div className="text-left">
                  <p className="font-medium">Approve — Force Close</p>
                  <p className="text-xs text-muted-foreground">Task moves to Force Closed. Reward refunded to requestor, trust deposit penalty applied.</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3"
                disabled={!adminComment.trim()}
                onClick={() => reviewReq && handleReject(reviewReq)}
              >
                <XCircle className="h-4 w-4 text-destructive" />
                <div className="text-left">
                  <p className="font-medium">Reject</p>
                  <p className="text-xs text-muted-foreground">Task remains in its current status. Request dismissed.</p>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <AdminTaskDetailDialog
        task={viewTask?.task || null}
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
      />
    </AdminLayout>
  );
};

export default AdminCloseRequests;

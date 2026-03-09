import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  type Task, type TaskStatus, type TimelineEntry,
  STATUS_COLORS, STATUS_LABELS, PLATFORM_FEE_PERCENT, TRUST_DEPOSIT_PERCENT,
} from "@/lib/taskTypes";
import { format } from "date-fns";
import { generateDisputeId, isEscalated, MAX_DISPUTES } from "@/lib/disputeId";
import { AlertTriangle, Lock, Info, Star, MessageSquare, Settings, Shield, Bell, Clock } from "lucide-react";

const ROLE_ICONS: Record<string, React.ElementType> = {
  status_change: Settings,
  alert: Bell,
  admin_action: Shield,
  escrow: Lock,
  rating: Star,
  comment: MessageSquare,
};

interface AdminTaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminTaskDetailDialog = ({ task, open, onOpenChange }: AdminTaskDetailDialogProps) => {
  if (!task) return null;

  const status = task.status as TaskStatus;
  const fee = parseFloat((task.reward * (PLATFORM_FEE_PERCENT / 100)).toFixed(2));
  const acceptorPayout = parseFloat((task.reward - fee).toFixed(2));
  const trustDeposit = parseFloat((task.reward * (TRUST_DEPOSIT_PERCENT / 100)).toFixed(2));

  // Load timeline
  let timeline: TimelineEntry[] = [];
  try {
    timeline = JSON.parse(localStorage.getItem(`reliyo_timeline_${task.id}`) || "[]");
  } catch {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[status] || "bg-muted"} text-xs`}>
              {STATUS_LABELS[status] || task.status}
            </Badge>
            <span className="text-lg font-bold text-foreground">{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</span>
          </div>
          <DialogTitle className="text-lg">{task.title}</DialogTitle>
          {task.taskId && (
            <p className="text-xs font-mono text-muted-foreground select-all">{task.taskId}</p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="space-y-4 pb-4">
            {/* Dispute banner */}
            {status === "disputed" && task.disputeCount && task.disputeCount > 0 && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                isEscalated(task.disputeCount)
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)]"
              }`}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-mono font-semibold">{generateDisputeId(task.taskId, task.disputeCount)}</span>
                <span>Dispute #{task.disputeCount}/{MAX_DISPUTES}</span>
                {isEscalated(task.disputeCount) && <span className="font-bold">⚠️ ESCALATED</span>}
              </div>
            )}

            {/* Task Details */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Task Details</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Description</p><p className="font-medium">{task.description || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Work Type</p><p className="font-medium">{task.workType || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{task.location || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-medium">{task.deadline ? format(new Date(task.deadline), "MMMM do, yyyy") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Domain</p><p className="font-medium">{task.domain || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Skills</p><p className="font-medium">{task.skills?.join(", ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Manpower</p><p className="font-medium">{task.manpower}</p></div>
                <div><p className="text-xs text-muted-foreground">Update Frequency</p><p className="font-medium">{task.updateFrequency || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{task.createdAt ? format(new Date(task.createdAt), "MMM d, yyyy h:mm a") : "—"}</p></div>
              </div>
            </div>

            {/* People */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Requestor</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {task.createdBy?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold">{task.createdBy || "—"}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Acceptor</h3>
                {task.acceptedBy ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm font-semibold">
                        {task.acceptedBy.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold">{task.acceptedBy}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>

            {/* Pay Breakdown */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">Pay Breakdown</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Reward</span><span>{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span><span className="text-destructive">-{task.currencySymbol || "₹"}{fee.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2">
                  <span>Acceptor Payout</span>
                  <span className="text-[hsl(var(--success))]">{task.currencySymbol || "₹"}{acceptorPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Trust Deposit Locked (10%)</span>
                  <span>{task.currencySymbol || "₹"}{trustDeposit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Activity & Comments ({timeline.length})
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {timeline.map((entry) => {
                    const Icon = ROLE_ICONS[entry.entryType] || MessageSquare;
                    return (
                      <div key={entry.id} className="flex gap-2 py-1.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-foreground">{entry.author}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{entry.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTaskDetailDialog;

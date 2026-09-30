import { useEffect, useMemo, useState, type ElementType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksListRefresh } from "@/hooks/useTasksListRefresh";
import { listUserTransactions, type UserTransaction } from "@/lib/payments/api";
import {
  buildTaskFundTimeline,
  type FundTimelineStage,
  type TimelineStageState,
} from "@/lib/payments/transactionTimeline";
import { STATUS_LABELS, type TaskStatus } from "@/lib/taskTypes";
import { cn } from "@/lib/utils";

const STAGE_ICON: Record<TimelineStageState, ElementType> = {
  completed: CheckCircle2,
  current: Clock,
  upcoming: Circle,
  failed: XCircle,
};

const STAGE_COLOR: Record<TimelineStageState, string> = {
  completed: "text-[hsl(var(--success))] border-[hsl(var(--success))]",
  current: "text-primary border-primary bg-primary/5",
  upcoming: "text-muted-foreground border-border",
  failed: "text-destructive border-destructive bg-destructive/5",
};

function StageRow({ stage, isLast }: { stage: FundTimelineStage; isLast: boolean }) {
  const isCurrent = stage.state === "current";
  const Icon =
    isCurrent && (stage.id === "reward_initiated" || stage.id === "trust_initiated")
      ? Loader2
      : STAGE_ICON[stage.state];

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div
          className={cn(
            "absolute left-[15px] top-8 bottom-0 w-px",
            stage.state === "completed" ? "bg-[hsl(var(--success))]/40" : "bg-border",
          )}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background",
          STAGE_COLOR[stage.state],
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            isCurrent &&
              (stage.id === "reward_initiated" || stage.id === "trust_initiated") &&
              Icon === Loader2 &&
              "animate-spin",
          )}
        />
      </div>

      <div className={cn("flex-1 min-w-0 pb-8", isLast && "pb-0")}>
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "font-semibold text-sm",
              isCurrent ? "text-primary" : stage.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {stage.title}
          </p>
          {isCurrent && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Current</Badge>
          )}
          {stage.state === "failed" && (
            <Badge variant="destructive" className="text-[10px]">Failed</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{stage.description}</p>
        {stage.timestamp && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(stage.timestamp), "dd MMM yyyy, h:mm a")}
          </p>
        )}
        {stage.pendingAction && isCurrent && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary font-medium leading-relaxed">{stage.pendingAction}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const TransactionStatus = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const refreshKey = useTasksListRefresh();
  const [items, setItems] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !taskId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await listUserTransactions();
        if (!cancelled) {
          setItems(res.items);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load transaction status.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authLoading, isAuthenticated, taskId, refreshKey]);

  const timeline = useMemo(
    () => (taskId ? buildTaskFundTimeline(taskId, items) : null),
    [taskId, items],
  );

  const taskTxs = useMemo(
    () => items.filter((t) => t.taskId === taskId),
    [items, taskId],
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => navigate("/transactions")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground text-center py-16 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading transaction status…
          </p>
        )}

        {error && (
          <Card className="rounded-xl border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && !timeline && (
          <Card className="rounded-xl">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No transaction records found for this task.
            </CardContent>
          </Card>
        )}

        {timeline && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <ArrowRightLeft className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Transaction Status</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{timeline.headline}</h1>
              {timeline.subheadline && (
                <p className="text-sm text-muted-foreground">{timeline.subheadline}</p>
              )}
            </div>

            <Card className="rounded-xl border-primary/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 border-b border-primary/10 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">
                        {timeline.taskDisplayId ?? timeline.taskId}
                      </p>
                      <p className="font-semibold text-foreground truncate">
                        {timeline.taskTitle ?? "Task"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {timeline.taskStatus && (
                          <Badge variant="outline" className="text-[10px]">
                            {STATUS_LABELS[timeline.taskStatus as TaskStatus] ?? timeline.taskStatus}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {timeline.role}
                        </Badge>
                        {timeline.taskCancelled && (
                          <Badge variant="secondary" className="text-[10px]">Cancelled</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-foreground">
                        {timeline.symbol}
                        {timeline.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeline.role === "requestor" ? "Reward deposit" : "Trust deposit"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-6">
                  <h2 className="text-sm font-bold text-foreground mb-5">Transaction timeline</h2>
                  <div>
                    {timeline.stages.map((stage, idx) => (
                      <StageRow
                        key={stage.id}
                        stage={stage}
                        isLast={idx === timeline.stages.length - 1 && !timeline.noFurtherSettlements}
                      />
                    ))}
                  </div>
                  {timeline.noFurtherSettlements && (
                    <div className="mt-2 flex items-start gap-3 rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">No Further Settlements</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          All payments for this task have been settled.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {taskTxs.length > 1 && (
              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Related holds on this task</h3>
                  {taskTxs.map((tx) => (
                    <div key={tx.id} className="flex justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-muted-foreground capitalize">
                        {tx.purpose.replace("_", " ")}
                      </span>
                      <span className="font-medium">
                        {timeline.symbol}
                        {tx.amount.toFixed(2)} · {tx.status}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/task/${taskId}`)}>
                Open task
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" onClick={() => navigate("/transactions")}>
                All transactions
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TransactionStatus;

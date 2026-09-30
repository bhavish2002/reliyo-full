import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Calendar, ChevronRight, CheckCircle2, Clock, AlertTriangle, Trash2, Info, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { format, differenceInHours } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import {
  type Task, type TaskStatus,
  STATUS_COLORS, STATUS_LABELS,
  QUIT_GRACE_HOURS, TRUST_DEPOSIT_PERCENT,
} from "@/lib/taskTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksListRefresh } from "@/hooks/useTasksListRefresh";
import { generateDisputeId, isEscalated } from "@/lib/disputeId";
import { removeItem } from "@/lib/storage";
import {
  cancelTask,
  quitTask,
  listMyAcceptedTasks,
  listMyCreatedTasks,
  mapApiTaskToTask,
} from "@/lib/tasks/api";
import { notifyTasksChanged } from "@/lib/tasks/events";
import { ApiClientError } from "@/lib/api/client";

const MyTasks = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { formatTask } = usePreferredCurrency();
  const refreshKey = useTasksListRefresh();
  const [searchParams] = useSearchParams();
  const initialTab: "created" | "accepted" | "dispute" =
    searchParams.get("tab") === "accepted"
      ? "accepted"
      : searchParams.get("tab") === "dispute"
        ? "dispute"
        : "created";
  const [tab, setTab] = useState<"created" | "accepted" | "dispute">(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quitDialog, setQuitDialog] = useState<Task | null>(null);
  const [quitAcknowledged, setQuitAcknowledged] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [createdRes, acceptedRes] = await Promise.all([
        listMyCreatedTasks(),
        listMyAcceptedTasks(),
      ]);
      setTasks(createdRes.items.map(mapApiTaskToTask));
      setAcceptedTasks(acceptedRes.items.map(mapApiTaskToTask));
    } catch (err) {
      setTasks([]);
      setAcceptedTasks([]);
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : "We couldn't load your tasks. Please refresh and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      setTasks([]);
      setAcceptedTasks([]);
      return;
    }
    void loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey triggers refetch
  }, [authLoading, isAuthenticated, user?.id, refreshKey]);

  const sortByRecent = (a: Task, b: Task) => {
    const dateA = new Date(a.acceptedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.acceptedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  };

  const createdTasks = tasks.sort(sortByRecent);
  const myAcceptedTasks = acceptedTasks.sort(sortByRecent);

  const disputeTasks = [
    ...createdTasks.filter((t) => t.status === "disputed"),
    ...myAcceptedTasks.filter((t) => t.status === "disputed"),
  ].sort(sortByRecent);

  const canQuitTask = (task: Task) => {
    if (!task.acceptedAt) return false;
    if (task.status !== "committed") return false;
    const hoursSinceAccepted = differenceInHours(new Date(), new Date(task.acceptedAt));
    return hoursSinceAccepted < QUIT_GRACE_HOURS;
  };

  const handleQuitTask = async (task: Task) => {
    try {
      await quitTask(task.id);
      notifyTasksChanged();
      setQuitDialog(null);
      setQuitAcknowledged(false);
      await loadTasks();
      toast({
        title: "Task Quit Successfully",
        description: "Your trust deposit will be refunded. The task is back on Browse Tasks.",
      });
    } catch (err) {
      toast({
        title: "Quit failed",
        description: err instanceof ApiClientError ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      await cancelTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      removeItem(`reliyo_timeline_${task.id}`);
      notifyTasksChanged();
      setDeleteDialog(null);
      toast({
        title: "Task Cancelled",
        description: "The task has been cancelled and your reward will be refunded per policy.",
      });
    } catch (err) {
      toast({
        title: "Cancel failed",
        description: err instanceof ApiClientError ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const tabs = [
    { key: "created" as const, label: "Created", count: createdTasks.length },
    { key: "accepted" as const, label: "Accepted", count: myAcceptedTasks.length },
    { key: "dispute" as const, label: "In Dispute", count: disputeTasks.length },
  ];

  const currentList = (tab === "created" ? createdTasks : tab === "accepted" ? myAcceptedTasks : disputeTasks).filter(
    (t) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.taskId?.toLowerCase().includes(q) ?? false) ||
        t.location.toLowerCase().includes(q)
      );
    },
  );

  const hasCommittedTasks = myAcceptedTasks.some((t) => t.status === "committed");

  if (isLoading) {
    return (
      <DashboardLayout>
        <h1 className="text-2xl font-bold text-foreground mb-4">My Tasks</h1>
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading your tasks...
        </div>
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout>
        <h1 className="text-2xl font-bold text-foreground mb-4">My Tasks</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-foreground mb-4">My Tasks</h1>

      <div className="flex gap-4 border-b mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, task ID, or location..."
          className="pl-9"
        />
      </div>

      {tab === "accepted" && hasCommittedTasks && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 text-sm text-primary">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Quit Task Policy:</span> You can quit a task only within the first{" "}
            <span className="font-semibold">{QUIT_GRACE_HOURS} hours</span> after accepting it. After this period,
            the &quot;Quit Task&quot; option will be disabled and you must complete the task. If you quit, you{" "}
            <span className="font-semibold">cannot re-accept the same task</span> in the future.
          </p>
        </div>
      )}

      {currentList.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--success))]/10 p-4 text-sm text-[hsl(var(--success))]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {tab === "dispute"
            ? "No disputes — keep up the good work!"
            : tab === "accepted"
              ? searchQuery.trim()
                ? "No accepted tasks match your search."
                : "No accepted tasks yet. Browse tasks to find work!"
              : searchQuery.trim()
                ? "No created tasks match your search."
                : "No tasks created yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((task) => {
            const statusKey = task.status as TaskStatus;
            const isCommitted = task.status === "committed";
            const canQuit = canQuitTask(task);
            return (
              <Card
                key={task.id}
                className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/task/${task.id}`)}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="space-y-1.5 flex-1">
                    <Badge className={`${STATUS_COLORS[statusKey] || "bg-muted text-muted-foreground"} text-xs`}>
                      {STATUS_LABELS[statusKey] || task.status}
                    </Badge>
                    {task.taskId && (
                      <p className="text-[10px] font-mono text-muted-foreground">{task.taskId}</p>
                    )}
                    {task.status === "disputed" && task.disputeCount && task.disputeCount > 0 && (
                      <p className="text-[10px] font-mono text-destructive font-semibold">
                        {generateDisputeId(task.taskId, task.disputeCount)}
                        {isEscalated(task.disputeCount) && " ⚠️ ESCALATED"}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.location}
                        </span>
                      )}
                      {tab === "accepted" && task.createdBy && (
                        <span className="flex items-center gap-1">👤 {task.createdBy}</span>
                      )}
                      {tab === "created" && task.acceptedBy && (
                        <span className="flex items-center gap-1">👷 {task.acceptedBy}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {task.deadline ? format(new Date(task.deadline), "MMM d") : "—"}
                      </span>
                      <span>{formatTask(task.reward, task)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab === "created" && task.status === "open" && !task.acceptedBy && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog(task);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    )}
                    {tab === "accepted" && isCommitted && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canQuit}
                        className={`${
                          canQuit
                            ? "text-destructive border-destructive/30 hover:bg-destructive/10"
                            : "text-muted-foreground border-border opacity-50 cursor-not-allowed"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canQuit) {
                            setQuitAcknowledged(false);
                            setQuitDialog(task);
                          }
                        }}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {canQuit ? "Quit Task" : "Quit Expired"}
                      </Button>
                    )}
                    {task.status === "disputed" && (
                      <AlertTriangle className="h-4 w-4 text-[hsl(35,90%,50%)]" />
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!quitDialog}
        onOpenChange={(open) => {
          if (!open) {
            setQuitDialog(null);
            setQuitAcknowledged(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Quit Task?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-1">
                <p>
                  You are within the {QUIT_GRACE_HOURS}-hour grace period. Your trust deposit of{" "}
                  {quitDialog
                    ? formatTask(
                        quitDialog.reward * (TRUST_DEPOSIT_PERCENT / 100),
                        quitDialog,
                      )
                    : formatTask(0, { currency: "INR" })}{" "}
                  will be fully refunded. The task will be released back to Browse Tasks.
                </p>
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <Checkbox
                    id="quit-acknowledge"
                    checked={quitAcknowledged}
                    onCheckedChange={(checked) => setQuitAcknowledged(checked === true)}
                  />
                  <label htmlFor="quit-acknowledge" className="text-sm leading-snug cursor-pointer text-foreground">
                    I understand that if I quit this task, my trust deposit will be refunded within the grace period,
                    but I will <span className="font-semibold">permanently lose the ability to re-accept this same
                    task</span> in the future.
                  </label>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuitDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!quitAcknowledged}
              onClick={() => quitDialog && handleQuitTask(quitDialog)}
            >
              Confirm Quit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Delete Task?
            </DialogTitle>
            <DialogDescription>
              This will cancel and archive the task &quot;{deleteDialog?.title}&quot;. Your reward deposit of{" "}
              {deleteDialog ? formatTask(deleteDialog.reward, deleteDialog) : formatTask(0, { currency: "INR" })}{" "}
              will be fully refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteDialog && handleDeleteTask(deleteDialog)}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyTasks;

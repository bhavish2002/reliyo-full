import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Calendar, ChevronRight, CheckCircle2, Clock, AlertTriangle, Trash2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { format, differenceInHours } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  type Task, type TaskStatus,
  STATUS_COLORS, STATUS_LABELS,
  QUIT_GRACE_HOURS,
} from "@/lib/taskTypes";
import { getCurrentUser } from "@/lib/auth";
import { notifyAcceptorQuit } from "@/lib/notifications";
import { generateDisputeId, isEscalated } from "@/lib/disputeId";
import { readJson, writeJson, removeItem } from "@/lib/storage";
import { env } from "@/lib/env";

const DEMO_TASKS: Task[] = [
  { id: "demo1", taskId: "RLY-TSK-2026-F2H8K4", title: "Deliver documents to Koramangala office", status: "open", location: "Bengaluru", reward: 4500, deadline: "2026-02-15", createdAt: "2026-02-10T10:00:00Z", createdBy: "Arjun Mehta", description: "", workType: "Physical", manpower: 1, skills: [], domain: "Delivery", updateFrequency: "Daily" },
  { id: "demo2", taskId: "RLY-TSK-2026-G5N3P7", title: "Design a logo for my bakery startup", status: "in_progress", location: "Mumbai", reward: 2000, deadline: "2026-02-21", createdAt: "2026-02-08T10:00:00Z", createdBy: "Arjun Mehta", acceptedBy: "Priya Sharma", description: "", workType: "Virtual", manpower: 1, skills: [], domain: "Design", updateFrequency: "Weekly" },
  { id: "demo3", taskId: "RLY-TSK-2026-H9Q6R2", title: "Translate product brochure to Hindi", status: "done", location: "Lucknow", reward: 1500, deadline: "2026-03-02", createdAt: "2026-02-05T10:00:00Z", createdBy: "Arjun Mehta", acceptedBy: "Sanjay Patel", description: "", workType: "Virtual", manpower: 1, skills: [], domain: "Translation", updateFrequency: "Weekly" },
];

const DEMO_ACCEPTED: Task[] = [
  { id: "accepted1", taskId: "RLY-TSK-2026-A3M7K9", title: "Social media management for 1 week", status: "committed", location: "", reward: 10000, deadline: "2026-02-25", createdAt: "2026-02-12T10:00:00Z", createdBy: "Priya", description: "", workType: "Virtual", manpower: 1, skills: [], domain: "", updateFrequency: "", acceptedAt: new Date().toISOString() },
];

const MyTasks = () => {
  const navigate = useNavigate();
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
  const [deleteDialog, setDeleteDialog] = useState<Task | null>(null);

  const currentUser = getCurrentUser();
  const currentUserName = currentUser?.name || "";

  useEffect(() => {
    try {
      const stored = readJson<Task[]>("reliyo_tasks", []);
      if (stored.length === 0 && env.enableDemoData) {
        writeJson("reliyo_tasks", DEMO_TASKS);
        setTasks(DEMO_TASKS);
      } else {
        setTasks(stored);
      }

      const storedAccepted = readJson<Task[]>("reliyo_accepted_tasks", []);
      if ((currentUser?.role === "acceptor" || currentUserName === "Priya Sharma") && env.enableDemoData) {
        const ids = new Set(storedAccepted.map((t) => t.id));
        const merged = [...storedAccepted, ...DEMO_ACCEPTED.filter((t) => !ids.has(t.id))];
        setAcceptedTasks(merged);
      } else {
        setAcceptedTasks(storedAccepted);
      }
    } catch {
      setLoadError("We couldn't load your tasks. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.role, currentUserName]);

  const sortByRecent = (a: Task, b: Task) => {
    const dateA = new Date(a.acceptedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.acceptedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  };

  const createdTasks = tasks.filter((t) => t.createdBy === currentUserName).sort(sortByRecent);
  
  const myAcceptedTasks = acceptedTasks.filter((t) => 
    t.acceptedBy === currentUserName || 
    (currentUser?.role === "acceptor" && !t.acceptedBy)
  ).sort(sortByRecent);

  const disputeTasks = [
    ...createdTasks.filter((t) => t.status === "disputed"),
    ...myAcceptedTasks.filter((t) => t.status === "disputed"),
  ].sort(sortByRecent);

  const canQuitTask = (task: Task) => {
    if (!task.acceptedAt) return false;
    if (task.status !== "committed") return false;
    const hoursSinceAccepted = differenceInHours(new Date(), new Date(task.acceptedAt));
    return hoursSinceAccepted <= QUIT_GRACE_HOURS;
  };

  const handleQuitTask = (task: Task) => {
    const updatedAccepted = acceptedTasks.filter((t) => t.id !== task.id);
    setAcceptedTasks(updatedAccepted);
    writeJson("reliyo_accepted_tasks", updatedAccepted.filter((t) => t.id !== task.id));

    const storedTasks = readJson<Task[]>("reliyo_tasks", []);
    const idx = storedTasks.findIndex((t: Task) => t.id === task.id);
    if (idx >= 0) {
      storedTasks[idx] = { ...storedTasks[idx], status: "open", acceptedBy: undefined, acceptedAt: undefined };
      writeJson("reliyo_tasks", storedTasks);
      setTasks(storedTasks);
    }

    removeItem(`reliyo_timeline_${task.id}`);
    notifyAcceptorQuit(task);

    setQuitDialog(null);
    toast({
      title: "Task Quit Successfully",
      description: "Your trust deposit will be refunded. The task is back on Browse Tasks.",
    });
  };

  const handleDeleteTask = (task: Task) => {
    const storedTasks = readJson<Task[]>("reliyo_tasks", []);
    const updated = storedTasks.filter((t: Task) => t.id !== task.id);
    writeJson("reliyo_tasks", updated);
    setTasks(updated);

    removeItem(`reliyo_timeline_${task.id}`);
    setDeleteDialog(null);
    toast({
      title: "Task Cancelled",
      description: "The task has been hidden and your reward deposit will be refunded.",
    });
  };

  const tabs = [
    { key: "created" as const, label: "Created", count: createdTasks.length },
    { key: "accepted" as const, label: "Accepted", count: myAcceptedTasks.length },
    { key: "dispute" as const, label: "In Dispute", count: disputeTasks.length },
  ];

  const currentList = tab === "created" ? createdTasks : tab === "accepted" ? myAcceptedTasks : disputeTasks;

  // Check if any accepted task is in committed status
  const hasCommittedTasks = myAcceptedTasks.some(t => t.status === "committed");

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

      {/* Quit task info notice for Accepted tab */}
      {tab === "accepted" && hasCommittedTasks && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 text-sm text-primary">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Quit Task Policy:</span> You can quit a task only within the first <span className="font-semibold">{QUIT_GRACE_HOURS} hours</span> after accepting it. After this period, the "Quit Task" option will be disabled and you must complete the task.
          </p>
        </div>
      )}

      {currentList.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--success))]/10 p-4 text-sm text-[hsl(var(--success))]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {tab === "dispute"
            ? "No disputes — keep up the good work!"
            : tab === "accepted"
            ? "No accepted tasks yet. Browse tasks to find work!"
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
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.location}</span>
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
                      <span>{task.currencySymbol || "₹"} {task.reward.toLocaleString()}</span>
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
                        className={`${canQuit 
                          ? "text-destructive border-destructive/30 hover:bg-destructive/10" 
                          : "text-muted-foreground border-border opacity-50 cursor-not-allowed"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canQuit) setQuitDialog(task);
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

      {/* Quit task confirmation dialog */}
      <Dialog open={!!quitDialog} onOpenChange={() => setQuitDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Quit Task?
            </DialogTitle>
            <DialogDescription>
              You are within the {QUIT_GRACE_HOURS}-hour grace period. Your trust deposit of {quitDialog ? (quitDialog.currencySymbol || "₹") : "₹"}{quitDialog ? (quitDialog.reward * 0.1).toFixed(2) : "0.00"} will be fully refunded. The task will be released back to Browse Tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuitDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => quitDialog && handleQuitTask(quitDialog)}>
              Confirm Quit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete task confirmation dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Delete Task?
            </DialogTitle>
            <DialogDescription>
              This will cancel and archive the task "{deleteDialog?.title}". Your reward deposit of {deleteDialog?.currencySymbol || "₹"}{deleteDialog?.reward.toLocaleString() || 0} will be fully refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
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

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Calendar, ChevronRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
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
  const initialTab = searchParams.get("tab") === "accepted" ? "accepted" : searchParams.get("tab") === "dispute" ? "dispute" : "created";
  const [tab, setTab] = useState<"created" | "accepted" | "dispute">(initialTab as any);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [quitDialog, setQuitDialog] = useState<Task | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    if (stored.length === 0) {
      localStorage.setItem("reliyo_tasks", JSON.stringify(DEMO_TASKS));
      setTasks(DEMO_TASKS);
    } else {
      setTasks(stored);
    }

    const storedAccepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    const ids = new Set(storedAccepted.map((t) => t.id));
    const merged = [...storedAccepted, ...DEMO_ACCEPTED.filter((t) => !ids.has(t.id))];
    setAcceptedTasks(merged);
  }, []);

  const createdTasks = tasks.filter((t) => t.createdBy === "Arjun Mehta");
  
  // Disputed tasks: from both created and accepted that are in "disputed" status
  const disputeTasks = [
    ...createdTasks.filter((t) => t.status === "disputed"),
    ...acceptedTasks.filter((t) => t.status === "disputed"),
  ];

  const canQuitTask = (task: Task) => {
    if (!task.acceptedAt) return false;
    if (task.status !== "committed") return false;
    const hoursSinceAccepted = differenceInHours(new Date(), new Date(task.acceptedAt));
    return hoursSinceAccepted <= QUIT_GRACE_HOURS;
  };

  const handleQuitTask = (task: Task) => {
    const updated = acceptedTasks.filter((t) => t.id !== task.id);
    setAcceptedTasks(updated);
    const storedAccepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    localStorage.setItem(
      "reliyo_accepted_tasks",
      JSON.stringify(storedAccepted.filter((t: Task) => t.id !== task.id))
    );
    // Clean up timeline
    localStorage.removeItem(`reliyo_timeline_${task.id}`);
    setQuitDialog(null);
    toast({
      title: "Task Quit Successfully",
      description: "Your trust deposit will be refunded. The task is back on Browse Tasks.",
    });
  };

  const tabs = [
    { key: "created" as const, label: "Created", count: createdTasks.length },
    { key: "accepted" as const, label: "Accepted", count: acceptedTasks.length },
    { key: "dispute" as const, label: "In Dispute", count: disputeTasks.length },
  ];

  const currentList = tab === "created" ? createdTasks : tab === "accepted" ? acceptedTasks : disputeTasks;

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
                      <span>₹ {task.reward.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab === "accepted" && task.status === "committed" && canQuitTask(task) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuitDialog(task);
                        }}
                      >
                        Quit Task
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
              You are within the {QUIT_GRACE_HOURS}-hour grace period. Your trust deposit of ₹{quitDialog ? Math.round(quitDialog.reward * 0.1).toLocaleString() : 0} will be fully refunded. The task will be released back to Browse Tasks.
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
    </DashboardLayout>
  );
};

export default MyTasks;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, ChevronRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  location: string;
  reward: number;
  deadline: string;
  createdAt: string;
  createdBy: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary text-primary-foreground",
  draft: "bg-muted-foreground text-primary-foreground",
  in_progress: "bg-destructive text-destructive-foreground",
  completed: "bg-success text-success-foreground",
  committed: "bg-success text-success-foreground",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  committed: "Committed",
  closed: "Closed",
};

// Seed some demo tasks on first load
const DEMO_TASKS: Task[] = [
  { id: "demo1", title: "Deliver documents to Koramangala office", status: "open", location: "Bengaluru", reward: 4500, deadline: "2026-02-15", createdAt: "2026-02-10T10:00:00Z", createdBy: "Arjun Mehta" },
  { id: "demo2", title: "Design a logo for my bakery startup", status: "in_progress", location: "Mumbai", reward: 2000, deadline: "2026-02-21", createdAt: "2026-02-08T10:00:00Z", createdBy: "Arjun Mehta" },
  { id: "demo3", title: "Translate product brochure to Hindi", status: "completed", location: "Lucknow", reward: 1500, deadline: "2026-03-02", createdAt: "2026-02-05T10:00:00Z", createdBy: "Arjun Mehta" },
  { id: "demo4", title: "Paint exterior walls of warehouse", status: "draft", location: "Ahmedabad", reward: 8000, deadline: "2026-02-25", createdAt: "2026-02-01T10:00:00Z", createdBy: "Arjun Mehta" },
];

const DEMO_ACCEPTED: Task[] = [
  { id: "accepted1", title: "Social media management for 1 week", status: "committed", location: "", reward: 10000, deadline: "2026-02-25", createdAt: "2026-02-12T10:00:00Z", createdBy: "Priya" },
];

const MyTasks = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"created" | "accepted" | "dispute">("created");
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    // Merge demos if no tasks exist
    if (stored.length === 0) {
      localStorage.setItem("reliyo_tasks", JSON.stringify(DEMO_TASKS));
      setTasks(DEMO_TASKS);
    } else {
      setTasks(stored);
    }
  }, []);

  const createdTasks = tasks.filter((t) => t.createdBy === "Arjun Mehta");
  const storedAccepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
  const acceptedTasks = [...DEMO_ACCEPTED, ...storedAccepted];
  const disputeTasks: Task[] = [];

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
        <div className="flex items-center gap-2 rounded-lg bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {tab === "dispute"
            ? "No disputes yet — keep up the good work"
            : "No tasks here yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((task) => (
            <Card
              key={task.id}
              className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/task/${task.id}`)}
            >
              <div className="flex items-center justify-between p-4">
                <div className="space-y-1.5">
                  <Badge className={`${STATUS_COLORS[task.status] || "bg-muted text-muted-foreground"} text-xs`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground">{task.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {task.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.location}</span>
                    )}
                    {tab === "accepted" && task.createdBy && (
                      <span className="flex items-center gap-1">👤 {task.createdBy}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {task.deadline ? format(new Date(task.deadline), "MMM d") : "—"}
                    </span>
                    <span>₹ {task.reward.toLocaleString()}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyTasks;

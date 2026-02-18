import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Star, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary text-primary-foreground",
  draft: "bg-muted-foreground text-primary-foreground",
  in_progress: "bg-destructive text-destructive-foreground",
  completed: "bg-success text-success-foreground",
  committed: "bg-success text-success-foreground",
  closed: "bg-muted text-muted-foreground",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Open", draft: "Draft", in_progress: "In Progress",
  completed: "Completed", committed: "Committed", closed: "Closed",
};

const PLATFORM_FEE_PERCENT = 7;

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  workType: string;
  manpower: number;
  location: string;
  deadline: string;
  updateFrequency: string;
  skills: string[];
  domain: string;
  reward: number;
  createdAt: string;
  createdBy: string;
}

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    const found = tasks.find((t) => t.id === id);
    if (found) setTask(found);
  }, [id]);

  if (!task) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Task not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/my-tasks")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Tasks
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const fee = Math.round(task.reward * (PLATFORM_FEE_PERCENT / 100));
  const acceptorPayout = task.reward - fee;
  const isOwner = task.createdBy === "Arjun Mehta";
  const needsRating = task.status === "completed";

  const timeline = [
    { label: "Task created", by: task.createdBy, date: task.createdAt, icon: <Circle className="h-4 w-4 text-primary" />, filled: true },
    { label: "Reward locked in escrow", by: "System", date: task.createdAt, icon: <Circle className="h-4 w-4 text-muted-foreground" />, filled: false },
    { label: "Task published", by: "System", date: task.createdAt, icon: <Circle className="h-4 w-4 text-muted-foreground" />, filled: false },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <Badge className={`${STATUS_COLORS[task.status] || "bg-muted"} text-xs`}>
            {STATUS_LABELS[task.status] || task.status}
          </Badge>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">₹{task.reward.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Reward</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mt-2">{task.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{task.description}</p>

        {needsRating && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Rating required to close this task. Please submit your rating below.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Task Details */}
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <h2 className="text-base font-bold text-foreground mb-4">Task Details</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div><p className="text-xs text-primary">Title</p><p className="font-medium">{task.title}</p></div>
                  <div><p className="text-xs text-primary">Work Type</p><p className="font-medium">{task.workType || "—"}</p></div>
                  <div><p className="text-xs text-primary">Description</p><p className="font-medium">{task.description}</p></div>
                  <div><p className="text-xs text-primary">Manpower</p><p className="font-medium">{task.manpower}</p></div>
                  <div><p className="text-xs text-primary">Location</p><p className="font-medium">{task.location || "—"}</p></div>
                  <div><p className="text-xs text-primary">Deadline</p><p className="font-medium">{task.deadline ? format(new Date(task.deadline), "MMMM do, yyyy") : "—"}</p></div>
                  <div><p className="text-xs text-primary">Update Frequency</p><p className="font-medium">{task.updateFrequency || "—"}</p></div>
                  <div><p className="text-xs text-primary">Skills</p><p className="font-medium">{task.skills?.join(", ") || "—"}</p></div>
                  <div><p className="text-xs text-primary">Domain</p><p className="font-medium">{task.domain || "—"}</p></div>
                  <div><p className="text-xs text-primary">Reward</p><p className="font-medium text-primary">₹{task.reward.toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <h2 className="text-base font-bold text-foreground mb-4">Task Timeline</h2>
                <div className="space-y-4">
                  {timeline.map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${event.filled ? "bg-primary/10" : "bg-muted"}`}>
                          {event.filled ? <CheckCircle2 className="h-4 w-4 text-primary" /> : event.icon}
                        </div>
                        {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-semibold text-foreground">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.by} • {format(new Date(event.date), "MMM d, yyyy, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <Card className="rounded-xl">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Actions</h3>
                {isOwner ? (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                    <Info className="h-4 w-4 shrink-0" />
                    You cannot accept your own Task.
                  </div>
                ) : needsRating ? (
                  <Button className="w-full">Submit Rating to Close</Button>
                ) : (
                  <Button className="w-full">Accept Task</Button>
                )}
              </CardContent>
            </Card>

            {/* Requestor */}
            <Card className="rounded-xl">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Requestor</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">A</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{task.createdBy}</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4].map(i => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                      <Star className="h-3 w-3 text-primary" />
                      <span className="ml-1 text-xs text-muted-foreground">4.7 (73)</span>
                    </div>
                    <p className="text-xs text-success mt-0.5">● 94% reliable</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pay Breakdown */}
            <Card className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Pay Breakdown</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Reward</span><span>₹{task.reward.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span><span className="text-destructive">-₹{fee}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Acceptor Payout</span>
                    <span className="text-success">₹{acceptorPayout}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TaskDetail;

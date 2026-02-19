import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Star, CheckCircle2, Circle, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

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
const TRUST_DEPOSIT_PERCENT = 10;

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

// Demo browse tasks for lookup when not in localStorage
const DEMO_BROWSE_TASKS: Task[] = [
  {
    id: "browse1", title: "Deliver documents to Koramangala office",
    description: "Pick up documents from HSR Layout and deliver to Koramangala office before 5 PM. Must have own vehicle.",
    status: "open", location: "Bengaluru", reward: 500, deadline: "2026-02-15",
    createdAt: "2026-02-10T10:00:00Z", createdBy: "Ravi Kumar",
    skills: ["physical", "delivery", "local-knowledge"], domain: "Delivery", workType: "Physical",
    manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "browse2", title: "Design a logo for my bakery startup",
    description: "Need a modern, minimalist logo for an artisan bakery. Must deliver in AI and PNG formats.",
    status: "open", location: "Mumbai", reward: 2000, deadline: "2026-02-21",
    createdAt: "2026-02-08T10:00:00Z", createdBy: "Priya Sharma",
    skills: ["design", "creative"], domain: "Design", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "browse3", title: "Translate product brochure to Tamil",
    description: "Professional translation of a 10-page product brochure from English to Tamil. Must maintain formatting.",
    status: "open", location: "Chennai", reward: 1500, deadline: "2026-03-02",
    createdAt: "2026-02-05T10:00:00Z", createdBy: "Sanjay Patel",
    skills: ["translation", "tamil", "english"], domain: "Translation", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "browse4", title: "Build a landing page for SaaS product",
    description: "Create a responsive landing page using React and Tailwind CSS. Must include hero, features, pricing sections.",
    status: "open", location: "Remote", reward: 5000, deadline: "2026-03-10",
    createdAt: "2026-02-12T10:00:00Z", createdBy: "Meera Joshi",
    skills: ["react", "tailwind", "frontend"], domain: "Technology", workType: "Virtual",
    manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "browse5", title: "Write SEO blog articles on fintech",
    description: "Write 5 high-quality blog articles of 1500 words each on fintech topics. Must be SEO-optimized.",
    status: "open", location: "Remote", reward: 3000, deadline: "2026-02-28",
    createdAt: "2026-02-11T10:00:00Z", createdBy: "Ankit Verma",
    skills: ["writing", "seo", "fintech"], domain: "Writing", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
];

const DEMO_ACCEPTED: Task[] = [
  { id: "accepted1", title: "Social media management for 1 week", status: "committed", location: "", reward: 10000, deadline: "2026-02-25", createdAt: "2026-02-12T10:00:00Z", createdBy: "Priya", description: "", workType: "Virtual", manpower: 1, skills: [], domain: "", updateFrequency: "" },
];

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [task, setTask] = useState<Task | null>(null);
  const [acceptStep, setAcceptStep] = useState<"none" | "conflict" | "deposit">("none");
  const [conflictTask, setConflictTask] = useState<Task | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const fromBrowse = location.state?.fromBrowse ?? false;

  useEffect(() => {
    const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    let found = tasks.find((t) => t.id === id);
    if (!found) {
      found = DEMO_BROWSE_TASKS.find((t) => t.id === id);
    }
    if (found) setTask(found);
  }, [id]);

  if (!task) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Task not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const fee = Math.round(task.reward * (PLATFORM_FEE_PERCENT / 100));
  const acceptorPayout = task.reward - fee;
  const trustDeposit = Math.round(task.reward * (TRUST_DEPOSIT_PERCENT / 100));
  const isOwner = task.createdBy === "Arjun Mehta";
  const needsRating = task.status === "completed";

  // Check if task is already accepted by this user
  const acceptedTasks = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]");
  const isAlreadyAccepted = acceptedTasks.some((t: any) => t.id === task.id);

  const handleAcceptClick = () => {
    // Check for conflicting deadlines in accepted tasks
    const acceptedTasks = [...DEMO_ACCEPTED];
    const storedAccepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    const allAccepted = [...acceptedTasks, ...storedAccepted];

    const conflict = allAccepted.find(
      (t) => t.deadline && task.deadline && t.deadline === task.deadline
    );

    if (conflict) {
      setConflictTask(conflict);
      setAcceptStep("conflict");
    } else {
      setAcceptStep("deposit");
    }
  };

  const proceedToDeposit = () => {
    setConflictTask(null);
    setAcceptStep("deposit");
  };

  const confirmAccept = () => {
    // Redirect to payment gateway for trust deposit
    navigate("/payment", {
      state: {
        taskData: task,
        amount: trustDeposit,
        platformFee: 0,
        isAcceptFlow: true,
      },
    });
  };

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
            <Card className="rounded-xl">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Actions</h3>
                {isOwner ? (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                    <Info className="h-4 w-4 shrink-0" />
                    You cannot accept your own Task.
                  </div>
                ) : isAlreadyAccepted ? (
                  <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    You have already accepted this task.
                  </div>
                ) : needsRating ? (
                  <Button className="w-full">Submit Rating to Close</Button>
                ) : task.status === "open" ? (
                  <Button className="w-full" onClick={handleAcceptClick}>Accept Task</Button>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    Task is no longer available for acceptance.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Requestor</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {task.createdBy?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{task.createdBy}</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4].map(i => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                      <Star className="h-3 w-3 text-primary" />
                      <span className="ml-1 text-xs text-muted-foreground">4.7 (23)</span>
                    </div>
                    <p className="text-xs text-success mt-0.5">✓ 67% reliable</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Trust Deposit Locked (10%)</span>
                    <span>₹{trustDeposit}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-primary">
                  <p>Requestor: Reward is refunded if the task is cancelled or not completed.</p>
                  <p>Acceptor: Deposit is refunded upon successful completion; forfeited if the task fails.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Conflict dialog */}
      <Dialog open={acceptStep === "conflict"} onOpenChange={() => setAcceptStep("none")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Deadline Conflict
            </DialogTitle>
            <DialogDescription>
              You already have an accepted task <strong>"{conflictTask?.title}"</strong> with the same deadline ({task.deadline ? format(new Date(task.deadline), "MMM d, yyyy") : "—"}). Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcceptStep("none")}>Cancel</Button>
            <Button onClick={proceedToDeposit}>Proceed Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept / Lock Deposit dialog */}
      <Dialog open={acceptStep === "deposit"} onOpenChange={() => setAcceptStep("none")}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Lock Trust Deposit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Info className="h-4 w-4" /> Pay Breakdown
              </div>
              <div className="flex justify-between text-sm py-2">
                <span>Total Deposit</span>
                <span className="font-semibold">₹{trustDeposit.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-3">
              <span>Total Payout</span>
              <span className="text-lg">₹{trustDeposit.toLocaleString()}</span>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary mb-2">Terms & conditions ⓘ</p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="accept-terms"
                  checked={agreedTerms}
                  onCheckedChange={(v) => setAgreedTerms(v === true)}
                />
                <label htmlFor="accept-terms" className="text-sm leading-snug cursor-pointer">
                  I hereby agree to the terms and conditions above
                </label>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-success/10 border border-success/20 p-3 text-sm text-success">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>Your full deposit amount will be refunded on successful task completion.</p>
                <p>In case of task failures this deposit is completely forfeited.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setAcceptStep("none")}>
              ← Previous
            </Button>
            <Button disabled={!agreedTerms} onClick={confirmAccept} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Confirm & Accept Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TaskDetail;

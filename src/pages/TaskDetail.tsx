import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Info, Star, CheckCircle2, Circle, AlertTriangle, Lock, Trash2, Clock, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import TaskTimeline from "@/components/TaskTimeline";
import { format, differenceInHours } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  type Task, type TaskStatus, type TimelineEntry, type AuthorRole,
  STATUS_COLORS, STATUS_LABELS,
  PLATFORM_FEE_PERCENT, TRUST_DEPOSIT_PERCENT, QUIT_GRACE_HOURS,
  getEffectiveDeadline,
} from "@/lib/taskTypes";
import { getCurrentUser } from "@/lib/auth";
import { checkInactivity, sendStrikeNotifications } from "@/lib/inactivity";
import { generateDisputeId, isEscalated, MAX_DISPUTES } from "@/lib/disputeId";
import { notifyTaskClosed } from "@/lib/notifications";
import { readJson, writeJson, removeItem } from "@/lib/storage";
import { env } from "@/lib/env";
import { comparePolicyStatus, normalizePolicyStatus } from "@/lib/taskPolicy";

// ── Demo browse tasks for lookup ─────────────────────────────────────────────
const DEMO_BROWSE_TASKS: Task[] = [
  {
    id: "browse1", taskId: "RLY-TSK-2026-D8K3M7", title: "Deliver documents to Koramangala office",
    description: "Pick up documents from HSR Layout and deliver to Koramangala office before 5 PM. Must have own vehicle.",
    status: "open", location: "Bengaluru", reward: 500, deadline: "2026-02-15",
    createdAt: "2026-02-10T10:00:00Z", createdBy: "Ravi Kumar",
    skills: ["physical", "delivery", "local-knowledge"], domain: "Delivery", workType: "Physical",
    manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "browse2", taskId: "RLY-TSK-2026-L4P9N2", title: "Design a logo for my bakery startup",
    description: "Need a modern, minimalist logo for an artisan bakery. Must deliver in AI and PNG formats.",
    status: "open", location: "Mumbai", reward: 2000, deadline: "2026-02-21",
    createdAt: "2026-02-08T10:00:00Z", createdBy: "Priya Sharma",
    skills: ["design", "creative"], domain: "Design", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "browse3", taskId: "RLY-TSK-2026-T7R2X5", title: "Translate product brochure to Tamil",
    description: "Professional translation of a 10-page product brochure from English to Tamil. Must maintain formatting.",
    status: "open", location: "Chennai", reward: 1500, deadline: "2026-03-02",
    createdAt: "2026-02-05T10:00:00Z", createdBy: "Sanjay Patel",
    skills: ["translation", "tamil", "english"], domain: "Translation", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "browse4", taskId: "RLY-TSK-2026-B5W8Q3", title: "Build a landing page for SaaS product",
    description: "Create a responsive landing page using React and Tailwind CSS. Must include hero, features, pricing sections.",
    status: "open", location: "Remote", reward: 5000, deadline: "2026-03-10",
    createdAt: "2026-02-12T10:00:00Z", createdBy: "Meera Joshi",
    skills: ["react", "tailwind", "frontend"], domain: "Technology", workType: "Virtual",
    manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "browse5", taskId: "RLY-TSK-2026-S6J4V8", title: "Write SEO blog articles on fintech",
    description: "Write 5 high-quality blog articles of 1500 words each on fintech topics. Must be SEO-optimized.",
    status: "open", location: "Remote", reward: 3000, deadline: "2026-02-28",
    createdAt: "2026-02-11T10:00:00Z", createdBy: "Ankit Verma",
    skills: ["writing", "seo", "fintech"], domain: "Writing", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
];

const DEMO_CREATED_TASKS: Task[] = [
  {
    id: "demo1", taskId: "RLY-TSK-2026-F2H8K4", title: "Deliver documents to Koramangala office",
    description: "Pick up documents from HSR Layout and deliver to Koramangala office before 5 PM.",
    status: "open", location: "Bengaluru", reward: 4500, deadline: "2026-02-15",
    createdAt: "2026-02-10T10:00:00Z", createdBy: "Arjun Mehta",
    skills: ["delivery"], domain: "Delivery", workType: "Physical", manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "demo2", taskId: "RLY-TSK-2026-G5N3P7", title: "Design a logo for my bakery startup",
    description: "Need a modern, minimalist logo for an artisan bakery. Must deliver in AI and PNG formats.",
    status: "in_progress", location: "Mumbai", reward: 2000, deadline: "2026-02-21",
    createdAt: "2026-02-08T10:00:00Z", createdBy: "Arjun Mehta", acceptedBy: "Priya Sharma",
    skills: ["design"], domain: "Design", workType: "Virtual", manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "demo3", taskId: "RLY-TSK-2026-H9Q6R2", title: "Translate product brochure to Hindi",
    description: "Professional translation of a 10-page product brochure from English to Hindi.",
    status: "done", location: "Lucknow", reward: 1500, deadline: "2026-03-02",
    createdAt: "2026-02-05T10:00:00Z", createdBy: "Arjun Mehta", acceptedBy: "Sanjay Patel",
    skills: ["translation"], domain: "Translation", workType: "Virtual", manpower: 1, updateFrequency: "Weekly",
  },
];

const DEMO_TIMELINES: Record<string, TimelineEntry[]> = {
  demo2: [
    { id: "tl1", taskId: "demo2", author: "System", authorRole: "system", message: "Task created and reward locked in escrow.", timestamp: "2026-02-08T10:00:00Z", systemGenerated: true, entryType: "escrow" },
    { id: "tl2", taskId: "demo2", author: "System", authorRole: "system", message: "Task published and visible to acceptors.", timestamp: "2026-02-08T10:01:00Z", systemGenerated: true, entryType: "status_change" },
    { id: "tl3", taskId: "demo2", author: "System", authorRole: "system", message: "Priya Sharma has accepted the task. Trust deposit locked. Status: Committed.", timestamp: "2026-02-09T14:30:00Z", systemGenerated: true, entryType: "status_change", metadata: { fromStatus: "open", toStatus: "committed" } },
    { id: "tl4", taskId: "demo2", author: "Priya Sharma", authorRole: "acceptor", message: "Hi! I've started working on the logo. Will share initial concepts by tomorrow.", timestamp: "2026-02-09T15:00:00Z", systemGenerated: false, entryType: "comment" },
    { id: "tl5", taskId: "demo2", author: "System", authorRole: "system", message: "Task moved to In Progress. Priya Sharma has started working.", timestamp: "2026-02-09T15:00:00Z", systemGenerated: true, entryType: "status_change", metadata: { fromStatus: "committed", toStatus: "in_progress" } },
    { id: "tl6", taskId: "demo2", author: "Arjun Mehta", authorRole: "requestor", message: "Great! Looking forward to seeing the concepts. The bakery name is 'Golden Crust'.", timestamp: "2026-02-09T16:00:00Z", systemGenerated: false, entryType: "comment" },
    { id: "tl7", taskId: "demo2", author: "Priya Sharma", authorRole: "acceptor", message: "Here are 3 initial concepts. Let me know which direction you prefer.", timestamp: "2026-02-10T11:00:00Z", systemGenerated: false, entryType: "comment" },
  ],
  demo3: [
    { id: "tl10", taskId: "demo3", author: "System", authorRole: "system", message: "Task created and reward locked in escrow.", timestamp: "2026-02-05T10:00:00Z", systemGenerated: true, entryType: "escrow" },
    { id: "tl11", taskId: "demo3", author: "System", authorRole: "system", message: "Sanjay Patel has accepted the task. Trust deposit locked.", timestamp: "2026-02-06T09:00:00Z", systemGenerated: true, entryType: "status_change", metadata: { fromStatus: "open", toStatus: "committed" } },
    { id: "tl12", taskId: "demo3", author: "Sanjay Patel", authorRole: "acceptor", message: "Starting translation. Will maintain original formatting.", timestamp: "2026-02-06T10:00:00Z", systemGenerated: false, entryType: "comment" },
    { id: "tl13", taskId: "demo3", author: "System", authorRole: "system", message: "Task moved to In Progress.", timestamp: "2026-02-06T10:00:00Z", systemGenerated: true, entryType: "status_change", metadata: { fromStatus: "committed", toStatus: "in_progress" } },
    { id: "tl14", taskId: "demo3", author: "Sanjay Patel", authorRole: "acceptor", message: "Translation complete. All 10 pages done with formatting preserved. Marking as done.", timestamp: "2026-02-10T16:00:00Z", systemGenerated: false, entryType: "comment" },
    { id: "tl15", taskId: "demo3", author: "System", authorRole: "system", message: "Sanjay Patel has marked this task as Done. Awaiting requestor review.", timestamp: "2026-02-10T16:00:00Z", systemGenerated: true, entryType: "status_change", metadata: { fromStatus: "in_progress", toStatus: "done" } },
  ],
  accepted1: [
    { id: "tl20", taskId: "accepted1", author: "System", authorRole: "system", message: "Task created and reward locked in escrow.", timestamp: "2026-02-12T10:00:00Z", systemGenerated: true, entryType: "escrow" },
    { id: "tl21", taskId: "accepted1", author: "System", authorRole: "system", message: "Arjun Mehta has accepted the task. Trust deposit locked.", timestamp: "2026-02-13T09:00:00Z", systemGenerated: true, entryType: "status_change", metadata: { fromStatus: "open", toStatus: "committed" } },
  ],
};

const TaskDetail = () => {
  const currentUser = getCurrentUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [task, setTask] = useState<Task | null>(null);
  const [acceptStep, setAcceptStep] = useState<"none" | "conflict" | "deposit">("none");
  const [conflictTask, setConflictTask] = useState<Task | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fromBrowse = location.state?.fromBrowse ?? false;

  const CURRENT_USER = currentUser?.name || "Guest";

  const getUserRole = (t: Task): AuthorRole => {
    if (t.createdBy === CURRENT_USER) return "requestor";
    if (t.acceptedBy === CURRENT_USER) return "acceptor";
    const accepted = readJson<Task[]>("reliyo_accepted_tasks", []);
    if (accepted.some((a) => a.id === t.id && (a.acceptedBy === CURRENT_USER || !a.acceptedBy))) return "acceptor";
    return "requestor";
  };

  useEffect(() => {
    try {
      const storedTasks = readJson<Task[]>("reliyo_tasks", []);
      const acceptedTasks = readJson<Task[]>("reliyo_accepted_tasks", []);

      let found = storedTasks.find((t) => t.id === id);
      if (!found) found = acceptedTasks.find((t) => t.id === id);
      if (!found && env.enableDemoData) found = DEMO_BROWSE_TASKS.find((t) => t.id === id);
      if (!found && env.enableDemoData) found = DEMO_CREATED_TASKS.find((t) => t.id === id);

      if (found) {
        const fromTasks = storedTasks.find((t) => t.id === id);
        const fromAccepted = acceptedTasks.find((t) => t.id === id);
        if (fromTasks && fromAccepted) {
          found = {
            ...fromTasks,
            ...fromAccepted,
            status:
              comparePolicyStatus(fromAccepted.status, fromTasks.status) >= 0
                ? fromAccepted.status
                : fromTasks.status,
          };
        }
        found.status = normalizePolicyStatus(found.status);
        setTask(found);
      }

      const storedTimeline = readJson<TimelineEntry[] | null>(`reliyo_timeline_${id}`, null);
      if (storedTimeline) {
        setTimelineEntries(storedTimeline);
      } else if (id && env.enableDemoData && DEMO_TIMELINES[id]) {
        setTimelineEntries(DEMO_TIMELINES[id]);
      } else if (found) {
        const initialEntries: TimelineEntry[] = [
          {
            id: `init-1-${id}`, taskId: found.id, author: "System", authorRole: "system",
            message: "Task created and reward locked in escrow.",
            timestamp: found.createdAt, systemGenerated: true, entryType: "escrow",
          },
          {
            id: `init-2-${id}`, taskId: found.id, author: "System", authorRole: "system",
            message: "Task published and visible to acceptors.",
            timestamp: found.createdAt, systemGenerated: true, entryType: "status_change",
          },
        ];
        setTimelineEntries(initialEntries);
      }
    } catch {
      setLoadError("We couldn't load this task. Please go back and retry.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // 3-strike inactivity check
  const inactivityChecked = useRef(false);
  useEffect(() => {
    if (!task || inactivityChecked.current) return;
    if (task.status !== "done") return;
    inactivityChecked.current = true;

    const inactivity = checkInactivity(task.id, task.statusEnteredAt, task.status, timelineEntries);

    if (inactivity.pendingEntries.length > 0) {
      const updated = [...timelineEntries, ...inactivity.pendingEntries];
      setTimelineEntries(updated);
      writeJson(`reliyo_timeline_${task.id}`, updated);
      sendStrikeNotifications(task, inactivity.pendingEntries, currentUser?.email);
    }

    if (inactivity.shouldAutoClose) {
      const closeEntry: TimelineEntry = {
        id: `auto-close-${Date.now()}`,
        taskId: task.id,
        author: "System",
        authorRole: "system",
        message: "Task closed automatically. Escrow funds released.",
        timestamp: new Date().toISOString(),
        systemGenerated: true,
        entryType: "escrow",
        metadata: { fromStatus: task.status as TaskStatus, toStatus: "closed" },
      };
      const allEntries = [...timelineEntries, ...inactivity.pendingEntries, closeEntry];
      setTimelineEntries(allEntries);
      writeJson(`reliyo_timeline_${task.id}`, allEntries);

      const closedTask: Task = { ...task, status: "closed" };
      setTask(closedTask);

      const storedTasks = readJson<Task[]>("reliyo_tasks", []);
      const idx = storedTasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) { storedTasks[idx] = { ...storedTasks[idx], status: "closed" }; writeJson("reliyo_tasks", storedTasks); }
      const storedAccepted = readJson<Task[]>("reliyo_accepted_tasks", []);
      const accIdx = storedAccepted.findIndex((t) => t.id === task.id);
      if (accIdx >= 0) { storedAccepted[accIdx] = { ...storedAccepted[accIdx], status: "closed" }; writeJson("reliyo_accepted_tasks", storedAccepted); }

      notifyTaskClosed(task);
      toast({ title: "Task Auto-Closed", description: "This task was closed due to requestor inactivity (3 strikes)." });
    }
  }, [currentUser?.email, task, timelineEntries]);

  const inactivityState = task ? checkInactivity(task.id, task.statusEnteredAt, task.status, timelineEntries) : null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Loading task details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto mt-10 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      </DashboardLayout>
    );
  }

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

  const fee = parseFloat((task.reward * (PLATFORM_FEE_PERCENT / 100)).toFixed(2));
  const acceptorPayout = parseFloat((task.reward - fee).toFixed(2));
  const trustDeposit = parseFloat((task.reward * (TRUST_DEPOSIT_PERCENT / 100)).toFixed(2));
  const isOwner = task.createdBy === CURRENT_USER;
  const userRole = getUserRole(task);
  const status = task.status as TaskStatus;
  const effectiveDeadline = getEffectiveDeadline(task);

  const acceptedTasks = readJson<Task[]>("reliyo_accepted_tasks", []);
  const isAlreadyAccepted = acceptedTasks.some((t) => t.id === task.id);

  const canDelete = isOwner && status === "open" && !task.acceptedBy;

  // ── Delete task handler ─────────────────────────────────────────────────────
  const handleDeleteTask = () => {
    const storedTasks = readJson<Task[]>("reliyo_tasks", []);
    const updated = storedTasks.filter((t: Task) => t.id !== task.id);
    writeJson("reliyo_tasks", updated);
    removeItem(`reliyo_timeline_${task.id}`);
    setShowDeleteDialog(false);
    toast({
      title: "Task Cancelled",
      description: "The task has been hidden and your reward deposit will be refunded.",
    });
    navigate("/my-tasks");
  };

  // ── Accept flow handlers ──────────────────────────────────────────────────

  const handleAcceptClick = () => {
    const storedAccepted = readJson<Task[]>("reliyo_accepted_tasks", []);
    const demoAccepted: Task[] = [
      { id: "accepted1", taskId: "RLY-TSK-2026-A3M7K9", title: "Social media management for 1 week", status: "committed", location: "", reward: 10000, deadline: "2026-02-25", createdAt: "2026-02-12T10:00:00Z", createdBy: "Priya", description: "", workType: "Virtual", manpower: 1, skills: [], domain: "", updateFrequency: "" },
    ];
    const allAccepted = [...storedAccepted, ...demoAccepted];
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
    navigate("/payment", {
      state: {
        taskData: task,
        amount: trustDeposit,
        platformFee: 0,
        isAcceptFlow: true,
      },
    });
  };

  // ── Timeline handlers ─────────────────────────────────────────────────────

  const saveTimeline = (entries: TimelineEntry[]) => {
    writeJson(`reliyo_timeline_${task.id}`, entries);
  };

  const handleAddEntry = (newEntries: TimelineEntry[]) => {
    const updated = [...timelineEntries, ...newEntries];
    setTimelineEntries(updated);
    saveTimeline(updated);
  };

  const handleStatusChange = (newStatus: TaskStatus, newEntries: TimelineEntry[]) => {
    const updated = [...timelineEntries, ...newEntries];
    setTimelineEntries(updated);
    saveTimeline(updated);

    const updatedTask: Task = { ...task, status: newStatus, statusEnteredAt: new Date().toISOString() };
    if (newStatus === "disputed") {
      updatedTask.disputeCount = (task.disputeCount || 0) + 1;
      const disputeId = generateDisputeId(task.taskId, updatedTask.disputeCount);
      updatedTask.disputes = [
        ...(task.disputes || []),
        { id: disputeId, number: updatedTask.disputeCount, escalated: isEscalated(updatedTask.disputeCount), createdAt: new Date().toISOString() },
      ];
    }
    setTask(updatedTask);

    const persistData = { status: newStatus, statusEnteredAt: updatedTask.statusEnteredAt, disputeCount: updatedTask.disputeCount, disputes: updatedTask.disputes, dsp4ResolvedValid: updatedTask.dsp4ResolvedValid };
    const storedTasks = readJson<Task[]>("reliyo_tasks", []);
    const taskIdx = storedTasks.findIndex((t: Task) => t.id === task.id);
    if (taskIdx >= 0) {
      storedTasks[taskIdx] = { ...storedTasks[taskIdx], ...persistData };
      writeJson("reliyo_tasks", storedTasks);
    }

    const storedAccepted = readJson<Task[]>("reliyo_accepted_tasks", []);
    const accIdx = storedAccepted.findIndex((t: Task) => t.id === task.id);
    if (accIdx >= 0) {
      storedAccepted[accIdx] = { ...storedAccepted[accIdx], ...persistData };
      writeJson("reliyo_accepted_tasks", storedAccepted);
    }

    toast({
      title: `Status updated to ${STATUS_LABELS[newStatus]}`,
      description: newEntries.find(e => e.systemGenerated)?.message || "",
    });
  };

  const handleRatingSubmit = (rating: number, feedback: string) => {
    const updatedTask = { ...task, rating, ratingFeedback: feedback };
    setTask(updatedTask);
  };

  const handleDeadlineExtend = (newDeadline: string) => {
    const updatedTask = { ...task, extendedDeadline: newDeadline };
    setTask(updatedTask);

    // Persist to both stores
    const stores = ["reliyo_tasks", "reliyo_accepted_tasks"];
    stores.forEach((key) => {
      try {
        const tasks = readJson<Task[]>(key, []);
        const idx = tasks.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
          tasks[idx] = { ...tasks[idx], extendedDeadline: newDeadline };
          writeJson(key, tasks);
        }
      } catch (error) {
        void error;
      }
    });

    toast({
      title: "Deadline Extended",
      description: `New deadline: ${format(new Date(newDeadline), "MMMM do, yyyy")}`,
    });
  };

  // ── Task lifecycle timeline (visual steps) ────────────────────────────────

  const lifecycleSteps = [
    { label: "Task created", filled: true },
    { label: "Reward locked in escrow", filled: true },
    { label: "Task published", filled: status !== "open" || true },
    { label: "Acceptor committed", filled: ["committed", "in_progress", "done", "disputed", "closed", "force_closed"].includes(status) },
    { label: "Work in progress", filled: ["in_progress", "done", "disputed", "closed", "force_closed"].includes(status) },
    { label: "Work done", filled: ["done", "disputed", "closed", "force_closed"].includes(status) },
    { label: "Closed", filled: status === "closed" },
    { label: "Force Closed", filled: status === "force_closed" },
  ];

  const showTimeline = isOwner
    ? ["committed", "in_progress", "done", "disputed", "closed", "force_closed"].includes(status)
    : isAlreadyAccepted || ["committed", "in_progress", "done", "disputed", "closed", "force_closed"].includes(status);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <Badge className={`${STATUS_COLORS[status] || "bg-muted"} text-xs`}>
            {STATUS_LABELS[status] || task.status}
          </Badge>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Reward</p>
          </div>
        </div>

        {task.taskId && (
          <p className="text-xs font-mono text-muted-foreground mt-2 select-all">{task.taskId}</p>
        )}
        <h1 className="text-xl font-bold text-foreground mt-1">{task.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-2">{task.description}</p>

        {/* Dispute ID banner */}
        {status === "disputed" && task.disputeCount && task.disputeCount > 0 && (
          <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm mb-3 ${
            isEscalated(task.disputeCount)
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)]"
          }`}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-mono font-semibold">{generateDisputeId(task.taskId, task.disputeCount)}</span>
              <span className="ml-2">Dispute #{task.disputeCount}/{MAX_DISPUTES}</span>
              {isEscalated(task.disputeCount) && <span className="ml-2 font-bold">⚠️ ESCALATED — Admin Review Required</span>}
            </div>
          </div>
        )}

        {/* Inactivity banner */}
        {inactivityState && inactivityState.bannerMessage && !inactivityState.shouldAutoClose && (
          <div className="flex items-center gap-2 rounded-lg border bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)] p-3 text-sm mb-3">
            <Clock className="h-4 w-4 shrink-0" />
            {inactivityState.bannerMessage}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <h2 className="text-base font-bold text-foreground mb-4">Task Details</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {task.taskId && (
                    <div className="col-span-2"><p className="text-xs text-primary">Task ID</p><p className="font-medium font-mono select-all">{task.taskId}</p></div>
                  )}
                  <div><p className="text-xs text-primary">Title</p><p className="font-medium">{task.title}</p></div>
                  <div><p className="text-xs text-primary">Work Type</p><p className="font-medium">{task.workType || "—"}</p></div>
                  <div><p className="text-xs text-primary">Description</p><p className="font-medium">{task.description}</p></div>
                  <div><p className="text-xs text-primary">Manpower</p><p className="font-medium">{task.manpower}</p></div>
                  <div><p className="text-xs text-primary">Location</p><p className="font-medium">{task.location || "—"}</p></div>
                  <div>
                    <p className="text-xs text-primary">Deadline</p>
                    <p className="font-medium">{task.deadline ? format(new Date(task.deadline), "MMMM do, yyyy") : "—"}</p>
                    {task.extendedDeadline && (
                      <p className="text-xs text-[hsl(35,90%,50%)] font-medium mt-0.5">
                        Extended: {format(new Date(task.extendedDeadline), "MMMM do, yyyy")}
                      </p>
                    )}
                  </div>
                  <div><p className="text-xs text-primary">Update Frequency</p><p className="font-medium">{task.updateFrequency || "—"}</p></div>
                  <div><p className="text-xs text-primary">Skills</p><p className="font-medium">{task.skills?.join(", ") || "—"}</p></div>
                  <div><p className="text-xs text-primary">Domain</p><p className="font-medium">{task.domain || "—"}</p></div>
                  <div><p className="text-xs text-primary">Reward</p><p className="font-medium text-primary">{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Lifecycle Progress */}
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <h2 className="text-base font-bold text-foreground mb-4">Task Lifecycle</h2>
                <div className="space-y-3">
                  {lifecycleSteps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${step.filled ? "bg-primary/10" : "bg-muted"}`}>
                          {step.filled ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        {i < lifecycleSteps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[8px]" />}
                      </div>
                      <p className={`text-sm pb-2 ${step.filled ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unified Timeline & Comments */}
            {showTimeline && (
              <TaskTimeline
                task={task}
                currentUserRole={userRole}
                currentUserName={CURRENT_USER}
                entries={timelineEntries}
                onAddEntry={handleAddEntry}
                onStatusChange={handleStatusChange}
                onRatingSubmit={handleRatingSubmit}
                onDeadlineExtend={handleDeadlineExtend}
              />
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Actions</h3>
                {isOwner && status === "open" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                      <Info className="h-4 w-4 shrink-0" />
                      You cannot accept your own Task.
                    </div>
                    {canDelete && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Task
                      </Button>
                    )}
                  </div>
                ) : isAlreadyAccepted && !isOwner ? (
                  <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--success))]/10 p-3 text-sm text-[hsl(var(--success))]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    You have accepted this task.
                  </div>
                ) : status === "open" && !isOwner ? (
                  <Button className="w-full" onClick={handleAcceptClick}>Accept Task</Button>
                ) : status === "closed" || status === "force_closed" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0" />
                    This task is {status === "force_closed" ? "force closed" : "closed"}.
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    {isOwner ? "Manage this task via the timeline below." : "Task is no longer available for acceptance."}
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
                    <p className="text-xs text-[hsl(var(--success))] mt-0.5">✓ 67% reliable</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {task.acceptedBy && (
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-foreground mb-3">Acceptor</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] font-semibold">
                        {task.acceptedBy.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{task.acceptedBy}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4].map(i => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                        <Star className="h-3 w-3 text-muted-foreground" />
                        <span className="ml-1 text-xs text-muted-foreground">4.3 (15)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Pay Breakdown</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Reward</span><span>{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span><span className="text-destructive">-{task.currencySymbol || "₹"}{fee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Acceptor Payout</span>
                    <span className="text-[hsl(var(--success))]">{task.currencySymbol || "₹"}{acceptorPayout}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Trust Deposit Locked (10%)</span>
                    <span>{task.currencySymbol || "₹"}{trustDeposit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete task dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Delete Task?
            </DialogTitle>
            <DialogDescription>
              This will cancel and archive "{task.title}". Your reward deposit of {task.currencySymbol || "₹"}{task.reward.toLocaleString()} will be fully refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTask}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Lock Deposit dialog */}
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
                <span className="font-semibold">{task.currencySymbol || "₹"}{trustDeposit.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-3">
              <span>Total Payout</span>
              <span className="text-lg">{task.currencySymbol || "₹"}{trustDeposit.toFixed(2)}</span>
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
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 p-3 text-sm text-[hsl(var(--success))]">
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

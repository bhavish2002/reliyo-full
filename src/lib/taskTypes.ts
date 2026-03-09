/**
 * Shared task types, status engine, and timeline entry interfaces.
 * Single source of truth for the task lifecycle contract.
 */

// ── Valid Task Statuses (strict contract) ───────────────────────────────────
export type TaskStatus =
  | "open"
  | "committed"
  | "in_progress"
  | "done"
  | "disputed"
  | "completed"
  | "closed"
  | "force_closed";

export const TASK_STATUSES: TaskStatus[] = [
  "open", "committed", "in_progress", "done", "disputed", "completed", "closed", "force_closed",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  committed: "Committed",
  in_progress: "In Progress",
  done: "Done",
  disputed: "Disputed",
  completed: "Completed",
  closed: "Closed",
  force_closed: "Force Closed",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-primary text-primary-foreground",
  committed: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  in_progress: "bg-destructive text-destructive-foreground",
  done: "bg-[hsl(220,70%,50%)] text-white",
  disputed: "bg-[hsl(35,90%,50%)] text-white",
  completed: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  closed: "bg-muted text-muted-foreground",
};

// ── Allowed Transitions ─────────────────────────────────────────────────────
// Key: current status → value: list of valid next statuses
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ["committed", "closed"],
  committed: ["in_progress", "open"], // open = quit within grace period
  in_progress: ["done", "closed"],    // closed = admin force-close
  done: ["completed", "disputed"],
  disputed: ["done", "closed"],       // done = fix resubmitted; closed = admin force-close
  completed: ["closed"],
  closed: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Author Roles ────────────────────────────────────────────────────────────
export type AuthorRole = "requestor" | "acceptor" | "admin" | "system";

export const ROLE_LABELS: Record<AuthorRole, string> = {
  requestor: "Requestor",
  acceptor: "Acceptor",
  admin: "Admin",
  system: "System",
};

// ── Timeline Entry ──────────────────────────────────────────────────────────
export interface TimelineEntry {
  id: string;
  taskId: string;
  author: string;
  authorRole: AuthorRole;
  message: string;
  timestamp: string; // ISO
  systemGenerated: boolean;
  entryType: "comment" | "status_change" | "alert" | "admin_action" | "rating" | "escrow";
  metadata?: {
    fromStatus?: TaskStatus;
    toStatus?: TaskStatus;
    alertType?: "progress_reminder" | "force_close_request" | "sla_warning";
    rating?: number;
    disputeCount?: number;
  };
}

// ── Task Interface ──────────────────────────────────────────────────────────
export interface Task {
  id: string;
  taskId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  workType: string;
  manpower: number;
  location: string;
  country?: string;
  deadline: string;
  updateFrequency: string;
  skills: string[];
  domain: string;
  reward: number;
  currency?: string;
  currencySymbol?: string;
  createdAt: string;
  createdBy: string;
  acceptedAt?: string;
  acceptedBy?: string;
  paymentStatus?: string;
  disputeCount?: number;
  rating?: number;
  ratingFeedback?: string;
  statusEnteredAt?: string;
  disputes?: Array<{ id: string; number: number; escalated: boolean; createdAt: string }>;
}

// ── Permission Helpers ──────────────────────────────────────────────────────

export function canComment(status: TaskStatus, role: AuthorRole): boolean {
  switch (status) {
    case "open":
      return false; // no comments in open state
    case "committed":
      return role === "acceptor"; // only acceptor can post first comment
    case "in_progress":
      return role === "requestor" || role === "acceptor";
    case "done":
      return role === "requestor" || role === "acceptor";
    case "disputed":
      return role === "requestor" || role === "acceptor" || role === "admin";
    case "completed":
      return false; // no comments, only rating
    case "closed":
      return false; // read-only
    default:
      return false;
  }
}

export function getCommentPlaceholder(status: TaskStatus, role: AuthorRole): string {
  switch (status) {
    case "committed":
      return role === "acceptor"
        ? "Add your first comment to notify the requestor you've started working..."
        : "Waiting for the acceptor to start working...";
    case "in_progress":
      return "Share a progress update...";
    case "done":
      return "Add a comment about the completed work...";
    case "disputed":
      return role === "acceptor"
        ? "Describe the fix or submit your response..."
        : "Add details about the dispute...";
    default:
      return "Comments are disabled for this status.";
  }
}

export function getStatusBanner(status: TaskStatus, role: AuthorRole): {
  message: string;
  variant: "info" | "warning" | "success" | "destructive" | "muted";
} | null {
  switch (status) {
    case "committed":
      if (role === "acceptor") {
        return {
          message: "Add your first comment to notify the requestor you've started working.",
          variant: "info",
        };
      }
      return {
        message: "Waiting for the acceptor to begin work. Their first comment will move this task to In Progress.",
        variant: "muted",
      };
    case "in_progress":
      return null;
    case "done":
      if (role === "requestor") {
        return {
          message: "The acceptor has marked this task as done. Review the work and accept or raise a dispute.",
          variant: "info",
        };
      }
      return {
        message: "You've marked this task as done. Waiting for the requestor to review.",
        variant: "success",
      };
    case "disputed":
      return {
        message: "This task is currently under dispute.",
        variant: "warning",
      };
    case "completed":
      if (role === "requestor") {
        return {
          message: "Rating required to close this task. Please submit your rating below.",
          variant: "destructive",
        };
      }
      return {
        message: "Work accepted. Waiting for the requestor to submit a rating.",
        variant: "success",
      };
    case "closed":
      return {
        message: "This task is closed and cannot be modified.",
        variant: "muted",
      };
    default:
      return null;
  }
}

// ── Platform Constants ──────────────────────────────────────────────────────
export const PLATFORM_FEE_PERCENT = 5;
export const TRUST_DEPOSIT_PERCENT = 10;
export const QUIT_GRACE_HOURS = 2;

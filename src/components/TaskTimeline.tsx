import { useState, useRef, useEffect } from "react";
import {
  Send, AlertTriangle, Lock, Settings, Shield, Star,
  CheckCircle2, XCircle, Info, MessageSquare, Clock, Bell,
  Paperclip, X, FileIcon, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  type Task, type TaskStatus, type TimelineEntry, type AuthorRole,
  canComment, canTransition, getCommentPlaceholder, getStatusBanner,
  STATUS_LABELS, ROLE_LABELS,
} from "@/lib/taskTypes";
import { saveForceCloseRequest } from "@/lib/adminData";
import {
  notifyAlertRaised, notifyForceCloseRequested, notifyTaskMarkedDone,
  notifyDisputeRaised, notifyFixResubmitted, notifyRatingRequired,
  notifyTaskClosed,
} from "@/lib/notifications";
import { format } from "date-fns";
import { generateDisputeId, MAX_DISPUTES, isEscalated } from "@/lib/disputeId";

// ── File attachment constants ────────────────────────────────────────────────
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
  "application/zip", "application/x-rar-compressed",
];

interface FileAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // for images preview
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateEntryId(): string {
  return `tle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSystemEntry(
  taskId: string,
  message: string,
  entryType: TimelineEntry["entryType"] = "status_change",
  metadata?: TimelineEntry["metadata"]
): TimelineEntry {
  return {
    id: generateEntryId(),
    taskId,
    author: "System",
    authorRole: "system",
    message,
    timestamp: new Date().toISOString(),
    systemGenerated: true,
    entryType,
    metadata,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Role styling ─────────────────────────────────────────────────────────────

const ROLE_AVATAR_COLORS: Record<AuthorRole, string> = {
  requestor: "bg-primary/10 text-primary",
  acceptor: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  admin: "bg-destructive/10 text-destructive",
  system: "bg-muted text-muted-foreground",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  status_change: Settings,
  alert: Bell,
  admin_action: Shield,
  escrow: Lock,
  rating: Star,
  comment: MessageSquare,
};

// ── Banner variants ──────────────────────────────────────────────────────────

const BANNER_STYLES: Record<string, string> = {
  info: "bg-primary/10 border-primary/20 text-primary",
  warning: "bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)]",
  success: "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20 text-[hsl(var(--success))]",
  destructive: "bg-destructive/10 border-destructive/20 text-destructive",
  muted: "bg-muted border-border text-muted-foreground",
};

// ── Props ────────────────────────────────────────────────────────────────────

interface TaskTimelineProps {
  task: Task;
  currentUserRole: AuthorRole; // "requestor" | "acceptor"
  currentUserName: string;
  entries: TimelineEntry[];
  onAddEntry: (entries: TimelineEntry[]) => void;
  onStatusChange: (newStatus: TaskStatus, entries: TimelineEntry[]) => void;
  onRatingSubmit?: (rating: number, feedback: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

const TaskTimeline = ({
  task,
  currentUserRole,
  currentUserName,
  entries,
  onAddEntry,
  onStatusChange,
  onRatingSubmit,
}: TaskTimelineProps) => {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [showForceCloseDialog, setShowForceCloseDialog] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = task.status as TaskStatus;
  const allowed = canComment(status, currentUserRole);
  const banner = getStatusBanner(status, currentUserRole);
  const placeholder = getCommentPlaceholder(status, currentUserRole);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  // Mandatory rating: auto-open non-dismissable dialog when completed + requestor
  const isMandatoryRating = status === "completed" && currentUserRole === "requestor";

  useEffect(() => {
    if (isMandatoryRating) {
      setShowRatingDialog(true);
    }
  }, [isMandatoryRating]);

  useEffect(() => {
    if (isMandatoryRating) {
      const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [isMandatoryRating]);

  // ── File attachment handling ────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        continue;
      }
      const attachment: FileAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      // For images, create a preview data URL
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          attachment.dataUrl = ev.target?.result as string;
          setAttachedFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }
      newFiles.push(attachment);
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Submit comment ──────────────────────────────────────────────────────

  const handleSubmit = () => {
    if ((!commentText.trim() && attachedFiles.length === 0) || !allowed || submitting) return;
    setSubmitting(true);

    let message = commentText.trim();
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map(f => `📎 ${f.name} (${formatFileSize(f.size)})`).join("\n");
      message = message ? `${message}\n\n${fileList}` : fileList;
    }

    const newEntry: TimelineEntry = {
      id: generateEntryId(),
      taskId: task.id,
      author: currentUserName,
      authorRole: currentUserRole,
      message,
      timestamp: new Date().toISOString(),
      systemGenerated: false,
      entryType: "comment",
    };

    const newEntries = [newEntry];

    // If committed + acceptor's first comment → transition to in_progress
    if (status === "committed" && currentUserRole === "acceptor") {
      const systemMsg = createSystemEntry(
        task.id,
        `Task moved to In Progress. ${currentUserName} has started working.`,
        "status_change",
        { fromStatus: "committed", toStatus: "in_progress" }
      );
      newEntries.push(systemMsg);
      onAddEntry(newEntries);
      onStatusChange("in_progress", newEntries);
    } else {
      onAddEntry(newEntries);
    }

    setCommentText("");
    setAttachedFiles([]);
    setSubmitting(false);
  };

  // ── Acceptor marks task done ────────────────────────────────────────────

  const handleMarkDone = () => {
    if (!canTransition(status, "done")) return;
    const sysEntry = createSystemEntry(
      task.id,
      `${currentUserName} has marked this task as Done. Awaiting requestor review.`,
      "status_change",
      { fromStatus: status as TaskStatus, toStatus: "done" }
    );
    notifyTaskMarkedDone(task);
    onStatusChange("done", [sysEntry]);
  };

  // ── Requestor accepts work ─────────────────────────────────────────────

  const handleAcceptWork = () => {
    if (!canTransition(status, "completed")) return;
    const sysEntry = createSystemEntry(
      task.id,
      `${currentUserName} has accepted the work. Task moved to Completed. Rating required to close.`,
      "status_change",
      { fromStatus: "done", toStatus: "completed" }
    );
    notifyRatingRequired(task);
    onStatusChange("completed", [sysEntry]);
  };

  // ── Requestor raises dispute ───────────────────────────────────────────

  const handleRaiseDispute = () => {
    if (!canTransition(status, "disputed")) return;
    const disputeNumber = (task.disputeCount || 0) + 1;
    if (disputeNumber > MAX_DISPUTES) return;
    const disputeId = generateDisputeId(task.taskId, disputeNumber);
    const escalated = isEscalated(disputeNumber);
    const escalationNote = escalated ? " ⚠️ ESCALATED — Admin review required." : "";
    const sysEntry = createSystemEntry(
      task.id,
      `Dispute raised by Requestor (${currentUserName}). ${disputeId} (Dispute #${disputeNumber}/${MAX_DISPUTES}).${escalationNote}`,
      "status_change",
      { fromStatus: "done", toStatus: "disputed", disputeCount: disputeNumber }
    );
    setShowDisputeDialog(false);
    notifyDisputeRaised(task);
    onStatusChange("disputed", [sysEntry]);
  };

  // ── Acceptor resubmits fix (disputed → done) ──────────────────────────

  const handleResubmitFix = () => {
    if (!canTransition(status, "done") || !commentText.trim()) return;
    const fixEntry: TimelineEntry = {
      id: generateEntryId(),
      taskId: task.id,
      author: currentUserName,
      authorRole: "acceptor",
      message: commentText.trim(),
      timestamp: new Date().toISOString(),
      systemGenerated: false,
      entryType: "comment",
    };
    const sysEntry = createSystemEntry(
      task.id,
      `${currentUserName} has submitted a fix and moved the task back to Done.`,
      "status_change",
      { fromStatus: "disputed", toStatus: "done" }
    );
    setCommentText("");
    notifyFixResubmitted(task);
    onStatusChange("done", [fixEntry, sysEntry]);
  };

  // ── Requestor sends alert ─────────────────────────────────────────────

  const handleSendAlert = () => {
    const alertEntry = createSystemEntry(
      task.id,
      `⚠️ Alert from Requestor (${currentUserName}): Progress update requested. Please share your current status.`,
      "alert",
      { alertType: "progress_reminder" }
    );
    setShowAlertDialog(false);
    notifyAlertRaised(task);
    onAddEntry([alertEntry]);
  };

  // ── Requestor requests force-close ─────────────────────────────────────

  const handleForceCloseRequest = () => {
    const entry = createSystemEntry(
      task.id,
      `Force-close requested by Requestor (${currentUserName}). Pending admin review.`,
      "admin_action"
    );
    setShowForceCloseDialog(false);
    notifyForceCloseRequested(task);

    // Store request in admin queue
    saveForceCloseRequest({
      id: `fcr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId: task.id,
      taskDisplayId: task.taskId || task.id,
      taskTitle: task.title,
      requestor: task.createdBy || currentUserName,
      acceptor: task.acceptedBy || "—",
      taskStatusAtRequest: task.status,
      status: "pending",
      createdAt: new Date().toISOString(),
      task,
    });

    onAddEntry([entry]);
  };

  // ── Admin: warn acceptor in escalated dispute ─────────────────────────

  const handleAdminWarnAcceptor = () => {
    const warnEntry = createSystemEntry(
      task.id,
      `⚠️ Admin Warning: Acceptor must complete the pending work immediately or a penalty will be applied.`,
      "admin_action"
    );
    onAddEntry([warnEntry]);
  };

  // ── Admin: force-close escalated dispute ──────────────────────────────

  const handleAdminForceClose = () => {
    const closeEntry = createSystemEntry(
      task.id,
      `Task force-closed by Admin (${currentUserName}). Escalated dispute resolved. Escrow funds released.`,
      "admin_action",
      { fromStatus: "disputed" as TaskStatus, toStatus: "closed" }
    );
    setShowForceCloseDialog(false);
    notifyTaskClosed(task);
    onStatusChange("closed", [closeEntry]);
  };

  // ── Rating submission ──────────────────────────────────────────────────

  const handleSubmitRating = () => {
    if (ratingValue === 0) return;
    const ratingEntry = createSystemEntry(
      task.id,
      `${currentUserName} rated the acceptor ${ratingValue}/5. ${ratingFeedback ? `Feedback: "${ratingFeedback}"` : ""}`,
      "rating",
      { rating: ratingValue }
    );
    const closeEntry = createSystemEntry(
      task.id,
      "Task closed. Escrow funds released. Reliability scores updated.",
      "escrow",
      { fromStatus: "completed", toStatus: "closed" }
    );
    setShowRatingDialog(false);
    onRatingSubmit?.(ratingValue, ratingFeedback);
    notifyTaskClosed(task);
    onStatusChange("closed", [ratingEntry, closeEntry]);
  };

  // ── Render timeline entry ──────────────────────────────────────────────

  const renderEntry = (entry: TimelineEntry) => {
    const isSystem = entry.systemGenerated;
    const Icon = ROLE_ICONS[entry.entryType] || MessageSquare;

    // Check for file attachments in message
    const hasAttachments = entry.message.includes("📎 ");
    const messageLines = entry.message.split("\n");
    const textLines = messageLines.filter(l => !l.startsWith("📎 "));
    const attachmentLines = messageLines.filter(l => l.startsWith("📎 "));

    if (isSystem) {
      return (
        <div key={entry.id} className="flex gap-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="rounded-lg bg-muted/60 border border-border px-3 py-2">
              <p className="text-sm text-muted-foreground">{entry.message}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>
      );
    }

    const avatarColor = ROLE_AVATAR_COLORS[entry.authorRole] || ROLE_AVATAR_COLORS.system;

    return (
      <div key={entry.id} className="flex gap-3 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={`text-xs font-semibold ${avatarColor}`}>
            {entry.author.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{entry.author}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {ROLE_LABELS[entry.authorRole]}
            </Badge>
          </div>
          <div className="rounded-lg bg-card border border-border px-3 py-2">
            {textLines.filter(Boolean).length > 0 && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{textLines.join("\n").trim()}</p>
            )}
            {attachmentLines.length > 0 && (
              <div className={`${textLines.filter(Boolean).length > 0 ? "mt-2 pt-2 border-t border-border" : ""} space-y-1`}>
                {attachmentLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span>{line.replace("📎 ", "")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
          </p>
        </div>
      </div>
    );
  };

  // ── Action buttons based on status + role ──────────────────────────────

  const renderActions = () => {
    const actions: React.ReactNode[] = [];

    // Committed: requestor can alert acceptor or request force-close
    if (status === "committed" && currentUserRole === "requestor") {
      actions.push(
        <Button key="alert" variant="outline" size="sm" onClick={() => setShowAlertDialog(true)} className="gap-1.5">
          <Bell className="h-3.5 w-3.5" /> Send Alert
        </Button>,
        <Button key="force-close" variant="outline" size="sm" onClick={() => setShowForceCloseDialog(true)} className="gap-1.5 text-destructive border-destructive/30">
          <XCircle className="h-3.5 w-3.5" /> Request Force-Close
        </Button>
      );
    }

    // In Progress: acceptor can mark done; requestor can alert or request force-close
    if (status === "in_progress") {
      if (currentUserRole === "acceptor") {
        actions.push(
          <Button key="mark-done" size="sm" onClick={handleMarkDone} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Done
          </Button>
        );
      }
      if (currentUserRole === "requestor") {
        actions.push(
          <Button key="alert" variant="outline" size="sm" onClick={() => setShowAlertDialog(true)} className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Send Alert
          </Button>,
          <Button key="force-close" variant="outline" size="sm" onClick={() => setShowForceCloseDialog(true)} className="gap-1.5 text-destructive border-destructive/30">
            <XCircle className="h-3.5 w-3.5" /> Request Force-Close
          </Button>
        );
      }
    }

    // Done: requestor can accept or dispute
    if (status === "done" && currentUserRole === "requestor") {
      actions.push(
        <Button key="accept-work" size="sm" onClick={handleAcceptWork} className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Accept Work
        </Button>,
        <Button
          key="dispute"
          variant="outline"
          size="sm"
          onClick={() => setShowDisputeDialog(true)}
          disabled={(task.disputeCount || 0) >= MAX_DISPUTES}
          className="gap-1.5 text-destructive border-destructive/30"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {(task.disputeCount || 0) >= MAX_DISPUTES ? "Max Disputes Reached" : "Raise Dispute"}
        </Button>
      );
    }

    // Disputed: acceptor can resubmit fix (only if NOT escalated / DSP4)
    const disputeIsEscalated = isEscalated(task.disputeCount || 0);

    if (status === "disputed" && currentUserRole === "acceptor" && !disputeIsEscalated) {
      actions.push(
        <Button
          key="resubmit"
          size="sm"
          disabled={!commentText.trim()}
          onClick={handleResubmitFix}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Submit Fix & Move to Done
        </Button>
      );
    }

    // Escalated dispute (DSP4): admin-only controls
    if (status === "disputed" && disputeIsEscalated && currentUserRole === "admin") {
      actions.push(
        <Button
          key="admin-warn"
          variant="outline"
          size="sm"
          onClick={handleAdminWarnAcceptor}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Warn Acceptor
        </Button>,
        <Button
          key="admin-force-close"
          variant="destructive"
          size="sm"
          onClick={() => setShowForceCloseDialog(true)}
          className="gap-1.5"
        >
          <XCircle className="h-3.5 w-3.5" /> Force-Close Task
        </Button>
      );
    }

    // Completed: requestor must rate
    if (status === "completed" && currentUserRole === "requestor") {
      actions.push(
        <Button key="rate" size="sm" onClick={() => setShowRatingDialog(true)} className="gap-1.5">
          <Star className="h-3.5 w-3.5" /> Submit Rating to Close
        </Button>
      );
    }

    if (actions.length === 0) return null;
    return <div className="flex flex-wrap gap-2 py-3 border-t border-border">{actions}</div>;
  };

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Activity & Comments
        </h3>
        <Badge variant="outline" className="text-xs">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </Badge>
      </div>

      {/* Status banner */}
      {banner && (
        <div className={`flex items-start gap-2 mx-4 mt-3 rounded-lg border p-3 text-sm ${BANNER_STYLES[banner.variant]}`}>
          {banner.variant === "destructive" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : banner.variant === "warning" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : status === "closed" ? (
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          {banner.message}
        </div>
      )}

      {/* Escalated dispute banner */}
      {status === "disputed" && isEscalated(task.disputeCount || 0) && (
        <div className="flex items-start gap-2 mx-4 mt-3 rounded-lg border p-3 text-sm bg-destructive/10 border-destructive/20 text-destructive">
          <Shield className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Escalated dispute — admin review in progress.</span>
            {currentUserRole === "acceptor" && (
              <span className="block mt-1 text-xs">You may add comments only. Status changes are restricted to admin.</span>
            )}
            {currentUserRole === "requestor" && (
              <span className="block mt-1 text-xs">Awaiting admin resolution. You may add comments.</span>
            )}
          </div>
        </div>
      )}

      {/* Timeline entries */}
      <div ref={scrollRef} className="px-4 max-h-[500px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No updates yet.</p>
            {status === "committed" && currentUserRole === "requestor" && (
              <p className="mt-1">The acceptor will post once work begins.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map(renderEntry)}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4">{renderActions()}</div>

      {/* Comment composer */}
      {status !== "closed" && status !== "force_closed" && status !== "completed" && status !== "open" && (
        <div className="border-t border-border p-4">
          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                  {f.type.startsWith("image/") ? (
                    <ImageIcon className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(f.size)})</span>
                  <button onClick={() => removeFile(i)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={placeholder}
            disabled={!allowed}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && allowed) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept={ALLOWED_FILE_TYPES.join(",")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
                disabled={!allowed}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" /> Attach
              </Button>
              <p className="text-[10px] text-muted-foreground">
                {!allowed
                  ? `You cannot comment in ${STATUS_LABELS[status]} status as ${ROLE_LABELS[currentUserRole]}.`
                  : `Max ${MAX_FILE_SIZE_MB}MB per file · Shift+Enter for new line`}
              </p>
            </div>
            {allowed && (
              <Button
                size="sm"
                disabled={(!commentText.trim() && attachedFiles.length === 0) || submitting}
                onClick={handleSubmit}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Closed / completed footer */}
      {(status === "closed" || status === "force_closed") && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/30">
          <Lock className="h-4 w-4" />
          This task is {status === "force_closed" ? "force closed" : "closed"} and cannot be modified.
        </div>
      )}
      {status === "completed" && currentUserRole !== "requestor" && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/30">
          <Clock className="h-4 w-4" />
          Waiting for requestor to submit a rating.
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* Dispute dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Raise Dispute
            </DialogTitle>
            <DialogDescription>
              {(task.disputeCount || 0) + 1 >= MAX_DISPUTES
                ? `This will be Dispute #${(task.disputeCount || 0) + 1} (ESCALATED). Admin review will be required.`
                : `This will create Dispute #${(task.disputeCount || 0) + 1}/${MAX_DISPUTES}. The acceptor will be notified and can submit fixes.`}
              {(task.disputeCount || 0) >= MAX_DISPUTES && " Maximum disputes reached for this task."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRaiseDispute}
              disabled={(task.disputeCount || 0) >= MAX_DISPUTES}
            >
              Confirm Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Send Alert to Acceptor
            </DialogTitle>
            <DialogDescription>
              This will send a progress reminder alert to the acceptor. It will appear as a system message in the timeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAlertDialog(false)}>Cancel</Button>
            <Button onClick={handleSendAlert}>Send Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force-close dialog */}
      <Dialog open={showForceCloseDialog} onOpenChange={setShowForceCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> {isEscalated(task.disputeCount || 0) && currentUserRole === "admin" ? "Force-Close Escalated Task" : "Request Force-Close"}
            </DialogTitle>
            <DialogDescription>
              {isEscalated(task.disputeCount || 0) && currentUserRole === "admin"
                ? "This will immediately close the escalated task and release escrow funds. This action is irreversible."
                : "This will send a force-close request to the admin for review. The task will not be closed until an admin approves it."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForceCloseDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={isEscalated(task.disputeCount || 0) && currentUserRole === "admin" ? handleAdminForceClose : handleForceCloseRequest}
            >
              {isEscalated(task.disputeCount || 0) && currentUserRole === "admin" ? "Force-Close Now" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating dialog — mandatory & non-dismissable when completed+requestor */}
      <Dialog
        open={showRatingDialog}
        onOpenChange={(open) => { if (!isMandatoryRating) setShowRatingDialog(open); }}
      >
        <DialogContent
          className={`sm:max-w-md ${isMandatoryRating ? "[&>.absolute]:hidden" : ""}`}
          onInteractOutside={(e) => { if (isMandatoryRating) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (isMandatoryRating) e.preventDefault(); }}
        >
          {isMandatoryRating && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Rating is mandatory. You must submit a rating to close this task.
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Rate the Acceptor
            </DialogTitle>
            <DialogDescription>
              Your rating is mandatory to close this task. Escrow funds will be released upon submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Rating <span className="text-destructive">*</span></p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setRatingValue(v)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${v <= ratingValue ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Feedback (optional)</p>
              <Textarea
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Share your experience..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {!isMandatoryRating && (
              <Button variant="outline" onClick={() => setShowRatingDialog(false)}>Cancel</Button>
            )}
            <Button disabled={ratingValue === 0} onClick={handleSubmitRating} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Submit Rating & Close Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskTimeline;

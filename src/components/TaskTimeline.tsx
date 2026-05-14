import { useState, useRef, useEffect } from "react";
import {
  Send, AlertTriangle, Lock, Settings, Shield, Star,
  CheckCircle2, XCircle, Info, MessageSquare, Clock, Bell,
  Paperclip, X, FileIcon, ImageIcon, Download, Eye,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  type Task, type TaskStatus, type TimelineEntry, type AuthorRole, type FileAttachmentData,
  canComment, canTransition, getCommentPlaceholder, getStatusBanner,
  STATUS_LABELS, ROLE_LABELS, getEffectiveDeadline, DSP4_COMPLETION_DAYS,
} from "@/lib/taskTypes";
import { saveForceCloseRequest } from "@/lib/adminData";
import {
  notifyAlertRaised, notifyForceCloseRequested, notifyTaskMarkedDone,
  notifyDisputeRaised, notifyFixResubmitted, notifyRatingRequired,
  notifyTaskClosed,
} from "@/lib/notifications";
import { format, addDays, differenceInDays, isAfter, isBefore } from "date-fns";
import { generateDisputeId, MAX_DISPUTES, isEscalated } from "@/lib/disputeId";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
const DISPUTE_COOLDOWN_MS = 48 * 60 * 60 * 1000;
const FORCE_CLOSE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface FileAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
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

function formatDisputeCooldown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatCooldown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
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
  currentUserRole: AuthorRole;
  currentUserName: string;
  entries: TimelineEntry[];
  onAddEntry: (entries: TimelineEntry[]) => void;
  onStatusChange: (newStatus: TaskStatus, entries: TimelineEntry[]) => void;
  onRatingSubmit?: (rating: number, feedback: string) => void;
  onDeadlineExtend?: (newDeadline: string) => void;
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
  onDeadlineExtend,
}: TaskTimelineProps) => {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  /** After "Accept work", requestor must rate before `Closed` (Sprint-0 contract; no `completed` state). */
  const [ratingMandatory, setRatingMandatory] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [showForceCloseDialog, setShowForceCloseDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendDate, setExtendDate] = useState<Date | undefined>(undefined);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = task.status as TaskStatus;
  const allowed = canComment(status, currentUserRole);
  const banner = getStatusBanner(status, currentUserRole);
  const placeholder = getCommentPlaceholder(status, currentUserRole);
  const effectiveDeadline = getEffectiveDeadline(task);
  const canShowRequestorDisputeAction =
    currentUserRole === "requestor" &&
    (status === "done" || status === "disputed") &&
    (task.disputeCount || 0) < MAX_DISPUTES;

  // Find the most recent dispute and done-after-dispute entries for cooldown logic
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const lastDisputeEntry = [...sortedEntries].reverse().find(
    (entry) =>
      (entry.entryType === "status_change" && entry.metadata?.toStatus === "disputed") ||
      (entry.systemGenerated && /dispute\s+(raised|escalated)/i.test(entry.message)),
  );
  const lastDisputeTime = lastDisputeEntry
    ? new Date(lastDisputeEntry.timestamp).getTime()
    : (task.disputes?.length ? new Date(task.disputes[task.disputes.length - 1].createdAt).getTime() : 0);

  // Check if there's a "done" status change AFTER the last dispute
  const lastDoneAfterDisputeEntry = lastDisputeTime > 0
    ? [...sortedEntries].reverse().find(
        (entry) =>
          new Date(entry.timestamp).getTime() > lastDisputeTime &&
          ((entry.entryType === "status_change" && entry.metadata?.toStatus === "done") ||
           (entry.systemGenerated && /moved.*back to done|marked.*as done/i.test(entry.message))),
      )
    : undefined;

  // If task is currently "done" AND there's a done entry after the last dispute, cooldown resets
  // Also reset if current status is "done" and the task was moved back from disputed
  const cooldownResetByDone = lastDoneAfterDisputeEntry != null || (status === "done" && lastDisputeTime > 0 && task.statusEnteredAt && new Date(task.statusEnteredAt).getTime() > lastDisputeTime);
  const lastDisputeTimestamp = cooldownResetByDone
    ? undefined
    : (lastDisputeEntry?.timestamp ?? task.disputes?.[task.disputes.length - 1]?.createdAt);
  const getDisputeCooldownRemaining = (referenceTime: number) => {
    if (!lastDisputeTimestamp) return 0;
    const disputeTime = new Date(lastDisputeTimestamp).getTime();
    if (Number.isNaN(disputeTime)) return 0;
    return Math.max(0, DISPUTE_COOLDOWN_MS - (referenceTime - disputeTime));
  };
  const disputeCooldownRemaining = getDisputeCooldownRemaining(currentTime);
  const isDisputeOnCooldown = disputeCooldownRemaining > 0;
  const disputeCooldownMessage = `Next dispute available in ${formatDisputeCooldown(disputeCooldownRemaining)}.`;

  // Force close cooldown logic (24h)
  const lastForceCloseEntry = [...sortedEntries].reverse().find(
    (entry) =>
      entry.systemGenerated && /force.?close\s+requested/i.test(entry.message),
  );
  const lastForceCloseTimestamp = lastForceCloseEntry?.timestamp;
  const getForceCloseCooldownRemaining = (referenceTime: number) => {
    if (!lastForceCloseTimestamp) return 0;
    const fcTime = new Date(lastForceCloseTimestamp).getTime();
    if (Number.isNaN(fcTime)) return 0;
    return Math.max(0, FORCE_CLOSE_COOLDOWN_MS - (referenceTime - fcTime));
  };
  const forceCloseCooldownRemaining = getForceCloseCooldownRemaining(currentTime);
  const isForceCloseOnCooldown = forceCloseCooldownRemaining > 0;
  const forceCloseCooldownMessage = `Next request available in ${formatCooldown(forceCloseCooldownRemaining)}.`;

  const deadlinePassed = effectiveDeadline ? isAfter(new Date(), new Date(effectiveDeadline)) : false;
  const daysUntilDeadline = effectiveDeadline ? differenceInDays(new Date(effectiveDeadline), new Date()) : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  useEffect(() => {
    const needsDisputeTimer = canShowRequestorDisputeAction && lastDisputeTimestamp;
    const needsForceCloseTimer = lastForceCloseTimestamp && currentUserRole === "requestor";
    if (!needsDisputeTimer && !needsForceCloseTimer) return;
    setCurrentTime(Date.now());
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, [canShowRequestorDisputeAction, lastDisputeTimestamp, lastForceCloseTimestamp, currentUserRole]);

  const isMandatoryRating =
    ratingMandatory && currentUserRole === "requestor" && status === "done";

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
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          attachment.dataUrl = ev.target?.result as string;
          setAttachedFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, create a data URL too for download
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

    // Store attachment data in metadata for later preview/download
    const attachmentData: FileAttachmentData[] = attachedFiles.map(f => ({
      name: f.name, size: f.size, type: f.type, dataUrl: f.dataUrl,
    }));

    const newEntry: TimelineEntry = {
      id: generateEntryId(),
      taskId: task.id,
      author: currentUserName,
      authorRole: currentUserRole,
      message,
      timestamp: new Date().toISOString(),
      systemGenerated: false,
      entryType: "comment",
      metadata: attachmentData.length > 0 ? { attachments: attachmentData } : undefined,
    };

    const newEntries = [newEntry];

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
    if (status !== "done" || currentUserRole !== "requestor") return;
    notifyRatingRequired(task);
    setRatingMandatory(true);
    setShowRatingDialog(true);
  };

  // ── Requestor raises dispute ───────────────────────────────────────────

  const handleOpenDisputeDialog = () => {
    const liveCooldownRemaining = getDisputeCooldownRemaining(Date.now());
    if (liveCooldownRemaining > 0) {
      toast({
        title: "Dispute cooldown active",
        description: `You can raise the next dispute in ${formatDisputeCooldown(liveCooldownRemaining)}.`,
      });
      return;
    }
    setShowDisputeDialog(true);
  };

  const handleRaiseDispute = () => {
    if (status !== "done" && status !== "disputed") return;
    if (status === "done" && !canTransition(status, "disputed")) return;
    const disputeNumber = (task.disputeCount || 0) + 1;
    if (disputeNumber > MAX_DISPUTES) return;
    const liveCooldownRemaining = getDisputeCooldownRemaining(Date.now());
    if (liveCooldownRemaining > 0) {
      toast({
        title: "Dispute cooldown active",
        description: `You can raise the next dispute in ${formatDisputeCooldown(liveCooldownRemaining)}.`,
      });
      return;
    }
    const disputeId = generateDisputeId(task.taskId, disputeNumber);
    const escalated = isEscalated(disputeNumber);
    const escalationNote = escalated ? " ⚠️ ESCALATED — Admin review required." : "";
    const disputeActionLabel = status === "disputed" ? "Dispute escalated" : "Dispute raised";
    const sysEntry = createSystemEntry(
      task.id,
      `${disputeActionLabel} by Requestor (${currentUserName}). ${disputeId} (Dispute #${disputeNumber}/${MAX_DISPUTES}).${escalationNote}`,
      "status_change",
      { fromStatus: status, toStatus: "disputed", disputeCount: disputeNumber }
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

  const handleOpenForceCloseDialog = () => {
    const liveCooldown = getForceCloseCooldownRemaining(Date.now());
    if (liveCooldown > 0) {
      toast({
        title: "Force close cooldown active",
        description: `You can request force close again in ${formatCooldown(liveCooldown)}.`,
      });
      return;
    }
    setShowForceCloseDialog(true);
  };

  const handleForceCloseRequest = () => {
    const entry = createSystemEntry(
      task.id,
      `Force-close requested by Requestor (${currentUserName}). Pending admin review.`,
      "admin_action"
    );
    setShowForceCloseDialog(false);
    notifyForceCloseRequested(task);

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
      `Task force-closed by Admin (${currentUserName}). Escalated dispute resolved. Platform-held funds settled.`,
      "admin_action",
      { fromStatus: "disputed" as TaskStatus, toStatus: "force_closed" }
    );
    setShowForceCloseDialog(false);
    notifyTaskClosed(task);
    onStatusChange("force_closed", [closeEntry]);
  };

  // ── Deadline extension ────────────────────────────────────────────────

  const handleExtendDeadline = () => {
    if (!extendDate) return;
    const newDeadline = format(extendDate, "yyyy-MM-dd");
    const entry = createSystemEntry(
      task.id,
      `📅 Deadline extended by Requestor (${currentUserName}) to ${format(extendDate, "MMMM do, yyyy")}`,
      "status_change"
    );
    setShowExtendDialog(false);
    setExtendDate(undefined);
    onAddEntry([entry]);
    onDeadlineExtend?.(newDeadline);
  };

  // ── Rating submission ──────────────────────────────────────────────────

  const handleSubmitRating = () => {
    if (ratingValue === 0 || !canTransition(status, "closed")) return;
    const ratingEntry = createSystemEntry(
      task.id,
      `${currentUserName} rated the acceptor ${ratingValue}/5. ${ratingFeedback ? `Feedback: "${ratingFeedback}"` : ""}`,
      "rating",
      { rating: ratingValue }
    );
    const closeEntry = createSystemEntry(
      task.id,
      "Task closed. Platform-held funds released. Reliability scores updated.",
      "escrow",
      { fromStatus: "done", toStatus: "closed" }
    );
    setShowRatingDialog(false);
    setRatingMandatory(false);
    onRatingSubmit?.(ratingValue, ratingFeedback);
    notifyTaskClosed(task);
    onStatusChange("closed", [ratingEntry, closeEntry]);
  };

  // ── Download attachment ────────────────────────────────────────────────

  const downloadAttachment = (att: FileAttachmentData) => {
    if (!att.dataUrl) return;
    const link = document.createElement("a");
    link.href = att.dataUrl;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render timeline entry ──────────────────────────────────────────────

  const renderEntry = (entry: TimelineEntry) => {
    const isSystem = entry.systemGenerated;
    const Icon = ROLE_ICONS[entry.entryType] || MessageSquare;

    const hasAttachments = entry.message.includes("📎 ");
    const messageLines = entry.message.split("\n");
    const textLines = messageLines.filter(l => !l.startsWith("📎 "));
    const attachmentLines = messageLines.filter(l => l.startsWith("📎 "));
    const attachmentData = entry.metadata?.attachments || [];

    // Admin comments should render with ADMIN badge, not as anonymous system entries
    const isAdminComment = entry.authorRole === "admin" && entry.entryType === "admin_action";

    if (isSystem && !isAdminComment) {
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
            {/* Render attachments with preview/download */}
            {attachmentData.length > 0 ? (
              <div className={`${textLines.filter(Boolean).length > 0 ? "mt-2 pt-2 border-t border-border" : ""} space-y-2`}>
                {attachmentData.map((att, i) => (
                  <div key={i} className="space-y-1">
                    {att.type.startsWith("image/") && att.dataUrl && (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="max-w-[200px] max-h-[150px] rounded-md border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(att.dataUrl!)}
                      />
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{att.name} ({formatFileSize(att.size)})</span>
                      {att.dataUrl && (
                        <button
                          onClick={() => downloadAttachment(att)}
                          className="flex items-center gap-0.5 text-primary hover:underline shrink-0"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                      )}
                      {att.type.startsWith("image/") && att.dataUrl && (
                        <button
                          onClick={() => setPreviewImage(att.dataUrl!)}
                          className="flex items-center gap-0.5 text-primary hover:underline shrink-0"
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : attachmentLines.length > 0 ? (
              <div className={`${textLines.filter(Boolean).length > 0 ? "mt-2 pt-2 border-t border-border" : ""} space-y-1`}>
                {attachmentLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span>{line.replace("📎 ", "")}</span>
                  </div>
                ))}
              </div>
            ) : null}
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
        <div key="force-close-wrapper" className="relative group">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenForceCloseDialog}
            aria-disabled={isForceCloseOnCooldown}
            title={isForceCloseOnCooldown ? forceCloseCooldownMessage : undefined}
            className={cn(
              "gap-1.5",
              isForceCloseOnCooldown
                ? "cursor-not-allowed border-border text-muted-foreground hover:bg-background hover:text-muted-foreground"
                : "text-destructive border-destructive/30"
            )}
          >
            <XCircle className="h-3.5 w-3.5" /> Request Force-Close
          </Button>
          {isForceCloseOnCooldown && (
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-center text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {forceCloseCooldownMessage}
            </div>
          )}
        </div>
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
          <div key="force-close-wrapper-ip" className="relative group">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenForceCloseDialog}
              aria-disabled={isForceCloseOnCooldown}
              title={isForceCloseOnCooldown ? forceCloseCooldownMessage : undefined}
              className={cn(
                "gap-1.5",
                isForceCloseOnCooldown
                  ? "cursor-not-allowed border-border text-muted-foreground hover:bg-background hover:text-muted-foreground"
                  : "text-destructive border-destructive/30"
              )}
            >
              <XCircle className="h-3.5 w-3.5" /> Request Force-Close
            </Button>
            {isForceCloseOnCooldown && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-center text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {forceCloseCooldownMessage}
              </div>
            )}
          </div>
        );
      }
    }

    // Done: requestor can accept work
    if (status === "done" && currentUserRole === "requestor") {
      actions.push(
        <Button key="accept-work" size="sm" onClick={handleAcceptWork} className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Accept Work
        </Button>
      );
    }

    // Requestor can keep escalating disputes until DSP4, with a 48-hour cooldown between raises
    if (canShowRequestorDisputeAction) {
      actions.push(
        <div key="dispute-wrapper" className="relative group">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenDisputeDialog}
            aria-disabled={isDisputeOnCooldown}
            title={isDisputeOnCooldown ? disputeCooldownMessage : undefined}
            className={cn(
              "gap-1.5",
              isDisputeOnCooldown
                ? "cursor-not-allowed border-border text-muted-foreground hover:bg-background hover:text-muted-foreground"
                : "border-destructive/30 text-destructive"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Raise Dispute
          </Button>
          {isDisputeOnCooldown && (
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-center text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {disputeCooldownMessage}
            </div>
          )}
        </div>
      );
    }

    // Disputed: acceptor can resubmit fix if NOT escalated OR if DSP4 resolved valid
    const disputeIsEscalated = isEscalated(task.disputeCount || 0);

    if (status === "disputed" && currentUserRole === "acceptor") {
      // Allow if not escalated, OR if DSP4 resolved valid
      if (!disputeIsEscalated || task.dsp4ResolvedValid) {
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

    // Deadline extension: requestor can extend if deadline has passed (in_progress or committed)
    if (deadlinePassed && currentUserRole === "requestor" && ["committed", "in_progress", "done", "disputed"].includes(status)) {
      actions.push(
        <Button key="extend" variant="outline" size="sm" onClick={() => setShowExtendDialog(true)} className="gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" /> Extend Deadline
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

      {/* Deadline banner for acceptor */}
      {currentUserRole === "acceptor" && effectiveDeadline && !["closed", "force_closed"].includes(status) && (
        <div className={cn(
          "flex items-center gap-2 mx-4 mt-3 rounded-lg border p-3 text-sm font-medium",
          deadlinePassed
            ? "bg-destructive/10 border-destructive/20 text-destructive"
            : daysUntilDeadline !== null && daysUntilDeadline <= 3
            ? "bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)]"
            : "bg-primary/10 border-primary/20 text-primary"
        )}>
          <Clock className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-bold">Deadline: {format(new Date(effectiveDeadline), "MMMM do, yyyy")}</span>
            {task.extendedDeadline && <span className="ml-1 text-xs">(Extended)</span>}
            {deadlinePassed && <span className="ml-2">⚠️ Deadline has passed!</span>}
            {!deadlinePassed && daysUntilDeadline !== null && daysUntilDeadline <= 3 && (
              <span className="ml-2">⏰ {daysUntilDeadline} day{daysUntilDeadline !== 1 ? "s" : ""} remaining</span>
            )}
          </div>
        </div>
      )}

      {/* Deadline reminder for requestor */}
      {currentUserRole === "requestor" && effectiveDeadline && !["closed", "force_closed", "open"].includes(status) && (
        <div className={cn(
          "flex items-center gap-2 mx-4 mt-3 rounded-lg border p-3 text-sm",
          deadlinePassed
            ? "bg-destructive/10 border-destructive/20 text-destructive"
            : daysUntilDeadline !== null && daysUntilDeadline <= 3
            ? "bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)]"
            : "bg-muted border-border text-muted-foreground"
        )}>
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <div>
            <span>Deadline: <strong>{format(new Date(effectiveDeadline), "MMMM do, yyyy")}</strong></span>
            {task.extendedDeadline && <span className="ml-1 text-xs">(Extended)</span>}
            {deadlinePassed && <span className="ml-2 font-medium">⚠️ Deadline has passed. You can extend it.</span>}
            {!deadlinePassed && daysUntilDeadline !== null && daysUntilDeadline <= 3 && (
              <span className="ml-2">⏰ {daysUntilDeadline} day{daysUntilDeadline !== 1 ? "s" : ""} remaining — review approaching</span>
            )}
          </div>
        </div>
      )}

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
            {task.dsp4ResolvedValid && (
              <span className="block mt-1 text-xs font-medium">
                ✅ Admin resolved as VALID. Acceptor: please complete the work and mark as Done.
              </span>
            )}
            {!task.dsp4ResolvedValid && currentUserRole === "acceptor" && (
              <span className="block mt-1 text-xs">You may add comments only. Status changes are restricted to admin.</span>
            )}
            {!task.dsp4ResolvedValid && currentUserRole === "requestor" && (
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
      {status !== "closed" && status !== "force_closed" && status !== "open" && (
        <div className="border-t border-border p-4">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                  {f.type.startsWith("image/") ? (
                    <>
                      {f.dataUrl && (
                        <img src={f.dataUrl} alt={f.name} className="h-8 w-8 rounded object-cover" />
                      )}
                      <ImageIcon className="h-3 w-3 text-primary shrink-0" />
                    </>
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

      {/* Closed footer */}
      {(status === "closed" || status === "force_closed") && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/30">
          <Lock className="h-4 w-4" />
          This task is {status === "force_closed" ? "force closed" : "closed"} and cannot be modified.
        </div>
      )}
      {status === "done" && currentUserRole !== "requestor" && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/30">
          <Clock className="h-4 w-4" />
          Waiting for the requestor to accept the work and submit a rating.
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
                ? `This will escalate to Dispute #${(task.disputeCount || 0) + 1} (ESCALATED). Admin review will be required.`
                : `${status === "disputed" ? "This will escalate" : "This will create"} Dispute #${(task.disputeCount || 0) + 1}/${MAX_DISPUTES}. The acceptor will be notified and can submit fixes.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRaiseDispute}>
              {status === "disputed" ? "Confirm Escalation" : "Confirm Dispute"}
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
                ? "This will immediately close the escalated task and settle platform-held funds. This action is irreversible."
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

      {/* Extend deadline dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" /> Extend Deadline
            </DialogTitle>
            <DialogDescription>
              Select a new deadline. The original deadline ({task.deadline ? format(new Date(task.deadline), "MMM d, yyyy") : "—"}) will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <Calendar
              mode="single"
              selected={extendDate}
              onSelect={setExtendDate}
              disabled={(date) => isBefore(date, addDays(new Date(), 1))}
              className="rounded-md border"
            />
          </div>
          {extendDate && (
            <p className="text-sm text-center text-foreground">
              New deadline: <strong>{format(extendDate, "MMMM do, yyyy")}</strong>
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>Cancel</Button>
            <Button disabled={!extendDate} onClick={handleExtendDeadline}>Confirm Extension</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl p-2">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Rating dialog — mandatory after Accept work while task is Done */}
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
              Your rating is mandatory to close this task. Platform-held funds will be released upon submission.
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

import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  type Task, type TaskStatus, type TimelineEntry, type AuthorRole, type FileAttachmentData,
  STATUS_COLORS, STATUS_LABELS, PLATFORM_FEE_PERCENT, TRUST_DEPOSIT_PERCENT,
  ROLE_LABELS, getEffectiveDeadline,
} from "@/lib/taskTypes";
import { format } from "date-fns";
import { generateDisputeId, isEscalated, MAX_DISPUTES } from "@/lib/disputeId";
import { ApiClientError } from "@/lib/api/client";
import { addTaskComment, getTaskDetail } from "@/lib/tasks/api";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, Lock, Info, Star, MessageSquare, Settings, Shield, Bell,
  Clock, Send, Paperclip, FileIcon, ImageIcon, X, Download,
} from "lucide-react";

const ROLE_ICONS: Record<string, React.ElementType> = {
  status_change: Settings,
  alert: Bell,
  admin_action: Shield,
  escrow: Lock,
  funds: Lock,
  rating: Star,
  comment: MessageSquare,
};

const ROLE_AVATAR_COLORS: Record<string, string> = {
  requestor: "bg-primary/10 text-primary",
  acceptor: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  admin: "bg-destructive/10 text-destructive",
  system: "bg-muted text-muted-foreground",
};

const MAX_FILE_SIZE_MB = 25;

interface FileAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadAttachment(att: FileAttachmentData) {
  if (!att.dataUrl) return;
  const link = document.createElement("a");
  link.href = att.dataUrl;
  link.download = att.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface AdminTaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminTaskDetailDialog = ({ task, open, onOpenChange }: AdminTaskDetailDialogProps) => {
  const [adminComment, setAdminComment] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  const loadTimeline = useCallback(async () => {
    if (!task?.id) return;
    setTimelineLoading(true);
    try {
      const detail = await getTaskDetail(task.id);
      setTimeline(detail.timeline);
    } catch {
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (open && task) {
      setAdminComment("");
      setAttachedFiles([]);
      void loadTimeline();
    }
  }, [open, task?.id, loadTimeline]);

  useEffect(() => {
    if (!open || !task) return;
    const interval = setInterval(() => void loadTimeline(), 15000);
    return () => clearInterval(interval);
  }, [open, task, loadTimeline]);

  if (!task) return null;

  const status = task.status as TaskStatus;
  const fee = parseFloat((task.reward * (PLATFORM_FEE_PERCENT / 100)).toFixed(2));
  const acceptorPayout = parseFloat((task.reward - fee).toFixed(2));
  const trustDeposit = parseFloat((task.reward * (TRUST_DEPOSIT_PERCENT / 100)).toFixed(2));
  const effectiveDeadline = getEffectiveDeadline(task);
  const canAdminComment = status === "disputed";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: `File too large`, description: `"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        continue;
      }
      const attachment: FileAttachment = { name: file.name, size: file.size, type: file.type };
      const reader = new FileReader();
      reader.onload = (ev) => {
        attachment.dataUrl = ev.target?.result as string;
        setAttachedFiles((prev) => [...prev]);
      };
      reader.readAsDataURL(file);
      newFiles.push(attachment);
    }
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdminComment = async () => {
    if (!adminComment.trim() && attachedFiles.length === 0) return;
    if (!canAdminComment) {
      toast({
        title: "Comments unavailable",
        description: "Admin timeline comments are allowed while the task is disputed.",
        variant: "destructive",
      });
      return;
    }

    let message = adminComment.trim();
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map((f) => `📎 ${f.name} (${formatFileSize(f.size)})`).join("\n");
      message = message ? `${message}\n\n${fileList}` : fileList;
    }

    const attachmentData: FileAttachmentData[] = attachedFiles
      .filter((f) => f.dataUrl)
      .map((f) => ({ name: f.name, size: f.size, type: f.type, dataUrl: f.dataUrl }));

    setSubmitting(true);
    try {
      await addTaskComment(task.id, message, {
        entryType: "comment",
        ...(attachmentData.length > 0 ? { attachments: attachmentData } : {}),
      });
      setAdminComment("");
      setAttachedFiles([]);
      await loadTimeline();
      toast({ title: "Comment posted", description: "Visible on the task timeline." });
    } catch (err) {
      toast({
        title: "Comment failed",
        description: err instanceof ApiClientError ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl h-[min(92vh,900px)] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="shrink-0 px-6 pt-6 pb-2 pr-12">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge className={`${STATUS_COLORS[status] || "bg-muted"} text-xs`}>
                  {STATUS_LABELS[status] || task.status}
                </Badge>
                <span className="text-lg font-bold text-foreground">{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</span>
              </div>
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
              {task.taskId && (
                <p className="text-xs font-mono text-muted-foreground select-all">{task.taskId}</p>
              )}
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="px-6 space-y-4 pb-6">
              {status === "disputed" && task.disputeCount && task.disputeCount > 0 && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  isEscalated(task.disputeCount)
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-[hsl(35,90%,50%)]/10 border-[hsl(35,90%,50%)]/20 text-[hsl(35,90%,50%)]"
                }`}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-mono font-semibold">{generateDisputeId(task.taskId, task.disputeCount)}</span>
                  <span>Dispute #{task.disputeCount}/{MAX_DISPUTES}</span>
                  {isEscalated(task.disputeCount) && <span className="font-bold">⚠️ ESCALATED</span>}
                </div>
              )}

              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Task Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Description</p><p className="font-medium">{task.description || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Work Type</p><p className="font-medium">{task.workType || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{task.location || "—"}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="font-medium">{effectiveDeadline ? format(new Date(effectiveDeadline), "MMMM do, yyyy") : "—"}</p>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Domain</p><p className="font-medium">{task.domain || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Skills</p><p className="font-medium">{task.skills?.join(", ") || "—"}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">Requestor</h3>
                  <p className="text-sm font-semibold">{task.createdBy || "—"}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">Acceptor</h3>
                  <p className="text-sm font-semibold">{task.acceptedBy || "Not assigned"}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Pay Breakdown</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Reward</span><span>{task.currencySymbol || "₹"}{task.reward.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span><span className="text-destructive">-{task.currencySymbol || "₹"}{fee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Acceptor Payout</span>
                    <span className="text-[hsl(var(--success))]">{task.currencySymbol || "₹"}{acceptorPayout.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Activity & Comments ({timeline.length})
                </h3>
                {timelineLoading && timeline.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Loading timeline…</p>
                ) : timeline.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No activity yet.
                  </div>
                ) : (
                  <>
                      <div className="space-y-2">
                        {timeline.map((entry) => {
                          const Icon = ROLE_ICONS[entry.entryType] || MessageSquare;
                          const isSystem = entry.systemGenerated;
                          const avatarColor = ROLE_AVATAR_COLORS[entry.authorRole] || ROLE_AVATAR_COLORS.system;
                          const messageLines = entry.message.split("\n");
                          const textLines = messageLines.filter((l) => !l.startsWith("📎 "));
                          const attachmentData: FileAttachmentData[] = entry.metadata?.attachments || [];
                          const isAdminComment = entry.authorRole === "admin";

                          if (isSystem && !isAdminComment) {
                            return (
                              <div key={entry.id} className="flex gap-2 py-1.5">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-xs font-semibold text-foreground">{entry.author}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{textLines.join("\n").trim()}</p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={entry.id} className="flex gap-2 py-1.5">
                              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                                <AvatarFallback className={`text-[10px] font-semibold ${avatarColor}`}>
                                  {entry.author.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-xs font-semibold text-foreground">{entry.author}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                    {ROLE_LABELS[entry.authorRole as AuthorRole] || entry.authorRole}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                                  </span>
                                </div>
                                <div className="rounded-md bg-muted/50 border border-border px-2.5 py-1.5">
                                  <p className="text-xs text-foreground whitespace-pre-wrap">{textLines.join("\n").trim()}</p>
                                  {attachmentData.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                      {attachmentData.map((att, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                          <Paperclip className="h-2.5 w-2.5" />
                                          <span>{att.name}</span>
                                          {att.dataUrl && (
                                            <button type="button" onClick={() => downloadAttachment(att)} className="text-primary hover:underline">
                                              Download
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    <div ref={timelineEndRef} />
                  </>
                )}

                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Admin Comment</p>
                  {!canAdminComment && (
                    <p className="text-[10px] text-muted-foreground mb-2">Available when task status is disputed.</p>
                  )}
                  <Textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Add a comment as admin..."
                    className="min-h-[50px] text-xs resize-none"
                    disabled={!canAdminComment || submitting}
                  />
                  <div className="flex items-center justify-end mt-2">
                    <Button
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      disabled={!canAdminComment || submitting || (!adminComment.trim() && attachedFiles.length === 0)}
                      onClick={() => void handleAdminComment()}
                    >
                      <Send className="h-3 w-3" /> Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl p-2">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminTaskDetailDialog;

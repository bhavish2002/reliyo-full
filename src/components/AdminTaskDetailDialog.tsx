import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  type Task, type TaskStatus, type TimelineEntry, type AuthorRole, type FileAttachmentData,
  STATUS_COLORS, STATUS_LABELS, PLATFORM_FEE_PERCENT, TRUST_DEPOSIT_PERCENT,
  ROLE_LABELS, getEffectiveDeadline,
} from "@/lib/taskTypes";
import { adminAddTimelineEntry } from "@/lib/adminData";
import { format } from "date-fns";
import { generateDisputeId, isEscalated, MAX_DISPUTES } from "@/lib/disputeId";
import {
  AlertTriangle, Lock, Info, Star, MessageSquare, Settings, Shield, Bell,
  Clock, Send, Paperclip, FileIcon, ImageIcon, X, Download, Eye,
} from "lucide-react";

const ROLE_ICONS: Record<string, React.ElementType> = {
  status_change: Settings,
  alert: Bell,
  admin_action: Shield,
  escrow: Lock,
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
  const [timelineKey, setTimelineKey] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  // Auto-refresh timeline when dialog opens or task changes
  useEffect(() => {
    if (open && task) {
      setTimelineKey(k => k + 1);
      setAdminComment("");
      setAttachedFiles([]);
    }
  }, [open, task?.id]);

  // Auto-scroll to bottom of timeline when new entries added
  useEffect(() => {
    if (timelineEndRef.current) {
      setTimeout(() => timelineEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [timelineKey]);

  // Auto-refresh timeline every 3s while open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setTimelineKey(k => k + 1), 3000);
    return () => clearInterval(interval);
  }, [open]);

  if (!task) return null;

  const status = task.status as TaskStatus;
  const fee = parseFloat((task.reward * (PLATFORM_FEE_PERCENT / 100)).toFixed(2));
  const acceptorPayout = parseFloat((task.reward - fee).toFixed(2));
  const trustDeposit = parseFloat((task.reward * (TRUST_DEPOSIT_PERCENT / 100)).toFixed(2));
  const effectiveDeadline = getEffectiveDeadline(task);

  // Load timeline
  let timeline: TimelineEntry[] = [];
  try {
    timeline = JSON.parse(localStorage.getItem(`reliyo_timeline_${task.id}`) || "[]");
  } catch {}

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        continue;
      }
      const attachment: FileAttachment = { name: file.name, size: file.size, type: file.type };
      const reader = new FileReader();
      reader.onload = (ev) => {
        attachment.dataUrl = ev.target?.result as string;
        setAttachedFiles(prev => [...prev]);
      };
      reader.readAsDataURL(file);
      newFiles.push(attachment);
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdminComment = () => {
    if (!adminComment.trim() && attachedFiles.length === 0) return;

    let message = adminComment.trim();
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map(f => `📎 ${f.name} (${formatFileSize(f.size)})`).join("\n");
      message = message ? `${message}\n\n${fileList}` : fileList;
    }

    // Store attachments in timeline metadata
    const attachmentData: FileAttachmentData[] = attachedFiles
      .filter(f => f.dataUrl)
      .map(f => ({ name: f.name, size: f.size, type: f.type, dataUrl: f.dataUrl }));

    const key = `reliyo_timeline_${task.id}`;
    try {
      const entries = JSON.parse(localStorage.getItem(key) || "[]");
      entries.push({
        id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        taskId: task.id,
        author: "Admin",
        authorRole: "admin",
        message,
        timestamp: new Date().toISOString(),
        systemGenerated: true,
        entryType: "admin_action",
        metadata: attachmentData.length > 0 ? { attachments: attachmentData } : undefined,
      });
      localStorage.setItem(key, JSON.stringify(entries));
    } catch {}

    setAdminComment("");
    setAttachedFiles([]);
    setTimelineKey(k => k + 1);
  };

  // Re-read timeline when key changes
  let currentTimeline = timeline;
  if (timelineKey > 0) {
    try {
      currentTimeline = JSON.parse(localStorage.getItem(`reliyo_timeline_${task.id}`) || "[]");
    } catch {}
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
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

          <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
            <div className="space-y-4 pb-4">
              {/* Dispute banner */}
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

              {/* Task Details */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Task Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Description</p><p className="font-medium">{task.description || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Work Type</p><p className="font-medium">{task.workType || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{task.location || "—"}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="font-medium">{task.deadline ? format(new Date(task.deadline), "MMMM do, yyyy") : "—"}</p>
                    {task.extendedDeadline && (
                      <p className="text-xs text-[hsl(35,90%,50%)] font-medium">Extended: {format(new Date(task.extendedDeadline), "MMMM do, yyyy")}</p>
                    )}
                  </div>
                  <div><p className="text-xs text-muted-foreground">Domain</p><p className="font-medium">{task.domain || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Skills</p><p className="font-medium">{task.skills?.join(", ") || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Manpower</p><p className="font-medium">{task.manpower}</p></div>
                  <div><p className="text-xs text-muted-foreground">Update Frequency</p><p className="font-medium">{task.updateFrequency || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{task.createdAt ? format(new Date(task.createdAt), "MMM d, yyyy h:mm a") : "—"}</p></div>
                </div>
              </div>

              {/* People */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">Requestor</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {task.createdBy?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold">{task.createdBy || "—"}</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">Acceptor</h3>
                  {task.acceptedBy ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm font-semibold">
                          {task.acceptedBy.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-semibold">{task.acceptedBy}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not assigned</p>
                  )}
                </div>
              </div>

              {/* Pay Breakdown */}
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
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Trust Deposit Locked (10%)</span>
                    <span>{task.currencySymbol || "₹"}{trustDeposit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline / Activity & Comments */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Activity & Comments ({currentTimeline.length})
                </h3>
                {currentTimeline.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No activity yet.
                  </div>
                ) : (
                  <>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {currentTimeline.map((entry) => {
                      const Icon = ROLE_ICONS[entry.entryType] || MessageSquare;
                      const isSystem = entry.systemGenerated;
                      const avatarColor = ROLE_AVATAR_COLORS[entry.authorRole] || ROLE_AVATAR_COLORS.system;

                      const messageLines = entry.message.split("\n");
                      const textLines = messageLines.filter(l => !l.startsWith("📎 "));
                      const attachmentLines = messageLines.filter(l => l.startsWith("📎 "));
                      const attachmentData: FileAttachmentData[] = entry.metadata?.attachments || [];

                      if (isSystem) {
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
                              {/* Render attachments */}
                              {attachmentData.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {attachmentData.map((att, i) => (
                                    <div key={i} className="space-y-0.5">
                                      {att.type.startsWith("image/") && att.dataUrl && (
                                        <img
                                          src={att.dataUrl}
                                          alt={att.name}
                                          className="max-w-[150px] max-h-[100px] rounded border border-border cursor-pointer hover:opacity-80"
                                          onClick={() => setPreviewImage(att.dataUrl!)}
                                        />
                                      )}
                                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Paperclip className="h-2.5 w-2.5" />
                                        <span>{att.name}</span>
                                        {att.dataUrl && (
                                          <button onClick={() => downloadAttachment(att)} className="text-primary hover:underline flex items-center gap-0.5">
                                            <Download className="h-2.5 w-2.5" /> Download
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                              {textLines.filter(Boolean).length > 0 && (
                                <p className="text-xs text-foreground whitespace-pre-wrap">{textLines.join("\n").trim()}</p>
                              )}
                              {/* Render attachments with preview/download */}
                              {attachmentData.length > 0 ? (
                                <div className={`${textLines.filter(Boolean).length > 0 ? "mt-1.5 pt-1.5 border-t border-border" : ""} space-y-1`}>
                                  {attachmentData.map((att, i) => (
                                    <div key={i} className="space-y-0.5">
                                      {att.type.startsWith("image/") && att.dataUrl && (
                                        <img
                                          src={att.dataUrl}
                                          alt={att.name}
                                          className="max-w-[150px] max-h-[100px] rounded border border-border cursor-pointer hover:opacity-80"
                                          onClick={() => setPreviewImage(att.dataUrl!)}
                                        />
                                      )}
                                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Paperclip className="h-2.5 w-2.5" />
                                        <span>{att.name} ({formatFileSize(att.size)})</span>
                                        {att.dataUrl && (
                                          <button onClick={() => downloadAttachment(att)} className="text-primary hover:underline flex items-center gap-0.5">
                                            <Download className="h-2.5 w-2.5" /> Download
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : attachmentLines.length > 0 ? (
                                <div className={`${textLines.filter(Boolean).length > 0 ? "mt-1.5 pt-1.5 border-t border-border" : ""} space-y-0.5`}>
                                  {attachmentLines.map((line, i) => (
                                    <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                      <span>{line.replace("📎 ", "")}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div ref={timelineEndRef} />
                )}

                {/* Admin comment composer */}
                  <p className="text-xs font-semibold text-foreground mb-2">Admin Comment</p>
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {attachedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px]">
                          {f.type.startsWith("image/") ? (
                            <ImageIcon className="h-2.5 w-2.5 text-primary shrink-0" />
                          ) : (
                            <FileIcon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate max-w-[100px]">{f.name}</span>
                          <button onClick={() => removeFile(i)} className="hover:text-destructive">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Add a comment as admin..."
                    className="min-h-[50px] text-xs resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAdminComment();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground hover:text-foreground h-6 px-1.5 text-[10px]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-3 w-3" /> Attach
                      </Button>
                      <span className="text-[10px] text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB</span>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      disabled={!adminComment.trim() && attachedFiles.length === 0}
                      onClick={handleAdminComment}
                    >
                      <Send className="h-3 w-3" /> Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
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
    </>
  );
};

export default AdminTaskDetailDialog;

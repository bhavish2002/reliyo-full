import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, AlertTriangle, CheckCircle2, Star, Info, Flag, MailOpen, Mail,
  ExternalLink, ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser } from "@/lib/auth";
import {
  type AppNotification, type NotificationType, type NotificationTarget,
  getNotifications, markNotificationRead, markAllNotificationsRead, toggleNotificationFlag,
} from "@/lib/notifications";

// ── Icon + color map per notification type ──────────────────────────────────

const TYPE_STYLE: Record<NotificationType, { icon: React.ElementType; className: string }> = {
  task_accepted:             { icon: CheckCircle2,  className: "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10" },
  acceptor_quit:             { icon: AlertTriangle,  className: "text-destructive bg-destructive/10" },
  alert_raised:              { icon: Bell,           className: "text-primary bg-primary/10" },
  force_close_requested:     { icon: ShieldAlert,    className: "text-destructive bg-destructive/10" },
  task_marked_done:          { icon: CheckCircle2,  className: "text-primary bg-primary/10" },
  dispute_raised:            { icon: AlertTriangle,  className: "text-destructive bg-destructive/10" },
  fix_resubmitted:           { icon: CheckCircle2,  className: "text-primary bg-primary/10" },
  rating_required:           { icon: Star,           className: "text-primary bg-primary/10" },
  task_force_closed:         { icon: ShieldAlert,    className: "text-muted-foreground bg-muted" },
  admin_force_close_request: { icon: ShieldAlert,    className: "text-destructive bg-destructive/10" },
  admin_dispute_escalation:  { icon: AlertTriangle,  className: "text-destructive bg-destructive/10" },
  admin_abuse_flag:          { icon: ShieldAlert,    className: "text-destructive bg-destructive/10" },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-primary text-primary-foreground",
  medium: "bg-muted text-muted-foreground",
};

const Notifications = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const target: NotificationTarget = currentUser?.role === "admin" ? "admin"
    : currentUser?.role === "acceptor" ? "acceptor" : "requestor";

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const reload = () => setNotifications(getNotifications(target));

  useEffect(() => { reload(); }, [target]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleRead = (id: string) => {
    markNotificationRead(target, id);
    reload();
  };

  const handleToggleFlag = (id: string) => {
    toggleNotificationFlag(target, id);
    reload();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(target);
    reload();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{unreadCount} unread</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bell className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">Notifications will appear here when actions are required on your tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const style = TYPE_STYLE[n.type] || TYPE_STYLE.task_accepted;
            const Icon = style.icon;
            return (
              <Card
                key={n.id}
                className={`rounded-xl transition-colors cursor-pointer ${!n.read ? "border-primary/30 bg-primary/[0.02]" : ""} ${n.flagged ? "ring-1 ring-primary/40" : ""}`}
                onClick={() => navigate(n.ctaPath)}
              >
                <div className="flex items-start gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <Badge className={`${PRIORITY_BADGE[n.priority]} text-[10px] px-1.5 py-0 h-4`}>
                        {n.priority}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{n.taskDisplayId}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">{formatDate(n.timestamp)}</p>
                      <button
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate(n.ctaPath); }}
                      >
                        View Task <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleToggleFlag(n.id); }}
                      title={n.flagged ? "Unflag" : "Flag as important"}
                    >
                      <Flag className={`h-4 w-4 ${n.flagged ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleToggleRead(n.id); }}
                      title={n.read ? "Mark as unread" : "Mark as read"}
                    >
                      {n.read ? (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Notifications;

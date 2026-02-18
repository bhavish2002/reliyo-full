import { useState } from "react";
import {
  Bell, AlertTriangle, CheckCircle2, Star, Info, Flag, MailOpen, Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "update" | "dispute" | "escrow" | "rating" | "general";
  read: boolean;
  flagged: boolean;
}

const ICON_MAP: Record<string, { icon: React.ElementType; className: string }> = {
  update: { icon: Bell, className: "text-primary bg-primary/10" },
  dispute: { icon: AlertTriangle, className: "text-destructive bg-destructive/10" },
  escrow: { icon: CheckCircle2, className: "text-success bg-success/10" },
  rating: { icon: Star, className: "text-primary bg-primary/10" },
  general: { icon: Info, className: "text-muted-foreground bg-muted" },
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1", title: "Progress update received",
    description: 'Priya submitted an update on "Design a logo for my bakery startup"',
    timestamp: "2026-02-05T15:30:00Z", type: "update", read: false, flagged: false,
  },
  {
    id: "n2", title: "Dispute raised on your task",
    description: 'A dispute was raised on "Wise entry for OEM product listings"',
    timestamp: "2026-02-04T11:22:00Z", type: "dispute", read: false, flagged: false,
  },
  {
    id: "n3", title: "Escrow locked",
    description: '₹500 locked for "Deliver documents to Koramangala office"',
    timestamp: "2026-02-03T14:15:00Z", type: "escrow", read: false, flagged: false,
  },
  {
    id: "n4", title: "Rating pending",
    description: 'Please rate "Priya" for "Translate product brochure for Hindi" to close the task.',
    timestamp: "2026-02-02T09:00:00Z", type: "rating", read: false, flagged: false,
  },
  {
    id: "n5", title: "Welcome to Reliyo!",
    description: "Walk through onboarding task completion. Browse open tasks to get started.",
    timestamp: "2026-01-12T15:30:00Z", type: "general", read: false, flagged: false,
  },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const toggleFlag = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, flagged: !n.flagged } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => {
          const iconInfo = ICON_MAP[n.type];
          const Icon = iconInfo.icon;
          return (
            <Card
              key={n.id}
              className={`rounded-xl transition-colors ${!n.read ? "border-primary/30 bg-primary/[0.02]" : ""} ${n.flagged ? "ring-1 ring-primary/40" : ""}`}
            >
              <div className="flex items-start gap-4 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconInfo.className}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(n.timestamp)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFlag(n.id)}
                    title={n.flagged ? "Unflag" : "Flag as important"}
                  >
                    <Flag className={`h-4 w-4 ${n.flagged ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleRead(n.id)}
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
    </DashboardLayout>
  );
};

export default Notifications;

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, AlertTriangle, DollarSign,
  BarChart3, Settings, LogOut, Menu, Clock, Bell, FileX, Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getCurrentUser, clearCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";
import { getAllDisputes, getPendingForceCloseCount } from "@/lib/adminData";

const overviewItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "All Tasks", icon: FileText, path: "/admin/tasks" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Disputes", icon: AlertTriangle, path: "/admin/disputes", dynamicBadge: true, badgeKey: "disputes" },
  { label: "Close Requests", icon: FileX, path: "/admin/close-requests", dynamicBadge: true, badgeKey: "close_requests" },
  { label: "Revenue", icon: DollarSign, path: "/admin/revenue" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Notifications", icon: Bell, path: "/admin/notifications", dynamicBadge: true },
  { label: "Support", icon: Ticket, path: "/admin/support" },
];

const systemItems = [
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

const SidebarContent = ({
  current,
  onNavigate,
  onLogout,
  adminNotifCount,
  disputeCount,
  closeRequestCount,
}: {
  current: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
  adminNotifCount: number;
  disputeCount: number;
  closeRequestCount: number;
}) => {
  const user = getCurrentUser();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">R</span>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Reliyo Admin</p>
          <p className="text-[11px] text-muted-foreground">Monitoring Panel</p>
        </div>
      </div>

      {/* Overview */}
      <p className="mt-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Overview
      </p>
      <nav className="mt-1 space-y-0.5 px-3">
        {overviewItems.map((item) => {
          const active = current === item.path || (item.path !== "/admin" && current.startsWith(item.path));
          const isExact = item.path === "/admin" && current === "/admin";
          const highlight = isExact || active;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                highlight
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {(item as any).badgeKey === "disputes" && disputeCount > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">
                  {disputeCount}
                </Badge>
              )}
              {(item as any).badgeKey === "close_requests" && closeRequestCount > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">
                  {closeRequestCount}
                </Badge>
              )}
              {(item as any).dynamicBadge && !(item as any).badgeKey && adminNotifCount > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">
                  {adminNotifCount}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* System */}
      <p className="mt-5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        System
      </p>
      <nav className="mt-1 space-y-0.5 px-3">
        {systemItems.map((item) => {
          const active = current.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* User info + logout */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-success/20 text-sm font-semibold text-success">
              {user?.name?.[0] || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name || "Super Admin"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email || "admin@reliyo.com"}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminNotifCount, setAdminNotifCount] = useState(0);
  const [disputeBadgeCount, setDisputeBadgeCount] = useState(0);
  const [closeReqCount, setCloseReqCount] = useState(0);

  useEffect(() => {
    const update = () => {
      setAdminNotifCount(getUnreadCount("admin"));
      const disputes = getAllDisputes();
      setDisputeBadgeCount(disputes.filter((d) => d.escalated && d.dsp4Status === "open").length);
      setCloseReqCount(getPendingForceCloseCount());
    };
    update();
    const interval = setInterval(update, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearCurrentUser();
    navigate("/sign-in", { replace: true });
  };
  const handleNav = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-background lg:block">
        <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} adminNotifCount={adminNotifCount} disputeCount={disputeBadgeCount} closeRequestCount={closeReqCount} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} adminNotifCount={adminNotifCount} disputeCount={disputeBadgeCount} closeRequestCount={closeReqCount} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: Just now
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

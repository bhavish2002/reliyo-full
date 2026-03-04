import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Search, Bell, UserRound, LogOut, Plus, Menu,
  Settings, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getCurrentUser, clearCurrentUser } from "@/lib/auth";
import { getUnreadCount, type NotificationTarget } from "@/lib/notifications";
import { getUserSettings, applyTheme } from "@/lib/userSettings";

const getNavItems = (notifCount: number) => [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "My Tasks", icon: FileText, path: "/my-tasks" },
  { label: "Browse Tasks", icon: Search, path: "/browse-tasks" },
  { label: "Notifications", icon: Bell, path: "/notifications", badge: notifCount > 0 ? notifCount : undefined },
  { label: "Profile", icon: UserRound, path: "/profile" },
];

const SidebarContent = ({ current, onNavigate, onLogout, notifCount }: {
  current: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
  notifCount: number;
}) => {
  const navItems = getNavItems(notifCount);
  return (
  <div className="flex h-full flex-col">
    <div className="flex items-center gap-2 px-4 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <span className="text-sm font-bold text-primary-foreground">R</span>
      </div>
      <span className="text-lg font-bold text-foreground">Reliyo</span>
    </div>

    <div className="px-3">
      <Button className="w-full justify-start gap-2 rounded-lg" size="sm" onClick={() => onNavigate("/create-task")}>
        <Plus className="h-4 w-4" /> Create Task
      </Button>
    </div>

    <p className="mt-5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
    <nav className="mt-1 flex-1 space-y-0.5 px-3">
      {navItems.map((item) => {
        const active = current === item.path;
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge && (
              <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">
                {item.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </nav>

    <div className="border-t px-3 py-3">
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  </div>
  );
};

// ── Header user dropdown ─────────────────────────────────────────────────────
const HeaderUserDropdown = ({ userName, initial, onNavigate, onLogout }: {
  userName: string;
  initial: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const items = [
    { label: "Profile", icon: UserRound, path: "/profile" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
      >
        <span className="text-sm font-medium text-foreground">{userName}</span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initial}</AvatarFallback>
        </Avatar>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border bg-popover p-1 shadow-lg z-50">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); onNavigate(item.path); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentUser = getCurrentUser();
  const userName = currentUser?.name?.split(" ")[0] || "User";

  const target: NotificationTarget = currentUser?.role === "acceptor" ? "acceptor" : "requestor";
  const [notifCount, setNotifCount] = useState(0);

  // Apply theme on every dashboard render (ensures correct user context)
  useEffect(() => {
    const userId = currentUser?.id || "guest";
    const settings = getUserSettings(userId);
    applyTheme(settings.darkMode);
  }, [currentUser?.id]);

  useEffect(() => {
    setNotifCount(getUnreadCount(target));
    const interval = setInterval(() => setNotifCount(getUnreadCount(target)), 3000);
    return () => clearInterval(interval);
  }, [target]);

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
      <aside className="hidden w-56 shrink-0 border-r bg-background lg:block">
        <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} notifCount={notifCount} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} notifCount={notifCount} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block" />
          <HeaderUserDropdown
            userName={currentUser?.name || "User"}
            initial={currentUser?.name?.charAt(0) || "U"}
            onNavigate={handleNav}
            onLogout={handleLogout}
          />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

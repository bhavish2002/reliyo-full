import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Search, Bell, UserRound, LogOut, Plus, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "My Tasks", icon: FileText, path: "/my-tasks" },
  { label: "Browse Tasks", icon: Search, path: "/browse-tasks" },
  { label: "Notifications", icon: Bell, path: "/notifications", badge: 3 },
  { label: "Profile", icon: UserRound, path: "/profile" },
];

const SidebarContent = ({ current, onNavigate, onLogout }: {
  current: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
}) => (
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userName = "Arjun";

  const handleLogout = () => navigate("/sign-in", { replace: true });
  const handleNav = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-56 shrink-0 border-r bg-background lg:block">
        <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{userName} Mehta</span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">A</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

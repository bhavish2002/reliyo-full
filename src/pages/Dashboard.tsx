import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Search, Bell, UserRound, LogOut, Plus, Menu, TrendingUp, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

const barData = [
  { month: "Sep", tasks: 1 },
  { month: "Oct", tasks: 2 },
  { month: "Nov", tasks: 3 },
  { month: "Dec", tasks: 3 },
  { month: "Jan", tasks: 1 },
  { month: "Feb", tasks: 4 },
];

const areaData = [
  { month: "Sep", earnings: 0 },
  { month: "Oct", earnings: 50 },
  { month: "Nov", earnings: 120 },
  { month: "Dec", earnings: 180 },
  { month: "Jan", earnings: 250 },
  { month: "Feb", earnings: 450 },
];

const pieData = [
  { name: "Completed", value: 85 },
  { name: "Disputed", value: 15 },
];
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))"];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "My Tasks", icon: FileText, path: "/my-tasks" },
  { label: "Browse Tasks", icon: Search, path: "/browse-tasks" },
  { label: "Notifications", icon: Bell, path: "/notifications", badge: 3 },
  { label: "Profile", icon: UserRound, path: "/profile" },
];

const stats = [
  { label: "Active Tasks", value: "3", icon: List },
  { label: "Completed Tasks", value: "4", icon: List },
  { label: "Disputed Tasks", value: "1", icon: List },
  { label: "Earnings", value: "₹2,375", icon: TrendingUp },
];

const SidebarContent = ({ current, onNavigate, onLogout }: {
  current: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
}) => (
  <div className="flex h-full flex-col">
    {/* Logo */}
    <div className="flex items-center gap-2 px-4 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <span className="text-sm font-bold text-primary-foreground">R</span>
      </div>
      <span className="text-lg font-bold text-foreground">Reliyo</span>
    </div>

    {/* Create Task */}
    <div className="px-3">
      <Button className="w-full justify-start gap-2 rounded-lg" size="sm">
        <Plus className="h-4 w-4" /> Create Task
      </Button>
    </div>

    {/* Nav */}
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

    {/* Logout */}
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

const Dashboard = () => {
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
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-background lg:block">
        <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent current={location.pathname} onNavigate={handleNav} onLogout={handleLogout} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
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

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {userName}</h1>
            <p className="text-sm text-muted-foreground">Here's what's happening with your tasks</p>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="rounded-xl">
                <CardContent className="flex items-start justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
                  </div>
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Tasks Completed</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip />
                    <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Earnings Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="earnings" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Dispute vs Completion</CardTitle>
              </CardHeader>
              <CardContent className="flex h-64 items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

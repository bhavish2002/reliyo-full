import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { FileText, Users, IndianRupee, AlertTriangle, TrendingUp, TrendingDown, Star } from "lucide-react";
import { STATUS_LABELS, type TaskStatus } from "@/lib/taskTypes";

// ── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { label: "Total Tasks", value: "388", icon: FileText, trend: "+12%", up: true, iconBg: "bg-primary/10", iconColor: "text-primary" },
  { label: "Active Users", value: "1,247", icon: Users, trend: "+8%", up: true, iconBg: "bg-success/10", iconColor: "text-success" },
  { label: "Total Revenue", value: "₹3.71L", icon: IndianRupee, trend: "+18%", up: true, iconBg: "bg-primary/10", iconColor: "text-primary" },
  { label: "Active Disputes", value: "14", icon: AlertTriangle, trend: "-3%", up: false, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
];

// ── Task Trends (multi-line) ─────────────────────────────────────────────────
const trendData = [
  { month: "Jan", open: 40, committed: 30, in_progress: 5, done: 2, disputed: 3, completed: 5, closed: 2 },
  { month: "Feb", open: 45, committed: 35, in_progress: 8, done: 5, disputed: 4, completed: 8, closed: 5 },
  { month: "Mar", open: 55, committed: 50, in_progress: 15, done: 8, disputed: 5, completed: 12, closed: 8 },
  { month: "Apr", open: 60, committed: 55, in_progress: 20, done: 12, disputed: 8, completed: 15, closed: 10 },
  { month: "May", open: 65, committed: 60, in_progress: 30, done: 18, disputed: 6, completed: 20, closed: 15 },
  { month: "Jun", open: 70, committed: 65, in_progress: 40, done: 25, disputed: 5, completed: 25, closed: 18 },
];

const TREND_COLORS: Record<string, string> = {
  open: "hsl(var(--success))",
  committed: "hsl(220, 70%, 55%)",
  in_progress: "hsl(250, 60%, 55%)",
  done: "hsl(35, 90%, 50%)",
  disputed: "hsl(var(--destructive))",
  completed: "hsl(var(--destructive))",
  closed: "hsl(220, 15%, 50%)",
};

// ── Task Status (donut) ──────────────────────────────────────────────────────
const statusData = [
  { name: "Open", value: 245, color: "hsl(var(--success))" },
  { name: "Committed", value: 87, color: "hsl(220, 70%, 55%)" },
  { name: "In Progress", value: 42, color: "hsl(250, 60%, 55%)" },
  { name: "Done", value: 42, color: "hsl(220, 25%, 30%)" },
  { name: "Disputed", value: 42, color: "hsl(250, 50%, 60%)" },
  { name: "Completed", value: 14, color: "hsl(var(--destructive))" },
  { name: "Closed", value: 42, color: "hsl(220, 60%, 60%)" },
];

// ── Revenue (bar chart) ──────────────────────────────────────────────────────
const revenueData = [
  { month: "Jan", revenue: 48000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 65000 },
  { month: "Apr", revenue: 58000 },
  { month: "May", revenue: 72000 },
  { month: "Jun", revenue: 68000 },
];

// ── Recent Tasks ─────────────────────────────────────────────────────────────
const recentTasks = [
  { title: "Social media management for 1 week", from: "Arjun M.", to: "Priya K.", status: "in_progress" as TaskStatus, reward: 10000 },
  { title: "Design a logo for my bakery startup", from: "Rajesh S.", to: "Priya K.", status: "completed" as TaskStatus, reward: 5000 },
  { title: "Deliver documents to Koramangala office", from: "Sneha P.", to: "Amit T.", status: "committed" as TaskStatus, reward: 500 },
  { title: "Wise entry for OEM product listings", from: "Arjun M.", to: "Rohan J.", status: "disputed" as TaskStatus, reward: 3000 },
  { title: "Translate product brochure to Hindi", from: "Meena K.", to: "Priya K.", status: "completed" as TaskStatus, reward: 2500 },
];

const STATUS_BADGE_COLORS: Record<string, string> = {
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  committed: "bg-[hsl(220,70%,50%)] text-white",
  disputed: "bg-destructive text-destructive-foreground",
  open: "bg-success text-success-foreground",
  done: "bg-[hsl(220,70%,50%)] text-white",
  closed: "bg-muted text-muted-foreground",
};

// ── Top Performers ───────────────────────────────────────────────────────────
const topPerformers = [
  { name: "Priya K.", tasks: 28, rating: 4.9, reliability: 98 },
  { name: "Amit T.", tasks: 24, rating: 4.8, reliability: 96 },
  { name: "Rohan J.", tasks: 21, rating: 4.7, reliability: 94 },
  { name: "Arjun M.", tasks: 18, rating: 4.7, reliability: 92 },
  { name: "Sneha P.", tasks: 16, rating: 4.6, reliability: 90 },
];

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor and manage your TrustTask platform</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-xl">
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${s.iconBg}`}>
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-success" : "text-destructive"}`}>
                {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {s.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Trends + Task Status */}
      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="rounded-xl lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Task Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {Object.keys(TREND_COLORS).map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={TREND_COLORS[key]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={STATUS_LABELS[key as TaskStatus] || key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Task Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 w-full space-y-1.5">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Overview */}
      <Card className="mb-6 rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Tasks + Top Performers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Tasks</CardTitle>
            <button className="text-xs font-medium text-primary hover:underline">View All</button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.from} → {t.to}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge className={`${STATUS_BADGE_COLORS[t.status] || "bg-muted"} text-[10px]`}>
                    {STATUS_LABELS[t.status]}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">₹{t.reward.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top Performers</CardTitle>
            <button className="text-xs font-medium text-primary hover:underline">View All</button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPerformers.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tasks} tasks • <Star className="inline h-3 w-3 text-primary fill-primary" /> {p.rating}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-success">{p.reliability}%</p>
                  <p className="text-[10px] text-muted-foreground">Reliability</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { FileText, Users, DollarSign, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { TASK_STATUSES, STATUS_LABELS, type TaskStatus } from "@/lib/taskTypes";
import { getAdminStats } from "@/lib/adminData";

const STATUS_PIE_COLORS: Record<TaskStatus, string> = {
  open: "hsl(var(--primary))",
  committed: "hsl(220, 70%, 50%)",
  in_progress: "hsl(45, 90%, 50%)",
  done: "hsl(200, 70%, 50%)",
  disputed: "hsl(var(--destructive))",
  completed: "hsl(var(--success))",
  closed: "hsl(var(--muted-foreground))",
  force_closed: "hsl(0, 70%, 45%)",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  committed: "bg-[hsl(220,70%,50%)] text-white",
  disputed: "bg-destructive text-destructive-foreground",
  open: "bg-success text-success-foreground",
  done: "bg-[hsl(220,70%,50%)] text-white",
  closed: "bg-muted text-muted-foreground",
  force_closed: "bg-destructive/80 text-destructive-foreground",
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-popover-foreground">{payload[0].name} ({payload[0].value})</p>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(() => getAdminStats());
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setStats(getAdminStats());
      setLoading(false);
    }, 200);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setStats(getAdminStats()), 5000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Total Tasks", value: String(stats.totalTasks), icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Users", value: String(stats.activeUsers), icon: Users, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
    { label: "Platform Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Disputes", value: String(stats.activeDisputes), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  const pieData = TASK_STATUSES.map((s) => ({
    name: STATUS_LABELS[s],
    value: stats.statusCounts[s] || 0,
    color: STATUS_PIE_COLORS[s],
  })).filter((d) => d.value > 0);

  const recentTasks = stats.tasks.slice(0, 5);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time platform overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="rounded-xl">
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Status + Revenue */}
      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="rounded-xl lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats.revenue.monthlyRevenue.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenue.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="fees" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Platform Fees" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {pieData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No tasks yet</div>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 w-full space-y-1.5">
                  {pieData.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Tasks</CardTitle>
          <button className="text-xs font-medium text-primary hover:underline" onClick={() => navigate("/admin/tasks")}>View All</button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks on the platform yet</p>
          ) : (
            recentTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.createdBy} {t.acceptedBy ? `→ ${t.acceptedBy}` : ""}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge className={`${STATUS_BADGE_COLORS[t.status] || "bg-muted"} text-[10px]`}>
                    {STATUS_LABELS[t.status as TaskStatus]}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">{t.currencySymbol || "₹"}{t.reward.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;

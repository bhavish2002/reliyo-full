import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { List, TrendingUp, CheckCircle2, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { type Task, type TaskStatus } from "@/lib/taskTypes";
import { format, parseISO, subMonths, startOfMonth, isAfter } from "date-fns";

// ── Helpers to compute real analytics from localStorage ─────────────────────

function getAllUserTasks(userName: string): Task[] {
  try {
    const created = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    const userCreated = created.filter((t) => t.createdBy === userName);
    const userAccepted = accepted.filter((t) => t.acceptedBy === userName || (!t.acceptedBy && true));
    // deduplicate by id
    const map = new Map<string, Task>();
    [...userCreated, ...userAccepted].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function computeMonthlyData(tasks: Task[], months: number) {
  const now = new Date();
  const buckets: { month: string; date: Date; completed: number; created: number; earnings: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    buckets.push({
      month: format(d, "MMM"),
      date: startOfMonth(d),
      completed: 0,
      created: 0,
      earnings: 0,
    });
  }

  tasks.forEach((t) => {
    const created = t.createdAt ? parseISO(t.createdAt) : null;
    if (created) {
      const bucket = buckets.find((b) =>
        format(created, "MMM yyyy") === format(b.date, "MMM yyyy"),
      );
      if (bucket) {
        bucket.created += 1;
        if (["completed", "closed"].includes(t.status)) {
          bucket.completed += 1;
          bucket.earnings += t.reward || 0;
        }
      }
    }
  });

  // cumulative earnings
  let cumEarnings = 0;
  return buckets.map((b) => {
    cumEarnings += b.earnings;
    return { ...b, cumulativeEarnings: cumEarnings };
  });
}

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(220,9%,46%)"];

const Dashboard = () => {
  const currentUser = getCurrentUser();
  const userName = currentUser?.name?.split(" ")[0] || "User";
  const fullName = currentUser?.name || "User";

  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(getAllUserTasks(fullName));
  }, [fullName]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => ["open", "committed", "in_progress"].includes(t.status)).length;
    const completed = tasks.filter((t) => ["completed", "closed"].includes(t.status)).length;
    const disputed = tasks.filter((t) => t.status === "disputed").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const totalEarnings = tasks
      .filter((t) => ["completed", "closed"].includes(t.status))
      .reduce((sum, t) => sum + (t.reward || 0), 0);
    const cs = tasks.find((t) => t.currencySymbol)?.currencySymbol || "₹";
    return [
      { label: "Active Tasks", value: String(active), icon: Clock, color: "text-primary" },
      { label: "Completed", value: String(completed), icon: CheckCircle2, color: "text-[hsl(var(--success))]" },
      { label: "Disputed", value: String(disputed), icon: AlertTriangle, color: "text-destructive" },
      { label: "Earnings", value: `${cs}${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    ];
  }, [tasks]);

  const monthlyData = useMemo(() => computeMonthlyData(tasks, 6), [tasks]);

  const pieData = useMemo(() => {
    const statusGroups: { name: string; statuses: TaskStatus[] }[] = [
      { name: "Active", statuses: ["open", "committed", "in_progress"] },
      { name: "Completed", statuses: ["completed", "closed"] },
      { name: "Disputed", statuses: ["disputed"] },
      { name: "Done (Pending)", statuses: ["done"] },
    ];
    return statusGroups
      .map((g) => ({
        name: g.name,
        value: tasks.filter((t) => g.statuses.includes(t.status as TaskStatus)).length,
      }))
      .filter((d) => d.value > 0);
  }, [tasks]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {userName}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening with your tasks</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-xl">
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
              </div>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tasks Created (6 months)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="created" name="Created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cumulative Earnings</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip />
                <Area type="monotone" dataKey="cumulativeEarnings" name="Earnings" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Task Status Distribution</CardTitle></CardHeader>
          <CardContent className="flex h-64 items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No task data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick summary */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Quick Summary</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground">Total Tasks</span>
                <span className="text-lg font-bold text-foreground">{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
                <span className="text-sm text-muted-foreground">Needing Action</span>
                <span className="text-lg font-bold text-primary">
                  {tasks.filter((t) => ["done", "disputed", "committed"].includes(t.status)).length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--success))]/10 p-3">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-lg font-bold text-[hsl(var(--success))]">
                  {tasks.length > 0
                    ? Math.round(
                        (tasks.filter((t) => ["completed", "closed"].includes(t.status)).length /
                          Math.max(tasks.filter((t) => !["open"].includes(t.status)).length, 1)) *
                          100,
                      )
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3">
                <span className="text-sm text-muted-foreground">Dispute Rate</span>
                <span className="text-lg font-bold text-destructive">
                  {tasks.length > 0
                    ? Math.round(
                        (tasks.filter((t) => t.status === "disputed").length /
                          Math.max(tasks.length, 1)) *
                          100,
                      )
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import {
  RefreshCw, Clock, FileText, UserCheck, AlertTriangle, DollarSign,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { type Task, type TaskStatus, TASK_STATUSES, STATUS_LABELS } from "@/lib/taskTypes";
import { getUserSettings } from "@/lib/userSettings";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";

// ── Currency lookup (mirrors CreateTask) ────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", GBP: "£", CAD: "C$", AUD: "A$", EUR: "€",
  JPY: "¥", BRL: "R$", ZAR: "R", AED: "د.إ", SGD: "S$", NGN: "₦",
};

// ── Data helpers ────────────────────────────────────────────────────────────

function getAllTasks(): Task[] {
  try {
    const created = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    const map = new Map<string, Task>();
    [...created, ...accepted].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function getUserTasks(allTasks: Task[], fullName: string) {
  const createdByUser = allTasks.filter((t) => t.createdBy === fullName);
  const acceptedByUser = allTasks.filter((t) => t.acceptedBy === fullName);
  const uniqueMap = new Map<string, Task>();
  [...createdByUser, ...acceptedByUser].forEach((t) => uniqueMap.set(t.id, t));
  return {
    all: Array.from(uniqueMap.values()),
    created: createdByUser,
    accepted: acceptedByUser,
  };
}

function computeMonthlyData(tasks: Task[], months: number, fullName: string) {
  const now = new Date();
  const buckets: { month: string; date: Date; created: number; earnings: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    buckets.push({ month: format(d, "MMM yyyy"), date: startOfMonth(d), created: 0, earnings: 0 });
  }

  tasks.forEach((t) => {
    const createdDate = t.createdAt ? parseISO(t.createdAt) : null;
    if (!createdDate) return;
    const key = format(createdDate, "MMM yyyy");
    const bucket = buckets.find((b) => b.month === key);
    if (!bucket) return;

    if (t.createdBy === fullName) bucket.created += 1;
    if (t.status === "closed" && t.acceptedBy === fullName) {
      bucket.earnings += t.reward || 0;
    }
  });

  let cum = 0;
  return buckets.map((b) => {
    cum += b.earnings;
    return { ...b, monthLabel: b.month.split(" ")[0], cumulativeEarnings: cum };
  });
}

// ── Status colors for pie ───────────────────────────────────────────────────
const STATUS_PIE_COLORS: Record<TaskStatus, string> = {
  open: "hsl(var(--primary))",
  committed: "hsl(220, 70%, 50%)",
  in_progress: "hsl(45, 90%, 50%)",
  done: "hsl(200, 70%, 50%)",
  disputed: "hsl(var(--destructive))",
  completed: "hsl(var(--success))",
  closed: "hsl(var(--muted-foreground))",
};

// ── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────────────

const Dashboard = () => {
  const currentUser = getCurrentUser();
  const userName = currentUser?.name?.split(" ")[0] || "User";
  const fullName = currentUser?.name || "User";
  const userId = currentUser?.id || "guest";
  const settings = getUserSettings(userId);
  const currencySymbol = CURRENCY_SYMBOLS[settings.preferredCurrency] || "₹";

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [monthRange, setMonthRange] = useState("6");

  const [userTasks, setUserTasks] = useState<{ all: Task[]; created: Task[]; accepted: Task[] }>({
    all: [], created: [], accepted: [],
  });

  const loadData = useCallback(() => {
    setLoading(true);
    // Simulate async feel
    setTimeout(() => {
      const all = getAllTasks();
      setUserTasks(getUserTasks(all, fullName));
      setLoading(false);
    }, 300);
  }, [fullName]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  // ── Stat cards ──────────────────────────────────────────────────────────
  const cards = useMemo(() => {
    const { all, created, accepted } = userTasks;
    const active = all.filter((t) => ["open", "committed", "in_progress"].includes(t.status)).length;
    const disputed = all.filter((t) => t.status === "disputed").length;
    const earnings = accepted
      .filter((t) => t.status === "closed")
      .reduce((s, t) => s + (t.reward || 0), 0);

    return [
      { label: "Active Tasks", value: String(active), icon: Clock, color: "text-primary", bg: "bg-primary/10" },
      { label: "Created Tasks", value: String(created.length), icon: FileText, color: "text-primary", bg: "bg-primary/10" },
      { label: "Accepted Tasks", value: String(accepted.length), icon: UserCheck, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
      { label: "Disputed", value: String(disputed), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
      { label: "Earnings", value: `${currencySymbol}${earnings.toLocaleString()}`, icon: DollarSign, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
    ];
  }, [userTasks, currencySymbol]);

  // ── Chart data (affected by monthRange) ─────────────────────────────────
  const months = parseInt(monthRange);
  const monthlyData = useMemo(
    () => computeMonthlyData(userTasks.all, months, fullName),
    [userTasks.all, months, fullName],
  );

  const hasEarnings = monthlyData.some((d) => d.cumulativeEarnings > 0);

  const pieData = useMemo(() => {
    return TASK_STATUSES.map((s) => ({
      name: STATUS_LABELS[s],
      status: s,
      value: userTasks.all.filter((t) => t.status === s).length,
    })).filter((d) => d.value > 0);
  }, [userTasks.all]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {userName}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={monthRange} onValueChange={setMonthRange}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "4", "5", "6"].map((v) => (
                <SelectItem key={v} value={v}>{v === "1" ? "Last month" : `Last ${v} months`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </CardContent>
              </Card>
            ))
          : cards.map((c) => (
              <Card key={c.label} className="rounded-xl transition-shadow hover:shadow-md">
                <CardContent className="flex items-start justify-between p-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
                    <c.icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts row 1: Bar + Area */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Tasks Created */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Tasks Created
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : monthlyData.every((d) => d.created === 0) ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No tasks created yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                  <Bar dataKey="created" name="Created" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cumulative Earnings */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Cumulative Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : !hasEarnings ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No earnings yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeEarnings"
                    name={`Earnings (${currencySymbol})`}
                    stroke="hsl(var(--success))"
                    fill="url(#earningsGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--success))", strokeWidth: 0 }}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Donut (full width) */}
      <div className="grid gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No task data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={100}
                    dataKey="value"
                    paddingAngle={3}
                    cornerRadius={4}
                    animationDuration={700}
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.status} fill={STATUS_PIE_COLORS[d.status as TaskStatus]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

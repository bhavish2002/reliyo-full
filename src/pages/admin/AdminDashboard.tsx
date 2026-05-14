import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { FileText, Users, DollarSign, AlertTriangle, RefreshCw, CalendarIcon } from "lucide-react";
import { TASK_STATUSES, STATUS_LABELS, type TaskStatus } from "@/lib/taskTypes";
import { getAdminStats, getAllPlatformUsers } from "@/lib/adminData";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, startOfDay, endOfDay, isAfter, isBefore, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

const STATUS_PIE_COLORS: Record<TaskStatus, string> = {
  open: "hsl(var(--primary))",
  committed: "hsl(220, 70%, 50%)",
  in_progress: "hsl(45, 90%, 50%)",
  done: "hsl(200, 70%, 50%)",
  disputed: "hsl(var(--destructive))",
  closed: "hsl(var(--muted-foreground))",
  force_closed: "hsl(0, 70%, 45%)",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  in_progress: "bg-primary text-primary-foreground",
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

type FilterMode = "6" | "3" | "custom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(() => getAdminStats());
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("6");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  // Date range computation for graphs
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    if (filterMode === "custom" && customRange?.from) {
      return {
        rangeStart: startOfDay(customRange.from),
        rangeEnd: customRange.to ? endOfDay(customRange.to) : endOfDay(now),
      };
    }
    const months = filterMode === "3" ? 3 : 6;
    return {
      rangeStart: startOfMonth(subMonths(now, months - 1)),
      rangeEnd: endOfDay(now),
    };
  }, [filterMode, customRange]);

  // User Monthly Stats (users onboarded per month)
  const userMonthlyData = useMemo(() => {
    const users = getAllPlatformUsers();
    // Derive onboarded months from tasks or use a simple distribution
    const buckets = new Map<string, number>();
    let cursor = startOfMonth(rangeStart);
    const end = startOfMonth(rangeEnd);
    while (!isAfter(cursor, end)) {
      buckets.set(format(cursor, "MMM yyyy"), 0);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    // Use task creation dates to approximate user onboarding
    stats.tasks.forEach(t => {
      if (!t.createdAt) return;
      const d = parseISO(t.createdAt);
      if (isBefore(d, rangeStart) || isAfter(d, rangeEnd)) return;
      const key = format(d, "MMM yyyy");
      if (buckets.has(key)) {
        // Count unique users per month
        buckets.set(key, (buckets.get(key) || 0));
      }
    });
    // Build unique user counts per month from createdBy
    const monthUsers = new Map<string, Set<string>>();
    stats.tasks.forEach(t => {
      if (!t.createdAt) return;
      const d = parseISO(t.createdAt);
      if (isBefore(d, rangeStart) || isAfter(d, rangeEnd)) return;
      const key = format(d, "MMM yyyy");
      if (!monthUsers.has(key)) monthUsers.set(key, new Set());
      if (t.createdBy) monthUsers.get(key)!.add(t.createdBy);
      if (t.acceptedBy) monthUsers.get(key)!.add(t.acceptedBy);
    });
    return Array.from(buckets.keys()).map(month => ({
      month: month.split(" ")[0],
      users: monthUsers.get(month)?.size || 0,
    }));
  }, [stats.tasks, rangeStart, rangeEnd]);

  const pieData = TASK_STATUSES.map((s) => ({
    name: STATUS_LABELS[s],
    value: stats.statusCounts[s] || 0,
    color: STATUS_PIE_COLORS[s],
  })).filter((d) => d.value > 0);

  const recentTasks = stats.tasks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const maxCustomFrom = subMonths(new Date(), 6);
  const filterLabel = filterMode === "6" ? "Last 6 Months" : filterMode === "3" ? "Last 3 Months" : "Custom";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time platform overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMode} onValueChange={(v) => {
            setFilterMode(v as FilterMode);
            if (v === "custom") setCalendarOpen(true);
          }}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue>{filterLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {filterMode === "custom" && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customRange?.from ? (
                    customRange.to
                      ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
                      : format(customRange.from, "MMM d, yyyy")
                  ) : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(range) => {
                    setCustomRange(range);
                    if (range?.from && range?.to) setCalendarOpen(false);
                  }}
                  disabled={(date) => isAfter(date, new Date()) || isBefore(date, maxCustomFrom)}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2 h-9">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
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

      {/* User Stats + Task Status */}
      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="rounded-xl lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">User Monthly Stats</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {userMonthlyData.every(d => d.users === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No user data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Active Users" />
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

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { RefreshCw, CalendarIcon } from "lucide-react";
import { getAdminStats, getAllDisputes } from "@/lib/adminData";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, startOfDay, endOfDay, isAfter, isBefore } from "date-fns";
import type { DateRange } from "react-day-picker";

type FilterMode = "6" | "3" | "custom";

const AdminAnalytics = () => {
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

  const tasksByDomain = useMemo(() => {
    const domainMap = new Map<string, number>();
    stats.tasks.forEach((t) => {
      const d = t.domain || "Other";
      domainMap.set(d, (domainMap.get(d) || 0) + 1);
    });
    return Array.from(domainMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [stats.tasks]);

  const disputeResolution = useMemo(() => {
    const disputes = getAllDisputes();
    const resolved = disputes.filter((d) => d.dsp4Status === "resolved_valid" || d.dsp4Status === "resolved_invalid").length;
    const adminClosed = disputes.filter((d) => d.dsp4Status === "admin_closed").length;
    const pending = disputes.filter((d) => d.dsp4Status === "open" && d.escalated).length;
    const normal = disputes.filter((d) => !d.escalated).length;
    return [
      { name: "Normal (≤DSP3)", value: normal, color: "hsl(var(--primary))" },
      { name: "Resolved", value: resolved, color: "hsl(var(--success))" },
      { name: "Admin Closed", value: adminClosed, color: "hsl(220, 70%, 50%)" },
      { name: "Pending (DSP4)", value: pending, color: "hsl(var(--destructive))" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const completionRate = useMemo(() => {
    const total = stats.tasks.length;
    const closed = stats.statusCounts.closed || 0;
    return total > 0 ? Math.round((closed / total) * 100) : 0;
  }, [stats]);

  const maxCustomFrom = subMonths(new Date(), 6);
  const filterLabel = filterMode === "6" ? "Last 6 Months" : filterMode === "3" ? "Last 3 Months" : "Custom";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Live platform performance insights</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalTasks}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
            <p className="text-xs text-muted-foreground">Users</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[hsl(var(--success))]">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.activeDisputes}</p>
            <p className="text-xs text-muted-foreground">Active Disputes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tasks by Domain</CardTitle></CardHeader>
          <CardContent className="h-64">
            {tasksByDomain.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByDomain} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="domain" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dispute Resolution</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center h-64">
            {disputeResolution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No disputes</div>
            ) : (
              <>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={disputeResolution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {disputeResolution.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 justify-center">
                  {disputeResolution.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;

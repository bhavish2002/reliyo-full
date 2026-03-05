import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { getAdminStats, getAllDisputes } from "@/lib/adminData";

const AdminAnalytics = () => {
  const [stats, setStats] = useState(() => getAdminStats());

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

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Live platform performance insights</p>
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

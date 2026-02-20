import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";

const userGrowth = [
  { month: "Sep", users: 650 }, { month: "Oct", users: 780 },
  { month: "Nov", users: 890 }, { month: "Dec", users: 950 },
  { month: "Jan", users: 1100 }, { month: "Feb", users: 1247 },
];

const tasksByDomain = [
  { domain: "Technology", count: 95 },
  { domain: "Design", count: 72 },
  { domain: "Writing", count: 58 },
  { domain: "Translation", count: 45 },
  { domain: "Delivery", count: 68 },
  { domain: "Other", count: 50 },
];

const completionRate = [
  { month: "Sep", rate: 82 }, { month: "Oct", rate: 85 },
  { month: "Nov", rate: 87 }, { month: "Dec", rate: 84 },
  { month: "Jan", rate: 89 }, { month: "Feb", rate: 91 },
];

const disputeResolution = [
  { name: "Resolved by Fix", value: 55, color: "hsl(var(--success))" },
  { name: "Admin Closed", value: 25, color: "hsl(var(--primary))" },
  { name: "Pending", value: 20, color: "hsl(var(--destructive))" },
];

const AdminAnalytics = () => (
  <AdminLayout>
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
      <p className="text-sm text-muted-foreground">Platform performance and insights</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-2 mb-6">
      <Card className="rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">User Growth</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip />
              <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tasks by Domain</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tasksByDomain} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="domain" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
              <RechartsTooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Completion Rate (%)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={completionRate}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[70, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dispute Resolution</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center h-64">
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
          <div className="flex gap-4 mt-2">
            {disputeResolution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}: {d.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
);

export default AdminAnalytics;

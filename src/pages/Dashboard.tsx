import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { List, TrendingUp } from "lucide-react";

const barData = [
  { month: "Sep", tasks: 1 }, { month: "Oct", tasks: 2 }, { month: "Nov", tasks: 3 },
  { month: "Dec", tasks: 3 }, { month: "Jan", tasks: 1 }, { month: "Feb", tasks: 4 },
];
const areaData = [
  { month: "Sep", earnings: 0 }, { month: "Oct", earnings: 50 }, { month: "Nov", earnings: 120 },
  { month: "Dec", earnings: 180 }, { month: "Jan", earnings: 250 }, { month: "Feb", earnings: 450 },
];
const pieData = [{ name: "Completed", value: 85 }, { name: "Disputed", value: 15 }];
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))"];

const stats = [
  { label: "Active Tasks", value: "3", icon: List },
  { label: "Completed Tasks", value: "4", icon: List },
  { label: "Disputed Tasks", value: "1", icon: List },
  { label: "Earnings", value: "₹2,375", icon: TrendingUp },
];

const Dashboard = () => {
  const userName = "Arjun";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {userName}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening with your tasks</p>
      </div>

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

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tasks Completed</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Earnings Over Time</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dispute vs Completion</CardTitle></CardHeader>
          <CardContent className="flex h-64 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

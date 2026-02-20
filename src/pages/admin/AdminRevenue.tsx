import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { IndianRupee, TrendingUp, Wallet, ArrowDownRight } from "lucide-react";

const revenueData = [
  { month: "Sep", revenue: 32000, fees: 1600 },
  { month: "Oct", revenue: 45000, fees: 2250 },
  { month: "Nov", revenue: 52000, fees: 2600 },
  { month: "Dec", revenue: 48000, fees: 2400 },
  { month: "Jan", revenue: 65000, fees: 3250 },
  { month: "Feb", revenue: 71000, fees: 3550 },
];

const escrowData = [
  { month: "Sep", locked: 120000, released: 95000 },
  { month: "Oct", locked: 150000, released: 130000 },
  { month: "Nov", locked: 180000, released: 165000 },
  { month: "Dec", locked: 160000, released: 155000 },
  { month: "Jan", locked: 210000, released: 190000 },
  { month: "Feb", locked: 240000, released: 210000 },
];

const stats = [
  { label: "Total Revenue", value: "₹3.71L", icon: IndianRupee, sub: "Lifetime platform fees" },
  { label: "This Month", value: "₹71,000", icon: TrendingUp, sub: "+9.2% vs last month" },
  { label: "Escrow Locked", value: "₹2.40L", icon: Wallet, sub: "Currently in escrow" },
  { label: "Refunds", value: "₹12,500", icon: ArrowDownRight, sub: "Trust deposit refunds" },
];

const AdminRevenue = () => (
  <AdminLayout>
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
      <p className="text-sm text-muted-foreground">Platform revenue and escrow tracking</p>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="rounded-xl">
          <CardContent className="p-4">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2 mb-6">
      <Card className="rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Revenue & Fees</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="fees" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Platform Fees" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Escrow Flow</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={escrowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="locked" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Locked" />
              <Area type="monotone" dataKey="released" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" name="Released" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
);

export default AdminRevenue;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { DollarSign, TrendingUp, Wallet, ArrowDownRight } from "lucide-react";
import { getRevenueStats } from "@/lib/adminData";

const AdminRevenue = () => {
  const [revenue, setRevenue] = useState(() => getRevenueStats());

  useEffect(() => {
    const interval = setInterval(() => setRevenue(getRevenueStats()), 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Total Platform Fees", value: `₹${revenue.totalRevenue.toLocaleString()}`, icon: DollarSign, sub: "Lifetime platform fees collected" },
    { label: "Escrow Locked", value: `₹${revenue.totalEscrowLocked.toLocaleString()}`, icon: Wallet, sub: "Currently held in escrow" },
    { label: "Escrow Released", value: `₹${revenue.totalEscrowReleased.toLocaleString()}`, icon: TrendingUp, sub: "Total released from escrow" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
        <p className="text-sm text-muted-foreground">Live platform revenue and escrow tracking</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-3">
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
            {revenue.monthlyRevenue.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue.monthlyRevenue}>
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

        <Card className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Escrow Flow</CardTitle></CardHeader>
          <CardContent className="h-64">
            {revenue.monthlyEscrow.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No escrow data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.monthlyEscrow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="locked" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Locked" />
                  <Area type="monotone" dataKey="released" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" name="Released" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRevenue;

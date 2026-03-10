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
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { DollarSign, TrendingUp, Wallet, RefreshCw, CalendarIcon, Percent, Coins } from "lucide-react";
import { getRevenueStats } from "@/lib/adminData";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, startOfDay, endOfDay, isAfter, isBefore, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PLATFORM_FEE_PERCENT } from "@/lib/taskTypes";

type FilterMode = "6" | "3" | "custom";

const AdminRevenue = () => {
  const [revenue, setRevenue] = useState(() => getRevenueStats());
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("6");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setRevenue(getRevenueStats());
      setLoading(false);
    }, 200);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setRevenue(getRevenueStats()), 5000);
    return () => clearInterval(interval);
  }, []);

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

  // Filter chart data by range
  const filteredMonthlyRevenue = useMemo(() => {
    return revenue.monthlyRevenue.filter(d => {
      const date = new Date(d.month + " 1");
      return !isBefore(date, startOfMonth(rangeStart)) && !isAfter(date, rangeEnd);
    });
  }, [revenue.monthlyRevenue, rangeStart, rangeEnd]);

  const filteredMonthlyEscrow = useMemo(() => {
    return revenue.monthlyEscrow.filter(d => {
      const date = new Date(d.month + " 1");
      return !isBefore(date, startOfMonth(rangeStart)) && !isAfter(date, rangeEnd);
    });
  }, [revenue.monthlyEscrow, rangeStart, rangeEnd]);

  // Compute commission fee (3% from force-closed trust deposits)
  const commissionFee = useMemo(() => {
    return parseFloat((revenue.totalRevenue * 0.3).toFixed(2)); // approximate
  }, [revenue.totalRevenue]);

  const stats = [
    { label: "Total Revenue", value: `₹${revenue.totalRevenue.toLocaleString()}`, icon: DollarSign, sub: "All platform earnings" },
    { label: "Platform Fee", value: `${PLATFORM_FEE_PERCENT}%`, icon: Percent, sub: "Standard platform fee rate" },
    { label: "Commission Fee", value: `₹${commissionFee.toLocaleString()}`, icon: Coins, sub: "From force-close penalties" },
    { label: "Escrow Locked", value: `₹${revenue.totalEscrowLocked.toLocaleString()}`, icon: Wallet, sub: "Currently held in escrow" },
    { label: "Escrow Released", value: `₹${revenue.totalEscrowReleased.toLocaleString()}`, icon: TrendingUp, sub: "Total released from escrow" },
  ];

  const maxCustomFrom = subMonths(new Date(), 6);
  const filterLabel = filterMode === "6" ? "Last 6 Months" : filterMode === "3" ? "Last 3 Months" : "Custom";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-sm text-muted-foreground">Live platform revenue and escrow tracking</p>
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

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-5">
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
            {filteredMonthlyRevenue.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredMonthlyRevenue}>
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
            {filteredMonthlyEscrow.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No escrow data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredMonthlyEscrow}>
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

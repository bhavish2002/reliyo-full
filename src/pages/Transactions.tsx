import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format as formatDate, isToday, isYesterday, startOfDay } from "date-fns";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksListRefresh } from "@/hooks/useTasksListRefresh";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import { listUserTransactions, type UserTransaction } from "@/lib/payments/api";

type FilterKey = "all" | "active" | "refunds" | "pending";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  pending: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

const SETTLEMENT_LABELS: Record<string, string> = {
  closed: "Reward payout successful",
  force_closed: "Force-close settlement successful",
  cancel_open: "Refund successful",
  quit_trust_refund: "Trust deposit refund successful",
};

function matchesFilter(tx: UserTransaction, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return tx.status === "pending";
  if (filter === "refunds") {
    return (
      tx.settlementScenario === "cancel_open" ||
      tx.settlementScenario === "quit_trust_refund" ||
      tx.settlementScenario === "force_closed"
    );
  }
  if (filter === "active") {
    return (
      tx.status === "confirmed" &&
      !tx.taskCancelled &&
      tx.taskStatus &&
      !["closed", "force_closed", "deleted"].includes(tx.taskStatus)
    );
  }
  return true;
}

function purposeLabel(tx: UserTransaction): string {
  if (tx.purpose === "task_reward") {
    return tx.role === "requestor" ? "Reward deposit" : "Task reward";
  }
  return "Trust deposit";
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return formatDate(d, "EEEE, d MMMM yyyy");
}

function groupByDate(items: UserTransaction[]): Array<{ label: string; items: UserTransaction[] }> {
  const map = new Map<string, UserTransaction[]>();
  for (const tx of items) {
    const key = startOfDay(new Date(tx.createdAt)).toISOString();
    const bucket = map.get(key) ?? [];
    bucket.push(tx);
    map.set(key, bucket);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, group]) => ({ label: groupLabel(key), items: group }));
}

const Transactions = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { format: formatMoney } = usePreferredCurrency();
  const refreshKey = useTasksListRefresh();
  const [items, setItems] = useState<UserTransaction[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listUserTransactions();
        if (!cancelled) setItems(res.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load transactions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, refreshKey]);

  const filtered = useMemo(
    () => items.filter((tx) => matchesFilter(tx, filter)),
    [items, filter],
  );

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
              Transactions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Payment deposits, trust locks, refunds, and settlement status — including cancelled tasks.
            </p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active tasks</SelectItem>
              <SelectItem value="pending">Processing</SelectItem>
              <SelectItem value="refunds">Refunds / settlements</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground text-center py-12">Loading transactions…</p>
        )}

        {error && (
          <Card className="rounded-xl border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Card className="rounded-xl">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No transactions match this filter yet.
            </CardContent>
          </Card>
        )}

        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="relative pl-6 space-y-3">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />

                {group.items.map((tx) => {
            const StatusIcon =
              tx.status === "confirmed"
                ? CheckCircle2
                : tx.status === "failed"
                  ? XCircle
                  : Clock;

            return (
              <div key={tx.id} className="relative">
                <span
                  className="absolute -left-6 top-5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
                  aria-hidden
                />
              <Card className="rounded-xl">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <StatusIcon
                      className={`h-5 w-5 ${
                        tx.status === "confirmed"
                          ? "text-[hsl(var(--success))]"
                          : tx.status === "failed"
                            ? "text-destructive"
                            : "text-primary"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">
                        {purposeLabel(tx)}
                      </p>
                      <Badge variant="outline" className={STATUS_STYLE[tx.status] ?? ""}>
                        {tx.status}
                      </Badge>
                      {tx.taskStatus === "deleted" ? (
                        <Badge variant="secondary">Deleted</Badge>
                      ) : tx.taskCancelled ? (
                        <Badge variant="secondary">Task cancelled</Badge>
                      ) : null}
                    </div>
                    {tx.taskTitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {tx.taskDisplayId ? `${tx.taskDisplayId} · ` : ""}
                        {tx.taskTitle}
                        {tx.taskStatus ? ` · ${tx.taskStatus}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(tx.createdAt), "HH:mm")}
                      {tx.confirmedAt &&
                        ` · Confirmed ${formatDate(new Date(tx.confirmedAt), "HH:mm")}`}
                      {tx.paymentMethod && ` · ${tx.paymentMethod}`}
                    </p>
                    {tx.settlementScenario && (
                      <p className="text-xs text-primary">
                        {SETTLEMENT_LABELS[tx.settlementScenario] ?? tx.settlementScenario}
                        {tx.settlementAt &&
                          ` · ${formatDate(new Date(tx.settlementAt), "dd MMM yyyy")}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-foreground whitespace-nowrap">
                      {formatMoney(tx.amount, { sourceCurrency: tx.currency })}
                    </p>
                    {tx.taskId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => navigate(`/transactions/status/${tx.taskId}`)}
                      >
                        View Status
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>
            );
          })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;

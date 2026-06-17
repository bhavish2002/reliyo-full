import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
import { listUserTransactions, type UserTransaction } from "@/lib/payments/api";

type FilterKey = "all" | "active" | "refunds" | "pending";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  pending: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

const SETTLEMENT_LABELS: Record<string, string> = {
  closed: "Settled on close",
  force_closed: "Force-close settlement",
  cancel_open: "Refund (cancelled)",
  quit_trust_refund: "Trust refund (quit)",
};

function purposeLabel(tx: UserTransaction): string {
  if (tx.purpose === "task_reward") {
    return tx.role === "requestor" ? "Reward deposit" : "Task reward";
  }
  return "Trust deposit";
}

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
      !["closed", "force_closed"].includes(tx.taskStatus)
    );
  }
  return true;
}

const Transactions = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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

        <div className="space-y-3">
          {filtered.map((tx) => {
            const symbol = tx.currency === "INR" ? "₹" : `${tx.currency} `;
            const StatusIcon =
              tx.status === "confirmed"
                ? CheckCircle2
                : tx.status === "failed"
                  ? XCircle
                  : Clock;

            return (
              <Card key={tx.id} className="rounded-xl">
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
                      {tx.taskCancelled && (
                        <Badge variant="secondary">Task cancelled</Badge>
                      )}
                    </div>
                    {tx.taskTitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {tx.taskDisplayId ? `${tx.taskDisplayId} · ` : ""}
                        {tx.taskTitle}
                        {tx.taskStatus ? ` · ${tx.taskStatus}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm")}
                      {tx.confirmedAt &&
                        ` · Confirmed ${format(new Date(tx.confirmedAt), "dd MMM HH:mm")}`}
                      {tx.paymentMethod && ` · ${tx.paymentMethod}`}
                    </p>
                    {tx.settlementScenario && (
                      <p className="text-xs text-primary">
                        {SETTLEMENT_LABELS[tx.settlementScenario] ?? tx.settlementScenario}
                        {tx.settlementAt &&
                          ` · ${format(new Date(tx.settlementAt), "dd MMM yyyy")}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-foreground whitespace-nowrap">
                      {symbol}
                      {tx.amount.toFixed(2)}
                    </p>
                    {tx.taskId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => navigate(`/task/${tx.taskId}`)}
                      >
                        View task
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;

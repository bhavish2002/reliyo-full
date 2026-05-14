import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, CreditCard,
  Smartphone, Building2, Lock, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser } from "@/lib/auth";
import { notifyTaskAccepted } from "@/lib/notifications";

type PaymentStatus = "idle" | "processing" | "success" | "failed" | "pending";

const fmtMoney = (v: number) => v.toFixed(2);

interface PaymentMethod {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "upi", label: "UPI", description: "Pay via Google Pay, PhonePe, Paytm, or any UPI app", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, RuPay accepted", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", description: "All major Indian banks supported", icon: Building2 },
];

const PaymentGateway = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const taskData = location.state?.taskData ?? null;
  const amount: number = location.state?.amount ?? 0;
  const platformFee: number = location.state?.platformFee ?? 0;
  const isAcceptFlow: boolean = location.state?.isAcceptFlow ?? false;
  const currencySymbol: string = taskData?.currencySymbol || "₹";

  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [status, setStatus] = useState<PaymentStatus>("idle");

  const handlePay = () => {
    if (!selectedMethod) return;
    setStatus("processing");

    setTimeout(() => {
      const outcomeMap: Record<string, PaymentStatus> = {
        upi: "success",
        card: "pending",
        netbanking: "failed",
      };
      const outcome = outcomeMap[selectedMethod] ?? "success";
      setStatus(outcome);

      const user = getCurrentUser();
      const userName = user?.name || "Unknown User";

      if (outcome === "success") {
        if (isAcceptFlow) {
          const acceptedAt = new Date().toISOString();
          // Save to accepted tasks with committed status
          const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]");
          accepted.push({
            ...taskData,
            status: "committed",
            acceptedAt,
            acceptedBy: userName,
          });
          localStorage.setItem("reliyo_accepted_tasks", JSON.stringify(accepted));

          // *** CRITICAL: Also update reliyo_tasks so requestor sees committed status ***
          const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]");
          const idx = tasks.findIndex((t: { id?: string }) => t.id === taskData.id);
          if (idx >= 0) {
            tasks[idx] = { ...tasks[idx], status: "committed", acceptedAt, acceptedBy: userName };
            localStorage.setItem("reliyo_tasks", JSON.stringify(tasks));
          }

          // Notify requestor that their task has been accepted
          notifyTaskAccepted(taskData);

          toast({ title: "Task Accepted!", description: "Trust deposit locked. You can now start working on this task." });
        } else {
          const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]");
          const newTask = {
            ...taskData,
            status: "open",
            paymentStatus: "paid",
            createdAt: new Date().toISOString(),
            createdBy: userName,
          };
          tasks.push(newTask);
          localStorage.setItem("reliyo_tasks", JSON.stringify(tasks));
          toast({ title: "Payment Successful!", description: "Your reward has been locked. Task is now live." });
        }
      }

      if (outcome === "pending") {
        if (isAcceptFlow) {
          const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]");
          accepted.push({
            ...taskData,
            status: "committed",
            acceptedAt: new Date().toISOString(),
            acceptedBy: userName,
            paymentStatus: "pending",
          });
          localStorage.setItem("reliyo_accepted_tasks", JSON.stringify(accepted));
        }
        toast({ title: "Payment Under Processing", description: "We'll update your task status once confirmed." });
      }
    }, 2000);
  };

  const handleRetry = () => {
    setStatus("idle");
    setSelectedMethod("");
  };

  const handleGoToTasks = () => {
    if (isAcceptFlow) {
      navigate("/my-tasks?tab=accepted");
    } else {
      navigate("/my-tasks");
    }
  };

  const handleBack = () => navigate(isAcceptFlow ? "/browse-tasks" : "/create-task");

  // ── Processing state ──
  if (status === "processing") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Processing Payment…</p>
            <p className="text-sm text-muted-foreground mt-1">Please do not close this window</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Success state ──
  if (status === "success") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
            <p className="text-muted-foreground mt-2">
              {isAcceptFlow
                ? `${currencySymbol}${fmtMoney(amount)} has been locked as a trust deposit. The task is now in your accepted list.`
                : `${currencySymbol}${fmtMoney(amount)} has been locked as a reward deposit. Your task is now live and visible to workers.`}
            </p>
          </div>
          <div className="w-full rounded-xl bg-muted p-4 text-sm text-left space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-semibold">{currencySymbol}{fmtMoney(amount)}</span></div>
            {!isAcceptFlow && (
              <div className="flex justify-between text-muted-foreground text-xs pt-1">
                <span>Platform fee will be deducted at payout</span>
              </div>
            )}
          </div>
          <Button className="w-full" onClick={handleGoToTasks}>
            {isAcceptFlow ? "View Accepted Tasks" : "View My Tasks"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Failed state ──
  if (status === "failed") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payment Failed</h2>
            <p className="text-muted-foreground mt-2">
              We were unable to process your payment of {currencySymbol}{fmtMoney(amount)}. No amount has been deducted.
            </p>
          </div>
          <div className="w-full space-y-3">
            <Button className="w-full" onClick={handleRetry}>Retry Payment</Button>
            <Button variant="ghost" className="w-full" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Pending state ──
  if (status === "pending") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payment Under Processing</h2>
            <p className="text-muted-foreground mt-2">
              Your payment of {currencySymbol}{fmtMoney(amount)} is being verified.
              {isAcceptFlow
                ? " The task has been added to your accepted list and will be fully confirmed once payment clears."
                : " Your payment is being processed. The task will be created and go live once payment is confirmed."}
            </p>
          </div>
          <div className="w-full rounded-xl border border-secondary bg-secondary/50 p-4 text-sm text-left">
            <p className="font-medium text-secondary-foreground">What happens next?</p>
            <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
              <li>We'll verify the payment with your bank</li>
              <li>{isAcceptFlow ? "Your task commitment will be fully confirmed" : "Your task will be published automatically on confirmation"}</li>
              <li>You'll receive a notification once it's processed</li>
            </ul>
          </div>
          <Button className="w-full" onClick={handleGoToTasks}>
            {isAcceptFlow ? "View Accepted Tasks" : "View My Tasks"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Idle / Select payment method ──
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          {isAcceptFlow ? "Lock Trust Deposit" : "Complete Payment"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isAcceptFlow
            ? `Lock ${currencySymbol}${fmtMoney(amount)} as a trust deposit to accept this task.`
            : `Lock ${currencySymbol}${fmtMoney(amount)} as a reward deposit to publish your task.`}
        </p>

        <Card className="rounded-xl mb-6">
          <CardContent className="p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isAcceptFlow ? "Trust Deposit (10%)" : "Reward Amount"}</span>
              <span>{currencySymbol}{fmtMoney(amount)}</span>
            </div>
            {!isAcceptFlow && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground italic">Platform fee will be deducted at payout</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-1 text-base">
              <span>Total to Pay</span>
              <span className="text-primary">{currencySymbol}{fmtMoney(amount)}</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm font-medium text-foreground mb-3">Select Payment Method</p>
        <div className="space-y-3 mb-6">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 shrink-0 transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground mb-6">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
          Your payment is secured with 256-bit SSL encryption. {isAcceptFlow ? "The trust deposit is held as platform-held funds and refunded on task completion per policy." : "The reward is held as platform-held funds and released only on task completion per policy."}
        </div>

        <Button
          className="w-full gap-2 h-12 text-base"
          disabled={!selectedMethod}
          onClick={handlePay}
        >
          <Lock className="h-4 w-4" />
          Lock & Pay {currencySymbol}{fmtMoney(amount)}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default PaymentGateway;

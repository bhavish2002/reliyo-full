import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
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
import { createFundHold, confirmFundHoldCheckout, getFundHold, pollFundHoldUntilSettled, type FundHold } from "@/lib/payments/api";
import { settleFundHold } from "@/lib/payments/flow";
import {
  clearFundHoldIds,
  loadCheckoutSuccessForHold,
  loadFundHoldIds,
  rememberCheckoutSuccess,
  rememberFundHoldId,
} from "@/lib/payments/payment-session";
import { acceptTask, createTask, getTaskDetail, type CreateTaskPayload } from "@/lib/tasks/api";
import { notifyTasksChanged } from "@/lib/tasks/events";
import { ApiClientError } from "@/lib/api/client";

type PaymentStatus = "idle" | "processing" | "success" | "failed" | "pending";

const fmtMoney = (v: number) => v.toFixed(2);

function formatPaymentError(err: unknown, isAccept: boolean): string {
  if (err instanceof ApiClientError) {
    const code = err.body?.code;
    if (code === "TASK_CANNOT_ACCEPT_OWN") {
      return "You cannot accept your own task.";
    }
    if (code === "TASK_ALREADY_ACCEPTED") {
      return "This task has already been accepted by another worker.";
    }
    if (code === "TASK_ACTION_FORBIDDEN") {
      return isAccept
        ? "This task is no longer open for acceptance. It may have been taken or closed."
        : err.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : isAccept ? "Payment or accept failed." : "Payment or task publish failed.";
}

async function assertTaskAcceptable(taskId: string): Promise<string> {
  const detail = await getTaskDetail(taskId);
  const me = getCurrentUser();
  if (detail.task.createdById === me?.id) {
    throw new Error("You cannot accept your own task.");
  }
  if (!detail.availableActions.canAccept) {
    if (detail.task.acceptedById) {
      throw new Error("This task has already been accepted.");
    }
    if (detail.task.status !== "open") {
      throw new Error(`This task is no longer open (status: ${detail.task.status}).`);
    }
    throw new Error("This task cannot be accepted right now.");
  }
  return detail.task.id;
}

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
  const taskDraft = location.state?.taskDraft as Omit<CreateTaskPayload, "fundHoldId"> | null;
  const amount: number = location.state?.amount ?? 0;
  const isAcceptFlow: boolean = location.state?.isAcceptFlow ?? false;
  const currency: string = location.state?.currency ?? taskDraft?.currency ?? "INR";
  const currencySymbol: string = taskData?.currencySymbol || taskDraft?.currencySymbol || "₹";

  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  if (isAcceptFlow && !taskData?.id) {
    return <Navigate to="/browse-tasks" replace />;
  }
  if (!isAcceptFlow && !taskDraft) {
    return <Navigate to="/create-task" replace />;
  }

  const publishAfterPayment = async (settled: FundHold) => {
    if (settled.status === "failed") {
      setStatus("failed");
      setPublishError("Payment could not be confirmed. Try again or check payment status.");
      return;
    }

    if (settled.status === "pending") {
      setStatus("pending");
      toast({
        title: "Payment Under Processing",
        description: isAcceptFlow
          ? "Your acceptance will complete once payment is confirmed."
          : "Your task will be published once payment is confirmed.",
      });
      return;
    }

    clearFundHoldIds();

    if (isAcceptFlow) {
      const taskId = await assertTaskAcceptable(taskData.id);
      try {
        await acceptTask(taskId, settled.id);
      } catch (err) {
        const detail = await getTaskDetail(taskId);
        const me = getCurrentUser();
        const alreadyMine =
          detail.task.acceptedById === me?.id &&
          detail.task.status !== "open";
        if (!alreadyMine) {
          throw new Error(formatPaymentError(err, true));
        }
      }
      notifyTasksChanged();
      notifyTaskAccepted(taskData);
      toast({
        title: "Task Accepted!",
        description: "Trust deposit locked. You can now start working on this task.",
      });
      navigate(`/task/${taskId}`, { replace: true });
      return;
    }

    if (taskDraft) {
      const created = await createTask({
        ...taskDraft,
        fundHoldId: settled.id,
      });
      toast({
        title: "Payment Successful!",
        description: "Your reward has been locked. Your task is now live.",
      });
      notifyTasksChanged();
      navigate(`/task/${created.id}`, { replace: true });
    }
  };

  const findConfirmedHoldFromSession = async (): Promise<FundHold | null> => {
    const expectedPurpose = isAcceptFlow ? "trust_deposit" : "task_reward";
    const expectedTaskId = isAcceptFlow ? taskData?.id : undefined;

    for (const id of loadFundHoldIds()) {
      const hold = await getFundHold(id);
      if (hold.status !== "confirmed") continue;
      if (hold.purpose !== expectedPurpose) continue;
      if (hold.amount !== amount || hold.currency !== currency) continue;
      if (expectedTaskId && hold.targetTaskId && hold.targetTaskId !== expectedTaskId) {
        continue;
      }
      return hold;
    }
    return null;
  };

  const runPaymentFlow = async () => {
    const user = getCurrentUser();
    const payer = {
      name: user?.name,
      contact: user?.phone?.replace(/\D/g, "").slice(-10),
    };

    if (isAcceptFlow) {
      await assertTaskAcceptable(taskData.id);
    }

    const recovered = await findConfirmedHoldFromSession();
    if (recovered) {
      await publishAfterPayment(recovered);
      return;
    }

    const hold = await createFundHold({
      purpose: isAcceptFlow ? "trust_deposit" : "task_reward",
      amount,
      currency,
      paymentMethod: selectedMethod,
      ...(isAcceptFlow ? { taskId: taskData.id } : {}),
    });
    rememberFundHoldId(hold.id);

    const settled = await settleFundHold(hold, payer);
    await publishAfterPayment(settled);
  };

  const handlePay = () => {
    if (!selectedMethod) return;
    setStatus("processing");
    setPublishError(null);

    void (async () => {
      try {
        await runPaymentFlow();
      } catch (err) {
        setStatus("failed");
        const message = formatPaymentError(err, isAcceptFlow);
        setPublishError(message);
        toast({
          title: isAcceptFlow ? "Accept failed" : "Could not publish task",
          description: message,
          variant: "destructive",
        });
      }
    })();
  };

  const handleCheckPaymentStatus = () => {
    setIsCheckingPayment(true);
    setPublishError(null);

    void (async () => {
      try {
        const ids = loadFundHoldIds();
        if (!ids.length) {
          setPublishError("No recent payment found. Try Lock & Pay again.");
          return;
        }

        let settled: FundHold | null = null;
        for (const id of ids) {
          const checkout = loadCheckoutSuccessForHold(id);
          if (checkout) {
            try {
              settled = await confirmFundHoldCheckout(id, {
                razorpayPaymentId: checkout.razorpayPaymentId,
                razorpayOrderId: checkout.razorpayOrderId,
                razorpaySignature: checkout.razorpaySignature,
              });
              if (settled.status === "confirmed") break;
            } catch {
              /* fall through to poll */
            }
          }
          try {
            settled = await pollFundHoldUntilSettled(id, {
              maxAttempts: 15,
              intervalMs: 2000,
            });
            if (settled.status === "confirmed") break;
          } catch {
            /* try next hold from earlier attempts */
          }
        }

        if (!settled || settled.status !== "confirmed") {
          const latest = await getFundHold(ids[0]);
          if (latest.status === "pending") {
            setStatus("pending");
            toast({
              title: "Still processing",
              description: "Payment not confirmed yet. Ensure Razorpay webhooks reach your API (tunnel).",
            });
          } else {
            setPublishError(
              "Payment not confirmed yet. If you paid on Razorpay, register the webhook tunnel URL in the Razorpay dashboard.",
            );
          }
          return;
        }

        setStatus("processing");
        await publishAfterPayment(settled);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not verify payment.";
        setPublishError(message);
      } finally {
        setIsCheckingPayment(false);
      }
    })();
  };

  const handleRetry = () => {
    setStatus("idle");
    setSelectedMethod("");
  };

  const handleGoToTasks = () => {
    if (isAcceptFlow) {
      navigate("/my-tasks?tab=accepted");
    } else {
      navigate("/my-tasks?tab=created");
    }
  };

  const handleBack = () => navigate(isAcceptFlow ? "/browse-tasks" : "/create-task");

  if (status === "processing") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto text-center">
          <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Processing Payment…</p>
            <p className="text-sm text-muted-foreground mt-1">
              Confirming payment and {isAcceptFlow ? "accepting the task" : "publishing your task"}.
            </p>
            {publishError && (
              <p className="text-sm text-destructive mt-2">{publishError}</p>
            )}
          </div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={isCheckingPayment}
            onClick={handleCheckPaymentStatus}
          >
            {isCheckingPayment ? "Checking…" : "Taking too long? Check payment status"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

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
          <Button className="w-full" onClick={handleGoToTasks}>
            {isAcceptFlow ? "View Accepted Tasks" : "Back to Create Task"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

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
              {!isAcceptFlow && " Your task was not created."}
            </p>
            {publishError && (
              <p className="text-sm text-destructive">{publishError}</p>
            )}
          </div>
          <div className="w-full space-y-3">
            <Button className="w-full" onClick={handleRetry}>Retry Payment</Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={isCheckingPayment}
              onClick={handleCheckPaymentStatus}
            >
              {isCheckingPayment ? "Checking…" : "I already paid — check status"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                ? " Your acceptance will complete once payment clears."
                : " Your task will be published once payment is confirmed."}
            </p>
          </div>
          <div className="w-full space-y-3">
            <Button
              className="w-full"
              disabled={isCheckingPayment}
              onClick={handleCheckPaymentStatus}
            >
              {isCheckingPayment ? "Checking…" : "Check payment status again"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleGoToTasks}>
              {isAcceptFlow ? "View Accepted Tasks" : "View My Tasks"}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                type="button"
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
          Razorpay handles card/UPI/netbanking in checkout. Reliyo confirms payment via server webhooks — keep your webhook tunnel running in staging.
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

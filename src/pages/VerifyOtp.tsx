import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { verifyOtp, sendOtp, getRedirectForRole } from "@/lib/auth/api";
import { useAuth } from "@/contexts/AuthContext";
import { ApiClientError } from "@/lib/api/client";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const { phone, dialCode, from, signupMeta } = (location.state as {
    phone?: string;
    dialCode?: string;
    from?: string;
    signupMeta?: { name: string; email?: string };
  }) || {};

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no phone
  useEffect(() => {
    if (!phone) navigate("/sign-in", { replace: true });
  }, [phone, navigate]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    const next = Array(OTP_LENGTH).fill("");
    digits.split("").forEach((d, i) => (next[i] = d));
    setOtp(next);
    const focusIdx = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const otpValue = otp.join("");
  const isComplete = otpValue.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isComplete) return;
    setIsVerifying(true);
    try {
      const tokens = await verifyOtp({
        phone: phone!,
        dialCode: dialCode || "+91",
        code: otpValue,
      });
      setSession(tokens.accessToken, tokens.user);
      toast({
        title: "Verified!",
        description: signupMeta?.name
          ? `Welcome, ${signupMeta.name}!`
          : `Welcome back${tokens.user.name ? `, ${tokens.user.name}` : ""}!`,
      });
      navigate(getRedirectForRole(tokens.user.role), { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.body?.message || "Invalid OTP. Please try again."
          : "Invalid OTP. Please try again.";
      toast({ title: "Verification failed", description: message, variant: "destructive" });
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await sendOtp({
        phone: phone!,
        dialCode: dialCode || "+91",
        purpose: from === "sign-up" ? "signup" : "login",
        ...(from === "sign-up" && signupMeta
          ? {
              name: signupMeta.name,
              email: signupMeta.email,
              preferredRole: "requestor" as const,
            }
          : {}),
      });
      toast({ title: "OTP Resent", description: "A new code has been sent to your phone." });
      setResendTimer(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      toast({ title: "Failed to resend", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const maskedPhone = phone ? `${dialCode || ""} ${"•".repeat(Math.max(0, phone.length - 3))}${phone.slice(-3)}` : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-8 shadow-xl">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Verify your phone</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            We've sent a {OTP_LENGTH}-digit code to{" "}
            <span className="font-medium text-foreground">{maskedPhone}</span>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* OTP Inputs */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-lg border-2 border-muted bg-muted text-center text-xl font-semibold text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <Button
            className="h-12 w-full rounded-xl text-base font-medium"
            disabled={!isComplete || isVerifying}
            onClick={handleVerify}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify"
            )}
          </Button>

          {/* Resend */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend code in <span className="font-medium text-foreground">{resendTimer}s</span>
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm font-medium text-primary"
              >
                {isResending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Resend OTP
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mx-auto flex items-center gap-1 text-sm text-muted-foreground"
            onClick={() => navigate(from === "sign-up" ? "/sign-up" : "/sign-in")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change phone number
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;

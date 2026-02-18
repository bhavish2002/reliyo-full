import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Phone, Loader2, CheckCircle2, Info, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { getCountryByCode } from "@/lib/countries";
import {
  signInSchema,
  type SignInFormData,
  validatePhoneForCountry,
} from "@/lib/validation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SignIn = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
    defaultValues: { phone: "", countryCode: "IN" },
  });

  const countryCode = watch("countryCode");
  const phone = watch("phone");
  const selectedCountry = getCountryByCode(countryCode);

  const phoneError = (() => {
    if (!phone || !dirtyFields.phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "Phone number is required.";
    if (selectedCountry) {
      return validatePhoneForCountry(digits, selectedCountry.phoneLength);
    }
    return null;
  })();

  const isFormReady = phone.length > 0 && !phoneError && !errors.phone;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setValue("phone", digits, { shouldValidate: true });
  };

  const onSubmit = async (data: SignInFormData) => {
    if (phoneError) return;
    setAccountError(null);
    setIsSubmitting(true);
    try {
      // Simulated account existence check
      const registered: string[] = JSON.parse(localStorage.getItem("registered_phones") || "[]");
      if (!registered.includes(data.phone)) {
        setAccountError("No account found for this phone number.");
        setIsSubmitting(false);
        return;
      }
      console.log("SignIn payload:", {
        ...data,
        dialCode: selectedCountry?.dialCode || "+91",
      });
      await new Promise((r) => setTimeout(r, 1200));
      toast({ title: "OTP Sent!", description: "Check your phone for the verification code." });
      navigate("/verify-otp", {
        state: { phone: data.phone, dialCode: selectedCountry?.dialCode || "+91", from: "sign-in" },
      });
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-8 shadow-xl">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your phone number to continue
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
          <div>
            <label className="mb-1 flex items-center text-xs font-medium text-muted-foreground">
              Phone Number
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="ml-1 inline h-3.5 w-3.5 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {selectedCountry
                      ? `Enter ${selectedCountry.phoneLength} digits for ${selectedCountry.name}.`
                      : "Select a country and enter your number."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <div className="flex gap-2">
              <CountryCodeSelect
                value={countryCode}
                onChange={(val) => setValue("countryCode", val, { shouldValidate: true })}
              />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder={selectedCountry ? "0".repeat(selectedCountry.phoneLength) : "Phone number"}
                  className="h-12 rounded-lg border-none bg-muted pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={selectedCountry?.phoneLength || 15}
                />
                {dirtyFields.phone && !phoneError && !errors.phone && phone.length > 0 && (
                  <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                )}
              </div>
            </div>
            {(errors.phone || phoneError) && (
              <p className="mt-1 text-xs text-destructive">
                {errors.phone?.message || phoneError}
              </p>
            )}
            {accountError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">
                  {accountError}{" "}
                  <Link to="/sign-up" className="font-medium underline">
                    Create an account
                  </Link>
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-medium"
            disabled={!isFormReady || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send OTP"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/sign-up" className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignIn;

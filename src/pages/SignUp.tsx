import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Phone, User, MapPin, Mail, Loader2, CheckCircle2, MapPinned, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { countries, getCountryByCode } from "@/lib/countries";
import {
  signUpSchema,
  type SignUpFormData,
  validatePhoneForCountry,
  capitalizeWords,
} from "@/lib/validation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SignUp = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isValid, dirtyFields },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      phone: "",
      location: "",
      email: "",
      countryCode: "IN",
    },
  });

  const countryCode = watch("countryCode");
  const phone = watch("phone");
  const selectedCountry = getCountryByCode(countryCode);

  // Extra phone validation beyond zod
  const phoneError = (() => {
    if (!phone || !dirtyFields.phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "Phone number is required.";
    if (selectedCountry) {
      return validatePhoneForCountry(digits, selectedCountry.phoneLength);
    }
    return null;
  })();

  const isFormReady = isValid && !phoneError;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits
    const digits = e.target.value.replace(/\D/g, "");
    setValue("phone", digits, { shouldValidate: true });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip numbers, emojis, and invalid special chars
    let val = e.target.value.replace(/[^A-Za-z '\-]/g, "");
    // Prevent consecutive spaces
    val = val.replace(/ {2,}/g, " ");
    setValue("fullName", val, { shouldValidate: true });
  };

  const handleLocationDetect = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually.",
        variant: "destructive",
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const locationStr = [city, state, country].filter(Boolean).join(", ");
          setValue("location", locationStr, { shouldValidate: true });

          // Try to match country code
          const countryMatch = countries.find(
            (c) => c.name.toLowerCase() === country.toLowerCase()
          );
          if (countryMatch) {
            setValue("countryCode", countryMatch.code, { shouldValidate: true });
          }
        } catch {
          toast({
            title: "Could not detect location",
            description: "Please enter your location manually.",
            variant: "destructive",
          });
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
        toast({
          title: "Location permission denied",
          description: "Please enter your location manually.",
          variant: "destructive",
        });
      }
    );
  }, [setValue]);

  const onSubmit = async (data: SignUpFormData) => {
    // Additional phone check
    if (phoneError) return;

    setIsSubmitting(true);
    try {
      // Capitalize name
      const formatted = {
        ...data,
        fullName: capitalizeWords(data.fullName),
        dialCode: selectedCountry?.dialCode || "+91",
      };
      console.log("SignUp payload:", formatted);
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1200));
      toast({ title: "Account created!", description: "Welcome to Reliyo." });
      navigate("/sign-in");
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

  const FieldHint = ({ text }: { text: string }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="ml-1 inline h-3.5 w-3.5 cursor-help text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const ValidIcon = () => (
    <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-8 shadow-xl">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the trust-driven task marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label className="mb-1 flex items-center text-xs font-medium text-muted-foreground">
              Full Name <FieldHint text="Letters, spaces, hyphens, and apostrophes only. 2–100 chars." />
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Full Name"
                className="h-12 rounded-lg border-none bg-muted pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
                {...register("fullName")}
                onChange={handleNameChange}
                maxLength={100}
              />
              {dirtyFields.fullName && !errors.fullName && <ValidIcon />}
            </div>
            {errors.fullName && (
              <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 flex items-center text-xs font-medium text-muted-foreground">
              Location <FieldHint text="Use GPS detection or type your city, state, country." />
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="City, State, Country"
                  className="h-12 rounded-lg border-none bg-muted pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
                  {...register("location")}
                />
                {dirtyFields.location && !errors.location && <ValidIcon />}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0 rounded-lg px-3"
                onClick={handleLocationDetect}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPinned className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.location && (
              <p className="mt-1 text-xs text-destructive">{errors.location.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 flex items-center text-xs font-medium text-muted-foreground">
              Phone Number{" "}
              <FieldHint
                text={`Digits only. ${selectedCountry ? selectedCountry.phoneLength + " digits for " + selectedCountry.name : "Select country"}.`}
              />
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
                {dirtyFields.phone && !phoneError && !errors.phone && phone.length > 0 && <ValidIcon />}
              </div>
            </div>
            {(errors.phone || phoneError) && (
              <p className="mt-1 text-xs text-destructive">
                {errors.phone?.message || phoneError}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 flex items-center text-xs font-medium text-muted-foreground">
              Email <FieldHint text="A valid email address. Converted to lowercase." />
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@example.com"
                className="h-12 rounded-lg border-none bg-muted pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
                {...register("email")}
                maxLength={255}
              />
              {dirtyFields.email && !errors.email && <ValidIcon />}
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-2 h-12 w-full rounded-xl text-base font-medium"
            disabled={!isFormReady || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/sign-in" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;

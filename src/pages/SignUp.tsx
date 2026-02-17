import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Phone, User, MapPin, Mail } from "lucide-react";

const SignUp = () => {
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

        <div className="mt-8 space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Full Name"
              className="h-12 rounded-lg border-none bg-muted pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              className="h-12 rounded-lg border-none bg-muted pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Location"
              className="h-12 rounded-lg border-none bg-muted pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email (optional)"
              className="h-12 rounded-lg border-none bg-muted pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button className="mt-2 h-12 w-full rounded-xl text-base font-medium">
            Create Account
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/sign-in" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

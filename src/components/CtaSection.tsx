import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CtaSection = () => {
  return (
    <section className="px-4 py-16">
      <div className="container">
        <div className="rounded-2xl bg-cta px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-cta-foreground sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-cta-foreground/80">
            Join the trust-driven marketplace today.
          </p>
          <Button
            size="lg"
            className="mt-8 px-8 text-base"
            asChild
          >
            <Link to="/sign-up">Create Your Account</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="flex flex-col items-center px-4 pb-24 pt-20 text-center">
      <span className="mb-6 inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground">
        Trust-First Marketplace
      </span>

      <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
        Get tasks done with{" "}
        <span className="text-primary">trust & transparency</span>
      </h1>

      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
        A marketplace where reliability is rewarded, payments are secured in
        escrow, and every action is auditable.
      </p>

      <Button size="lg" className="mt-8 gap-2 px-8 text-base">
        Start Now <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
};

export default HeroSection;

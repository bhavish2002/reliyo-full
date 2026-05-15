import { FileText, Users, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    step: "STEP 1",
    title: "Create a Task",
    description:
      "Describe what you need, set in the deadline and lock the reward.",
  },
  {
    icon: Users,
    step: "STEP 2",
    title: "Get Matched",
    description:
      "Tasks are mapped to trusted acceptors with a trust deposit locked for reliability.",
  },
  {
    icon: CheckCircle,
    step: "STEP 3",
    title: "Review & Pay",
    description:
      "Approve the work, rate the acceptor, and funds release automatically on task completion.",
  },
];

const HowItWorks = () => {
  return (
    <section className="px-4 py-20">
      <div className="container">
        <h2 className="text-center text-3xl font-bold text-foreground">
          How It Works
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
          Three simple steps for requestors and acceptors — with platform-held funds at
          every stage.
        </p>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-xl border border-border bg-card p-8 shadow-sm"
              style={{
                borderTopWidth: "3px",
                borderTopColor: "hsl(var(--primary))",
              }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-semibold tracking-wider text-primary">
                {s.step}
              </p>
              <h3 className="mt-1 text-lg font-bold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

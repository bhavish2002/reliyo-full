import { Users, Zap, TrendingUp } from "lucide-react";

const stats = [
  { icon: Users, value: "850+", label: "Trusted Users" },
  { icon: Zap, value: "2,400+", label: "Tasks Completed" },
  { icon: TrendingUp, value: "₹12L+", label: "Paid Out" },
];

const StatsSection = () => {
  return (
    <section className="px-4 py-16">
      <div className="container flex flex-wrap items-center justify-center gap-16 md:gap-24">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <s.icon className="mb-1 h-6 w-6 text-primary" />
            <span className="text-3xl font-extrabold text-foreground">
              {s.value}
            </span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;

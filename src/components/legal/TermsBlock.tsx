import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermsBlockProps {
  monetary: { title: string; bullets: string[] };
  additional: { title: string; bullets: string[] };
  className?: string;
  compact?: boolean;
}

function renderBullet(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Scrollable terms panel — monetary summary first, then additional details. */
export default function TermsBlock({ monetary, additional, className, compact }: TermsBlockProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground",
        compact ? "max-h-48" : "max-h-64",
        "overflow-y-auto p-3 space-y-4",
        className,
      )}
    >
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2 flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          {monetary.title}
        </p>
        <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
          {monetary.bullets.map((b) => (
            <li key={b.slice(0, 40)}>{renderBullet(b)}</li>
          ))}
        </ul>
      </section>
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-2">
          {additional.title}
        </p>
        <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
          {additional.bullets.map((b) => (
            <li key={b.slice(0, 40)}>{renderBullet(b)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TermsBlock from "@/components/legal/TermsBlock";

interface TermsConsentDialogProps {
  title: string;
  monetary: { title: string; bullets: string[] };
  additional: { title: string; bullets: string[] };
  consentLabel: string;
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

const SCROLL_THRESHOLD_PX = 24;

/** Info (ⓘ) dialog with scroll-gated T&C consent checkbox at the bottom. */
export default function TermsConsentDialog({
  title,
  monetary,
  additional,
  consentLabel,
  agreed,
  onAgreedChange,
}: TermsConsentDialogProps) {
  const [open, setOpen] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd =
      el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX;
    setScrolledToEnd(atEnd);
  }, []);

  useEffect(() => {
    if (!open) return;
    setScrolledToEnd(false);
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      updateScrollState();
      if (el.scrollHeight <= el.clientHeight + SCROLL_THRESHOLD_PX) {
        setScrolledToEnd(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, updateScrollState]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && !agreed) {
      onAgreedChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={agreed ? "outline" : "ghost"}
          size="sm"
          className={`h-8 gap-1.5 shrink-0 ${agreed ? "text-[hsl(var(--success))] border-[hsl(var(--success))]/40" : "text-primary"}`}
          aria-label={`View ${title}`}
        >
          {agreed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          {agreed ? "Terms accepted" : "View terms"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex-1 overflow-y-auto px-6 pb-2 min-h-0"
        >
          <TermsBlock monetary={monetary} additional={additional} className="max-h-none" />
        </div>
        <div className="shrink-0 border-t border-border px-6 py-4 space-y-3 bg-muted/30">
          {!scrolledToEnd && !agreed && (
            <p className="text-xs text-muted-foreground">
              Scroll to the bottom to read all terms before accepting.
            </p>
          )}
          <div className="flex items-start gap-2">
            <Checkbox
              id={`terms-consent-${title.replace(/\s+/g, "-")}`}
              checked={agreed}
              disabled={!scrolledToEnd}
              onCheckedChange={(checked) => onAgreedChange(checked === true)}
            />
            <label
              htmlFor={`terms-consent-${title.replace(/\s+/g, "-")}`}
              className={`text-sm leading-snug flex-1 ${scrolledToEnd ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            >
              {consentLabel}
            </label>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!agreed}
            onClick={() => setOpen(false)}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

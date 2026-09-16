import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MAIN_TERMS_SECTIONS } from "@/lib/legal/termsContent";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container px-4 py-12 max-w-3xl">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: August 12, 2026</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground rounded-lg border bg-muted/30 p-4">
        These Terms reflect Reliyo&apos;s implemented task lifecycle, platform-held funds, fee schedule
        (5% reward fee on normal close; 3% trust fee on force close; 10% trust deposit on accept),
        dispute levels DSP1–DSP4, and settlement rules. Bank payouts to acceptors require separate
        verification when enabled.
      </p>
      <div className="mt-8 space-y-8">
        {MAIN_TERMS_SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.content}</p>
          </section>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default Terms;

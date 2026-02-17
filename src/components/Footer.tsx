import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-background px-4 py-8">
      <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Reliyo</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 Reliyo. Trust-driven task marketplace.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

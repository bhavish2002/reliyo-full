import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Linkedin, Youtube, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Reliyo</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A trust-driven task marketplace where reliability is rewarded and every action is transparent.
            </p>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/help-support" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/leadership" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  Leadership
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Follow Us
            </h3>
            <div className="flex items-center gap-4">
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-all hover:scale-110 hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-all hover:scale-110 hover:text-primary">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-all hover:scale-110 hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-border" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Reliyo. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

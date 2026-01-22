import React from "react";
import { Link } from "react-router-dom";
import { Menu, Mic2, ExternalLink, Phone, Instagram, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Open Mic", to: "/openmic" },
  { label: "Dediche", to: "/messaggi" },
  { label: "Party Band", to: "/partyband" },
];

export const SiteHeader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-card/98 backdrop-blur-xl border-b border-border/50 safe-area-top",
        className
      )}
    >
      <div className="container h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <Mic2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold neon-text-pink tracking-tight">
              Non C&apos;è Duo
            </div>
            <div className="text-[10px] font-semibold -mt-0.5 uppercase tracking-wider text-secondary">
              Sito
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/app" className="hidden sm:block">
            <Button variant="outline" size="sm" className="gap-2">
              Apri App
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px]">
              <SheetHeader>
                <SheetTitle className="font-display neon-text-pink">Menu</SheetTitle>
              </SheetHeader>

              <nav className="mt-6 space-y-2">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.to} to={item.to}>
                    <Button variant="ghost" className="w-full justify-start">
                      {item.label}
                    </Button>
                  </Link>
                ))}

                <div className="pt-3 mt-3 border-t border-border/60" />

                <Link to="/app">
                  <Button className="w-full neon-button-cyan justify-between">
                    Entra nell&apos;App
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </nav>

              <div className="mt-6 glass-card p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Per info e date eventi:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href="https://wa.me/393807911941"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="icon" className="w-full">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                  <a
                    href="https://www.instagram.com/nonceduo/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="icon" className="w-full">
                      <Instagram className="w-4 h-4" />
                    </Button>
                  </a>
                  <a href="mailto:info@nonceduo.com">
                    <Button variant="outline" size="icon" className="w-full">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

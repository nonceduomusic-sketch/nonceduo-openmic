import React from "react";
import { Link } from "react-router-dom";
import { Menu, Mic2, ExternalLink, Phone, Instagram, Mail, Shield, Download, MessageCircle, Gamepad2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

export const SiteHeader: React.FC<{ className?: string }> = ({ className }) => {
  const { isActive: isOpenmicMenu } = useFormatActiveCheck('openmic', 'menu');
  const { isActive: isDedicheMenu } = useFormatActiveCheck('dediche', 'menu');
  const { isActive: isGiochiMenu } = useFormatActiveCheck('giochi', 'menu');
  const { isActive: isCommunityMenu } = useFormatActiveCheck('community', 'menu');

  const menuFormats = [
    isOpenmicMenu && { label: "Open Mic", to: "/openmic", icon: Mic2 },
    isDedicheMenu && { label: "Dediche", to: "/messaggi", icon: MessageCircle },
    isGiochiMenu && { label: "Non C'è Furore", to: "/app/furore", icon: Gamepad2 },
    isCommunityMenu && { label: "Community", to: "/social", icon: Users },
  ].filter(Boolean) as { label: string; to: string; icon: React.ElementType }[];

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
                <Link to="/">
                  <Button variant="ghost" className="w-full justify-start">
                    Home
                  </Button>
                </Link>

                {menuFormats.map((item) => (
                  <Link key={item.to} to={item.to}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}

                <Link to="/partyband">
                  <Button variant="ghost" className="w-full justify-start">
                    Party Band
                  </Button>
                </Link>

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
                  <a href="https://wa.me/393807911941" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="w-full">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                  <a href="https://www.instagram.com/nonceduo.music/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="w-full">
                      <Instagram className="w-4 h-4" />
                    </Button>
                  </a>
                  <a href="mailto:nonceduo.music@gmail.com">
                    <Button variant="outline" size="icon" className="w-full">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                <Link to="/installa">
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    <Download className="w-4 h-4 mr-2" />
                    Installa App
                  </Button>
                </Link>
                <Link to="/admin">
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    <Shield className="w-4 h-4 mr-2" />
                    Area Staff
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

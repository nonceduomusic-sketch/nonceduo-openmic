import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mic2, MessageCircle, Loader2, Zap, Radio, Calendar, Instagram, ArrowRight, Sparkles, Music, Gamepad2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";
import { cn } from "@/lib/utils";

interface FormatCardProps {
  to: string;
  icon: React.ElementType;
  label: string;
  description: string;
  isLive: boolean;
  accentClass: string; // e.g. "secondary", "primary", "destructive", "orange-500"
  liveCta?: string;
  infoCta?: string;
}

const FormatCard: React.FC<FormatCardProps> = ({
  to, icon: Icon, label, description, isLive, accentClass,
  liveCta = "Entra", infoCta = "Scopri"
}) => (
  <Link to={to} className="group block">
    <Card className={cn(
      "glass-card transition-all duration-200 group-hover:-translate-y-1 h-full",
      isLive
        ? `border-${accentClass}/40 hover:border-${accentClass}`
        : "border-border/40 opacity-80"
    )}>
      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
          `bg-${accentClass}/20`
        )}>
          <Icon className={cn("w-7 h-7", `text-${accentClass}`)} />
        </div>
        <div>
          <div className="font-display text-lg font-bold text-foreground">{label}</div>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
        <Button size="sm" className={cn(
          "w-full justify-between mt-auto",
          isLive ? `neon-button-cyan` : "variant-outline"
        )}>
          {isLive ? liveCta : infoCta}
          <ArrowRight className="w-4 h-4" />
        </Button>
        {!isLive && (
          <p className="text-xs text-muted-foreground">Non attivo al momento</p>
        )}
      </CardContent>
    </Card>
  </Link>
);

const AppLauncher: React.FC = () => {
  const { eventState, liveEvent, isFreeMode, freeMode, isOpenmicVisible, isDedicheVisible, loading } = useLiveEvent();
  const { isActive: isGiochiVisible } = useFormatActiveCheck('giochi', 'app');
  const { isActive: isFuroreVisible } = useFormatActiveCheck('furore', 'app');
  const { isActive: isOpenmicAppVisible } = useFormatActiveCheck('openmic', 'app');
  const { isActive: isDedicheAppVisible } = useFormatActiveCheck('dediche', 'app');
  const { isActive: isOpenmicFormatActive } = useFormatActiveCheck('openmic', 'format_active');
  const { isActive: isDedicheFormatActive } = useFormatActiveCheck('dediche', 'format_active');
  const { isActive: isFuroreFormatActive } = useFormatActiveCheck('furore', 'format_active');
  const { isActive: isGiochiFormatActive } = useFormatActiveCheck('giochi', 'format_active');

  // Build list of visible format cards
  const formatCards: FormatCardProps[] = [];

  if (isOpenmicAppVisible) {
    const isLive = isOpenmicFormatActive && isOpenmicVisible;
    formatCards.push({
      to: isLive ? "/app/openmic" : "/openmic",
      icon: Mic2,
      label: "Open Mic",
      description: isLive ? "Prenota la canzone e sali sul palco." : "Scopri come funziona l'Open Mic.",
      isLive,
      accentClass: "secondary",
      liveCta: "Prenota",
      infoCta: "Scopri",
    });
  }

  if (isDedicheAppVisible) {
    const isLive = isDedicheFormatActive && isDedicheVisible;
    formatCards.push({
      to: isLive ? "/app/dediche" : "/messaggi",
      icon: MessageCircle,
      label: "Dediche",
      description: isLive ? "Scrivi una dedica e mandala allo staff." : "Scopri come funzionano le dediche.",
      isLive,
      accentClass: "primary",
      liveCta: "Scrivi",
      infoCta: "Scopri",
    });
  }

  if (isFuroreVisible) {
    formatCards.push({
      to: isFuroreFormatActive ? "/app/furore" : "/furore",
      icon: Zap,
      label: "Non C'è Furore",
      description: isFuroreFormatActive ? "Gioco dal vivo a buzzer — Pulsantiera" : "Scopri il gioco a buzzer dal vivo!",
      isLive: isFuroreFormatActive,
      accentClass: "destructive",
      liveCta: "Gioca",
      infoCta: "Scopri",
    });
  }

  if (isGiochiVisible) {
    formatCards.push({
      to: isGiochiFormatActive ? "/app/giochi" : "/giochi",
      icon: Gamepad2,
      label: "Giochi",
      description: isGiochiFormatActive ? "Quiz musicale e altri giochi passatempo" : "Scopri i giochi interattivi!",
      isLive: isGiochiFormatActive,
      accentClass: "primary",
      liveCta: "Gioca",
      infoCta: "Scopri",
    });
  }

  const hasAnyAppFormat = formatCards.length > 0;
  const isEverythingOff = !loading && !hasAnyAppFormat;

  // Responsive grid classes based on count
  const gridClasses = cn(
    "grid gap-4",
    formatCards.length === 1 && "grid-cols-1 max-w-xs mx-auto",
    formatCards.length === 2 && "grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto",
    formatCards.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto",
    formatCards.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto",
  );

  return (
    <>
      <SiteHeader />
      <SEO
        title="App | Non C'è Duo"
        description="Apri l'app e scegli il format della serata: Open Mic o Dediche."
      />

      <main className="container py-10">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isEverythingOff ? (
            // ========== EMPTY STATE ==========
            <div className="text-center space-y-8 max-w-xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl -z-10" />
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl animate-pulse" />
                  <div className="absolute inset-2 bg-background rounded-2xl flex items-center justify-center">
                    <Music className="w-10 h-10 text-primary" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-secondary animate-pulse" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">Prossimamente</h1>
                <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  <span className="text-foreground/80">Seguici per non perdere le prossime serate!</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <Card className="glass-card border-secondary/20 group hover:border-secondary/40 transition-all">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Mic2 className="w-6 h-6 text-secondary" />
                    </div>
                    <h3 className="font-display font-bold text-foreground mb-1">Open Mic</h3>
                    <p className="text-xs text-muted-foreground">Sali sul palco e canta con noi</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-primary/20 group hover:border-primary/40 transition-all">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-foreground mb-1">Dediche</h3>
                    <p className="text-xs text-muted-foreground">Invia un messaggio speciale</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 pt-4">
                <a href="https://www.instagram.com/nonceduo.music/" target="_blank" rel="noopener noreferrer" className="block">
                  <Button size="lg" className="w-full gap-3 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white border-0 shadow-lg">
                    <Instagram className="w-5 h-5" />
                    Seguici su Instagram
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Link to="/"><Button variant="outline" size="lg" className="w-full">Torna al sito</Button></Link>
              </div>

              <div className="pt-6">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="w-8 h-px bg-border" />
                  <span>Non C'è Duo Music</span>
                  <span className="w-8 h-px bg-border" />
                </div>
              </div>
            </div>
          ) : (
            // ========== NORMAL STATE ==========
            <>
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                  App Non C&apos;è Duo
                </h1>
                <p className="text-muted-foreground mt-2">
                  Scegli il format e entra subito nel live.
                </p>
              </div>

              {/* Status Banners */}
              {eventState.type === 'live' && liveEvent && (
                <div className={cn(
                  "relative overflow-hidden rounded-xl p-4 mb-6",
                  "bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/10",
                  "border border-primary/30",
                )}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Radio className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-lg font-bold text-foreground">{liveEvent.event_name}</h2>
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          <span className="relative flex h-2 w-2 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
                          </span>
                          LIVE
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Evento in corso — Entra e partecipa!</p>
                    </div>
                  </div>
                </div>
              )}

              {eventState.type === 'freemode' && (
                <div className={cn(
                  "relative overflow-hidden rounded-xl p-4 mb-6",
                  "bg-gradient-to-br from-accent/20 via-accent/10 to-secondary/10",
                  "border border-accent/30",
                )}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-lg font-bold text-foreground">Evento Live</h2>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {freeMode.openmic && freeMode.dediche
                          ? "Open Mic e Dediche senza limiti!"
                          : freeMode.openmic
                            ? "Open Mic disponibile senza limiti!"
                            : "Dediche disponibili senza limiti!"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {eventState.type === 'upcoming' && (
                <div className={cn(
                  "relative overflow-hidden rounded-xl p-4 mb-6",
                  "bg-gradient-to-br from-muted via-muted/50 to-transparent",
                  "border border-border",
                )}>
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Prossimi Eventi</h2>
                      <p className="text-sm text-muted-foreground">Ci sono eventi in programma. Resta sintonizzato!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Unified Format Cards Grid */}
              <div className={gridClasses}>
                {formatCards.map((card) => (
                  <FormatCard key={card.label} {...card} />
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://www.instagram.com/nonceduo.music/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full sm:w-auto gap-2">
                    <Instagram className="w-4 h-4" />
                    Seguici
                  </Button>
                </a>
                <Link to="/">
                  <Button variant="ghost" className="w-full sm:w-auto">Torna al sito</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default AppLauncher;

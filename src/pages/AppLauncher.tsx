import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mic2, MessageCircle, Loader2, Zap, Radio, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { cn } from "@/lib/utils";

const AppLauncher: React.FC = () => {
  const { eventState, liveEvent, isFreeMode, freeMode, isOpenmicVisible, isDedicheVisible, loading } = useLiveEvent();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="App | Non C'è Duo"
        description="Apri l'app e scegli il format della serata: Open Mic o Dediche."
      />

      <SiteHeader />

      <main className="container py-10">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
              App Non C&apos;è Duo
            </h1>
            <p className="text-muted-foreground mt-2">
              Scegli il format e entra subito nel live.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Status Banner */}
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
                        <h2 className="font-display text-lg font-bold text-foreground">
                          {liveEvent.event_name}
                        </h2>
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          <span className="relative flex h-2 w-2 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
                          </span>
                          LIVE
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Evento in corso — Entra e partecipa!
                      </p>
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
                        <h2 className="font-display text-lg font-bold text-foreground">
                          Serata Aperta
                        </h2>
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
                            : "Dediche disponibili senza limiti!"
                        }
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
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Prossimi Eventi
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Ci sono eventi in programma. Resta sintonizzato!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {eventState.type === 'none' && (
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
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Prossimamente
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Stiamo preparando nuovi eventi. Seguici per le novità!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Open Mic */}
                <Link 
                  to={isOpenmicVisible ? "/app/openmic" : "/openmic"} 
                  className="group"
                >
                  <Card className={cn(
                    "glass-card transition-all duration-200 group-hover:-translate-y-1",
                    isOpenmicVisible 
                      ? "border-secondary/40 hover:border-secondary" 
                      : "border-border/40 opacity-75"
                  )}>
                    <CardContent className="p-6">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4">
                        <Mic2 className="w-7 h-7 text-secondary" />
                      </div>
                      <div className="font-display text-xl font-bold text-foreground">
                        Open Mic
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isOpenmicVisible 
                          ? "Prenota la canzone e sali sul palco."
                          : "Scopri come funziona l'Open Mic."
                        }
                      </p>
                      <div className="mt-4">
                        <Button className={cn(
                          "w-full justify-between",
                          isOpenmicVisible ? "neon-button-cyan" : "variant-outline"
                        )}>
                          {isOpenmicVisible ? "Entra" : "Scopri"}
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                      {!isOpenmicVisible && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Non attivo al momento
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>

                {/* Dediche */}
                <Link 
                  to={isDedicheVisible ? "/app/dediche" : "/messaggi"} 
                  className="group"
                >
                  <Card className={cn(
                    "glass-card transition-all duration-200 group-hover:-translate-y-1",
                    isDedicheVisible 
                      ? "border-primary/40 hover:border-primary" 
                      : "border-border/40 opacity-75"
                  )}>
                    <CardContent className="p-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                        <MessageCircle className="w-7 h-7 text-primary" />
                      </div>
                      <div className="font-display text-xl font-bold text-foreground">
                        Serata Dediche
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isDedicheVisible 
                          ? "Scrivi una dedica e mandala allo staff."
                          : "Scopri come funzionano le dediche."
                        }
                      </p>
                      <div className="mt-4">
                        <Button className={cn(
                          "w-full justify-between",
                          isDedicheVisible ? "neon-button-pink" : "variant-outline"
                        )}>
                          {isDedicheVisible ? "Scrivi" : "Scopri"}
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                      {!isDedicheVisible && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Non attivo al momento
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </>
          )}

          <div className="mt-8 text-center">
            <Link to="/">
              <Button variant="outline">Torna al sito</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLauncher;

import React from "react";
import { Link, Navigate } from "react-router-dom";
import { ExternalLink, Mic2, Phone, Instagram, Calendar, Clock, Music, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/layout/PageLayout";
import { useLiveEvent } from "@/hooks/useLiveEvent";

const OpenMicInfo: React.FC = () => {
  const { isOpenmicVisible, loading, liveEvent, isFreeMode } = useLiveEvent();

  const isActuallyLive = isOpenmicVisible && (Boolean(liveEvent) || isFreeMode);

  // When Open Mic is live, redirect to the app experience directly
  if (!loading && isActuallyLive) {
    return <Navigate to="/app/openmic" replace />;
  }

  return (
    <PageLayout variant="main" title="Open Mic" showBack showAdmin>
      <SEO
        title="Open Mic | Non C'è Duo"
        description="Karaoke live con la band: scegli la canzone e sali sul palco durante i nostri eventi."
        image="/og-openmic.jpg"
        url="/openmic"
      />

      <main className="container py-4 md:py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center">
              <Mic2 className="w-8 h-8 md:w-10 md:h-10 text-secondary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                Open Mic
              </h1>
              <p className="text-muted-foreground text-lg">Il karaoke live dove TU sei la star.</p>
            </div>
          </div>

          {/* Status Badge */}
          {!loading && (
            <div className="flex justify-center">
              {isActuallyLive ? (
                <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-base px-4 py-2 gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Evento Live in corso!
                </Badge>
              ) : (
                <Badge variant="outline" className="text-base px-4 py-2 gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Prossimamente – Seguici per le date!
                </Badge>
              )}
            </div>
          )}

          {/* Main Info Card */}
          <Card className="glass-card border-secondary/20">
            <CardContent className="p-6 md:p-8 space-y-6">
              <p className="text-foreground/90 leading-relaxed text-lg">
                Durante le serate Open Mic puoi prenotare una canzone dal nostro catalogo 
                e cantare dal vivo con la band. Scegli il tuo brano, scrivi il tuo nome, 
                e quando è il tuo turno... il palco è tuo!
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Catalogo brani</p>
                    <p className="text-sm text-muted-foreground">Centinaia di canzoni tra cui scegliere</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold">Band dal vivo</p>
                    <p className="text-sm text-muted-foreground">Niente karaoke registrato!</p>
                  </div>
                </div>
              </div>

              {/* Mockup preview */}
              <div className="mt-6 p-4 rounded-xl bg-card/50 border border-border">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  👆 Durante la serata vedrai qualcosa così:
                </p>
                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <Mic2 className="w-4 h-4 text-secondary" />
                    </div>
                    <span className="font-medium">Cerca la tua canzone...</span>
                  </div>
                  <div className="h-10 rounded-lg bg-muted/30 animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted/20 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA & Contact */}
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Prossime date e info
              </h3>
              <p className="text-muted-foreground">
                Seguici su Instagram per scoprire le prossime serate Open Mic, 
                oppure contattaci per sapere dove suoniamo!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/app/openmic" className="flex-1 block touch-manipulation">
                  <Button className="w-full neon-button-cyan gap-2 cursor-pointer" size="lg">
                    Apri App
                    <ExternalLink className="w-4 h-4 pointer-events-none" />
                  </Button>
                </Link>
                <a
                  href="https://www.instagram.com/nonceduo.music/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <Instagram className="w-5 h-5" />
                    Instagram
                  </Button>
                </a>
                <a
                  href="https://wa.me/393807911941"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <Phone className="w-5 h-5" />
                    WhatsApp
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Back to home */}
          <div className="text-center pt-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Torna al sito Non C'è Duo
            </Link>
          </div>
        </div>
      </main>
    </PageLayout>
  );
};

export default OpenMicInfo;

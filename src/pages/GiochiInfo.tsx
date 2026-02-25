import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Gamepad2, Phone, Instagram, Calendar, Clock, Brain, PartyPopper, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

const GiochiInfo: React.FC = () => {
  const navigate = useNavigate();
  const { isActive: isGiochiActive, loading } = useFormatActiveCheck('giochi');

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Giochi Passatempo | Non C'è Duo"
        description="Quiz, sfide e giochi interattivi dal vivo durante le serate Non C'è Duo. Divertiti con il pubblico!"
        url="/giochi"
      />

      <SiteHeader />

      {/* Navigation bar */}
      <div className="container py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </Button>
        <Link to="/app/giochi">
          <Button size="sm" className="neon-button-cyan gap-1.5">
            Vai all'App
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <main className="container py-4 md:py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                Giochi Passatempo
              </h1>
              <p className="text-muted-foreground text-lg">Quiz e sfide dal vivo!</p>
            </div>
          </div>

          {/* Status Badge */}
          {!loading && (
            <div className="flex justify-center">
              {isGiochiActive ? (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-base px-4 py-2 gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Giochi disponibili!
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
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6 md:p-8 space-y-6">
              <p className="text-foreground/90 leading-relaxed text-lg">
                I Giochi Passatempo sono momenti di puro divertimento durante le nostre serate! 
                Quiz musicali, sfide a tempo e giochi interattivi pensati per coinvolgere 
                tutto il pubblico. Gioca dal tuo telefono e sfida gli altri!
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Quiz interattivi</p>
                    <p className="text-sm text-muted-foreground">Domande musicali e non solo</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <PartyPopper className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Gioca dal telefono</p>
                    <p className="text-sm text-muted-foreground">Nessun download, solo il browser</p>
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
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">Scegli un gioco...</span>
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
                Seguici su Instagram per scoprire le prossime serate con i Giochi, 
                oppure contattaci per sapere dove suoniamo!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/app/giochi" className="flex-1">
                  <Button className="w-full neon-button-cyan gap-2" size="lg">
                    Apri App
                    <ExternalLink className="w-4 h-4" />
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
    </div>
  );
};

export default GiochiInfo;

import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Zap, Phone, Instagram, Calendar, Clock, Trophy, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

const FuroreInfo: React.FC = () => {
  const { isActive: isFuroreActive, loading } = useFormatActiveCheck('furore');

  return (
    <PageLayout variant="main" title="Non C'è Furore" showBack showAdmin>
      <SEO
        title="Non C'è Furore | Non C'è Duo"
        description="Il gioco dal vivo a buzzer: premi il pulsante più veloce di tutti e scala la classifica durante i nostri eventi!"
        url="/furore"
      />

      <main className="container py-4 md:py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center">
              <Zap className="w-8 h-8 md:w-10 md:h-10 text-destructive" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                Non C'è Furore
              </h1>
              <p className="text-muted-foreground text-lg">Il quiz-buzzer dal vivo più veloce!</p>
            </div>
          </div>

          {/* Status Badge */}
          {!loading && (
            <div className="flex justify-center">
              {isFuroreActive ? (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-base px-4 py-2 gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Sessione attiva!
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
          <Card className="glass-card border-destructive/20">
            <CardContent className="p-6 md:p-8 space-y-6">
              <p className="text-foreground/90 leading-relaxed text-lg">
                Non C'è Furore è il nostro gioco a buzzer dal vivo! Quando lo staff 
                apre la sessione, premi il pulsante il più velocemente possibile per 
                prenotarti e salire sul palco. Chi è più rapido scala la classifica!
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Timer className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold">Velocità pura</p>
                    <p className="text-sm text-muted-foreground">Premi il buzzer prima di tutti!</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Classifica live</p>
                    <p className="text-sm text-muted-foreground">Punteggio cumulativo e podio finale</p>
                  </div>
                </div>
              </div>

              {/* Mockup preview */}
              <div className="mt-6 p-4 rounded-xl bg-card/50 border border-border">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  👆 Durante la serata vedrai qualcosa così:
                </p>
                <div className="bg-background/50 rounded-lg p-4 space-y-3 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                    <Zap className="w-10 h-10 text-destructive" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Premi il buzzer!</span>
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
                Seguici su Instagram per scoprire le prossime serate con Non C'è Furore, 
                oppure contattaci per sapere dove suoniamo!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/app/furore" className="flex-1">
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
    </PageLayout>
  );
};

export default FuroreInfo;

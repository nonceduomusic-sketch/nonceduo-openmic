import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle, Phone, Instagram, Calendar, Clock, Heart, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useFormatGating } from "@/hooks/useFormatGating";

const DedicheInfo: React.FC = () => {
  const { isLiveSessionActive, loading } = useFormatGating('dediche');

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Dediche | Non C'è Duo"
        description="Invia una dedica musicale durante i nostri eventi: un messaggio speciale, letto dallo staff in serata."
        image="/og-dediche.jpg"
        url="/messaggi"
      />

      <SiteHeader />

      <main className="container py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                Dediche
              </h1>
              <p className="text-muted-foreground text-lg">Il tuo messaggio, la tua canzone.</p>
            </div>
          </div>

          {/* Status Badge */}
          {!loading && (
            <div className="flex justify-center">
              {isLiveSessionActive ? (
                <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-base px-4 py-2 gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Serata in corso!
                </Badge>
              ) : (
                <Badge variant="outline" className="text-base px-4 py-2 gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Disponibile durante le serate
                </Badge>
              )}
            </div>
          )}

          {/* Main Info Card */}
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6 md:p-8 space-y-6">
              <p className="text-foreground/90 leading-relaxed text-lg">
                La Serata Dediche è il momento perfetto per dedicare una canzone 
                a qualcuno di speciale. Scrivi il tuo messaggio e noi lo leggeremo 
                durante l'evento, con la canzone che hai scelto!
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Messaggio speciale</p>
                    <p className="text-sm text-muted-foreground">Dediche, auguri, dichiarazioni</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold">Lettura dal vivo</p>
                    <p className="text-sm text-muted-foreground">Il tuo messaggio letto dal palco</p>
                  </div>
                </div>
              </div>

              {/* Mockup preview */}
              <div className="mt-6 p-4 rounded-xl bg-card/50 border border-border">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  👆 Durante la serata vedrai qualcosa così:
                </p>
                <div className="bg-background/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">Scrivi la tua dedica...</span>
                  </div>
                  <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted/20 animate-pulse w-1/3 ml-auto" />
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
                Seguici su Instagram per scoprire le prossime serate Dediche, 
                oppure contattaci per sapere dove suoniamo!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/app/dediche" className="flex-1">
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

export default DedicheInfo;

import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle, Phone, Instagram } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";

const DedicheInfo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Dediche | Non C'è Duo"
        description="Invia una dedica musicale durante i nostri eventi: un messaggio speciale, letto dallo staff in serata."
        image="/og-dediche.jpg"
        url="/messaggi"
      />

      <SiteHeader />

      <main className="container py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                Dediche
              </h1>
              <p className="text-muted-foreground">Scrivi un messaggio e mandalo allo staff durante la serata.</p>
            </div>
          </div>

          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                La Serata Dediche è il momento perfetto per dedicare una canzone, fare un augurio o mandare un messaggio
                che leggeremo durante l&apos;evento.
              </p>
              <p className="text-sm text-muted-foreground">
                Se entrando nell&apos;app vedi la pagina “Attiva durante le serate”, significa che in questo momento il
                format non è attivo.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/app/dediche" className="w-full sm:w-auto">
                  <Button className="w-full neon-button-cyan">
                    Apri App (Live)
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a
                  href="https://wa.me/393807911941"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </a>
                <a
                  href="https://www.instagram.com/nonceduo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="outline" className="w-full">
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DedicheInfo;

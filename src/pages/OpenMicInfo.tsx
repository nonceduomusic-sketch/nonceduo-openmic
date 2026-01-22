import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mic2, Phone, Instagram } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";

const OpenMicInfo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Open Mic | Non C'è Duo"
        description="Karaoke live con la band: scegli la canzone e sali sul palco durante i nostri eventi."
        image="/og-openmic.jpg"
        url="/openmic"
      />

      <SiteHeader />

      <main className="container py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Mic2 className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black neon-text-pink">
                Open Mic
              </h1>
              <p className="text-muted-foreground">Il karaoke live dove TU sei la star.</p>
            </div>
          </div>

          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Durante le serate Open Mic puoi prenotare una canzone e cantare dal vivo con noi.
              </p>
              <p className="text-sm text-muted-foreground">
                Se entrando nell&apos;app vedi la pagina “Attiva durante le serate”, significa che in questo momento il
                format non è attivo.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/app/openmic" className="w-full sm:w-auto">
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
                  href="https://www.instagram.com/nonceduo.music/"
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

export default OpenMicInfo;

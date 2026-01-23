import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mic2, MessageCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

const AppLauncher: React.FC = () => {
  const { isActive: isOpenmicActive, loading: openmicLoading } = useFormatActiveCheck('openmic');
  const { isActive: isDedicheActive, loading: dedicheLoading } = useFormatActiveCheck('dediche');

  const isLoading = openmicLoading || dedicheLoading;

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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Open Mic - always shown, links to info page if disabled */}
              <Link to={isOpenmicActive ? "/app/openmic" : "/openmic"} className="group">
                <Card className="glass-card border-secondary/40 hover:border-secondary transition-all duration-200 group-hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4">
                      <Mic2 className="w-7 h-7 text-secondary" />
                    </div>
                    <div className="font-display text-xl font-bold text-foreground">
                      Open Mic
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isOpenmicActive 
                        ? "Prenota la canzone e sali sul palco."
                        : "Scopri come funziona l'Open Mic."
                      }
                    </p>
                    <div className="mt-4">
                      <Button className="w-full neon-button-cyan justify-between">
                        {isOpenmicActive ? "Entra" : "Scopri"}
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    {!isOpenmicActive && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Non attivo al momento
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>

              {/* Dediche - always shown, links to info page if disabled */}
              <Link to={isDedicheActive ? "/app/dediche" : "/messaggi"} className="group">
                <Card className="glass-card border-primary/40 hover:border-primary transition-all duration-200 group-hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                      <MessageCircle className="w-7 h-7 text-primary" />
                    </div>
                    <div className="font-display text-xl font-bold text-foreground">
                      Serata Dediche
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isDedicheActive 
                        ? "Scrivi una dedica e mandala allo staff."
                        : "Scopri come funzionano le dediche."
                      }
                    </p>
                    <div className="mt-4">
                      <Button className="w-full neon-button-pink justify-between">
                        {isDedicheActive ? "Scrivi" : "Scopri"}
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    {!isDedicheActive && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Non attivo al momento
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
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

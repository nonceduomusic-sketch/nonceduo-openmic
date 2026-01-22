import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Home, ExternalLink, Phone, Instagram, Mail } from "lucide-react";

interface SectionOffLandingProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  secondaryBackTo?: string;
  secondaryBackLabel?: string;
}

export const SectionOffLanding: React.FC<SectionOffLandingProps> = ({
  title,
  description =
    "Questo format è disponibile solo durante le serate. Se lo stai vedendo ora, significa che al momento non è attivo.",
  backTo = "/",
  backLabel = "Torna al sito",
  secondaryBackTo,
  secondaryBackLabel = "Torna all'app",
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-24 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 w-80 h-80 bg-secondary/15 rounded-full blur-3xl" />
      </div>

      <Card className="glass-card max-w-lg w-full relative z-10">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-accent" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            {title}
          </h1>
            <p className="text-muted-foreground mb-6">{description}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={backTo} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  {backLabel}
                </Button>
              </Link>

              {secondaryBackTo && (
                <Link to={secondaryBackTo} className="w-full sm:w-auto">
                  <Button className="w-full neon-button-cyan">
                    {secondaryBackLabel}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="mt-6 glass-card p-4 text-left">
              <p className="text-sm text-muted-foreground mb-3">
                Vuoi info o la prossima data evento?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="https://wa.me/393807911941"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="icon" className="w-full">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
                <a
                  href="https://www.instagram.com/nonceduo/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="icon" className="w-full">
                    <Instagram className="w-4 h-4" />
                  </Button>
                </a>
                <a href="mailto:info@nonceduo.com">
                  <Button variant="outline" size="icon" className="w-full">
                    <Mail className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Home } from "lucide-react";

interface SectionOffLandingProps {
  title: string;
  description?: string;
  backTo?: string;
}

export const SectionOffLanding: React.FC<SectionOffLandingProps> = ({
  title,
  description = "Questa sezione è attiva solo durante le serate. Torna più tardi!",
  backTo = "/",
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
                Torna alla Home
              </Button>
            </Link>
            <Link to={backTo === "/openmic" ? "/messaggi" : "/openmic"} className="w-full sm:w-auto">
              <Button className="w-full neon-button-cyan">Attiva durante le serate</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

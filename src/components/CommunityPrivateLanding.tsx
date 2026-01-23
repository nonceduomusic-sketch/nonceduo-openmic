import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Home, MessageCircle, Instagram, Mail, Users } from "lucide-react";

interface CommunityPrivateLandingProps {
  variant?: 'landing' | 'auth';
}

export const CommunityPrivateLanding: React.FC<CommunityPrivateLandingProps> = ({
  variant = 'landing'
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gradient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          {/* Logo/Icon section - Instagram style */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary via-accent to-secondary p-[2px] shadow-lg shadow-primary/20">
              <div className="w-full h-full rounded-3xl bg-background flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Community Privata
            </h1>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              {variant === 'auth' 
                ? "La Community è attualmente riservata ai membri. Contattaci per richiedere l'accesso."
                : "Al momento la Community è disponibile solo su invito. Seguici per restare aggiornato!"
              }
            </p>
          </div>

          {/* Action card - Apple style */}
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Richiedi Accesso</p>
                <p className="text-xs text-muted-foreground">Contattaci per entrare</p>
              </div>
            </div>

            {/* Contact buttons */}
            <div className="space-y-3">
              <a
                href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20Community%20Non%20C'è%20Duo"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 rounded-xl font-medium shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02]"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Scrivici su WhatsApp
                </Button>
              </a>

              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/nonceduo.music/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-border/50 hover:bg-accent/10 hover:border-accent/50 transition-all"
                  >
                    <Instagram className="w-5 h-5 mr-2 text-pink-500" />
                    Instagram
                  </Button>
                </a>
                <a
                  href="mailto:nonceduo.music@gmail.com?subject=Richiesta%20accesso%20Community"
                  className="flex-1"
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-border/50 hover:bg-accent/10 hover:border-accent/50 transition-all"
                  >
                    <Mail className="w-5 h-5 mr-2 text-blue-500" />
                    Email
                  </Button>
                </a>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-card text-muted-foreground">oppure</span>
              </div>
            </div>

            {/* Back button */}
            <Link to="/">
              <Button 
                variant="ghost" 
                className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <Home className="w-4 h-4 mr-2" />
                Torna alla Home
              </Button>
            </Link>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            La Community riapre durante le serate live 🎤
          </p>
        </div>
      </div>

      {/* Brand footer */}
      <div className="relative z-10 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-display font-bold neon-text-pink">Non C'è Duo</span>
          {" "}· Musica Live
        </p>
      </div>
    </div>
  );
};

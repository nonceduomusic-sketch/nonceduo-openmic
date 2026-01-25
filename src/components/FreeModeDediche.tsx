import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, MessageCircle, Zap } from "lucide-react";
import Messages from "@/pages/Messages";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

/**
 * FreeModeDediche - Dediche senza limiti (Serata Aperta)
 * 
 * Wraps the Messages component with a Free Mode banner header.
 * No event limits applied.
 */
export const FreeModeDediche: React.FC = () => {
  return (
    <>
      <SEO 
        title="Dediche - Serata Aperta | Non Ce Duo"
        description="Invia le tue dediche liberamente!"
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Custom Header with Free Mode Banner */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Link to="/app" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm hidden sm:inline">App</span>
              </Link>
              
              <h1 className="font-display text-lg font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-secondary" />
                Dediche
              </h1>
              
              <div className="w-10" /> {/* Spacer for alignment */}
            </div>
          </div>
        </header>

        {/* Free Mode Banner */}
        <div className="container mx-auto px-4 py-4">
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/10",
            "border border-secondary/30",
          )}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-secondary/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  Serata Aperta
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Invia le tue dediche liberamente! 💌
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Component without event context (no limits) */}
        <div className="flex-1">
          <Messages appMode />
        </div>
      </div>
    </>
  );
};

export default FreeModeDediche;

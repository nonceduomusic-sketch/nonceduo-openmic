import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, MessageCircle, Zap, AlertTriangle, Timer } from "lucide-react";
import Messages from "@/pages/Messages";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { FreeModeState } from "@/hooks/useLiveEvent";
import { FreeModeClosureOverlay } from "@/components/FreeModeClosureOverlay";
import { Badge } from "@/components/ui/badge";
import { differenceInSeconds, parseISO } from "date-fns";

interface FreeModeDedicheProps {
  freeModeState: FreeModeState;
}

/**
 * FreeModeDediche - Dediche con stato Free Mode
 * 
 * Features:
 * - Limiti numerici e temporali
 * - Countdown alla scadenza
 * - Riapertura straordinaria
 * - Messaggio di chiusura configurabile
 */
export const FreeModeDediche: React.FC<FreeModeDedicheProps> = ({ freeModeState }) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  const {
    eventName,
    dedicheMaxTotal,
    dedicheCurrentCount,
    expiresAt,
    reopenActive,
    reopenUntil,
    reopenMessage,
    closureMode,
    closureTitle,
    closureMessage,
    closureRedirectUrl,
    closurePreviewEnabled,
  } = freeModeState;

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate if booking is closed
  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= now;
  }, [expiresAt, now]);

  const isLimitReached = useMemo(() => {
    if (!dedicheMaxTotal) return false;
    return dedicheCurrentCount >= dedicheMaxTotal;
  }, [dedicheMaxTotal, dedicheCurrentCount]);

  // Check if reopening is active and valid
  const isReopenValid = useMemo(() => {
    if (!reopenActive || !reopenUntil) return false;
    return new Date(reopenUntil) > now;
  }, [reopenActive, reopenUntil, now]);

  // Is booking closed? (also respects admin preview mode)
  const isClosed = closurePreviewEnabled || ((isExpired || isLimitReached) && !isReopenValid);

  // Handle redirect mode
  useEffect(() => {
    if (isClosed && closureMode === 'redirect') {
      if (closureRedirectUrl) {
        window.location.href = closureRedirectUrl;
      } else {
        navigate('/messaggi');
      }
    }
  }, [isClosed, closureMode, closureRedirectUrl, navigate]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    if (!expiresAt || isExpired) return null;
    const seconds = differenceInSeconds(parseISO(expiresAt), now);
    if (seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { minutes, seconds: secs, total: seconds };
  }, [expiresAt, now, isExpired]);

  // Calculate reopen remaining time
  const reopenRemaining = useMemo(() => {
    if (!reopenUntil || !isReopenValid) return null;
    const seconds = differenceInSeconds(parseISO(reopenUntil), now);
    if (seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { minutes, seconds: secs };
  }, [reopenUntil, now, isReopenValid]);

  const remaining = dedicheMaxTotal ? dedicheMaxTotal - dedicheCurrentCount : null;

  return (
    <>
      <SEO 
        title={`Dediche - ${eventName || 'Evento Live'} | Non Ce Duo`}
        description="Invia le tue dediche per l'evento!"
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
          {/* Closure Overlay - blocks all content when closed */}
          {isClosed ? (
            <FreeModeClosureOverlay
              closureTitle={closureTitle || 'Dediche chiuse'}
              closureMessage={closureMessage || (isLimitReached 
                ? 'Abbiamo raggiunto il numero massimo di dediche per questa serata. Grazie per la comprensione!' 
                : 'Il tempo per inviare dediche è scaduto. Grazie per aver partecipato!')}
            />
          ) : (
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/10",
              "border border-secondary/30",
              isReopenValid && "ring-2 ring-accent/50"
            )}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-secondary/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    {eventName || 'Evento Live'}
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                    </span>
                  </h2>
                  
                  {/* Status info */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {remaining !== null && (
                      <Badge variant={remaining <= 3 ? "destructive" : "secondary"} className="text-xs">
                        {remaining} dediche rimaste
                      </Badge>
                    )}
                    {remainingTime && (
                      <Badge variant={remainingTime.total <= 300 ? "destructive" : "outline"} className="text-xs flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {remainingTime.minutes}m {remainingTime.seconds}s
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Reopen banner - VERY VISIBLE */}
              {isReopenValid && (
                <div className="mt-3 pt-3 border-t-2 border-secondary/50 animate-pulse">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-secondary/40">
                    <div className="p-2 rounded-full bg-secondary/30">
                      <AlertTriangle className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-secondary">
                        🎉 {reopenMessage || 'Riapertura straordinaria!'}
                      </p>
                      <p className="text-xs text-secondary/80">
                        Affrettati! Dediche extra disponibili per poco tempo
                      </p>
                    </div>
                    {reopenRemaining && (
                      <Badge variant="secondary" className="text-sm font-bold animate-bounce">
                        ⏱️ {reopenRemaining.minutes}:{reopenRemaining.seconds.toString().padStart(2, '0')}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages Component - only show if not closed */}
        {!isClosed && (
          <div className="flex-1">
            <Messages appMode />
          </div>
        )}
      </div>
    </>
  );
};

export default FreeModeDediche;

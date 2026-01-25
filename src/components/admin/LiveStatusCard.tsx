import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Radio, 
  Clock, 
  AlertCircle,
  Instagram,
} from 'lucide-react';
import { useUnifiedLiveSession } from '@/hooks/useUnifiedLiveSession';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface LiveStatusCardProps {
  title?: string;
}

export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({ 
  title = 'Stato Evento'
}) => {
  const { 
    session, 
    loading, 
    isOwner,
    isActive,
    startSession, 
    stopSession, 
  } = useUnifiedLiveSession();

  const [expiresInHours, setExpiresInHours] = useState<number>(4);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        // Start session WITHOUT PIN protection (empty formats array)
        await startSession([], expiresInHours > 0 ? expiresInHours : undefined);
      } else {
        await stopSession();
      }
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  return (
    <Card className={cn(
      "glass-card transition-all duration-300",
      isActive ? "border-primary/50 bg-primary/5" : "border-border/50"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-2">
            <Radio className={cn(
              "w-5 h-5 md:w-4 md:h-4 transition-colors",
              isActive ? "text-primary animate-pulse" : "text-muted-foreground"
            )} />
            <span className="font-semibold text-base md:text-sm">
              {title}
            </span>
            {isActive && (
              <Badge className="bg-primary/20 text-primary text-xs animate-in fade-in-0">
                LIVE
              </Badge>
            )}
          </div>
          
          {isOwner && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={handleToggle}
                      disabled={isToggling}
                      className={cn(
                        "scale-125 md:scale-100",
                        "data-[state=checked]:bg-primary"
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="hidden md:block">
                  <p>{isActive ? 'Termina evento' : 'Inizia evento'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Quando attivo, il badge "LIVE" appare nell'app. Indipendente dal PIN.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-2">
        {!isOwner && !isActive && (
          <p className="text-base md:text-sm text-muted-foreground">
            Solo l'owner può gestire lo stato dell'evento
          </p>
        )}

        {/* When NOT active - show config options */}
        {!isActive && isOwner && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="expires" className="text-xs text-muted-foreground whitespace-nowrap">
                Durata (ore):
              </Label>
              <Input
                id="expires"
                type="number"
                min={0}
                max={12}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-sm"
                placeholder="0 = mai"
              />
              <span className="text-xs text-muted-foreground">
                (0 = nessuna scadenza)
              </span>
            </div>
          </div>
        )}

        {/* When active - show session info */}
        {isActive && session && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            {/* Session Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  Attivo da {formatDistanceToNow(new Date(session.created_at), { locale: it })}
                </span>
              </div>
              {session.expires_at && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>
                    Scade {formatDistanceToNow(new Date(session.expires_at), { 
                      addSuffix: true, 
                      locale: it 
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* When NOT active - show Instagram CTA */}
        {!isActive && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
            <div className="flex items-center gap-2 text-sm">
              <Instagram className="w-4 h-4 text-pink-400" />
              <span className="text-muted-foreground">
                 Seguici su <span className="font-semibold text-pink-400">@nonceduo.music</span> per i prossimi eventi!
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

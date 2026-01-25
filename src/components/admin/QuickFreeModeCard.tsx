import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Music, MessageSquare, Power, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalFormatSettings } from '@/hooks/useGlobalFormatSettings';
import { useLiveEvent } from '@/hooks/useLiveEvent';

/**
 * QuickFreeModeCard - Pannello rapido per attivare/disattivare l'Evento Live (Free Mode)
 * 
 * Permette all'admin di:
 * - Attivare Open Mic + Dediche insieme (Evento Live completo)
 * - Attivare solo Open Mic
 * - Attivare solo Dediche
 * - Disattivare tutto
 */
export const QuickFreeModeCard: React.FC = () => {
  const { settings, toggleFormat, loading } = useGlobalFormatSettings();
  const { liveEvent } = useLiveEvent();

  const hasLiveEvent = Boolean(liveEvent);
  const bothActive = settings.openmic && settings.dediche;
  const anyActive = settings.openmic || settings.dediche;

  const handleActivateBoth = async () => {
    if (!settings.openmic) await toggleFormat('openmic');
    if (!settings.dediche) await toggleFormat('dediche');
  };

  const handleDeactivateAll = async () => {
    if (settings.openmic) await toggleFormat('openmic');
    if (settings.dediche) await toggleFormat('dediche');
  };

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  // If there's a live event, show a different state
  if (hasLiveEvent) {
    return (
      <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-medium">
              <Radio className="w-5 h-5 text-primary animate-pulse" />
              <span>Evento Live</span>
            </div>
            <Badge className="bg-primary text-primary-foreground">
              {liveEvent?.event_name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            I formati sono controllati dalle regole dell'evento. Usa il pannello Evento per modificare le impostazioni.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "glass-card overflow-hidden transition-all",
      anyActive 
        ? "border-accent/30 bg-gradient-to-br from-accent/5 to-transparent" 
        : "border-border/50"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-medium">
            <Zap className={cn(
              "w-5 h-5 transition-colors",
              anyActive ? "text-accent" : "text-muted-foreground"
            )} />
            <span>Evento Live</span>
          </div>
          {anyActive && (
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
              Attiva
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Attiva rapidamente i formati senza limiti di tempo o prenotazioni.
        </p>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={bothActive ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-12 flex flex-col items-center justify-center gap-1",
              bothActive && "bg-accent hover:bg-accent/90"
            )}
            onClick={handleActivateBoth}
          >
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              <span>+</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-xs">Entrambi</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-12 flex flex-col items-center justify-center gap-1"
            onClick={handleDeactivateAll}
            disabled={!anyActive}
          >
            <Power className="w-4 h-4" />
            <span className="text-xs">Disattiva</span>
          </Button>
        </div>

        {/* Individual Toggles */}
        <div className="flex gap-2">
          <Button
            variant={settings.openmic && !settings.dediche ? "default" : "outline"}
            size="sm"
            className={cn(
              "flex-1 h-10",
              settings.openmic && !settings.dediche && "bg-primary hover:bg-primary/90"
            )}
            onClick={() => toggleFormat('openmic')}
          >
            <Music className="w-4 h-4 mr-1.5" />
            Open Mic
            {settings.openmic && <span className="ml-1.5 text-xs opacity-70">✓</span>}
          </Button>

          <Button
            variant={settings.dediche && !settings.openmic ? "default" : "outline"}
            size="sm"
            className={cn(
              "flex-1 h-10",
              settings.dediche && !settings.openmic && "bg-secondary hover:bg-secondary/90"
            )}
            onClick={() => toggleFormat('dediche')}
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Dediche
            {settings.dediche && <span className="ml-1.5 text-xs opacity-70">✓</span>}
          </Button>
        </div>

        {/* Status Message */}
        {anyActive && (
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-center">
            <p className="text-xs text-accent">
              <Zap className="w-3 h-3 inline mr-1" />
              Evento Live attivo! {bothActive ? 'Entrambi i formati' : settings.openmic ? 'Open Mic' : 'Dediche'} senza limiti
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

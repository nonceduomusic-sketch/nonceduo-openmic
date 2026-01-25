import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Power, Music, MessageSquare, Users, AlertCircle, Zap, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalFormatSettings, GlobalFormatKey } from '@/hooks/useGlobalFormatSettings';
import { useLiveEvent } from '@/hooks/useLiveEvent';

interface ActiveFormatsCardProps {
  disabled?: boolean;
}

export const ActiveFormatsCard: React.FC<ActiveFormatsCardProps> = ({ disabled = false }) => {
  const { settings, loading, toggleFormat } = useGlobalFormatSettings();
  const { liveEvent } = useLiveEvent();

  // Check if there's a live event - in that case, formats are controlled by event
  const hasLiveEvent = Boolean(liveEvent);

  const formats = [
    {
      key: 'openmic' as GlobalFormatKey,
      label: 'Open Mic',
      icon: <Music className="w-5 h-5 md:w-4 md:h-4" />,
      description: hasLiveEvent ? 'Controllato da evento' : 'Attiva Serata Aperta',
      color: 'text-primary',
      bgActive: 'bg-primary/10 border-primary/30',
    },
    {
      key: 'dediche' as GlobalFormatKey,
      label: 'Dediche',
      icon: <MessageSquare className="w-5 h-5 md:w-4 md:h-4" />,
      description: hasLiveEvent ? 'Controllato da evento' : 'Attiva Serata Aperta',
      color: 'text-secondary',
      bgActive: 'bg-secondary/10 border-secondary/30',
    },
    {
      key: 'community' as GlobalFormatKey,
      label: 'Community',
      icon: <Users className="w-5 h-5 md:w-4 md:h-4" />,
      description: 'Gruppi e social (sempre indipendente)',
      color: 'text-accent',
      bgActive: 'bg-accent/10 border-accent/30',
    },
  ];

  const activeCount = Object.values(settings).filter(Boolean).length;
  const freeModeActive = !hasLiveEvent && (settings.openmic || settings.dediche);

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }

  return (
    <Card className={cn(
      "glass-card border-border/50 overflow-hidden transition-opacity",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base md:text-sm font-medium text-muted-foreground">
            <Power className="w-5 h-5 md:w-4 md:h-4" />
            <span>Formati Pubblici</span>
          </div>
          <div className="flex items-center gap-2">
            {hasLiveEvent && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Evento Live
              </Badge>
            )}
            {freeModeActive && (
              <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">
                <Zap className="w-3 h-3 mr-1" />
                Evento Live
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-2 md:px-4">
        {hasLiveEvent ? (
          <p className="text-sm md:text-xs text-muted-foreground mb-3">
            ⚡ <strong>{liveEvent?.event_name}</strong> è in corso — I formati sono controllati dalle regole dell'evento
          </p>
        ) : (
          <p className="text-sm md:text-xs text-muted-foreground mb-3">
            Attiva un formato per abilitare l'<strong>Evento Live</strong> (senza limiti)
          </p>
        )}
        
        <div className="space-y-2">
          {formats.map((format) => {
            const isActive = settings[format.key];
            // For openmic/dediche, if there's a live event, show the event-controlled state
            const isEventControlled = hasLiveEvent && format.key !== 'community';
            
            return (
              <div
                key={format.key}
                className={cn(
                  "flex items-center justify-between p-4 md:p-3 rounded-xl transition-all duration-300",
                  "min-h-[60px] md:min-h-[52px] touch-target",
                  "border",
                  isEventControlled 
                    ? "bg-muted/20 border-border/50 opacity-60" 
                    : isActive 
                      ? format.bgActive 
                      : "bg-muted/30 border-transparent cursor-pointer hover:bg-muted/50 active:scale-[0.98]"
                )}
                onClick={() => !disabled && !isEventControlled && toggleFormat(format.key)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center transition-all",
                    isActive ? `${format.color} bg-current/10` : "text-muted-foreground bg-muted"
                  )}>
                    {format.icon}
                  </div>
                  <div>
                    <span className={cn(
                      "font-semibold text-base md:text-sm transition-colors",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {format.label}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isActive && !isEventControlled && (
                    <AlertCircle className="w-4 h-4 text-muted-foreground md:hidden" />
                  )}
                  {isEventControlled && (
                    <Badge variant="outline" className="text-xs">
                      Evento
                    </Badge>
                  )}
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => !disabled && !isEventControlled && toggleFormat(format.key)}
                    disabled={disabled || isEventControlled}
                    className={cn(
                      "scale-125 md:scale-100",
                      "data-[state=checked]:bg-primary"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {activeCount === 0 && !hasLiveEvent && (
          <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-sm text-muted-foreground">
              Tutti i formati sono disattivati. Gli utenti vedranno una pagina informativa.
            </p>
          </div>
        )}

        {freeModeActive && (
          <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-center gap-2 text-accent mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-medium text-sm">Evento Live attivo!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gli utenti possono usare {settings.openmic && settings.dediche ? 'Open Mic e Dediche' : settings.openmic ? 'Open Mic' : 'Dediche'} senza limiti numerici o temporali.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

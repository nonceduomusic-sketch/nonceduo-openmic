import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Power, Music, MessageSquare, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalFormatSettings, GlobalFormatKey } from '@/hooks/useGlobalFormatSettings';

interface ActiveFormatsCardProps {
  disabled?: boolean;
}

export const ActiveFormatsCard: React.FC<ActiveFormatsCardProps> = ({ disabled = false }) => {
  const { settings, loading, toggleFormat } = useGlobalFormatSettings();

  const formats = [
    {
      key: 'openmic' as GlobalFormatKey,
      label: 'Open Mic',
      icon: <Music className="w-5 h-5 md:w-4 md:h-4" />,
      description: 'Prenotazioni canzoni karaoke',
      color: 'text-primary',
      bgActive: 'bg-primary/10 border-primary/30',
    },
    {
      key: 'dediche' as GlobalFormatKey,
      label: 'Dediche',
      icon: <MessageSquare className="w-5 h-5 md:w-4 md:h-4" />,
      description: 'Messaggi e dediche dal pubblico',
      color: 'text-secondary',
      bgActive: 'bg-secondary/10 border-secondary/30',
    },
    {
      key: 'community' as GlobalFormatKey,
      label: 'Community',
      icon: <Users className="w-5 h-5 md:w-4 md:h-4" />,
      description: 'Gruppi e social',
      color: 'text-accent',
      bgActive: 'bg-accent/10 border-accent/30',
    },
  ];

  const activeCount = Object.values(settings).filter(Boolean).length;

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
            <span>Format attivi</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {activeCount}/3 attivi
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-2 md:px-4">
        <p className="text-sm md:text-xs text-muted-foreground mb-3">
          Disattiva un format per renderlo non accessibile al pubblico
        </p>
        
        <div className="space-y-2">
          {formats.map((format) => {
            const isActive = settings[format.key];
            
            return (
              <div
                key={format.key}
                className={cn(
                  "flex items-center justify-between p-4 md:p-3 rounded-xl transition-all duration-300",
                  "min-h-[60px] md:min-h-[52px] touch-target",
                  "cursor-pointer hover:bg-muted/50 active:scale-[0.98]",
                  "border",
                  isActive ? format.bgActive : "bg-muted/30 border-transparent"
                )}
                onClick={() => !disabled && toggleFormat(format.key)}
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
                    <p className="text-xs text-muted-foreground hidden md:block">
                      {format.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <AlertCircle className="w-4 h-4 text-destructive md:hidden" />
                  )}
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => !disabled && toggleFormat(format.key)}
                    disabled={disabled}
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
        
        {activeCount === 0 && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
            <AlertCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-sm text-destructive font-medium">
              Tutti i format sono disattivati!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2, Music, MessageSquare, Users, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormatPreferences } from '@/hooks/useFormatPreferences';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FormatToggleCardProps {
  preferences: FormatPreferences;
  onToggle: (format: keyof FormatPreferences) => void;
  access?: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
    giochi: boolean;
  };
}

interface FormatToggleItemProps {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  hasAccess: boolean;
  onToggle: () => void;
  tooltip: string;
}

const FormatToggleItem: React.FC<FormatToggleItemProps> = ({
  label,
  icon,
  enabled,
  hasAccess,
  onToggle,
  tooltip,
}) => {
  if (!hasAccess) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              // Mobile-first: large touch targets, high contrast
              "flex items-center justify-between p-4 rounded-xl transition-all duration-300 ease-out cursor-pointer",
              "min-h-[56px] touch-target", // Minimum 56px height for easy tapping
              "hover:bg-muted/50 active:scale-[0.98]",
              // Desktop: slightly more compact
              "md:p-3 md:min-h-[48px]",
              enabled 
                ? "bg-primary/10 border-2 border-primary/30" 
                : "bg-muted/30 border border-transparent"
            )}
            onClick={onToggle}
          >
            <div className="flex items-center gap-3 md:gap-2">
              <div
                className={cn(
                  // Mobile: larger icons
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                  // Desktop: standard size
                  "md:w-8 md:h-8 md:rounded-lg",
                  enabled 
                    ? "bg-primary/20 text-primary shadow-lg shadow-primary/20" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                {React.cloneElement(icon as React.ReactElement, {
                  className: cn(
                    "w-5 h-5 md:w-4 md:h-4",
                    enabled && "animate-pulse"
                  )
                })}
              </div>
              <span
                className={cn(
                  // Mobile: larger, bolder text
                  "font-semibold text-base transition-colors duration-300",
                  // Desktop: standard size
                  "md:font-medium md:text-sm",
                  enabled ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              className={cn(
                // Mobile: larger switch
                "scale-125 md:scale-100",
                "data-[state=checked]:bg-primary"
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px] hidden md:block">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const FormatToggleCard: React.FC<FormatToggleCardProps> = ({
  preferences,
  onToggle,
  access = { openmic: true, dediche: true, community: true, giochi: true },
}) => {
  const formats = [
    {
      key: 'openmic' as const,
      label: 'Open Mic',
      icon: <Music className="w-4 h-4" />,
      tooltip: 'Attiva per monitorare prenotazioni Open Mic in tempo reale',
    },
    {
      key: 'dediche' as const,
      label: 'Dediche',
      icon: <MessageSquare className="w-4 h-4" />,
      tooltip: 'Attiva per monitorare messaggi Dediche in tempo reale',
    },
    {
      key: 'community' as const,
      label: 'Community',
      icon: <Users className="w-4 h-4" />,
      tooltip: 'Attiva per monitorare messaggi e richieste Community in tempo reale',
    },
    {
      key: 'giochi' as const,
      label: 'Giochi',
      icon: <Gamepad2 className="w-4 h-4" />,
      tooltip: 'Attiva per monitorare l\'attività dei giochi in tempo reale',
    },
  ];

  const accessibleFormats = formats.filter(f => access[f.key]);

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4 md:px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Settings2 className="w-4 h-4" />
          <span className="text-base md:text-sm">Format da monitorare</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-2 md:px-4">
        <div className="space-y-2 md:space-y-2">
          {accessibleFormats.map((format) => (
            <FormatToggleItem
              key={format.key}
              label={format.label}
              icon={format.icon}
              enabled={preferences[format.key]}
              hasAccess={access[format.key]}
              onToggle={() => onToggle(format.key)}
              tooltip={format.tooltip}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

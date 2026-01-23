import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2, Music, MessageSquare, Users } from 'lucide-react';
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
              "flex items-center justify-between p-3 rounded-xl transition-all duration-300 ease-out cursor-pointer",
              "hover:bg-muted/50",
              enabled ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-transparent"
            )}
            onClick={onToggle}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                  enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {icon}
              </div>
              <span
                className={cn(
                  "font-medium text-sm transition-colors duration-300",
                  enabled ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const FormatToggleCard: React.FC<FormatToggleCardProps> = ({
  preferences,
  onToggle,
  access = { openmic: true, dediche: true, community: true },
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
  ];

  const accessibleFormats = formats.filter(f => access[f.key]);

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Settings2 className="w-4 h-4" />
          Seleziona format da monitorare
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        <div className="space-y-2">
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

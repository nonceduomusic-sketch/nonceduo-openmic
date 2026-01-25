import React, { useState } from 'react';
import { Mic, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import type { EventBookingRules, EventType } from '@/hooks/useEventBookingRules';
import { cn } from '@/lib/utils';

interface Props {
  rules: EventBookingRules;
  onUpdate: (updates: Partial<EventBookingRules>) => Promise<boolean>;
}

const TYPE_CONFIG: Record<EventType, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = {
  openmic: {
    label: 'Solo Open Mic',
    description: 'Solo prenotazioni canzoni karaoke',
    icon: Mic,
    color: 'text-purple-500',
  },
  dediche: {
    label: 'Solo Dediche',
    description: 'Solo messaggi e dediche musicali',
    icon: MessageSquare,
    color: 'text-pink-500',
  },
  both: {
    label: 'Open Mic + Dediche',
    description: 'Entrambi i formati attivi',
    icon: Sparkles,
    color: 'text-amber-500',
  },
};

export const EventTypeSelector: React.FC<Props> = ({ rules, onUpdate }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<EventType>(rules.event_type);

  const handleTypeChange = async (value: EventType) => {
    setSelectedType(value);
    setIsSaving(true);

    const success = await onUpdate({ 
      event_type: value,
      // Aggiorna anche i flag enabled per coerenza
      openmic_enabled: value === 'openmic' || value === 'both',
      dediche_enabled: value === 'dediche' || value === 'both',
    });

    if (success) {
      toast({
        title: 'Tipo evento aggiornato',
        description: `L'evento è ora impostato come "${TYPE_CONFIG[value].label}"`,
      });
      await adminAuditLog({
        action: 'event.type_changed',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { 
          event_name: rules.event_name,
          from: rules.event_type,
          to: value,
        },
      });
    } else {
      setSelectedType(rules.event_type); // Rollback
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il tipo evento',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tipo Evento</CardTitle>
        <CardDescription>
          Scegli quali formati sono disponibili per questo evento
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <RadioGroup 
          value={selectedType} 
          onValueChange={(v) => handleTypeChange(v as EventType)}
          disabled={isSaving}
          className="space-y-2"
        >
          {(Object.keys(TYPE_CONFIG) as EventType[]).map((type) => {
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            const isSelected = selectedType === type;
            
            return (
              <div 
                key={type}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => !isSaving && handleTypeChange(type)}
              >
                <RadioGroupItem value={type} id={`type-${type}`} />
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}>
                  <Icon className={cn("w-4 h-4", isSelected ? config.color : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <Label 
                    htmlFor={`type-${type}`} 
                    className={cn(
                      "font-medium cursor-pointer",
                      isSelected && config.color
                    )}
                  >
                    {config.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
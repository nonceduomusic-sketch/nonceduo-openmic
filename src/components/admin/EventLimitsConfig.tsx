import React, { useState } from 'react';
import { Hash, Music, MessageSquare, Save, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import type { EventBookingRules } from '@/hooks/useEventBookingRules';

interface Props {
  rules: EventBookingRules;
  onUpdate: (updates: Partial<EventBookingRules>) => Promise<boolean>;
}

export const EventLimitsConfig: React.FC<Props> = ({ rules, onUpdate }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Open Mic limits
  const [openmicEnabled, setOpenmicEnabled] = useState(rules.openmic_enabled);
  const [openmicMaxSongs, setOpenmicMaxSongs] = useState(rules.openmic_max_songs?.toString() || '');
  const [openmicFinalLimitEnabled, setOpenmicFinalLimitEnabled] = useState(rules.openmic_final_limit_enabled);
  const [openmicFinalLimitSongs, setOpenmicFinalLimitSongs] = useState(rules.openmic_final_limit_songs?.toString() || '2');
  const [openmicFinalLimitMinutes, setOpenmicFinalLimitMinutes] = useState(rules.openmic_final_limit_minutes?.toString() || '10');

  // Dediche limits
  const [dedicheEnabled, setDedicheEnabled] = useState(rules.dediche_enabled);
  const [dedicheMaxTotal, setDedicheMaxTotal] = useState(rules.dediche_max_total?.toString() || '');
  const [dedicheFinalLimitEnabled, setDedicheFinalLimitEnabled] = useState((rules as any).dediche_final_limit_enabled ?? false);
  const [dedicheFinalLimitTotal, setDedicheFinalLimitTotal] = useState((rules as any).dediche_final_limit_total?.toString() || '2');
  const [dedicheFinalLimitMinutes, setDedicheFinalLimitMinutes] = useState((rules as any).dediche_final_limit_minutes?.toString() || '10');

  const handleSave = async () => {
    setIsSaving(true);

    const updates: Partial<EventBookingRules> & {
      dediche_final_limit_enabled?: boolean;
      dediche_final_limit_total?: number | null;
      dediche_final_limit_minutes?: number | null;
    } = {
      openmic_enabled: openmicEnabled,
      openmic_max_songs: openmicMaxSongs ? parseInt(openmicMaxSongs) : null,
      openmic_final_limit_enabled: openmicFinalLimitEnabled,
      openmic_final_limit_songs: openmicFinalLimitEnabled && openmicFinalLimitSongs ? parseInt(openmicFinalLimitSongs) : null,
      openmic_final_limit_minutes: openmicFinalLimitEnabled && openmicFinalLimitMinutes ? parseInt(openmicFinalLimitMinutes) : null,
      dediche_enabled: dedicheEnabled,
      dediche_max_total: dedicheMaxTotal ? parseInt(dedicheMaxTotal) : null,
      dediche_final_limit_enabled: dedicheFinalLimitEnabled,
      dediche_final_limit_total: dedicheFinalLimitEnabled && dedicheFinalLimitTotal ? parseInt(dedicheFinalLimitTotal) : null,
      dediche_final_limit_minutes: dedicheFinalLimitEnabled && dedicheFinalLimitMinutes ? parseInt(dedicheFinalLimitMinutes) : null,
    };

    const success = await onUpdate(updates as any);

    if (success) {
      toast({
        title: 'Limiti salvati',
        description: 'La configurazione dei limiti è stata aggiornata',
      });
      await adminAuditLog({
        action: 'event.limits_updated',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { 
          openmic_max: openmicMaxSongs || 'illimitato',
          dediche_max: dedicheMaxTotal || 'illimitato',
        },
      });
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare i limiti',
        variant: 'destructive',
      });
    }

    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Limiti Numerici
        </CardTitle>
        <CardDescription>
          Configura il numero massimo di prenotazioni per tipo. 
          I limiti funzionano in combinazione con la finestra temporale.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Open Mic Limits */}
        <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Music className="w-5 h-5 text-primary" />
            <h4 className="font-medium">Open Mic (Karaoke)</h4>
          </div>

          {/* Limite 1: Max canzoni per tutta la sera - INDIPENDENTE */}
          <div className="space-y-3 p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-500" />
                <Label className="font-medium">Max canzoni per tutta la sera</Label>
              </div>
              <Switch
                checked={openmicEnabled}
                onCheckedChange={setOpenmicEnabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Limite massimo di canzoni prenotabili durante l'intero evento
            </p>
            
            {openmicEnabled && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  id="openmicMaxSongs"
                  type="number"
                  min="1"
                  value={openmicMaxSongs}
                  onChange={(e) => setOpenmicMaxSongs(e.target.value)}
                  placeholder="Es: 50"
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  canzoni totali
                </span>
              </div>
            )}
          </div>

          {/* Limite 2: Ultimi minuti - INDIPENDENTE */}
          <div className="space-y-3 p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                <Label className="font-medium">Limite "ultimi minuti"</Label>
              </div>
              <Switch
                checked={openmicFinalLimitEnabled}
                onCheckedChange={setOpenmicFinalLimitEnabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Riduce il numero di canzoni prenotabili negli ultimi minuti dell'evento
            </p>
            
            {openmicFinalLimitEnabled && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-sm">Max</span>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={openmicFinalLimitSongs}
                  onChange={(e) => setOpenmicFinalLimitSongs(e.target.value)}
                  className="w-16 h-8"
                />
                <span className="text-sm">canzoni negli ultimi</span>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={openmicFinalLimitMinutes}
                  onChange={(e) => setOpenmicFinalLimitMinutes(e.target.value)}
                  className="w-16 h-8"
                />
                <span className="text-sm">minuti</span>
              </div>
            )}
          </div>
        </div>

        {/* Dediche Limits */}
        <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-secondary" />
              <h4 className="font-medium">Dediche</h4>
            </div>
            <Switch
              checked={dedicheEnabled}
              onCheckedChange={setDedicheEnabled}
            />
          </div>

          {dedicheEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="dedicheMaxTotal">Numero massimo dediche</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="dedicheMaxTotal"
                    type="number"
                    min="0"
                    value={dedicheMaxTotal}
                    onChange={(e) => setDedicheMaxTotal(e.target.value)}
                    placeholder="Illimitato"
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {dedicheMaxTotal ? `max ${dedicheMaxTotal} dediche` : 'nessun limite'}
                  </span>
                </div>
              </div>

              {/* Final limit for dediche (ultimi X minuti) */}
              <div className="space-y-3 p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-500" />
                    <Label className="font-medium">Limite "ultimi minuti"</Label>
                  </div>
                  <Switch
                    checked={dedicheFinalLimitEnabled}
                    onCheckedChange={setDedicheFinalLimitEnabled}
                  />
                </div>
                
                {dedicheFinalLimitEnabled && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-sm">Max</span>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={dedicheFinalLimitTotal}
                      onChange={(e) => setDedicheFinalLimitTotal(e.target.value)}
                      className="w-16 h-8"
                    />
                    <span className="text-sm">dediche negli ultimi</span>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={dedicheFinalLimitMinutes}
                      onChange={(e) => setDedicheFinalLimitMinutes(e.target.value)}
                      className="w-16 h-8"
                    />
                    <span className="text-sm">minuti</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Limiti'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

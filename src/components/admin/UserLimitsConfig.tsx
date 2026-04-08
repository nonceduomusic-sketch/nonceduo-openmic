import React, { useState, useEffect } from 'react';
import { User, Users, Timer, Repeat, Hash, Save, Info, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import { cn } from '@/lib/utils';
import { useReservations } from '@/hooks/useReservations';

interface UserLimitsSettings {
  user_limit_enabled: boolean;
  user_limit_mode: 'session' | 'session_name';
  user_limit_songs_total: number | null;
  user_limit_dediche_total: number | null;
  user_limit_songs_interval: number | null;
  user_limit_interval_minutes: number | null;
  user_limit_consecutive_songs: number | null;
  user_limit_cooldown_message: string;
  // Individual enable flags for each limit type
  user_limit_total_enabled?: boolean;
  user_limit_consecutive_enabled?: boolean;
  user_limit_interval_enabled?: boolean;
}

interface Props {
  settings: UserLimitsSettings;
  onUpdate: (updates: Partial<UserLimitsSettings>) => Promise<boolean>;
  entityId?: string;
}

export const UserLimitsConfig: React.FC<Props> = ({ settings, onUpdate, entityId }) => {
  const { toast } = useToast();
  const { resetUserCounts } = useReservations();
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Local state
  const [enabled, setEnabled] = useState(settings.user_limit_enabled);
  const [mode, setMode] = useState<'session' | 'session_name'>(settings.user_limit_mode || 'session');
  
  // Individual limit toggles
  const [totalEnabled, setTotalEnabled] = useState(settings.user_limit_total_enabled ?? false);
  const [consecutiveEnabled, setConsecutiveEnabled] = useState(settings.user_limit_consecutive_enabled ?? false);
  const [intervalEnabled, setIntervalEnabled] = useState(settings.user_limit_interval_enabled ?? false);
  
  // Limit values
  const [songsTotalLimit, setSongsTotalLimit] = useState(settings.user_limit_songs_total?.toString() || '');
  const [dedicheTotalLimit, setDedicheTotalLimit] = useState(settings.user_limit_dediche_total?.toString() || '');
  const [songsIntervalLimit, setSongsIntervalLimit] = useState(settings.user_limit_songs_interval?.toString() || '');
  const [intervalMinutes, setIntervalMinutes] = useState(settings.user_limit_interval_minutes?.toString() || '');
  const [consecutiveSongsLimit, setConsecutiveSongsLimit] = useState(settings.user_limit_consecutive_songs?.toString() || '');
  const [cooldownMessage, setCooldownMessage] = useState(
    settings.user_limit_cooldown_message || 
    'Hai superato il limite di prenotazioni. Potrai riprendere tra {minutes} minuti.'
  );

  // Sync with props only on initial load - use a ref to track initialization
  const initializedRef = React.useRef(false);
  const lastEntityIdRef = React.useRef<string | undefined>(undefined);
  
  useEffect(() => {
    // Only sync on initial mount or when switching to a different entity
    if (!initializedRef.current || (entityId && entityId !== lastEntityIdRef.current)) {
      setEnabled(settings.user_limit_enabled);
      setMode(settings.user_limit_mode || 'session');
      setTotalEnabled(settings.user_limit_total_enabled ?? false);
      setConsecutiveEnabled(settings.user_limit_consecutive_enabled ?? false);
      setIntervalEnabled(settings.user_limit_interval_enabled ?? false);
      setSongsTotalLimit(settings.user_limit_songs_total?.toString() || '');
      setDedicheTotalLimit(settings.user_limit_dediche_total?.toString() || '');
      setSongsIntervalLimit(settings.user_limit_songs_interval?.toString() || '');
      setIntervalMinutes(settings.user_limit_interval_minutes?.toString() || '');
      setConsecutiveSongsLimit(settings.user_limit_consecutive_songs?.toString() || '');
      setCooldownMessage(settings.user_limit_cooldown_message || 'Hai superato il limite di prenotazioni. Potrai riprendere tra {minutes} minuti.');
      initializedRef.current = true;
      lastEntityIdRef.current = entityId;
    }
  }, [entityId, settings]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updates: Partial<UserLimitsSettings> = {
        user_limit_enabled: enabled,
        user_limit_mode: mode,
        user_limit_total_enabled: totalEnabled,
        user_limit_consecutive_enabled: consecutiveEnabled,
        user_limit_interval_enabled: intervalEnabled,
        user_limit_songs_total: totalEnabled && songsTotalLimit ? parseInt(songsTotalLimit) : null,
        user_limit_dediche_total: totalEnabled && dedicheTotalLimit ? parseInt(dedicheTotalLimit) : null,
        user_limit_songs_interval: intervalEnabled && songsIntervalLimit ? parseInt(songsIntervalLimit) : null,
        user_limit_interval_minutes: intervalEnabled && intervalMinutes ? parseInt(intervalMinutes) : null,
        user_limit_consecutive_songs: consecutiveEnabled && consecutiveSongsLimit ? parseInt(consecutiveSongsLimit) : null,
        user_limit_cooldown_message: cooldownMessage,
      };

      const success = await onUpdate(updates);

      if (success) {
        toast({
          title: 'Limiti utente salvati',
          description: 'La configurazione è stata aggiornata',
        });
        // Audit log
        if (entityId) {
          adminAuditLog({
            action: 'event.user_limits_updated',
            entity: 'event_settings',
            entity_id: entityId,
            metadata: { 
              enabled,
              mode,
              total_enabled: totalEnabled,
              consecutive_enabled: consecutiveEnabled,
              interval_enabled: intervalEnabled,
            },
          }).catch(console.error);
        }
      } else {
        toast({
          title: 'Errore',
          description: 'Impossibile salvare i limiti utente',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[UserLimitsConfig] Save error:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Limiti per Utente
            </CardTitle>
            <CardDescription>
              Configura limiti individuali per evitare che una persona monopolizzi le prenotazioni.
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={async (checked) => {
              setEnabled(checked);
              try {
                const success = await onUpdate({ user_limit_enabled: checked });
                if (success) {
                  toast({
                    title: checked ? 'Limiti utente attivati' : 'Limiti utente disattivati',
                    description: checked ? 'Configura i limiti qui sotto' : 'I limiti utente sono disabilitati',
                  });
                } else {
                  setEnabled(!checked);
                  toast({
                    title: 'Errore',
                    description: 'Impossibile aggiornare lo stato',
                    variant: 'destructive',
                  });
                }
              } catch (error) {
                console.error('[UserLimitsConfig] Toggle error:', error);
                setEnabled(!checked);
              }
            }}
          />
        </div>
      </CardHeader>

      {(
        <CardContent className={cn("space-y-6", !enabled && "opacity-50 pointer-events-none")}>
          {/* Identification Mode */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <Label className="font-medium">Modalità identificazione</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>Solo sessione:</strong> Traccia per dispositivo/browser. Più semplice ma aggirabile.</p>
                    <p className="mt-1"><strong>Sessione + Nome:</strong> Combina dispositivo e nome. Più robusto.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'session' | 'session_name')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="session" id="mode-session" />
                <Label htmlFor="mode-session" className="cursor-pointer">
                  Solo sessione (dispositivo)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="session_name" id="mode-session-name" />
                <Label htmlFor="mode-session-name" className="cursor-pointer">
                  Sessione + Nome (più robusto)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Limit Types */}
          <div className="space-y-4">
            {/* Total Limit */}
            <div className={cn(
              "space-y-3 p-4 rounded-lg border transition-all",
              totalEnabled 
                ? "border-blue-500/50 bg-blue-500/5" 
                : "border-border bg-background opacity-75"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <Label className="font-medium">Limite totale per evento</Label>
                </div>
                <Switch
                  checked={totalEnabled}
                  onCheckedChange={setTotalEnabled}
                />
              </div>
              
              {totalEnabled && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Numero massimo di prenotazioni per tutta la durata dell'evento.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max canzoni</Label>
                      <Input
                        type="number"
                        min="1"
                        value={songsTotalLimit}
                        onChange={(e) => setSongsTotalLimit(e.target.value)}
                        placeholder="∞"
                        className="w-24"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max dediche</Label>
                      <Input
                        type="number"
                        min="1"
                        value={dedicheTotalLimit}
                        onChange={(e) => setDedicheTotalLimit(e.target.value)}
                        placeholder="∞"
                        className="w-24"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Consecutive Limit */}
            <div className={cn(
              "space-y-3 p-4 rounded-lg border transition-all",
              consecutiveEnabled 
                ? "border-orange-500/50 bg-orange-500/5" 
                : "border-border bg-background opacity-75"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-orange-500" />
                  <Label className="font-medium">Limite canzoni consecutive</Label>
                </div>
                <Switch
                  checked={consecutiveEnabled}
                  onCheckedChange={setConsecutiveEnabled}
                />
              </div>
              
              {consecutiveEnabled && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Blocca dopo X prenotazioni consecutive senza che altri prenotino nel mezzo.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={consecutiveSongsLimit}
                      onChange={(e) => setConsecutiveSongsLimit(e.target.value)}
                      placeholder="3"
                      className={cn("w-24", !consecutiveSongsLimit && "border-red-500 focus:border-red-500")}
                      required
                    />
                    <span className="text-sm text-muted-foreground">
                      {consecutiveSongsLimit 
                        ? `max ${consecutiveSongsLimit} canzoni di fila` 
                        : ''}
                    </span>
                  </div>
                  {!consecutiveSongsLimit && (
                    <p className="text-xs text-red-500 font-medium">
                      ⚠️ Inserisci un valore e clicca "Salva Limiti" per attivare
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Interval Limit */}
            <div className={cn(
              "space-y-3 p-4 rounded-lg border transition-all",
              intervalEnabled 
                ? "border-green-500/50 bg-green-500/5" 
                : "border-border bg-background opacity-75"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-green-500" />
                  <Label className="font-medium">Limite temporale</Label>
                </div>
                <Switch
                  checked={intervalEnabled}
                  onCheckedChange={setIntervalEnabled}
                />
              </div>
              
              {intervalEnabled && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Dopo X canzoni, l'utente deve aspettare Y minuti prima di prenotare ancora.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">Max</span>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={songsIntervalLimit}
                      onChange={(e) => setSongsIntervalLimit(e.target.value)}
                      placeholder="2"
                      className={cn("w-20", !songsIntervalLimit && "border-red-500 focus:border-red-500")}
                      required
                    />
                    <span className="text-sm">canzoni ogni</span>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(e.target.value)}
                      placeholder="5"
                      className={cn("w-20", !intervalMinutes && "border-red-500 focus:border-red-500")}
                      required
                    />
                    <span className="text-sm">minuti</span>
                  </div>
                  {!songsIntervalLimit || !intervalMinutes ? (
                    <p className="text-xs text-red-500 font-medium">
                      ⚠️ Inserisci entrambi i valori e clicca "Salva Limiti" per attivare
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Esempio: dopo {songsIntervalLimit} canzoni, aspetta {intervalMinutes} minuti
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Cooldown Message */}
          <div className="space-y-2">
            <Label>Messaggio di cooldown</Label>
            <Textarea
              value={cooldownMessage}
              onChange={(e) => setCooldownMessage(e.target.value)}
              placeholder="Messaggio mostrato quando l'utente raggiunge un limite..."
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Usa <code className="bg-muted px-1 rounded">{'{minutes}'}</code> per inserire i minuti rimanenti.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={async () => {
                setIsResetting(true);
                try {
                  await resetUserCounts();
                } finally {
                  setIsResetting(false);
                }
              }} 
              disabled={isResetting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isResetting ? 'Resettando...' : 'Reset Conteggi'}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvataggio...' : 'Salva Limiti'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

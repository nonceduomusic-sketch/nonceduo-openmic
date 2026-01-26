import React, { useState, useEffect, forwardRef } from 'react';
import { Calendar, Clock, Play, Timer, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface EventTimingSettings {
  start_mode: 'manual' | 'scheduled';
  end_mode: 'manual' | 'scheduled' | 'duration';
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  duration_minutes: number | null;
  expires_at: string | null;
  // Countdown visibility
  countdown_start_show_minutes?: number | null;
  countdown_end_show_minutes?: number | null;
}

interface Props {
  settings: EventTimingSettings;
  isActive: boolean;
  onUpdate: (updates: Partial<EventTimingSettings>) => Promise<boolean>;
  onActivate?: () => void;
}

export const EventTimingConfig = forwardRef<HTMLDivElement, Props>(({ 
  settings, 
  isActive,
  onUpdate,
  onActivate 
}, ref) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Local state
  const [startMode, setStartMode] = useState<'manual' | 'scheduled'>(settings.start_mode || 'manual');
  const [endMode, setEndMode] = useState<'manual' | 'scheduled' | 'duration'>(settings.end_mode || 'manual');
  const [eventDate, setEventDate] = useState(settings.event_date || '');
  const [eventStartTime, setEventStartTime] = useState(settings.event_start_time || '');
  const [eventEndTime, setEventEndTime] = useState(settings.event_end_time || '');
  const [durationMinutes, setDurationMinutes] = useState(settings.duration_minutes?.toString() || '120');
  const [countdownStartMinutes, setCountdownStartMinutes] = useState(
    settings.countdown_start_show_minutes?.toString() || ''
  );
  const [countdownEndMinutes, setCountdownEndMinutes] = useState(
    settings.countdown_end_show_minutes?.toString() || ''
  );

  // Sync from props when settings change
  useEffect(() => {
    setStartMode(settings.start_mode || 'manual');
    setEndMode(settings.end_mode || 'manual');
    setEventDate(settings.event_date || '');
    setEventStartTime(settings.event_start_time || '');
    setEventEndTime(settings.event_end_time || '');
    setDurationMinutes(settings.duration_minutes?.toString() || '120');
    setCountdownStartMinutes(settings.countdown_start_show_minutes?.toString() || '');
    setCountdownEndMinutes(settings.countdown_end_show_minutes?.toString() || '');
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);

    const updates: Partial<EventTimingSettings> = {
      start_mode: startMode,
      end_mode: endMode,
    };

    // Date/time for scheduled start
    if (startMode === 'scheduled') {
      updates.event_date = eventDate || null;
      updates.event_start_time = eventStartTime || null;
    } else {
      updates.event_date = null;
      updates.event_start_time = null;
    }

    // End configuration
    if (endMode === 'scheduled') {
      updates.event_end_time = eventEndTime || null;
      updates.duration_minutes = null;
    } else if (endMode === 'duration') {
      updates.duration_minutes = parseInt(durationMinutes) || null;
      updates.event_end_time = null;
    } else {
      updates.event_end_time = null;
      updates.duration_minutes = null;
    }

    // Countdown visibility settings
    updates.countdown_start_show_minutes = countdownStartMinutes 
      ? parseInt(countdownStartMinutes) 
      : null;
    updates.countdown_end_show_minutes = countdownEndMinutes 
      ? parseInt(countdownEndMinutes) 
      : null;
    const success = await onUpdate(updates);
    
    if (success) {
      toast({
        title: 'Tempistiche salvate',
        description: 'La configurazione è stata aggiornata',
      });
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la configurazione',
        variant: 'destructive',
      });
    }
    
    setIsSaving(false);
  };

  // Calculate scheduled start time display
  const getScheduledStartDisplay = () => {
    if (!eventDate || !eventStartTime) return null;
    const dateTime = new Date(`${eventDate}T${eventStartTime}`);
    return dateTime.toLocaleString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card ref={ref}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-5 h-5" />
          Tempistiche Evento
        </CardTitle>
        <CardDescription className="text-xs">
          Configura quando l'evento parte e quando termina.
          Necessario per i limiti "ultimi minuti".
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* START MODE */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Partenza Evento
          </Label>

          <RadioGroup 
            value={startMode} 
            onValueChange={(v) => setStartMode(v as 'manual' | 'scheduled')}
            className="space-y-2"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="manual" id="start-manual" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="start-manual" className="font-medium cursor-pointer">
                  Manuale
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Avvia l'evento con il pulsante "Avvia Evento Libero"
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="scheduled" id="start-scheduled" className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="start-scheduled" className="font-medium cursor-pointer">
                    Automatica a data/ora
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    L'evento parte automaticamente all'orario impostato
                  </p>
                </div>
                
                {startMode === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ora</Label>
                      <Input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    {getScheduledStartDisplay() && (
                      <p className="col-span-2 text-xs text-primary font-medium">
                        → {getScheduledStartDisplay()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        <hr className="border-border" />

        {/* END MODE */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Timer className="w-4 h-4 text-destructive" />
            Termine Evento
          </Label>

          <RadioGroup 
            value={endMode} 
            onValueChange={(v) => setEndMode(v as 'manual' | 'scheduled' | 'duration')}
            className="space-y-2"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="manual" id="end-manual" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="end-manual" className="font-medium cursor-pointer">
                  Manuale
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Termina l'evento con il pulsante "Termina Evento"
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="scheduled" id="end-scheduled" className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="end-scheduled" className="font-medium cursor-pointer">
                    A orario specifico
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    L'evento termina all'ora impostata{eventDate ? ` (${eventDate})` : ''}
                  </p>
                </div>
                
                {endMode === 'scheduled' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Ora fine</Label>
                    <Input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="h-9 w-32"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="duration" id="end-duration" className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="end-duration" className="font-medium cursor-pointer">
                    Dopo X minuti dalla partenza
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    L'evento termina dopo un tempo prestabilito
                  </p>
                </div>
                
                {endMode === 'duration' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="10"
                      max="480"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="h-9 w-24"
                    />
                    <span className="text-sm text-muted-foreground">minuti</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.floor(parseInt(durationMinutes || '0') / 60)}h {parseInt(durationMinutes || '0') % 60}m)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Info about final limits */}
        {(endMode === 'scheduled' || endMode === 'duration') && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning">
            <strong>Nota:</strong> Impostando un termine, potrai usare i limiti "ultimi minuti" 
            per Open Mic e Dediche (es. max 5 canzoni negli ultimi 30 minuti).
          </div>
        )}

        {/* Countdown Visibility Config */}
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Visibilità Countdown</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Configura quando mostrare i countdown ad admin e utenti. Lascia vuoto per mostrarlo sempre.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {startMode === 'scheduled' && (
              <div className="space-y-2">
                <Label htmlFor="countdown-start" className="text-xs">
                  Countdown partenza
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="countdown-start"
                    type="number"
                    min="1"
                    max="60"
                    placeholder="Sempre"
                    value={countdownStartMinutes}
                    onChange={(e) => setCountdownStartMinutes(e.target.value)}
                    className="h-8 w-20"
                    disabled={isActive}
                  />
                  <span className="text-xs text-muted-foreground">min prima</span>
                </div>
              </div>
            )}
            
            {(endMode === 'scheduled' || endMode === 'duration') && (
              <div className="space-y-2">
                <Label htmlFor="countdown-end" className="text-xs">
                  Countdown chiusura
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="countdown-end"
                    type="number"
                    min="1"
                    max="60"
                    placeholder="Sempre"
                    value={countdownEndMinutes}
                    onChange={(e) => setCountdownEndMinutes(e.target.value)}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">min prima</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? 'Salvataggio...' : 'Salva Tempistiche'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

EventTimingConfig.displayName = 'EventTimingConfig';

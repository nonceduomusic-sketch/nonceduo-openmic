import React, { useState } from 'react';
import { Calendar, Clock, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import type { EventBookingRules } from '@/hooks/useEventBookingRules';

interface Props {
  rules: EventBookingRules;
  onUpdate: (updates: Partial<EventBookingRules>) => Promise<boolean>;
}

export const EventBookingWindowConfig: React.FC<Props> = ({ rules, onUpdate }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Local form state
  const [eventName, setEventName] = useState(rules.event_name || '');
  const [eventDate, setEventDate] = useState(rules.event_date || '');
  const [eventStartTime, setEventStartTime] = useState(rules.event_start_time || '');
  const [eventEndTime, setEventEndTime] = useState(rules.event_end_time || '');
  
  const [bookingOpensAt, setBookingOpensAt] = useState(
    rules.booking_opens_at ? new Date(rules.booking_opens_at).toISOString().slice(0, 16) : ''
  );
  const [bookingClosesAt, setBookingClosesAt] = useState(
    rules.booking_closes_at ? new Date(rules.booking_closes_at).toISOString().slice(0, 16) : ''
  );
  const [closeMode, setCloseMode] = useState<'fixed' | 'before_end'>(
    rules.close_minutes_before_end ? 'before_end' : 'fixed'
  );
  const [closeMinutesBefore, setCloseMinutesBefore] = useState(
    rules.close_minutes_before_end?.toString() || '20'
  );

  const handleSave = async () => {
    setIsSaving(true);
    
    const updates: Partial<EventBookingRules> = {
      event_name: eventName || null,
      event_date: eventDate || null,
      event_start_time: eventStartTime || null,
      event_end_time: eventEndTime || null,
      booking_opens_at: bookingOpensAt ? new Date(bookingOpensAt).toISOString() : null,
    };

    if (closeMode === 'fixed') {
      updates.booking_closes_at = bookingClosesAt ? new Date(bookingClosesAt).toISOString() : null;
      updates.close_minutes_before_end = null;
    } else {
      updates.booking_closes_at = null;
      updates.close_minutes_before_end = parseInt(closeMinutesBefore) || null;
    }

    const success = await onUpdate(updates);
    
    if (success) {
      toast({
        title: 'Finestra salvata',
        description: 'La configurazione della finestra di prenotazione è stata aggiornata',
      });
      await adminAuditLog({
        action: 'event.window_updated',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { event_name: eventName, closeMode },
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Finestra di Prenotazione
        </CardTitle>
        <CardDescription>
          Configura quando le prenotazioni sono aperte. Se la finestra è chiusa, 
          nessuna prenotazione è possibile anche se i limiti numerici non sono stati raggiunti.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Info Evento */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Informazioni Evento</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Nome Evento</Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Es. Serata Karaoke"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventDate">Data Evento</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventStartTime">Ora Inizio</Label>
              <Input
                id="eventStartTime"
                type="time"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventEndTime">Ora Fine</Label>
              <Input
                id="eventEndTime"
                type="time"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Apertura Prenotazioni */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Apertura Prenotazioni</h4>
          
          <div className="space-y-2">
            <Label htmlFor="bookingOpensAt">Data e Ora Apertura</Label>
            <Input
              id="bookingOpensAt"
              type="datetime-local"
              value={bookingOpensAt}
              onChange={(e) => setBookingOpensAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lascia vuoto per prenotazioni sempre aperte (fino alla chiusura)
            </p>
          </div>
        </div>

        <hr className="border-border" />

        {/* Chiusura Prenotazioni */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Chiusura Prenotazioni</h4>
          
          <RadioGroup value={closeMode} onValueChange={(v) => setCloseMode(v as 'fixed' | 'before_end')}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="fixed" id="close-fixed" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="close-fixed" className="font-medium cursor-pointer">
                  Orario fisso
                </Label>
                <p className="text-xs text-muted-foreground">
                  Le prenotazioni si chiudono a una data/ora specifica
                </p>
                {closeMode === 'fixed' && (
                  <Input
                    type="datetime-local"
                    value={bookingClosesAt}
                    onChange={(e) => setBookingClosesAt(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="before_end" id="close-before" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="close-before" className="font-medium cursor-pointer">
                  Minuti prima della fine evento
                </Label>
                <p className="text-xs text-muted-foreground">
                  Le prenotazioni si chiudono X minuti prima della fine dell'evento
                </p>
                {closeMode === 'before_end' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={closeMinutesBefore}
                      onChange={(e) => setCloseMinutesBefore(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minuti prima</span>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Finestra'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

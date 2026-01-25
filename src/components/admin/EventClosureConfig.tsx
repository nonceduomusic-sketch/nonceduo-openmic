import React, { useState } from 'react';
import { Settings2, Save, ExternalLink, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import type { EventBookingRules } from '@/hooks/useEventBookingRules';

interface Props {
  rules: EventBookingRules;
  onUpdate: (updates: Partial<EventBookingRules>) => Promise<boolean>;
}

export const EventClosureConfig: React.FC<Props> = ({ rules, onUpdate }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [closureMode, setClosureMode] = useState<'overlay' | 'redirect'>(
    (rules.closure_mode as 'overlay' | 'redirect') || 'overlay'
  );
  const [closureTitle, setClosureTitle] = useState(rules.closure_title || 'Prenotazioni chiuse! 🎤');
  const [closureMessage, setClosureMessage] = useState(
    rules.closure_message || 'Grazie per aver partecipato alla serata! Seguici sui social per non perdere i prossimi eventi.'
  );
  const [closureRedirectUrl, setClosureRedirectUrl] = useState(rules.closure_redirect_url || '');

  const handleSave = async () => {
    setIsSaving(true);

    const updates: Partial<EventBookingRules> = {
      closure_mode: closureMode,
      closure_title: closureTitle || null,
      closure_message: closureMessage || null,
      closure_redirect_url: closureMode === 'redirect' ? closureRedirectUrl : null,
    };

    const success = await onUpdate(updates);

    if (success) {
      toast({
        title: 'Configurazione salvata',
        description: 'Le impostazioni di chiusura sono state aggiornate',
      });
      await adminAuditLog({
        action: 'event.closure_updated',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { mode: closureMode },
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
          <Settings2 className="w-5 h-5" />
          Esperienza di Chiusura
        </CardTitle>
        <CardDescription>
          Configura cosa vedono gli utenti quando le prenotazioni sono chiuse.
          Rendi l'esperienza positiva e invita a seguire i prossimi eventi.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-4">
          <Label>Modalità di chiusura</Label>

          <RadioGroup value={closureMode} onValueChange={(v) => setClosureMode(v as 'overlay' | 'redirect')}>
            <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="overlay" id="closure-overlay" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="closure-overlay" className="font-medium cursor-pointer flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Overlay sulla pagina
                </Label>
                <p className="text-sm text-muted-foreground">
                  Mostra un messaggio amichevole sopra la pagina corrente.
                  L'utente vede ancora il contenuto ma non può prenotare.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="redirect" id="closure-redirect" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="closure-redirect" className="font-medium cursor-pointer flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Redirect a pagina dedicata
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reindirizza automaticamente a una pagina con messaggio completo 
                  e link ai social/newsletter.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Message Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closureTitle">Titolo</Label>
            <Input
              id="closureTitle"
              value={closureTitle}
              onChange={(e) => setClosureTitle(e.target.value)}
              placeholder="Es. Prenotazioni chiuse! 🎤"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closureMessage">Messaggio</Label>
            <Textarea
              id="closureMessage"
              value={closureMessage}
              onChange={(e) => setClosureMessage(e.target.value)}
              placeholder="Es. Grazie per aver partecipato! Seguici per i prossimi eventi."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Usa un tono positivo e invita a partecipare ai prossimi eventi
            </p>
          </div>

          {closureMode === 'redirect' && (
            <div className="space-y-2">
              <Label htmlFor="closureRedirectUrl">URL di redirect</Label>
              <Input
                id="closureRedirectUrl"
                type="url"
                value={closureRedirectUrl}
                onChange={(e) => setClosureRedirectUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                L'URL della pagina a cui reindirizzare gli utenti (lascia vuoto per usare una pagina generata automaticamente)
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Anteprima</Label>
          <div className="p-6 rounded-lg bg-muted/50 border border-border text-center">
            <div className="text-4xl mb-3">🎤</div>
            <h3 className="text-lg font-semibold mb-2">{closureTitle || 'Prenotazioni chiuse'}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {closureMessage || 'Messaggio di chiusura...'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Instagram
              </Button>
              <Button variant="outline" size="sm" disabled>
                Facebook
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Configurazione'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

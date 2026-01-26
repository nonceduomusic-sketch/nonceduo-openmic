import React, { useState, useEffect } from 'react';
import { Settings2, Save, ExternalLink, Layers, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import { FreeModeClosureOverlay } from '@/components/FreeModeClosureOverlay';
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
  const [closurePreviewEnabled, setClosurePreviewEnabled] = useState(
    rules.closure_preview_enabled || false
  );

  // Sync from props when they change
  useEffect(() => {
    setClosurePreviewEnabled(rules.closure_preview_enabled || false);
  }, [rules.closure_preview_enabled]);

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

  const handleTogglePreview = async () => {
    const newValue = !closurePreviewEnabled;
    setClosurePreviewEnabled(newValue);
    
    // Update immediately
    const success = await onUpdate({ closure_preview_enabled: newValue });
    
    if (success) {
      toast({
        title: newValue ? 'Anteprima attivata' : 'Anteprima disattivata',
        description: newValue 
          ? 'Gli utenti vedranno ora la schermata di chiusura' 
          : 'Gli utenti vedranno nuovamente la pagina normale',
      });
      await adminAuditLog({
        action: newValue ? 'event.closure_preview_enabled' : 'event.closure_preview_disabled',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { preview_enabled: newValue },
      });
    } else {
      // Revert on failure
      setClosurePreviewEnabled(!newValue);
      toast({
        title: 'Errore',
        description: 'Impossibile attivare l\'anteprima',
        variant: 'destructive',
      });
    }
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
        {/* Preview Toggle - PROMINENT */}
        <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {closurePreviewEnabled ? (
                <div className="p-2 rounded-full bg-primary/20 animate-pulse">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-muted">
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  Anteprima Chiusura
                  {closurePreviewEnabled && (
                    <Badge variant="default" className="animate-pulse">
                      ATTIVA
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {closurePreviewEnabled 
                    ? 'Gli utenti stanno vedendo la schermata di chiusura' 
                    : 'Attiva per mostrare agli utenti come appare la chiusura'}
                </p>
              </div>
            </div>
            <Switch
              checked={closurePreviewEnabled}
              onCheckedChange={handleTogglePreview}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          {closurePreviewEnabled && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">
                <strong>Attenzione:</strong> Gli utenti NON potranno prenotare mentre questa opzione è attiva!
              </p>
            </div>
          )}
        </div>

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

        {/* Preview - Using actual component */}
        <div className="space-y-2">
          <Label>Anteprima (come la vedono gli utenti)</Label>
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <FreeModeClosureOverlay 
              closureTitle={closureTitle || 'Prenotazioni chiuse'}
              closureMessage={closureMessage || 'Messaggio di chiusura...'}
            />
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

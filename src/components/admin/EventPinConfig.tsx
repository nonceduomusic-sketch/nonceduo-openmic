import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  RefreshCw, 
  Copy, 
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import type { EventBookingRules } from '@/hooks/useEventBookingRules';
import { cn } from '@/lib/utils';

interface Props {
  rules: EventBookingRules;
  onUpdate: (updates: Partial<EventBookingRules>) => Promise<boolean>;
  generatePin: () => string;
}

export const EventPinConfig: React.FC<Props> = ({ rules, onUpdate, generatePin }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Local state
  const [pinRequired, setPinRequired] = useState(rules.pin_required);
  const [pinCode, setPinCode] = useState(rules.pin_code || '');

  // Sync with props
  useEffect(() => {
    setPinRequired(rules.pin_required);
    setPinCode(rules.pin_code || '');
  }, [rules.pin_required, rules.pin_code]);

  const handleTogglePin = async (enabled: boolean) => {
    setPinRequired(enabled);
    
    // Se abilitiamo il PIN e non c'è un codice, generiamone uno
    let newPin = pinCode;
    if (enabled && !pinCode) {
      newPin = generatePin();
      setPinCode(newPin);
    }

    setIsSaving(true);
    const success = await onUpdate({
      pin_required: enabled,
      pin_code: enabled ? newPin : null,
    });

    if (success) {
      toast({
        title: enabled ? 'PIN attivato' : 'PIN disattivato',
        description: enabled 
          ? `Gli utenti dovranno inserire il PIN ${newPin} per accedere`
          : 'L\'accesso all\'evento è ora libero',
      });
      await adminAuditLog({
        action: enabled ? 'event.pin_enabled' : 'event.pin_disabled',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { event_name: rules.event_name },
      });
    } else {
      // Rollback
      setPinRequired(!enabled);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la configurazione PIN',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const handlePinChange = async () => {
    if (!pinCode || pinCode.length < 4) {
      toast({
        title: 'PIN non valido',
        description: 'Il PIN deve essere di almeno 4 caratteri',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const success = await onUpdate({ pin_code: pinCode.toUpperCase() });

    if (success) {
      toast({
        title: 'PIN aggiornato',
        description: `Il nuovo PIN è ${pinCode.toUpperCase()}`,
      });
      await adminAuditLog({
        action: 'event.pin_changed',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { event_name: rules.event_name },
      });
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il PIN',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const handleGenerateNew = async () => {
    const newPin = generatePin();
    setPinCode(newPin);
    
    setIsSaving(true);
    const success = await onUpdate({ pin_code: newPin });
    
    if (success) {
      toast({
        title: 'Nuovo PIN generato',
        description: `Il nuovo PIN è ${newPin}`,
      });
    }
    setIsSaving(false);
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'PIN copiato',
      description: 'Il PIN è stato copiato negli appunti',
    });
  };

  return (
    <Card className={cn(
      "transition-colors",
      pinRequired ? "border-amber-500/30 bg-amber-500/5" : ""
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              pinRequired ? "bg-amber-500/20" : "bg-muted"
            )}>
              {pinRequired ? (
                <Lock className="w-5 h-5 text-amber-500" />
              ) : (
                <Unlock className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Protezione PIN</CardTitle>
              <CardDescription className="text-sm">
                {pinRequired 
                  ? 'Gli utenti devono inserire il PIN per accedere'
                  : 'Accesso libero all\'evento'
                }
              </CardDescription>
            </div>
          </div>
          
          <Switch
            checked={pinRequired}
            onCheckedChange={handleTogglePin}
            disabled={isSaving}
          />
        </div>
      </CardHeader>

      {pinRequired && (
        <CardContent className="space-y-4">
          {/* PIN Display */}
          <div className="space-y-2">
            <Label>Codice PIN</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                  type={pinVisible ? 'text' : 'password'}
                  placeholder="Es. 1234"
                  className="pr-10 font-mono text-lg tracking-widest"
                  maxLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setPinVisible(!pinVisible)}
                >
                  {pinVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={copyPin}
                disabled={!pinCode}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateNew}
              disabled={isSaving}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Genera nuovo
            </Button>
            
            <Button
              size="sm"
              onClick={handlePinChange}
              disabled={isSaving || pinCode === rules.pin_code}
            >
              Salva PIN
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Condividi questo PIN con i partecipanti per dare accesso all'evento
          </p>
        </CardContent>
      )}
    </Card>
  );
};
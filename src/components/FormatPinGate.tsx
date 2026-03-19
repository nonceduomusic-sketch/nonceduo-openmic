import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFormatPinValidator, FormatKey } from '@/hooks/useFormatGating';
import { usePinSession } from '@/hooks/usePinSession';
import { supabase } from '@/integrations/supabase/client';

interface FormatPinGateProps {
  format: FormatKey;
  formatDisplayName: string;
  onPinValidated: () => void;
  backTo?: string;
  backLabel?: string;
}

export const FormatPinGate: React.FC<FormatPinGateProps> = ({
  format,
  formatDisplayName,
  onPinValidated,
  backTo = '/app',
  backLabel = 'Torna all\'app',
}) => {
  const [pin, setPin] = useState('');
  const { validatePin, validating, isValid: pinIsValid } = useFormatPinValidator(format);
  const { 
    hasValidSession, 
    loading: sessionLoading, 
    sessionInvalidated, 
    invalidationReason,
    createSession,
    clearSession 
  } = usePinSession(format);

  // Track if we've already auto-entered to prevent loops
  const hasAutoEntered = React.useRef(false);
  
  // Check for existing valid GLOBAL session on mount
  // If user entered PIN on Open Mic, they should auto-enter Dediche too (same PIN)
  useEffect(() => {
    if (!sessionLoading && hasValidSession && !sessionInvalidated && !hasAutoEntered.current) {
      hasAutoEntered.current = true;
      if (import.meta.env.DEV) console.log(`[FormatPinGate] Valid global session found for ${format}, auto-entering`);
      onPinValidated();
    }
  }, [sessionLoading, hasValidSession, sessionInvalidated, onPinValidated, format]);

  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    
    const valid = await validatePin(pin);
    if (valid) {
      // Resolve the correct active live session for THIS format via backend (handles the case of >1 active session)
      const { data: sessions, error: rpcError } = await supabase.rpc('get_active_session_for_format', {
        p_format: format,
      });

      if (rpcError) {
        if (import.meta.env.DEV) {
          console.error('[FormatPinGate] Error resolving active session for format:', format, rpcError);
        }
        setSessionError('Errore di connessione. Riprova.');
        return;
      }

      const liveSession = Array.isArray(sessions) ? sessions[0] : sessions;

      if (!liveSession?.id) {
        // PIN was valid, but we couldn't resolve a session id to persist the access.
        if (import.meta.env.DEV) console.warn('[FormatPinGate] No active live session resolved for format:', format);
        setSessionError('Sessione live non trovata. Riprova o contatta lo staff.');
        return;
      }

      const protectedFormats = (liveSession.protected_formats as string[]) || [];

      // Create GLOBAL session - works for ALL formats that share the same live session
      const created = await createSession(liveSession.id as string, pin);
      if (!created) {
        if (import.meta.env.DEV) console.error('[FormatPinGate] Failed to create pin session - blocking entry');
        setSessionError('Errore salvataggio sessione. Riprova.');
        return;
      }

      if (import.meta.env.DEV) {
        console.log(`[FormatPinGate] Global session created for live_session ${liveSession.id}`);
        console.log(`[FormatPinGate] User now has access to ALL protected formats:`, protectedFormats);
      }
      
      onPinValidated();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleRetry = () => {
    hasAutoEntered.current = false;
    clearSession();
    setPin('');
  };

  // Show loading while checking existing global session
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card border-primary/20">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifica accesso in corso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show session invalidated message with retry
  if (sessionInvalidated) {
    const getMessage = () => {
      switch (invalidationReason) {
        case 'pin_changed':
          return 'Il PIN è stato aggiornato. Reinserisci il nuovo codice annunciato dal performer.';
        case 'session_deactivated':
          return 'La serata live è terminata. Torna presto!';
        case 'admin_reset':
          return 'L\'accesso è stato resettato dall\'organizzatore. Reinserisci il PIN.';
        case 'session_changed':
          return 'La sessione è stata modificata. Reinserisci il PIN.';
        default:
          return 'La tua sessione è scaduta. Reinserisci il PIN per continuare.';
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card border-amber-500/30">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              PIN Aggiornato
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {getMessage()}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={handleRetry}
              className="w-full h-12 text-lg neon-button-cyan"
            >
              Inserisci Nuovo PIN
            </Button>
            
            <div className="pt-4 border-t border-border">
              <Link to={backTo}>
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {backLabel}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {formatDisplayName} – Serata Live
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Per accedere al contenuto live, inserisci il PIN annunciato dal performer.
          </p>
          
          {/* Info about shared access */}
          <div className="mt-4 p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>
                Un solo PIN per tutti i format della serata
              </span>
            </div>
          </div>

          {/* Display PIN hint if enabled by admin */}
          {displayPin && (
            <div className="mt-3 p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Il PIN di stasera è:</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">
                {displayPin}
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Inserisci PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className={cn(
                  "text-center text-2xl font-mono tracking-[0.3em] h-14 uppercase",
                  pinIsValid === false && "border-destructive focus:ring-destructive"
                )}
                maxLength={8}
                autoFocus
                autoComplete="off"
              />
              
              {pinIsValid === false && (
                <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>PIN non valido – chiedi il codice al performer o al locale</span>
                </div>
              )}
              
              {sessionError && (
                <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>{sessionError}</span>
                </div>
              )}
            </div>

            <Button
              type="submit" 
              className="w-full h-12 text-lg neon-button-cyan"
              disabled={pin.length < 4 || validating}
            >
              {validating ? 'Verifica...' : 'Accedi alla Serata'}
            </Button>
          </form>

          <div className="pt-4 border-t border-border">
            <Link to={backTo}>
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

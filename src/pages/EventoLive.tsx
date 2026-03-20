import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import {
  Mic2,
  MessageSquare,
  Music,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Home,
  Radio,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveReactionBar } from '@/components/live/LiveReactionBar';
import { toast } from 'sonner';

interface EventSession {
  id: string;
  protected_formats: string[];
  expires_at: string | null;
  is_active: boolean;
}

interface StoredPinSession {
  token: string;
  liveSessionId: string;
  pinCodeHash: string;
  createdAt: string;
}

const PIN_SESSION_STORAGE_KEY = 'ncd_pin_sessions_v2';
const PIN_SESSION_SYNC_EVENT = 'ncd-pin-session-sync';

// Same lightweight hash strategy used by usePinSession (client-side matching only)
const hashPinLight = (pin: string): string => {
  const cleanPin = pin.toUpperCase().trim();
  let hash = 0;
  for (let i = 0; i < cleanPin.length; i++) {
    const char = cleanPin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const EventoLive: React.FC = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<EventSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notActive, setNotActive] = useState(false);
  const [pin, setPin] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validatedFormats, setValidatedFormats] = useState<string[]>([]);
  const [autoValidating, setAutoValidating] = useState(false);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  const [invalidationReason, setInvalidationReason] = useState<string | null>(null);
  const [sessionSyncKey, setSessionSyncKey] = useState(0);

  const urlPin = searchParams.get('pin');

  const emitSessionSync = useCallback(() => {
    window.dispatchEvent(new CustomEvent(PIN_SESSION_SYNC_EVENT));
  }, []);

  const getStoredSession = useCallback((): StoredPinSession | null => {
    try {
      const raw = localStorage.getItem(PIN_SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const saveStoredSession = useCallback((storedSession: StoredPinSession) => {
    localStorage.setItem(PIN_SESSION_STORAGE_KEY, JSON.stringify(storedSession));
    emitSessionSync();
    setSessionSyncKey((prev) => prev + 1);
  }, [emitSessionSync]);

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(PIN_SESSION_STORAGE_KEY);
    emitSessionSync();
    setSessionSyncKey((prev) => prev + 1);
  }, [emitSessionSync]);

  const invalidateAccess = useCallback((reason: string) => {
    clearStoredSession();
    setIsValid(false);
    setValidatedFormats([]);
    setSessionInvalidated(true);
    setInvalidationReason(reason);
  }, [clearStoredSession]);

  const fetchSession = useCallback(async () => {
    if (!linkCode) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const { data: anySession, error: anyError } = await supabase
        .from('live_sessions')
        .select('id, protected_formats, expires_at, is_active')
        .eq('event_link_code', linkCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyError) throw anyError;

      if (!anySession) {
        setNotFound(true);
      } else if (!anySession.is_active) {
        setNotActive(true);
      } else if (anySession.expires_at && new Date(anySession.expires_at) < new Date()) {
        setNotActive(true);
      } else {
        setSession(anySession as EventSession);
        setNotFound(false);
        setNotActive(false);

        if (!anySession.protected_formats || anySession.protected_formats.length === 0) {
          setIsValid(true);
          setValidatedFormats(['openmic', 'dediche']);
          setSessionInvalidated(false);
          setInvalidationReason(null);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [linkCode]);

  useEffect(() => {
    fetchSession();

    const channel = supabase
      .channel(`evento-live-${linkCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
        },
        () => {
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkCode, fetchSession]);

  useEffect(() => {
    const handleSessionSync = () => setSessionSyncKey((prev) => prev + 1);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PIN_SESSION_STORAGE_KEY) {
        setSessionSyncKey((prev) => prev + 1);
      }
    };

    window.addEventListener(PIN_SESSION_SYNC_EVENT, handleSessionSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(PIN_SESSION_SYNC_EVENT, handleSessionSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!session?.id) return;

    let cancelled = false;

    const validateExistingAccess = async () => {
      const stored = getStoredSession();
      if (!stored || stored.liveSessionId !== session.id) {
        if (!cancelled) {
          setIsValid(false);
          setValidatedFormats([]);
        }
        return;
      }

      const protectedFormats = session.protected_formats || [];
      const targetFormat = protectedFormats[0] || 'openmic';

      try {
        const { data, error } = await supabase.rpc('validate_pin_session', {
          p_token: stored.token,
          p_format: targetFormat,
        });

        const row = Array.isArray(data) ? data[0] : (data as any);
        const hasAccess = !error && Boolean(row?.is_valid);

        if (!cancelled) {
          setIsValid(hasAccess);
          setValidatedFormats(hasAccess ? protectedFormats : []);
          if (hasAccess) {
            setSessionInvalidated(false);
            setInvalidationReason(null);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[EventoLive] validate existing access error:', error);
      }
    };

    void validateExistingAccess();

    return () => {
      cancelled = true;
    };
  }, [getStoredSession, session?.id, session?.protected_formats, sessionSyncKey]);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.token || !stored.liveSessionId || !session || stored.liveSessionId !== session.id) {
      return;
    }

    const pinChannel = supabase
      .channel(`evento-live-pin-${stored.token.substring(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pin_sessions',
          filter: `session_token=eq.${stored.token}`,
        },
        (payload) => {
          const next = payload.new as { is_valid: boolean; invalidation_reason?: string };
          if (!next.is_valid) {
            invalidateAccess(next.invalidation_reason || 'admin_reset');
          }
        }
      )
      .subscribe();

    const liveChannel = supabase
      .channel(`evento-live-session-${stored.liveSessionId.substring(0, 8)}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${stored.liveSessionId}`,
        },
        (payload) => {
          const prev = payload.old as {
            sessions_invalidated_at?: string | null;
            pin_code?: string;
            is_active?: boolean;
          };
          const next = payload.new as {
            sessions_invalidated_at?: string | null;
            pin_code?: string;
            is_active?: boolean;
            expires_at?: string | null;
          };

          if (next?.sessions_invalidated_at && next.sessions_invalidated_at !== prev?.sessions_invalidated_at) {
            invalidateAccess('admin_reset');
            return;
          }

          if (next?.pin_code && prev?.pin_code && next.pin_code !== prev.pin_code) {
            invalidateAccess('pin_changed');
            return;
          }

          if (next?.is_active === false) {
            invalidateAccess('session_deactivated');
            return;
          }

          if (next?.expires_at && new Date(next.expires_at) < new Date()) {
            invalidateAccess('session_expired');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pinChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [getStoredSession, invalidateAccess, session, sessionSyncKey]);

  useEffect(() => {
    if (!isValid || !session?.protected_formats?.length) return;

    let cancelled = false;
    let consecutiveErrors = 0;

    const revalidateAccess = async () => {
      const stored = getStoredSession();
      if (!stored || stored.liveSessionId !== session.id) {
        if (!cancelled) {
          invalidateAccess('session_missing');
        }
        return;
      }

      try {
        const { data, error } = await supabase.rpc('validate_pin_session', {
          p_token: stored.token,
          p_format: session.protected_formats[0] || 'openmic',
        });

        if (error) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5 && !cancelled) {
            invalidateAccess('connection_lost');
          }
          return;
        }

        consecutiveErrors = 0;
        const row = Array.isArray(data) ? data[0] : (data as any);
        if (!row?.is_valid && !cancelled) {
          invalidateAccess('admin_reset');
        }
      } catch (error) {
        consecutiveErrors++;
        if (consecutiveErrors >= 5 && !cancelled) {
          invalidateAccess('connection_lost');
        }
      }
    };

    const handleFocus = () => void revalidateAccess();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void revalidateAccess();
      }
    };

    let lastInteractionCheck = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastInteractionCheck < 3000) return;
      lastInteractionCheck = now;
      void revalidateAccess();
    };

    const interval = window.setInterval(() => void revalidateAccess(), 3000);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [getStoredSession, invalidateAccess, isValid, session]);

  const validatePinAndCreateSession = async (inputPin: string): Promise<boolean> => {
    if (!session) return false;

    const cleanPin = inputPin.toUpperCase().trim();

    try {
      const { data: token, error } = await supabase.rpc('create_pin_session', {
        p_live_session_id: session.id,
        p_format: session.protected_formats?.[0] || 'openmic',
        p_pin_code: cleanPin,
        p_device_fingerprint: navigator.userAgent.substring(0, 100),
      });

      const isCorrect = !!token && !error;

      if (isCorrect) {
        const storedSession = {
          token: token as string,
          liveSessionId: session.id,
          pinCodeHash: hashPinLight(cleanPin),
          createdAt: new Date().toISOString(),
        };
        saveStoredSession(storedSession);

        setIsValid(true);
        setValidatedFormats(session.protected_formats);
        setSessionInvalidated(false);
        setInvalidationReason(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!urlPin || !session || isValid || autoValidating) return;

    const autoLogin = async () => {
      setAutoValidating(true);
      const success = await validatePinAndCreateSession(urlPin);

      if (success) {
        toast.success('Accesso automatico riuscito!');
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('pin');
        const newSearch = newParams.toString();
        navigate(
          { pathname: window.location.pathname, search: newSearch ? `?${newSearch}` : '' },
          { replace: true }
        );
      } else {
        toast.error('PIN non valido - inseriscilo manualmente');
      }
      setAutoValidating(false);
    };

    void autoLogin();
  }, [urlPin, session, isValid, autoValidating, searchParams, navigate]);

  const handleValidatePin = async () => {
    if (!session || !pin.trim()) return;

    setIsValidating(true);
    const success = await validatePinAndCreateSession(pin);

    if (success) {
      toast.success('PIN corretto! Ora puoi accedere.');
    } else {
      toast.error('PIN non valido - chiedi il codice al performer o al locale');
    }
    setIsValidating(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidatePin();
    }
  };

  const handleRetry = () => {
    setPin('');
    setSessionInvalidated(false);
    setInvalidationReason(null);
  };

  const getInvalidationMessage = () => {
    switch (invalidationReason) {
      case 'pin_changed':
        return 'Il PIN è stato aggiornato. Reinserisci il nuovo codice.';
      case 'session_deactivated':
        return 'L’evento live è terminato.';
      case 'admin_reset':
      case 'admin_kick':
        return 'Sei stato disconnesso dallo staff. Reinserisci il PIN per rientrare.';
      case 'session_expired':
        return 'La sessione è scaduta.';
      default:
        return 'L’accesso è stato invalidato. Reinserisci il PIN per continuare.';
    }
  };

  if (loading || autoValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        {autoValidating && (
          <p className="text-muted-foreground text-sm animate-pulse">Accesso automatico in corso...</p>
        )}
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEO
          title="Evento non trovato | Non C'è Duo"
          description="L'evento live non è più attivo o il link non è valido."
        />
        <Card className="max-w-md w-full glass-card">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Evento non trovato</h1>
            <p className="text-muted-foreground mb-6">
              Questo link non è valido. Controlla l'URL o scansiona di nuovo il QR code.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/app">
                <Button className="w-full gap-2">
                  <Home className="w-4 h-4" />
                  Vai all'app
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Vai al sito
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEO
          title="Evento non attivo | Non C'è Duo"
          description="L'evento live non è attualmente in corso."
        />
        <Card className="max-w-md w-full glass-card border-accent/30">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-xl font-bold mb-2">Evento non attivo</h1>
            <p className="text-muted-foreground mb-6">
              Al momento non c'è nessun evento live in corso. Torna durante la prossima serata!
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/app">
                <Button className="w-full gap-2 neon-button-cyan">
                  <Home className="w-4 h-4" />
                  Vai all'app
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Scopri le prossime date
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <SEO
        title="Evento Live | Non C'è Duo"
        description="Partecipa all'evento live di Non C'è Duo - Prenota canzoni e dediche!"
      />

      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
                <Radio className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold neon-text-pink">
                  Evento Live
                </h1>
                <p className="text-xs text-secondary font-medium">
                  Non C'è Duo
                </p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary animate-pulse">
              🔴 LIVE
            </Badge>
          </div>
        </div>
      </header>

      {isValid && <LiveReactionBar />}

      <main className="container py-8 max-w-lg mx-auto">
        {sessionInvalidated ? (
          <Card className="glass-card border-accent/30">
            <CardHeader className="text-center">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-10 h-10 text-accent" />
              </div>
              <CardTitle className="text-2xl">Accesso terminato</CardTitle>
              <CardDescription className="text-base">
                {getInvalidationMessage()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleRetry} className="w-full h-12 text-lg gap-2">
                <RefreshCw className="w-5 h-5" />
                Reinserisci il PIN
              </Button>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Torna al sito
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : !isValid ? (
          <Card className="glass-card border-primary/30">
            <CardHeader className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                <Music className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                Benvenuto all'evento live!
              </CardTitle>
              <CardDescription className="text-base">
                Per prenotare canzoni o dediche, inserisci il PIN annunciato dal performer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Inserisci il PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className="text-center text-2xl font-mono tracking-widest h-14 uppercase"
                  maxLength={8}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleValidatePin}
                disabled={!pin.trim() || isValidating}
                className="w-full h-12 text-lg gap-2"
              >
                {isValidating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Accedi all'evento
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mb-4">
                Non hai il PIN? Chiedilo al performer o al locale.
              </p>

              <div className="pt-4 border-t border-border">
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
                  <Home className="w-4 h-4" />
                  Torna al sito
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <Card className="glass-card border-accent/30 bg-accent/5">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-3" />
                <p className="text-lg font-semibold text-accent">
                  Accesso sbloccato!
                </p>
                <p className="text-sm text-muted-foreground">
                  Scegli cosa vuoi fare
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {validatedFormats.includes('openmic') && (
                <Link to="/app/openmic">
                  <Card className={cn(
                    'glass-card border-primary/30 hover:border-primary/60 transition-all cursor-pointer group',
                    'hover:bg-primary/5'
                  )}>
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mic2 className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">Open Mic</h3>
                        <p className="text-sm text-muted-foreground">
                          Prenota una canzone e sali sul palco!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {validatedFormats.includes('dediche') && (
                <Link to="/app/dediche">
                  <Card className={cn(
                    'glass-card border-secondary/30 hover:border-secondary/60 transition-all cursor-pointer group',
                    'hover:bg-secondary/5'
                  )}>
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-7 h-7 text-secondary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">Dediche</h3>
                        <p className="text-sm text-muted-foreground">
                          Invia una dedica speciale!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              L'accesso è stato salvato per questa sessione.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventoLive;

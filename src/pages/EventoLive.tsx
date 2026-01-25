import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EventSession {
  id: string;
  // pin_code removed for security - validation done via RPC
  protected_formats: string[];
  expires_at: string | null;
  is_active: boolean;
}

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
  const [session, setSession] = useState<EventSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notActive, setNotActive] = useState(false);
  const [pin, setPin] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validatedFormats, setValidatedFormats] = useState<string[]>([]);

  const fetchSession = useCallback(async () => {
    if (!linkCode) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      // First check if there's ANY session with this link code (active or not)
      // Note: pin_code is NOT selected - validation is done via secure RPC
      const { data: anySession, error: anyError } = await supabase
        .from('live_sessions')
        .select('id, protected_formats, expires_at, is_active')
        .eq('event_link_code', linkCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyError) throw anyError;

      if (!anySession) {
        // No session with this link code exists at all
        setNotFound(true);
      } else if (!anySession.is_active) {
        // Session exists but is not active
        setNotActive(true);
      } else if (anySession.expires_at && new Date(anySession.expires_at) < new Date()) {
        // Session is expired
        setNotActive(true);
      } else {
        // Session is active and valid
        setSession(anySession as EventSession);
        
        // Check if formats are protected - if no formats are protected, go directly to app
        if (!anySession.protected_formats || anySession.protected_formats.length === 0) {
          setIsValid(true);
          setValidatedFormats(['openmic', 'dediche']); // All formats accessible
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

    // Subscribe to realtime updates
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

  const handleValidatePin = async () => {
    if (!session || !pin.trim()) return;

    setIsValidating(true);
    
    const inputPin = pin.toUpperCase().trim();
    
    try {
      // Use secure RPC to validate PIN - this also creates the session if valid
      // Never compare PIN client-side as it exposes the code
      const { data: token, error } = await supabase.rpc('create_pin_session', {
        p_live_session_id: session.id,
        p_format: session.protected_formats?.[0] || 'openmic',
        p_pin_code: inputPin,
        p_device_fingerprint: navigator.userAgent.substring(0, 100),
      });
      
      const isCorrect = !!token && !error;
      
      if (isCorrect) {
        // Store session locally for persistence
        const storedSession = {
          token: token as string,
          liveSessionId: session.id,
          pinCodeHash: hashPinLight(inputPin),
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('ncd_pin_sessions_v2', JSON.stringify(storedSession));

        setIsValid(true);
        setValidatedFormats(session.protected_formats);
        toast.success('PIN corretto! Ora puoi accedere.');
      } else {
        toast.error('PIN non valido - chiedi il codice al performer o al locale');
      }
    } catch (error) {
      console.error('Error validating PIN:', error);
      toast.error('Errore durante la validazione. Riprova.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidatePin();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Event not found (link code doesn't exist)
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

  // Event exists but not currently active
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
      
      {/* Header */}
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

      {/* Main Content */}
      <main className="container py-8 max-w-lg mx-auto">
        {!isValid ? (
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
              {/* PIN Input */}
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

              {/* Back to site link */}
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

            {/* Format Cards */}
            <div className="grid gap-4">
              {validatedFormats.includes('openmic') && (
                <Link to="/app/openmic">
                  <Card className={cn(
                    "glass-card border-primary/30 hover:border-primary/60 transition-all cursor-pointer group",
                    "hover:bg-primary/5"
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
                    "glass-card border-secondary/30 hover:border-secondary/60 transition-all cursor-pointer group",
                    "hover:bg-secondary/5"
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

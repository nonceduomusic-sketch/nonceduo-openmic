import React, { useState, useEffect } from 'react';
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
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EventSession {
  id: string;
  pin_code: string;
  protected_formats: string[];
  expires_at: string | null;
  is_active: boolean;
}

const EventoLive: React.FC = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [session, setSession] = useState<EventSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pin, setPin] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validatedFormats, setValidatedFormats] = useState<string[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      if (!linkCode) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('id, pin_code, protected_formats, expires_at, is_active')
          .eq('event_link_code', linkCode)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setNotFound(true);
        } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setNotFound(true);
        } else {
          setSession(data as EventSession);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [linkCode]);

  const handleValidatePin = async () => {
    if (!session || !pin.trim()) return;

    setIsValidating(true);
    
    // Simple local validation
    const isCorrect = pin.toUpperCase().trim() === session.pin_code;
    
    if (isCorrect) {
      setIsValid(true);
      setValidatedFormats(session.protected_formats);
      toast.success('PIN corretto! Ora puoi prenotare.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Evento non trovato</h1>
            <p className="text-muted-foreground mb-6">
              Questo evento live non è più attivo o il link non è valido.
            </p>
            <Link to="/app">
              <Button className="gap-2">
                <Home className="w-4 h-4" />
                Torna all'app
              </Button>
            </Link>
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

              <p className="text-xs text-center text-muted-foreground">
                Non hai il PIN? Chiedilo al performer o al locale.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <Card className="glass-card border-green-500/30 bg-green-500/5">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-green-500">
                  PIN validato!
                </p>
                <p className="text-sm text-muted-foreground">
                  Ora puoi prenotare canzoni e dediche
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
              Il PIN è stato salvato per questa sessione.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventoLive;

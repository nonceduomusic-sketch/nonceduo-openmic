import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Zap, Play, Pause, RotateCcw, Trophy, Lock, Users, UserX, Eye, EyeOff,
} from 'lucide-react';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
  useFuroreAdmin,
  type FurorePlayer,
} from '@/hooks/useFurore';
import brandLogoText from '@/assets/brand-logo-text.png';

type RemotePhase = 'loading' | 'invalid' | 'pin' | 'controls';

export default function FuroreRemote() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<RemotePhase>('loading');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [accessInfo, setAccessInfo] = useState<{ id: string; name: string; pin_required: boolean } | null>(null);

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmKickAll, setConfirmKickAll] = useState(false);

  const { session, loading: sessionLoading } = useFuroreSession();
  const { players, refetch: refetchPlayers } = useFurorePlayers(session?.id);
  const { bookings } = useFuroreBookings(session?.id);
  const {
    openBookings, closeBookings, resetSession, resetBookingsOnly,
    setShowLeaderboard, kickAllPlayers,
  } = useFuroreAdmin();

  // Validate token on mount
  useEffect(() => {
    if (!token) { setPhase('invalid'); return; }

    const validate = async () => {
      const { data, error } = await supabase
        .from('furore_remote_access')
        .select('id, name, pin_required, pin_code, is_active')
        .eq('access_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setPhase('invalid');
        return;
      }

      setAccessInfo({ id: data.id, name: data.name, pin_required: data.pin_required });

      // Update last_used_at
      supabase.from('furore_remote_access').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {});

      if (!data.pin_required) {
        setPhase('controls');
      } else {
        // Check if already validated in this session
        const savedPin = sessionStorage.getItem(`furore_remote_pin_${data.id}`);
        if (savedPin === data.pin_code) {
          setPhase('controls');
        } else {
          setPhase('pin');
        }
      }
    };

    validate();
  }, [token]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessInfo || !pin.trim()) return;
    setValidating(true);
    setPinError(null);

    const { data } = await supabase
      .from('furore_remote_access')
      .select('pin_code')
      .eq('id', accessInfo.id)
      .eq('is_active', true)
      .maybeSingle();

    if (data && data.pin_code === pin.trim().toUpperCase()) {
      sessionStorage.setItem(`furore_remote_pin_${accessInfo.id}`, data.pin_code);
      setPhase('controls');
    } else {
      setPinError('PIN non valido');
    }
    setValidating(false);
  };

  // ─── Handlers ───
  const handleOpen = async () => {
    if (!session) return;
    await openBookings(session.id);
    toast.success('Prenotazioni aperte!');
  };
  const handleClose = async () => {
    if (!session) return;
    await closeBookings(session.id);
    toast.success('Prenotazioni chiuse');
  };
  const handleResetBookings = async () => {
    if (!session) return;
    await resetBookingsOnly(session.id);
    await refetchPlayers();
    toast.success('Punti assegnati, prenotazioni riaperte!');
  };
  const handleReset = async () => {
    if (!session) return;
    await resetSession(session.id);
    await refetchPlayers();
    setConfirmReset(false);
    toast.success('Partita resettata completamente');
  };
  const handleKickAll = async () => {
    if (!session) return;
    await kickAllPlayers(session.id);
    await refetchPlayers();
    setConfirmKickAll(false);
    toast.success('Tutti i giocatori espulsi');
  };

  // ─── Loading ───
  if (phase === 'loading' || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Connessione al telecomando...</p>
        </div>
      </div>
    );
  }

  // ─── Invalid Token ───
  if (phase === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <Zap className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-lg font-bold">Link non valido</h2>
            <p className="text-sm text-muted-foreground">
              Questo telecomando non esiste o è stato disattivato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── PIN Entry ───
  if (phase === 'pin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <img src={brandLogoText} alt="Logo" className="h-8 mx-auto mb-2 opacity-70" />
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" /> Telecomando Furore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase())}
                placeholder="Inserisci PIN"
                className="text-center text-xl tracking-[0.3em] uppercase font-mono"
                maxLength={6}
                autoFocus
              />
              {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
              <Button type="submit" className="w-full" disabled={validating || !pin.trim()}>
                {validating ? 'Verifica...' : 'Accedi'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Controls ───
  const isBookingOpen = session?.status === 'open';

  // Sort players by score for leaderboard
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Telecomando Furore</span>
          </div>
          <Badge
            variant={isBookingOpen ? 'default' : 'secondary'}
            className={cn("text-xs", isBookingOpen && "bg-green-600 hover:bg-green-600")}
          >
            {isBookingOpen ? '🟢 APERTE' : bookings.length > 0 ? '⏸️ STANDBY' : '🔴 CHIUSE'}
          </Badge>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* No session */}
        {!session && (
          <Card>
            <CardContent className="py-8 text-center">
              <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nessuna sessione attiva</p>
            </CardContent>
          </Card>
        )}

        {session && (
          <>
            {/* Main Controls */}
            <Card>
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm">Controlli Manche</CardTitle>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={handleClose}
                    disabled={session.status === 'closed'}
                    variant={session.status === 'closed' ? 'secondary' : 'outline'}
                    className="gap-1.5 h-12"
                  >
                    <Pause className="w-4 h-4" />
                    <span className="text-xs">Standby</span>
                  </Button>
                  <Button
                    onClick={handleOpen}
                    disabled={session.status === 'open'}
                    variant={session.status === 'open' ? 'secondary' : 'default'}
                    className="gap-1.5 h-12"
                  >
                    <Play className="w-4 h-4" />
                    <span className="text-xs">Apri</span>
                  </Button>
                  <Button
                    onClick={handleResetBookings}
                    variant="outline"
                    className="gap-1.5 h-12 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-xs">Reset & Apri</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setConfirmReset(true)}
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 h-10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">Reset Completo</span>
                  </Button>
                  <Button
                    onClick={() => setConfirmKickAll(true)}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-10 border-destructive/50 text-destructive hover:bg-destructive/10"
                    disabled={players.length === 0}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span className="text-xs">Espelli Tutti</span>
                  </Button>
                </div>

                <Separator />

                {/* Leaderboard Toggle */}
                <Button
                  onClick={() => {
                    const newVal = !(session as any).show_leaderboard;
                    setShowLeaderboard(session.id, newVal);
                    toast.success(newVal ? 'Classifica visibile' : 'Classifica nascosta');
                  }}
                  variant={(session as any).show_leaderboard ? 'default' : 'outline'}
                  className="gap-2 w-full h-10"
                >
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs">
                    {(session as any).show_leaderboard ? '🏆 Classifica ATTIVA' : 'Mostra Classifica'}
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Live Status */}
            <Card>
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> Stato Live
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-black">{players.length}</p>
                    <p className="text-[10px] text-muted-foreground">Giocatori</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-black">{bookings.length}</p>
                    <p className="text-[10px] text-muted-foreground">Prenotati</p>
                  </div>
                </div>

                {/* Bookings order */}
                {bookings.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Ordine di arrivo:</p>
                    {bookings.map(b => {
                      const player = players.find(p => p.id === b.player_id);
                      if (!player) return null;
                      return (
                        <div key={b.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm">
                          <span className="font-bold text-primary w-6 text-center">{b.position}°</span>
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: player.color }}
                          >
                            {player.symbol}
                          </span>
                          <span className="font-medium truncate">{player.nickname}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            {sortedPlayers.length > 0 && (
              <Card>
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Classifica
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 space-y-1.5">
                  {sortedPlayers.map((player, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                    return (
                      <div
                        key={player.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md text-sm",
                          idx < 3 ? "bg-primary/5 border border-primary/10" : "bg-muted/30"
                        )}
                      >
                        <span className="w-6 text-center font-bold text-xs">
                          {medal || `${idx + 1}°`}
                        </span>
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.symbol}
                        </span>
                        <span className="font-medium truncate flex-1">{player.nickname}</span>
                        <span className="font-black text-primary">{player.score || 0}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <img src={brandLogoText} alt="NonceDuo" className="h-6 mx-auto opacity-30" />
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Completo</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione cancellerà tutti i giocatori, le prenotazioni e i punteggi.
              Tutti gli utenti collegati verranno espulsi. Sei sicuro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sì, resetta tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmKickAll} onOpenChange={setConfirmKickAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Espelli Tutti</AlertDialogTitle>
            <AlertDialogDescription>
              {`Tutti i ${players.length} giocatori verranno espulsi. I punteggi andranno persi. Sei sicuro?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleKickAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sì, espelli tutti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

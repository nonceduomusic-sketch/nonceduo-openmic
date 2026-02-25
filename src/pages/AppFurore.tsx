import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Zap, Users, Clock, Trophy, ArrowLeft, Check, LogOut } from 'lucide-react';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
  useFurorePlayerActions,
  FURORE_SYMBOLS,
  FURORE_COLORS,
  type FurorePlayer,
} from '@/hooks/useFurore';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

type Phase = 'landing' | 'register' | 'buzzer';

const AppFurore: React.FC = () => {
  const { session, loading } = useFuroreSession();
  const { players } = useFurorePlayers(session?.id);
  const { bookings } = useFuroreBookings(session?.id);
  const { joinSession, exitSession, pressButton } = useFurorePlayerActions();

  const [phase, setPhase] = useState<Phase>('landing');
  const [myPlayer, setMyPlayer] = useState<FurorePlayer | null>(null);
  const [nickname, setNickname] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(FURORE_SYMBOLS[0]);
  const [selectedColor, setSelectedColor] = useState(FURORE_COLORS[0]);
  const [joining, setJoining] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);

  // Check if player already registered (by device fingerprint)
  useEffect(() => {
    if (!session?.id || players.length === 0) return;
    const fp = localStorage.getItem('furore_device_fp');
    if (!fp) return;
    const existing = players.find(p => p.device_fingerprint === fp);
    if (existing) {
      setMyPlayer(existing);
      setPhase('buzzer');
      // Check if already booked
      const myBooking = bookings.find(b => b.player_id === existing.id);
      if (myBooking) setMyPosition(myBooking.position);
    }
  }, [session?.id, players, bookings]);

  // Watch for my booking position in realtime
  useEffect(() => {
    if (!myPlayer) return;
    const myBooking = bookings.find(b => b.player_id === myPlayer.id);
    if (myBooking) setMyPosition(myBooking.position);
  }, [bookings, myPlayer]);

  const handleRegister = async () => {
    if (!session?.id || !nickname.trim()) return;
    setJoining(true);
    const player = await joinSession(session.id, nickname, selectedSymbol, selectedColor);
    if (player) {
      setMyPlayer(player);
      setPhase('buzzer');
    }
    setJoining(false);
  };

  const handlePress = async () => {
    if (!session?.id || !myPlayer || pressing || myPosition !== null) return;
    setPressing(true);
    const pos = await pressButton(session.id, myPlayer.id);
    if (pos && pos > 0) {
      setMyPosition(pos);
    }
    setPressing(false);
  };

  const handleExit = async () => {
    if (!session?.id || !myPlayer) return;
    const ok = await exitSession(myPlayer.id, session.id);
    if (ok) {
      setMyPlayer(null);
      setMyPosition(null);
      setPhase('landing');
    }
  };

  const isBookingOpen = session?.status === 'open';
  const hasBooked = myPosition !== null;
  const isFull = bookings.length >= (session?.max_players ?? 8);
  const showOrder = session?.show_order_to_players ?? true;

  if (loading) {
    return (
      <PageLayout variant="main" title="Non C'è Furore" showBack backPath="/app">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  if (!session) {
    return (
      <PageLayout variant="main" title="Non C'è Furore" showBack backPath="/app">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="text-6xl mb-4">🔥</div>
          <h1 className="text-2xl font-bold mb-2">Non C'è Furore</h1>
          <p className="text-muted-foreground mb-6">
            Preparati per i giochi musicali live! Pulsantiera, quiz dal vivo e molto altro...
          </p>
          <p className="text-sm text-muted-foreground/60">
            La serata non è ancora iniziata. Resta sintonizzato!
          </p>
        </div>
      </PageLayout>
    );
  }

  // ─── LANDING ───
  if (phase === 'landing') {
    return (
      <PageLayout variant="main" title="🔥 Non C'è Furore" showBack backPath="/app">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="text-7xl mb-4">🔥</div>
            <h1 className="text-3xl font-black mb-2">Non C'è Furore</h1>
            <p className="text-muted-foreground">Giochi musicali interattivi dal vivo</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-primary/30">
              <CardContent className="p-6 space-y-4">
                {(session as any)?.show_player_count !== false && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm">{players.length} giocatori collegati</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm">
                    {isBookingOpen ? 'Prenotazioni aperte!' : 'In attesa del via...'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold gap-3"
              onClick={() => setPhase('register')}
            >
              <Zap className="w-5 h-5" />
              Prenota e Gioca
            </Button>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  // ─── REGISTER ───
  if (phase === 'register') {
    return (
      <PageLayout variant="main" title="Registrati" showBack backPath="/app">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => setPhase('landing')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Indietro
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-bold mb-1">Come ti chiami?</h2>
            <p className="text-sm text-muted-foreground">Scegli nickname, simbolo e colore</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nickname *</label>
              <Input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Il tuo nome"
                maxLength={50}
                autoFocus
                className="h-12 text-lg"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Simbolo</label>
              <div className="grid grid-cols-8 gap-2">
                {FURORE_SYMBOLS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSymbol(s)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                      selectedSymbol === s
                        ? "bg-primary/20 ring-2 ring-primary scale-110"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Colore</label>
              <div className="grid grid-cols-6 gap-2">
                {FURORE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-all",
                      selectedColor === c ? "ring-2 ring-foreground scale-110" : "ring-1 ring-border"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold"
              disabled={!nickname.trim() || joining}
              onClick={handleRegister}
            >
              {joining ? 'Entrata in corso...' : 'Entra nella partita'}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ─── BUZZER ───
  return (
    <PageLayout variant="main" title="🔥 Pulsantiera" showBack backPath="/app">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Player Info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: myPlayer?.color || '#FF6B6B' }}
          >
            {myPlayer?.symbol}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{myPlayer?.nickname}</p>
            {(session as any)?.show_player_count !== false ? (
              <p className="text-xs text-muted-foreground">
                {players.length} giocatori collegati
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">In gioco</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleExit} className="gap-1.5 text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
            Esci
          </Button>
        </div>

        {/* Status Banner */}
        <AnimatePresence mode="wait">
          {!isBookingOpen && !hasBooked && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center p-6 rounded-2xl bg-muted/30 border border-border"
            >
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-bold">Prenotazioni chiuse</h2>
              <p className="text-sm text-muted-foreground">Attendi il via dal presentatore</p>
            </motion.div>
          )}

          {isBookingOpen && !hasBooked && !isFull && (
            <motion.div
              key="open"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30 animate-pulse">
                <p className="text-lg font-bold text-primary">🔥 PRENOTAZIONI APERTE — PREMI ORA!</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handlePress}
                disabled={pressing}
                className={cn(
                  "w-full aspect-square max-w-[280px] mx-auto rounded-full flex flex-col items-center justify-center gap-3",
                  "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl shadow-red-500/30",
                  "active:from-red-600 active:to-red-800 transition-all",
                  "disabled:opacity-50"
                )}
                style={{ display: 'flex' }}
              >
                <Zap className="w-16 h-16" />
                <span className="text-2xl font-black">PREMI!</span>
              </motion.button>
            </motion.div>
          )}

          {isBookingOpen && isFull && !hasBooked && (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-6 rounded-2xl bg-destructive/10 border border-destructive/30"
            >
              <p className="text-lg font-bold text-destructive">Posti esauriti!</p>
              <p className="text-sm text-muted-foreground">Tutti i {session?.max_players} posti sono stati prenotati</p>
            </motion.div>
          )}

          {hasBooked && (
            <motion.div
              key="booked"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30">
                <Check className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-bold">Prenotato!</h2>
                {showOrder && (
                  <div className="mt-2">
                    <span className="text-4xl font-black text-primary">{myPosition}°</span>
                    <p className="text-sm text-muted-foreground mt-1">Il tuo ordine di prenotazione</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bookings List (if show_order is enabled) */}
        {showOrder && bookings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Ordine di prenotazione
            </h3>
            {bookings.map(b => {
              const player = players.find(p => p.id === b.player_id);
              if (!player) return null;
              const isMe = player.id === myPlayer?.id;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl",
                    isMe ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
                  )}
                >
                  <span className="text-lg font-bold w-8 text-center">{b.position}°</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.symbol}
                  </div>
                  <span className={cn("font-medium", isMe && "text-primary")}>{player.nickname}</span>
                  {isMe && <Badge variant="secondary" className="ml-auto text-xs">Tu</Badge>}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AppFurore;

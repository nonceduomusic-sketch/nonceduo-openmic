import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Zap, Play, Pause, RotateCcw, Users, Volume2, Eye, EyeOff, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
  useFuroreAdmin,
  FURORE_SOUNDS,
} from '@/hooks/useFurore';

export const AdminFuroreTab: React.FC = () => {
  const { session, loading } = useFuroreSession();
  const { players } = useFurorePlayers(session?.id);
  const { bookings } = useFuroreBookings(session?.id);
  const { createSession, openBookings, closeBookings, resetSession, setMaxPlayers, setShowOrder, setSoundKey } = useFuroreAdmin();

  const handleCreateSession = async () => {
    const s = await createSession();
    if (s) toast.success('Sessione Furore creata');
    else toast.error('Errore nella creazione');
  };

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

  const handleReset = async () => {
    if (!session) return;
    await resetSession(session.id);
    toast.success('Partita resettata');
  };

  const playSound = (key: string) => {
    // Simple beep sounds using Web Audio API
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const soundMap: Record<string, { freq: number; type: OscillatorType; dur: number }> = {
      bell1: { freq: 800, type: 'sine', dur: 0.4 },
      bell2: { freq: 1200, type: 'sine', dur: 0.3 },
      buzzer: { freq: 400, type: 'square', dur: 0.5 },
      horn: { freq: 600, type: 'sawtooth', dur: 0.6 },
      pop: { freq: 1000, type: 'triangle', dur: 0.2 },
    };

    const s = soundMap[key] || soundMap.bell1;
    osc.frequency.value = s.freq;
    osc.type = s.type;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
    osc.start();
    osc.stop(ctx.currentTime + s.dur);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold">Non C'è Furore — Pulsantiera</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestisci prenotazioni e giocatori in tempo reale</p>
        </div>
      </div>

      {/* No session yet */}
      {!session && (
        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nessuna sessione attiva</p>
            <Button onClick={handleCreateSession} className="gap-2">
              <Play className="w-4 h-4" /> Crea nuova sessione
            </Button>
          </CardContent>
        </Card>
      )}

      {session && (
        <>
          {/* Control Buttons */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base">Controlli</CardTitle>
                <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                  {session.status === 'open' ? '🟢 APERTE' : '🔴 CHIUSE'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <Button
                  onClick={handleOpen}
                  disabled={session.status === 'open'}
                  className="gap-2 h-12 sm:h-10"
                  variant={session.status === 'open' ? 'secondary' : 'default'}
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm">Apri</span>
                </Button>
                <Button
                  onClick={handleClose}
                  disabled={session.status === 'closed'}
                  variant="outline"
                  className="gap-2 h-12 sm:h-10"
                >
                  <Pause className="w-4 h-4" />
                  <span className="text-sm">Chiudi</span>
                </Button>
                <Button
                  onClick={handleReset}
                  variant="destructive"
                  className="gap-2 h-12 sm:h-10 col-span-2 sm:col-span-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm">Reset</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-sm sm:text-base">Impostazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-sm">Max prenotazioni</Label>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Numero massimo giocatori</p>
                </div>
                <Input
                  type="number"
                  min={2}
                  max={50}
                  value={session.max_players}
                  onChange={e => setMaxPlayers(session.id, parseInt(e.target.value) || 8)}
                  className="w-20 h-9 text-center"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-sm">Mostra ordine ai giocatori</Label>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">I giocatori vedono la posizione</p>
                </div>
                <Switch
                  checked={session.show_order_to_players}
                  onCheckedChange={v => setShowOrder(session.id, v)}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="font-medium text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> Suono prenotazione
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FURORE_SOUNDS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setSoundKey(session.id, s.key);
                        playSound(s.key);
                        toast.success(`Suono: ${s.label}`);
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all",
                        session.sound_key === s.key
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Players & Bookings */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Giocatori ({players.length}) — Prenotati ({bookings.length}/{session.max_players})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {bookings.length === 0 && players.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nessun giocatore collegato</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map(b => {
                    const player = players.find(p => p.id === b.player_id);
                    if (!player) return null;
                    return (
                      <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                        <span className="text-lg font-bold w-8 text-center">{b.position}°</span>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.symbol}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{player.nickname}</p>
                        </div>
                        {b.position === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                    );
                  })}

                  {/* Show unbooked players */}
                  {players.filter(p => !bookings.find(b => b.player_id === p.id)).map(player => (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed opacity-50">
                      <span className="text-lg font-bold w-8 text-center">—</span>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.nickname}</p>
                        <p className="text-[11px] text-muted-foreground">In attesa</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

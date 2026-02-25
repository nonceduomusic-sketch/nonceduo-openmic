import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Zap, Play, Pause, RotateCcw, Users, Volume2, Eye, EyeOff, Crown, ExternalLink, QrCode, Tv, Gamepad2, Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
  useFuroreAdmin,
  FURORE_SOUNDS,
} from '@/hooks/useFurore';

// ─── Professional Sound Engine ───
const SOUND_PRESETS: Record<string, { label: string; emoji: string; category: 'real' | 'synth'; play: (ctx: AudioContext) => void }> = {};

// Synthetic sounds using AudioContext Pro (multi-oscillator, ADSR, reverb)
function createSynthSound(
  ctx: AudioContext,
  frequencies: number[],
  types: OscillatorType[],
  duration: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  detune: number = 0,
) {
  const masterGain = ctx.createGain();
  // Simple convolver for reverb-like effect
  const delayNode = ctx.createDelay();
  delayNode.delayTime.value = 0.08;
  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = 0.2;
  
  masterGain.connect(ctx.destination);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  delayNode.connect(masterGain);

  const now = ctx.currentTime;
  
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.frequency.value = freq;
    osc.type = types[i % types.length];
    osc.detune.value = detune * (i % 2 === 0 ? 1 : -1);
    
    // ADSR envelope
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.25 / frequencies.length, now + attack);
    oscGain.gain.linearRampToValueAtTime(sustain * 0.25 / frequencies.length, now + attack + decay);
    oscGain.gain.linearRampToValueAtTime(sustain * 0.25 / frequencies.length, now + duration - release);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    oscGain.connect(delayNode);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
  });
}

// Register all 8 synth sounds
const SYNTH_SOUNDS = [
  {
    key: 'synth_quiz_classic',
    label: 'Quiz Classico',
    emoji: '🔔',
    play: (ctx: AudioContext) => createSynthSound(ctx, [880, 1320, 1760], ['sine', 'triangle', 'sine'], 0.5, 0.01, 0.1, 0.7, 0.15, 5),
  },
  {
    key: 'synth_game_buzzer',
    label: 'Buzzer Energico',
    emoji: '🚨',
    play: (ctx: AudioContext) => createSynthSound(ctx, [440, 554, 659], ['square', 'sawtooth', 'square'], 0.6, 0.005, 0.05, 0.8, 0.2, 8),
  },
  {
    key: 'synth_correct_chime',
    label: 'Risposta Esatta',
    emoji: '✅',
    play: (ctx: AudioContext) => {
      createSynthSound(ctx, [523, 659, 784], ['sine', 'sine', 'triangle'], 0.4, 0.01, 0.08, 0.6, 0.1, 3);
      setTimeout(() => createSynthSound(ctx, [784, 988, 1047], ['sine', 'sine', 'triangle'], 0.3, 0.01, 0.06, 0.5, 0.1, 3), 200);
    },
  },
  {
    key: 'synth_wrong_soft',
    label: 'Errore Morbido',
    emoji: '❌',
    play: (ctx: AudioContext) => createSynthSound(ctx, [300, 280], ['sine', 'triangle'], 0.7, 0.01, 0.3, 0.4, 0.3, 12),
  },
  {
    key: 'synth_reveal_tension',
    label: 'Suspense Rivelazione',
    emoji: '🥁',
    play: (ctx: AudioContext) => createSynthSound(ctx, [220, 330, 440], ['sawtooth', 'triangle', 'sine'], 1.0, 0.3, 0.2, 0.8, 0.3, 6),
  },
  {
    key: 'synth_hit_energy',
    label: 'Hit Energetico',
    emoji: '💥',
    play: (ctx: AudioContext) => createSynthSound(ctx, [600, 900, 1200, 1500], ['square', 'sawtooth', 'square', 'sine'], 0.35, 0.005, 0.05, 0.6, 0.15, 10),
  },
  {
    key: 'synth_victory_fanfare',
    label: 'Fanfara Vittoria',
    emoji: '🏆',
    play: (ctx: AudioContext) => {
      createSynthSound(ctx, [523, 659], ['sine', 'triangle'], 0.25, 0.01, 0.05, 0.7, 0.05, 4);
      setTimeout(() => createSynthSound(ctx, [659, 784], ['sine', 'triangle'], 0.25, 0.01, 0.05, 0.7, 0.05, 4), 180);
      setTimeout(() => createSynthSound(ctx, [784, 1047], ['sine', 'triangle'], 0.5, 0.01, 0.1, 0.8, 0.15, 4), 360);
    },
  },
  {
    key: 'synth_countdown_tick',
    label: 'Countdown Tick',
    emoji: '⏱️',
    play: (ctx: AudioContext) => createSynthSound(ctx, [1000, 2000], ['sine', 'sine'], 0.15, 0.002, 0.02, 0.5, 0.05, 0),
  },
];

const ALL_SOUNDS = SYNTH_SOUNDS.map(s => ({
  key: s.key,
  label: s.label,
  emoji: s.emoji,
}));

// Audio context singleton
let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playSoundByKey(key: string) {
  const synth = SYNTH_SOUNDS.find(s => s.key === key);
  if (synth) {
    synth.play(getAudioContext());
    return;
  }
  // Legacy fallback for old keys
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

// ─── Quick Links with QR ───
const QuickLinksSection: React.FC = () => {
  const baseUrl = window.location.origin;
  const links = [
    { label: 'Pulsantiera (Utenti)', url: `${baseUrl}/app/furore`, icon: Zap },
    { label: 'Trasmetti (TV)', url: `${baseUrl}/trasmetti`, icon: Tv },
    { label: 'Giochi (Utenti)', url: `${baseUrl}/app/giochi`, icon: Gamepad2 },
  ];

  const copyToClipboard = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(`Link "${label}" copiato!`);
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <ExternalLink className="w-4 h-4" /> Link Rapidi & QR
        </CardTitle>
        <CardDescription className="text-xs">Condividi con concorrenti e staff</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-3">
        {links.map(link => (
          <div key={link.url} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
            <link.icon className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{link.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{link.url}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => copyToClipboard(link.url, link.label)}>
                📋
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => window.open(link.url, '_blank')}>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const AdminFuroreTab: React.FC = () => {
  const { session, loading } = useFuroreSession();
  const { players } = useFurorePlayers(session?.id);
  const { bookings } = useFuroreBookings(session?.id);
  const { createSession, openBookings, closeBookings, resetSession, setMaxPlayers, setShowOrder, setShowPlayerCount, setSoundKey, deletePlayer, updatePlayer } = useFuroreAdmin();

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
        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold">Non C'è Furore — Pulsantiera</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestisci prenotazioni e giocatori in tempo reale</p>
        </div>
      </div>

      {/* Quick Links */}
      <QuickLinksSection />

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
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-sm">Mostra giocatori collegati</Label>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">I giocatori vedono quanti sono collegati</p>
                </div>
                <Switch
                  checked={session.show_player_count ?? true}
                  onCheckedChange={v => setShowPlayerCount(session.id, v)}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> Suono prenotazione
                </Label>
                <p className="text-[11px] text-muted-foreground mb-2">Suoni sintetici professionali stile quiz TV</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_SOUNDS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setSoundKey(session.id, s.key);
                        playSoundByKey(s.key);
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
                      <span className="flex-1">{s.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSoundByKey(s.key);
                        }}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Players & Bookings */}
          <PlayersManagementCard
            players={players}
            bookings={bookings}
            session={session}
            onDeletePlayer={async (playerId) => {
              await deletePlayer(playerId, session.id);
              toast.success('Giocatore eliminato');
            }}
            onUpdatePlayer={async (playerId, updates) => {
              const ok = await updatePlayer(playerId, updates);
              if (ok) toast.success('Giocatore aggiornato');
              else toast.error('Errore aggiornamento');
            }}
          />
        </>
      )}
    </div>
  );
};

// ─── Players Management Card with Edit/Delete ───
const PlayersManagementCard: React.FC<{
  players: any[];
  bookings: any[];
  session: any;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onUpdatePlayer: (playerId: string, updates: { nickname?: string; symbol?: string }) => Promise<void>;
}> = ({ players, bookings, session, onDeletePlayer, onUpdatePlayer }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editSymbol, setEditSymbol] = useState('');

  const startEdit = (player: any) => {
    setEditingId(player.id);
    setEditNickname(player.nickname);
    setEditSymbol(player.symbol);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdatePlayer(editingId, { nickname: editNickname.trim(), symbol: editSymbol });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
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
              const isEditing = editingId === player.id;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                  <span className="text-lg font-bold w-8 text-center">{b.position}°</span>
                  {isEditing ? (
                    <>
                      <Input
                        value={editSymbol}
                        onChange={e => setEditSymbol(e.target.value)}
                        className="w-14 h-10 text-center text-xl p-0"
                        maxLength={2}
                      />
                      <Input
                        value={editNickname}
                        onChange={e => setEditNickname(e.target.value)}
                        className="flex-1 h-10"
                        maxLength={50}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.nickname}</p>
                      </div>
                      {b.position === 1 && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => startEdit(player)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onDeletePlayer(player.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Show unbooked players */}
            {players.filter(p => !bookings.find(b => b.player_id === p.id)).map(player => {
              const isEditing = editingId === player.id;
              return (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed opacity-70">
                  <span className="text-lg font-bold w-8 text-center">—</span>
                  {isEditing ? (
                    <>
                      <Input
                        value={editSymbol}
                        onChange={e => setEditSymbol(e.target.value)}
                        className="w-14 h-10 text-center text-xl p-0"
                        maxLength={2}
                      />
                      <Input
                        value={editNickname}
                        onChange={e => setEditNickname(e.target.value)}
                        className="flex-1 h-10"
                        maxLength={50}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.nickname}</p>
                        <p className="text-[11px] text-muted-foreground">In attesa</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => startEdit(player)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onDeletePlayer(player.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

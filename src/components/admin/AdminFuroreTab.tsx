import React, { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuizQuestionSets, useQuizQuestions, type QuizQuestion } from '@/hooks/useGames';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Zap, Play, Pause, RotateCcw, Users, Volume2, Eye, EyeOff, Crown, ExternalLink, QrCode, Tv, Gamepad2, Pencil, Trash2, Check, X, Trophy, BarChart3, UserX, Award, HelpCircle, Send, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
  useFuroreAdmin,
  FURORE_SOUNDS,
  DEFAULT_SCORING_RULES,
  FuroreScoringRules,
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

// ─── Quick Links with QR + Telecomando ───
const QuickLinksSection: React.FC = () => {
  const baseUrl = window.location.origin;
  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [remotePinRequired, setRemotePinRequired] = useState(true);
  const [remotePin, setRemotePin] = useState('');
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState(false);
  const [editPinValue, setEditPinValue] = useState('');

  // Load or create remote access
  useEffect(() => {
    const loadRemote = async () => {
      const { data } = await supabase
        .from('furore_remote_access')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setRemoteToken(data.access_token);
        setRemotePinRequired(data.pin_required);
        setRemotePin(data.pin_code);
        setRemoteId(data.id);
      } else {
        // Create one automatically
        const { data: newData } = await supabase
          .from('furore_remote_access')
          .insert({ name: 'Telecomando Furore' })
          .select()
          .single();
        if (newData) {
          setRemoteToken(newData.access_token);
          setRemotePinRequired(newData.pin_required);
          setRemotePin(newData.pin_code);
          setRemoteId(newData.id);
        }
      }
      setLoadingRemote(false);
    };
    loadRemote();
  }, []);

  const togglePinRequired = async () => {
    if (!remoteId) return;
    const newVal = !remotePinRequired;
    await supabase.from('furore_remote_access').update({ pin_required: newVal }).eq('id', remoteId);
    setRemotePinRequired(newVal);
    toast.success(newVal ? 'PIN richiesto per il telecomando' : 'PIN disattivato — accesso diretto');
  };

  const savePin = async () => {
    if (!remoteId || !editPinValue.trim()) return;
    const newPin = editPinValue.trim().toUpperCase();
    if (newPin.length < 2 || newPin.length > 12) {
      toast.error('Il PIN deve essere tra 2 e 12 caratteri');
      return;
    }
    const { error } = await supabase.from('furore_remote_access').update({ pin_code: newPin }).eq('id', remoteId);
    if (error) {
      toast.error('Errore nel salvare il PIN');
      return;
    }
    setRemotePin(newPin);
    setEditingPin(false);
    toast.success('PIN aggiornato!');
  };

  const regenerateToken = async () => {
    if (!remoteId) return;
    // Deactivate old, create new
    await supabase.from('furore_remote_access').update({ is_active: false }).eq('id', remoteId);
    const { data } = await supabase
      .from('furore_remote_access')
      .insert({ name: 'Telecomando Furore' })
      .select()
      .single();
    if (data) {
      setRemoteToken(data.access_token);
      setRemotePinRequired(data.pin_required);
      setRemotePin(data.pin_code);
      setRemoteId(data.id);
      toast.success('Nuovo telecomando generato!');
    }
  };

  const remoteUrl = remoteToken ? `${baseUrl}/furore-remote/${remoteToken}` : '';

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
        {/* Standard links */}
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
              <Button
                variant="ghost" size="sm" className="h-8 px-2"
                onClick={() => setShowQR(showQR === link.url ? null : link.url)}
              >
                <QrCode className="w-3.5 h-3.5" />
              </Button>
            </div>
            {showQR === link.url && (
              <div className="w-full mt-2">
                <FuroreQRDisplay url={link.url} />
              </div>
            )}
          </div>
        ))}

        {/* Telecomando Furore - special section */}
        <Separator />
        {loadingRemote ? (
          <div className="text-center py-3">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : remoteToken ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
              <Zap className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">🎮 Telecomando Furore</p>
                <p className="text-[11px] text-muted-foreground truncate">{remoteUrl}</p>
                {remotePinRequired && !editingPin && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[11px] font-mono text-primary">PIN: {remotePin}</p>
                    <button onClick={() => { setEditPinValue(remotePin); setEditingPin(true); }} className="text-muted-foreground hover:text-primary">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {remotePinRequired && editingPin && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Input
                      value={editPinValue}
                      onChange={e => setEditPinValue(e.target.value.toUpperCase())}
                      placeholder="Nuovo PIN"
                      maxLength={12}
                      className="h-6 text-xs font-mono w-24 px-1.5"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') savePin(); if (e.key === 'Escape') setEditingPin(false); }}
                    />
                    <button onClick={savePin} className="text-green-600 hover:text-green-500"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingPin(false)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => copyToClipboard(remoteUrl, 'Telecomando Furore')}>
                  📋
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => window.open(remoteUrl, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-8 px-2"
                  onClick={() => setShowQR(showQR === 'furore-remote' ? null : 'furore-remote')}
                >
                  <QrCode className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {showQR === 'furore-remote' && (
              <FuroreQRDisplay url={remoteUrl} />
            )}
            <div className="flex items-center gap-2 justify-between px-1">
              <div className="flex items-center gap-2">
                <Switch checked={remotePinRequired} onCheckedChange={togglePinRequired} />
                <Label className="text-xs">PIN richiesto</Label>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={regenerateToken}>
                <RotateCcw className="w-3 h-3 mr-1" /> Rigenera
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

// QR Code display component
const FuroreQRDisplay: React.FC<{ url: string }> = ({ url }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    });
  }, [url]);

  return (
    <div className="flex justify-center py-3">
      <canvas ref={canvasRef} className="rounded-lg" />
    </div>
  );
};

export const AdminFuroreTab: React.FC = () => {
  const { session, loading } = useFuroreSession();
  const { players, refetch: refetchPlayers } = useFurorePlayers(session?.id);
  const { bookings } = useFuroreBookings(session?.id);
  const { createSession, openBookings, closeBookings, resetSession, resetBookingsOnly, setMaxPlayers, setShowOrder, setShowPlayerCount, setShowBookings, setShowLeaderboard, setSoundKey, deletePlayer, kickAllPlayers, updatePlayer, resetScores, setScoringRules, setAutoScoring, publishQuizQuestion, revealQuizAnswer, clearQuizQuestion, setPlayerScore } = useFuroreAdmin();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmKickAll, setConfirmKickAll] = useState(false);
  const [showAssignScore, setShowAssignScore] = useState(false);
  const [assignPlayerId, setAssignPlayerId] = useState<string | null>(null);
  const [assignScoreValue, setAssignScoreValue] = useState(0);

  // Quiz state
  const [quizSetFilter, setQuizSetFilter] = useState<string>('all');
  const [quizSearchQuery, setQuizSearchQuery] = useState('');
  const { data: questionSets } = useQuizQuestionSets();
  const { data: quizQuestions } = useQuizQuestions(quizSetFilter === 'all' ? undefined : quizSetFilter === 'general' ? undefined : quizSetFilter);
  
  const filteredQuestions = React.useMemo(() => {
    if (!quizQuestions) return [];
    let result = quizQuestions;
    if (quizSetFilter === 'general') result = result.filter(q => !q.question_set_id);
    if (quizSearchQuery.trim()) {
      const q = quizSearchQuery.toLowerCase();
      result = result.filter(item => {
        const setName = questionSets?.find(s => s.id === item.question_set_id)?.name || '';
        return item.question_text.toLowerCase().includes(q) || setName.toLowerCase().includes(q);
      });
    }
    return result;
  }, [quizQuestions, quizSetFilter, quizSearchQuery, questionSets]);

  const activeQuizQuestion = React.useMemo(() => {
    if (!session?.quiz_question_id || !quizQuestions) return null;
    return quizQuestions.find(q => q.id === session.quiz_question_id) || null;
  }, [session?.quiz_question_id, quizQuestions]);

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

  const handleResetBookings = async () => {
    if (!session) return;
    // First verify bookings exist in DB before calling award
    const { data: dbBookings, error: checkErr } = await supabase
      .from('furore_bookings')
      .select('id, player_id, position')
      .eq('session_id', session.id);
    console.log('[Furore Admin] Reset & Apri - session:', session.id, 'local bookings:', bookings.length, 'DB bookings:', dbBookings?.length, checkErr);
    
    const result = await resetBookingsOnly(session.id);
    console.log('[Furore Admin] Reset & Apri result:', result);
    
    // Force immediate refetch of players to show updated scores
    await refetchPlayers();
    toast.success('Prenotazioni resettate e riaperte!');
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
    toast.success('Tutti i giocatori sono stati espulsi');
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
                <Badge 
                  variant={session.status === 'open' ? 'default' : 'secondary'} 
                  className={cn("text-xs", session.status === 'open' && "bg-green-600 hover:bg-green-600")}
                >
                  {session.status === 'open' ? '🟢 APERTE' : bookings.length > 0 ? '⏸️ STANDBY' : '🔴 IN ATTESA'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Button
                  onClick={handleClose}
                  disabled={session.status === 'closed'}
                  variant={session.status === 'closed' ? 'secondary' : 'outline'}
                  className="gap-2 h-12 sm:h-10"
                >
                  <Pause className="w-4 h-4" />
                  <span className="text-sm">Standby</span>
                </Button>
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
                  onClick={handleResetBookings}
                  variant="outline"
                  className="gap-2 h-12 sm:h-10 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm">Reset & Apri</span>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setConfirmReset(true)}
                  variant="destructive"
                  className="gap-2 h-10"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm">Reset Completo</span>
                </Button>
                <Button
                  onClick={() => setConfirmKickAll(true)}
                  variant="outline"
                  className="gap-2 h-10 border-destructive/50 text-destructive hover:bg-destructive/10"
                  size="sm"
                  disabled={players.length === 0}
                >
                  <UserX className="w-4 h-4" />
                  <span className="text-sm">Espelli Tutti</span>
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="font-medium text-sm">Mostra su TV</Label>
                <Button
                  onClick={() => {
                    const newVal = !(session as any).show_leaderboard;
                    setShowLeaderboard(session.id, newVal);
                    toast.success(newVal ? 'Classifica visibile su TV' : 'Classifica nascosta da TV');
                  }}
                  variant={(session as any).show_leaderboard ? 'default' : 'outline'}
                  className="gap-2 w-full h-12 sm:h-10"
                >
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">{(session as any).show_leaderboard ? '🏆 Classifica su TV — ATTIVA' : 'Mostra Classifica su TV'}</span>
                </Button>
              </div>
              {/* Manual Score Assignment Button */}
              {!session.auto_scoring && players.length > 0 && (
                <>
                  <Separator />
                  <Button
                    onClick={() => { setShowAssignScore(true); setAssignPlayerId(null); setAssignScoreValue(0); }}
                    variant="outline"
                    className="gap-2 w-full h-12 sm:h-10 border-primary/50 text-primary hover:bg-primary/10"
                  >
                    <Award className="w-4 h-4" />
                    <span className="text-sm">Assegna punti</span>
                  </Button>
                </>
              )}
              <p className="text-[11px] text-muted-foreground">
                <strong>Standby</strong>: prenotazioni bloccate, in attesa. 
                <strong> Apri</strong>: i giocatori possono prenotarsi. 
                <strong> Reset & Apri</strong>: {session.auto_scoring ? 'assegna punti e riapre' : 'cancella prenotazioni e riapre'}. 
                <strong> Reset Completo</strong>: cancella tutto e butta fuori tutti.
                <strong> Espelli Tutti</strong>: butta fuori tutti senza resettare punteggi.
              </p>
            </CardContent>
          </Card>

          {/* Quiz Mode Card */}
          <Card className="border-amber-500/30">
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" /> Modalità Quiz
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Pubblica domande su /trasmetti durante la partita</p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-3">
              {session.quiz_question_id && activeQuizQuestion ? (
                /* Active question controls */
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border-2 border-amber-500/40 bg-amber-500/5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Domanda pubblicata:</p>
                    <p className="font-bold text-sm">{activeQuizQuestion.question_text}</p>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const text = activeQuizQuestion[`option_${opt.toLowerCase()}` as keyof QuizQuestion] as string | null;
                        if (!text) return null;
                        const isCorrect = activeQuizQuestion.correct_option === opt;
                        return (
                          <div key={opt} className={cn(
                            "text-xs p-1.5 rounded border",
                            session.quiz_answer_revealed && isCorrect && "bg-green-500/20 border-green-500/50 font-bold",
                            session.quiz_answer_revealed && !isCorrect && "opacity-50"
                          )}>
                            <span className="font-bold">{opt}.</span> {text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {!session.quiz_answer_revealed ? (
                      <Button
                        onClick={async () => {
                          await revealQuizAnswer(session.id);
                          toast.success('Risposta rivelata su TV!');
                        }}
                        className="gap-1.5 h-10 bg-green-600 hover:bg-green-700"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Mostra risposta</span>
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled className="gap-1.5 h-10">
                        <Check className="w-4 h-4" />
                        <span className="text-xs">Risposta visibile</span>
                      </Button>
                    )}
                    <Button
                      onClick={async () => {
                        await clearQuizQuestion(session.id);
                        toast.success('Domanda rimossa da TV');
                      }}
                      variant="outline"
                      className="gap-1.5 h-10 border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                      <span className="text-xs">Rimuovi domanda</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Question selector */
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium shrink-0">Elenco:</Label>
                    <Select value={quizSetFilter} onValueChange={setQuizSetFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte le domande</SelectItem>
                        <SelectItem value="general">Generali (senza elenco)</SelectItem>
                        {questionSets?.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="text"
                    value={quizSearchQuery}
                    onChange={e => setQuizSearchQuery(e.target.value)}
                    placeholder="Cerca domanda..."
                    className="h-8 text-xs"
                  />
                  {filteredQuestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Nessuna domanda disponibile</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {filteredQuestions.map(q => (
                        <button
                          key={q.id}
                          onClick={async () => {
                            await publishQuizQuestion(session.id, q.id);
                            toast.success('Domanda pubblicata su TV!');
                          }}
                          className="flex items-center gap-2 w-full p-2.5 rounded-lg border text-left text-xs hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
                        >
                          <Send className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="flex-1 truncate">{q.question_text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Clicca su una domanda per pubblicarla su /trasmetti. Le prenotazioni rimangono attive.
                  </p>
                </div>
              )}
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
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-sm">Mostra prenotati ai giocatori</Label>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">I giocatori vedono la lista delle squadre prenotate</p>
                </div>
                <Switch
                  checked={session.show_bookings_to_players ?? true}
                  onCheckedChange={v => setShowBookings(session.id, v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-sm">Punteggio automatico</Label>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Se disattivato, i punti si assegnano solo manualmente dalla classifica</p>
                </div>
                <Switch
                  checked={session.auto_scoring ?? true}
                  onCheckedChange={v => {
                    setAutoScoring(session.id, v);
                    toast.success(v ? 'Punteggio automatico attivato' : 'Punteggio automatico disattivato — gestione manuale');
                  }}
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

          {/* Live Players, Bookings & Leaderboard — Tabbed */}
          <FurorePlayersAndLeaderboard
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
            onResetScores={async () => {
              await resetScores(session.id);
              toast.success('Punteggi azzerati');
            }}
            onSetPlayerScore={async (playerId, score) => {
              const ok = await setPlayerScore(playerId, score);
              if (ok) toast.success('Punteggio aggiornato');
              else toast.error('Errore');
            }}
            onSetScoringRules={async (rules) => {
              await setScoringRules(session.id, rules);
              toast.success('Punteggi per posizione aggiornati');
            }}
          />
        </>
      )}

      {/* Assign Score Dialog */}
      <Dialog open={showAssignScore} onOpenChange={setShowAssignScore}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" /> Assegna punti
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Seleziona giocatore</Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAssignPlayerId(p.id)}
                    className={cn(
                      "flex items-center gap-2 w-full p-2.5 rounded-lg border text-left text-sm transition-all",
                      assignPlayerId === p.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0" style={{ backgroundColor: p.color }}>{p.symbol}</span>
                    <span className="flex-1 truncate">{p.nickname}</span>
                    <span className="text-xs text-muted-foreground">{p.score || 0} pt</span>
                  </button>
                ))}
              </div>
            </div>
            {assignPlayerId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Punti da aggiungere</Label>
                <Input
                  type="number"
                  value={assignScoreValue}
                  onChange={e => setAssignScoreValue(parseInt(e.target.value) || 0)}
                  className="text-center text-lg font-bold"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Nuovo totale: {(players.find(p => p.id === assignPlayerId)?.score || 0) + assignScoreValue} pt
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignScore(false)}>Annulla</Button>
            <Button
              disabled={!assignPlayerId || assignScoreValue === 0}
              onClick={async () => {
                if (!assignPlayerId) return;
                const player = players.find(p => p.id === assignPlayerId);
                const newScore = (player?.score || 0) + assignScoreValue;
                const ok = await setPlayerScore(assignPlayerId, newScore);
                if (ok) {
                  toast.success(`${assignScoreValue > 0 ? '+' : ''}${assignScoreValue} punti a ${player?.nickname}`);
                  await refetchPlayers();
                  setAssignPlayerId(null);
                  setAssignScoreValue(0);
                } else {
                  toast.error('Errore nell\'assegnazione');
                }
              }}
            >
              <Award className="w-4 h-4 mr-1" /> Assegna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Completo</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione cancellerà tutti i giocatori, le prenotazioni e i punteggi. 
              Tutti gli utenti collegati verranno espulsi e dovranno registrarsi di nuovo. 
              Sei sicuro di voler procedere?
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
              {`Tutti i ${players.length} giocatori verranno espulsi dalla partita. I punteggi accumulati andranno persi. Sei sicuro?`}
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
};

// ─── Players & Leaderboard Tabbed Card ───
const FurorePlayersAndLeaderboard: React.FC<{
  players: any[];
  bookings: any[];
  session: any;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onUpdatePlayer: (playerId: string, updates: { nickname?: string; symbol?: string }) => Promise<void>;
  onResetScores: () => Promise<void>;
  onSetPlayerScore: (playerId: string, score: number) => Promise<void>;
  onSetScoringRules: (rules: FuroreScoringRules) => Promise<void>;
}> = ({ players, bookings, session, onDeletePlayer, onUpdatePlayer, onResetScores, onSetPlayerScore, onSetScoringRules }) => {
  const [activeTab, setActiveTab] = useState<'players' | 'leaderboard'>('players');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editSymbol, setEditSymbol] = useState('');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState(0);
  const [scoringRules, setScoringRulesLocal] = useState<FuroreScoringRules>(
    session?.scoring_rules || DEFAULT_SCORING_RULES
  );

  useEffect(() => {
    if (session?.scoring_rules) setScoringRulesLocal(session.scoring_rules);
  }, [session?.scoring_rules]);

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

  const startScoreEdit = (player: any) => {
    setEditingScoreId(player.id);
    setEditScoreValue(player.score || 0);
  };

  const saveScoreEdit = async () => {
    if (!editingScoreId) return;
    await onSetPlayerScore(editingScoreId, editScoreValue);
    setEditingScoreId(null);
  };

  const handleScoringRuleChange = (pos: string, value: number) => {
    const updated = { ...scoringRules, [pos]: value };
    setScoringRulesLocal(updated);
    onSetScoringRules(updated);
  };

  const leaderboard = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <Card>
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            {activeTab === 'players' ? <Users className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            {activeTab === 'players'
              ? `Giocatori (${players.length}) — Prenotati (${bookings.length}/${session.max_players})`
              : `Classifica (${players.length} giocatori)`
            }
          </CardTitle>
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant={activeTab === 'players' ? 'default' : 'outline'} size="sm" className="gap-1.5 h-8" onClick={() => setActiveTab('players')}>
            <Users className="w-3.5 h-3.5" /> Prenotati
          </Button>
          <Button variant={activeTab === 'leaderboard' ? 'default' : 'outline'} size="sm" className="gap-1.5 h-8" onClick={() => setActiveTab('leaderboard')}>
            <Trophy className="w-3.5 h-3.5" /> Classifica
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {activeTab === 'players' ? (
          bookings.length === 0 && players.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun giocatore collegato</p>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => {
                const player = players.find((p: any) => p.id === b.player_id);
                if (!player) return null;
                const isEditing = editingId === player.id;
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                    <span className="text-lg font-bold w-8 text-center">{b.position}°</span>
                    {isEditing ? (
                      <>
                        <Input value={editSymbol} onChange={e => setEditSymbol(e.target.value)} className="w-14 h-10 text-center text-xl p-0" maxLength={2} />
                        <Input value={editNickname} onChange={e => setEditNickname(e.target.value)} className="flex-1 h-10" maxLength={50} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}><Check className="w-4 h-4 text-green-500" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: player.color }}>{player.symbol}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{player.nickname}</p>
                        </div>
                        {b.position === 1 && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => startEdit(player)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onDeletePlayer(player.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                  </div>
                );
              })}
              {players.filter((p: any) => !bookings.find((b: any) => b.player_id === p.id)).map((player: any) => (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed opacity-70">
                  <span className="text-lg font-bold w-8 text-center">—</span>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: player.color }}>{player.symbol}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{player.nickname}</p>
                    <p className="text-[11px] text-muted-foreground">In attesa</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => startEdit(player)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onDeletePlayer(player.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* Scoring Rules Config */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <Label className="font-medium text-sm flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Punti per posizione (manche)
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {['1', '2', '3', '4', '5'].map(pos => (
                  <div key={pos} className="text-center space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {pos === '1' ? '🥇' : pos === '2' ? '🥈' : pos === '3' ? '🥉' : `${pos}°`}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={scoringRules[pos] ?? 0}
                      onChange={e => handleScoringRuleChange(pos, parseInt(e.target.value) || 0)}
                      className="h-9 text-center text-sm font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">pt</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun giocatore</p>
            ) : (
              <>
                {leaderboard.map((player: any, index: number) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`;
                  const isEditingScore = editingScoreId === player.id;
                  return (
                    <div key={player.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      index === 0 && "bg-yellow-500/10 border-yellow-500/30",
                      index === 1 && "bg-gray-300/10 border-gray-400/30",
                      index === 2 && "bg-orange-500/10 border-orange-500/30",
                      index > 2 && "bg-card/50"
                    )}>
                      <span className="text-lg font-bold w-8 text-center">{medal}</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: player.color }}>{player.symbol}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.nickname}</p>
                      </div>
                      {isEditingScore ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={editScoreValue}
                            onChange={e => setEditScoreValue(parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center text-sm"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveScoreEdit(); if (e.key === 'Escape') setEditingScoreId(null); }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveScoreEdit}><Check className="w-3.5 h-3.5 text-green-500" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingScoreId(null)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-sm font-bold gap-1 cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => startScoreEdit(player)}
                        >
                          <BarChart3 className="w-3 h-3" />
                          {player.score || 0} pt
                          <Pencil className="w-2.5 h-2.5 ml-1 opacity-50" />
                        </Badge>
                      )}
                    </div>
                  );
                })}
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-destructive hover:bg-destructive/10"
                  onClick={onResetScores}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Azzera tutti i punteggi
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

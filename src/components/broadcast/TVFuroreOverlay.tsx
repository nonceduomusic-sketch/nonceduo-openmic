import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
} from '@/hooks/useFurore';
import { type QuizQuestion } from '@/hooks/useGames';
import brandLogo from '@/assets/brand-logo-splash.png';

/**
 * TV overlay for /trasmetti — shows Furore buzzer board
 * Shows idle screen when no session or no activity
 */
export const TVFuroreOverlay: React.FC = () => {
  const { session, loading } = useFuroreSession();
  const { players, refetch: refetchPlayers } = useFurorePlayers(session?.id);
  const { bookings, refetch: refetchBookings } = useFuroreBookings(session?.id);
  const lastBookingCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);

  // Fetch quiz question when session has one
  useEffect(() => {
    if (!session?.quiz_question_id) {
      setQuizQuestion(null);
      return;
    }
    const fetchQuestion = async () => {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('id', session.quiz_question_id)
        .maybeSingle();
      if (data) setQuizQuestion(data as unknown as QuizQuestion);
    };
    fetchQuestion();
  }, [session?.quiz_question_id]);

  // Force refetch when session changes (status or updated_at)
  useEffect(() => {
    if (session?.id) {
      refetchBookings();
      refetchPlayers();
    }
  }, [session?.status, session?.updated_at, refetchBookings, refetchPlayers]);

  // Play sound when a new booking arrives
  const playBuzzerSound = useCallback((soundKey: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
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

      const s = soundMap[soundKey] || soundMap.bell1;
      osc.frequency.value = s.freq;
      osc.type = s.type;
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
      osc.start();
      osc.stop(ctx.currentTime + s.dur);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, []);

  // Detect new bookings and play sound
  useEffect(() => {
    if (bookings.length > lastBookingCountRef.current && lastBookingCountRef.current > 0) {
      playBuzzerSound(session?.sound_key || 'bell1');
    }
    lastBookingCountRef.current = bookings.length;
  }, [bookings.length, session?.sound_key, playBuzzerSound]);

  if (loading) return null;

  const isOpen = session?.status === 'open';
  const isClosed = session?.status === 'closed';

  // ─── IDLE SCREEN — no session or no activity ───
  if (!session) {
    return (
      <div className="fixed inset-0 z-[55] bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col items-center justify-center overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-red-500/8 rounded-full blur-[250px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-orange-500/6 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '3.5s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo */}
          <motion.img
            src={brandLogo}
            alt="Non C'è Duo"
            className="w-auto h-32 md:h-48 object-contain drop-shadow-2xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, delay: 0.2 }}
          />

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-red-500 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                🔥 Non C'è Furore
              </span>
            </h1>
            <p className="mt-4 text-lg md:text-2xl text-white/40 font-medium">
              Giochi musicali interattivi dal vivo
            </p>
          </motion.div>

          {/* Animated dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-3 mt-4"
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-white/20"
                animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  const maxSlots = session.max_players;
  const showLeaderboard = (session as any).show_leaderboard === true;

  // When closed (standby), hide bookings — show waiting message
  const visibleBookings = isClosed ? [] : bookings;

  // Build list of booked players only (no empty slots)
  const bookedSlots = visibleBookings
    .sort((a, b) => a.position - b.position)
    .map(booking => ({
      booking,
      player: players.find(p => p.id === booking.player_id),
    }))
    .filter(s => s.player);

  // Leaderboard sorted by score
  const leaderboard = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Determine grid cols based on booked count
  const count = bookedSlots.length;
  const gridCols = count <= 4 ? "grid-cols-2 md:grid-cols-4" :
    count <= 6 ? "grid-cols-3" :
    count <= 8 ? "grid-cols-4" :
    "grid-cols-4 md:grid-cols-5";

  return (
    <div className="fixed inset-0 z-[55] bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-red-500/8 rounded-full blur-[200px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-orange-500/6 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-8 pb-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 bg-clip-text text-transparent">
            {showLeaderboard ? '🏆 Classifica' : '🔥 Non C\'è Furore'}
          </span>
        </h1>

        {/* Status Banner */}
        {!showLeaderboard && (
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="open"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4"
              >
                <div className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl md:text-2xl font-black animate-pulse shadow-lg shadow-green-500/30">
                  ⚡ PRENOTAZIONI APERTE — PREMI ORA!
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4"
              >
                <div className="inline-block px-6 py-2 rounded-full bg-white/10 text-white/60 text-lg font-medium">
                  In attesa...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-8 gap-6">
        {/* Quiz Question Overlay */}
        <AnimatePresence>
          {quizQuestion && !showLeaderboard && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 18 }}
              className="w-full max-w-4xl"
            >
               <div className="rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-orange-500/15 p-6 md:p-8 backdrop-blur-md shadow-2xl shadow-amber-500/10">
                <p className="text-2xl md:text-4xl font-black text-center mb-6 leading-tight text-white drop-shadow-lg">
                  {quizQuestion.question_text}
                </p>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => {
                    const text = quizQuestion[`option_${opt.toLowerCase()}` as keyof QuizQuestion] as string | null;
                    if (!text) return null;
                    const isCorrect = quizQuestion.correct_option === opt;
                    const revealed = session?.quiz_answer_revealed;
                    return (
                      <motion.div
                        key={opt}
                        animate={revealed && isCorrect ? { scale: [1, 1.05, 1], borderColor: ['rgba(34,197,94,0.5)', 'rgba(34,197,94,1)', 'rgba(34,197,94,0.8)'] } : {}}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          "rounded-xl border-2 px-5 py-4 flex items-center gap-3 transition-all duration-500",
                          revealed && isCorrect && "bg-green-500/30 border-green-500 shadow-lg shadow-green-500/20",
                          revealed && !isCorrect && "opacity-40 border-white/10 bg-black/20",
                          !revealed && "border-white/30 bg-white/10 backdrop-blur-sm"
                        )}
                      >
                        <span className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0",
                          revealed && isCorrect ? "bg-green-500 text-white" : "bg-white/20 text-white"
                        )}>
                          {opt}
                        </span>
                        <span className={cn(
                          "text-lg md:text-2xl font-bold text-white drop-shadow-md",
                          revealed && isCorrect && "text-green-300",
                          revealed && !isCorrect && "text-white/50"
                        )}>
                          {text}
                        </span>
                        {revealed && isCorrect && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto text-3xl"
                          >
                            ✅
                          </motion.span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bookings/Leaderboard Area */}
        <div className={cn("w-full flex items-center justify-center", quizQuestion && !showLeaderboard && "max-h-[40vh]")}>
        <AnimatePresence mode="wait">
          {showLeaderboard ? (
            /* ─── LEADERBOARD VIEW ─── */
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl space-y-3"
            >
              {leaderboard.length === 0 ? (
                <p className="text-2xl text-white/30 text-center">Nessun giocatore</p>
              ) : (
                leaderboard.map((player, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`;
                  const isTop3 = index < 3;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 rounded-2xl border-2",
                        index === 0 && "bg-yellow-500/15 border-yellow-500/40 text-xl",
                        index === 1 && "bg-gray-400/10 border-gray-400/30 text-lg",
                        index === 2 && "bg-orange-500/10 border-orange-500/30 text-lg",
                        index > 2 && "bg-white/5 border-white/10"
                      )}
                    >
                      <span className={cn("font-black w-12 text-center", isTop3 ? "text-3xl" : "text-xl text-white/50")}>
                        {medal}
                      </span>
                      <div
                        className={cn("rounded-full flex items-center justify-center shrink-0", isTop3 ? "w-14 h-14 text-3xl" : "w-10 h-10 text-xl")}
                        style={{ backgroundColor: `${player.color}40`, borderColor: player.color, borderWidth: 2 }}
                      >
                        {player.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold truncate", isTop3 ? "text-xl" : "text-base")}>
                          {player.nickname}
                        </p>
                      </div>
                      <div className={cn(
                        "font-black tabular-nums",
                        isTop3 ? "text-3xl" : "text-xl text-white/70"
                      )}>
                        {player.score || 0}
                        <span className="text-sm font-medium text-white/40 ml-1">pt</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            /* ─── BOOKINGS VIEW ─── */
            <motion.div
              key="bookings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              {bookedSlots.length === 0 && !quizQuestion ? (
                <div className="text-center">
                  <p className="text-2xl md:text-3xl text-white/30 font-medium">
                    {isOpen ? 'In attesa delle prenotazioni...' : 'In attesa di aprire le prenotazioni...'}
                  </p>
                </div>
              ) : bookedSlots.length > 0 ? (
                <div className={cn("grid gap-4 w-full max-w-5xl mx-auto", gridCols)}>
                  {bookedSlots.map(({ booking, player }) => (
                    <motion.div
                      key={booking.id}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                      className={cn(
                        "relative rounded-2xl border-2 flex flex-col items-center justify-center gap-2 border-white/30 shadow-lg",
                        quizQuestion ? "p-3" : "aspect-square"
                      )}
                      style={{
                        backgroundColor: `${player!.color}20`,
                        borderColor: `${player!.color}60`,
                        boxShadow: `0 0 30px ${player!.color}30`,
                      }}
                    >
                      <span className={cn("absolute top-2 left-3 font-bold text-white/50", quizQuestion ? "text-xs" : "text-sm")}>
                        {booking.position}°
                      </span>
                      <span className={cn(quizQuestion ? "text-2xl" : "text-4xl md:text-5xl")}>{player!.symbol}</span>
                      <span className={cn("font-bold text-white truncate max-w-full px-2", quizQuestion ? "text-xs" : "text-sm md:text-base")}>
                        {player!.nickname}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-4 text-white/20 text-sm">
        {showLeaderboard
          ? `Classifica — ${players.length} giocatori — Powered by Non C'è Duo`
          : isClosed
            ? `In attesa — ${maxSlots} posti disponibili — Powered by Non C'è Duo`
            : `${visibleBookings.length}/${maxSlots} prenotati — Powered by Non C'è Duo`
        }
      </div>
    </div>
  );
};

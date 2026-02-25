import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
  type FurorePlayer,
  type FuroreBooking,
} from '@/hooks/useFurore';

/**
 * TV overlay for /trasmetti — shows Furore buzzer board
 * Only renders when a furore_session exists
 */
export const TVFuroreOverlay: React.FC = () => {
  const { session, loading } = useFuroreSession();
  const { players } = useFurorePlayers(session?.id);
  const { bookings } = useFuroreBookings(session?.id);
  const lastBookingCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  if (loading || !session) return null;

  // Don't render if session is closed AND there are no players/bookings (after reset)
  // This allows the OpenMic standby to show through
  const hasActivity = players.length > 0 || bookings.length > 0;
  if (session.status === 'closed' && !hasActivity) return null;

  const isOpen = session.status === 'open';
  const maxSlots = session.max_players;

  // Build slot grid
  const slots: Array<{ booking?: FuroreBooking; player?: FurorePlayer }> = [];
  for (let i = 0; i < maxSlots; i++) {
    const booking = bookings.find(b => b.position === i + 1);
    const player = booking ? players.find(p => p.id === booking.player_id) : undefined;
    slots.push({ booking, player });
  }

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
            🔥 Non C'è Furore
          </span>
        </h1>

        {/* Status Banner */}
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
      </div>

      {/* Player Slots Grid */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8 pb-8">
        <div className={cn(
          "grid gap-4 w-full max-w-5xl",
          maxSlots <= 4 ? "grid-cols-2 md:grid-cols-4" :
          maxSlots <= 6 ? "grid-cols-3" :
          maxSlots <= 8 ? "grid-cols-4" :
          "grid-cols-4 md:grid-cols-5"
        )}>
          {slots.map((slot, i) => (
            <motion.div
              key={i}
              initial={slot.booking ? { scale: 0.5, opacity: 0 } : false}
              animate={slot.booking ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className={cn(
                "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                slot.booking && slot.player
                  ? "border-white/30 shadow-lg"
                  : "border-white/10 bg-white/5"
              )}
              style={slot.player ? {
                backgroundColor: `${slot.player.color}20`,
                borderColor: `${slot.player.color}60`,
                boxShadow: slot.booking ? `0 0 30px ${slot.player.color}30` : undefined,
              } : undefined}
            >
              {slot.booking && slot.player ? (
                <>
                  <span className="absolute top-2 left-3 text-sm font-bold text-white/50">
                    {slot.booking.position}°
                  </span>
                  <span className="text-4xl md:text-5xl">{slot.player.symbol}</span>
                  <span className="text-sm md:text-base font-bold text-white truncate max-w-full px-2">
                    {slot.player.nickname}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl text-white/10">{i + 1}</span>
                  <span className="text-xs text-white/20">Libero</span>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-4 text-white/20 text-sm">
        {bookings.length}/{maxSlots} prenotati — Powered by Non C'è Duo
      </div>
    </div>
  );
};

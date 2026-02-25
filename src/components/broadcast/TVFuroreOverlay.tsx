import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useFuroreSession,
  useFurorePlayers,
  useFuroreBookings,
} from '@/hooks/useFurore';
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

  // Force refetch when session status changes (reset, standby, open)
  useEffect(() => {
    if (session?.status) {
      refetchBookings();
      refetchPlayers();
    }
  }, [session?.status, refetchBookings, refetchPlayers]);

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

  const hasActivity = session && (players.length > 0 || bookings.length > 0);
  const isOpen = session?.status === 'open';

  // ─── IDLE SCREEN — no session or no activity ───
  if (!session || (session.status === 'closed' && !hasActivity)) {
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

  // Build list of booked players only (no empty slots)
  const bookedSlots = bookings
    .sort((a, b) => a.position - b.position)
    .map(booking => ({
      booking,
      player: players.find(p => p.id === booking.player_id),
    }))
    .filter(s => s.player);

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

      {/* Booked Players Grid — only shows who booked, in order */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8 pb-8">
        {bookedSlots.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-2xl md:text-3xl text-white/30 font-medium">
              {isOpen ? 'In attesa delle prenotazioni...' : 'Nessuna prenotazione'}
            </p>
          </motion.div>
        ) : (
          <div className={cn("grid gap-4 w-full max-w-5xl", gridCols)}>
            {bookedSlots.map(({ booking, player }) => (
              <motion.div
                key={booking.id}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 border-white/30 shadow-lg"
                style={{
                  backgroundColor: `${player!.color}20`,
                  borderColor: `${player!.color}60`,
                  boxShadow: `0 0 30px ${player!.color}30`,
                }}
              >
                <span className="absolute top-2 left-3 text-sm font-bold text-white/50">
                  {booking.position}°
                </span>
                <span className="text-4xl md:text-5xl">{player!.symbol}</span>
                <span className="text-sm md:text-base font-bold text-white truncate max-w-full px-2">
                  {player!.nickname}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-4 text-white/20 text-sm">
        {bookings.length}/{maxSlots} prenotati — Powered by Non C'è Duo
      </div>
    </div>
  );
};

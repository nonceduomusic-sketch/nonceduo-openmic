import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameSettings, useGameScores, useGameConfigs } from '@/hooks/useGames';
import { Trophy, Gamepad2, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TVGameOverlay – rendered inside /trasmetti
 * Reads game_settings.tv_display_mode in realtime:
 *   'off'        → nothing rendered
 *   'banner'     → bottom overlay bar with leaderboard
 *   'fullscreen' → full-screen game promo + leaderboard
 */
export const TVGameOverlay: React.FC = () => {
  const { data: settings } = useGameSettings();
  const { data: configs } = useGameConfigs();
  const { data: quizScores } = useGameScores('quiz', 10);

  // Realtime subscription to detect mode changes instantly
  const [tvMode, setTvMode] = useState<string>('off');

  useEffect(() => {
    if (settings?.tv_display_mode) {
      setTvMode(settings.tv_display_mode);
    }
  }, [settings?.tv_display_mode]);

  // Subscribe to realtime changes on game_settings
  useEffect(() => {
    const channel = supabase
      .channel('game-settings-tv')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_settings' },
        (payload) => {
          const newMode = (payload.new as any)?.tv_display_mode;
          if (newMode) setTvMode(newMode);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (tvMode === 'off' || !settings?.show_on_tv) return null;

  const enabledGames = configs?.filter(g => g.is_enabled) || [];
  const topScores = quizScores?.slice(0, 5) || [];

  // ── BANNER MODE ──
  if (tvMode === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none"
        >
          <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-4 px-6">
            <div className="max-w-6xl mx-auto flex items-center gap-6">
              {/* Game icon & title */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">🔥 Non C'è Furore</p>
                  <p className="text-white/50 text-sm">Gioca ora dal tuo telefono!</p>
                </div>
              </div>

              {/* Mini leaderboard */}
              {topScores.length > 0 && (
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className="h-8 w-px bg-white/20 flex-shrink-0" />
                  <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  {topScores.slice(0, 3).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn(
                        "text-sm font-bold",
                        i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : "text-orange-400"
                      )}>
                        {i + 1}.
                      </span>
                      <span className="text-white/90 text-sm font-medium truncate max-w-[100px]">
                        {s.nickname}
                      </span>
                      <span className="text-primary text-sm font-bold">{s.score}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Available games count */}
              <div className="flex-shrink-0 text-white/40 text-sm">
                {enabledGames.length} giochi disponibili
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── FULLSCREEN MODE ──
  if (tvMode === 'fullscreen') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[200px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl px-8">
          {/* Main title */}
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
            className="text-center"
          >
            <div className="text-6xl md:text-8xl mb-4">🔥</div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-primary via-yellow-400 to-primary bg-clip-text text-transparent">
                Non C'è Furore
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/60 mt-4 font-light">
              Sfida i tuoi amici al Quiz Musicale!
            </p>
          </motion.div>

          {/* Leaderboard */}
          {topScores.length > 0 && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-md"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white/90">Classifica</h2>
                </div>
                <div className="space-y-3">
                  {topScores.map((s, i) => {
                    const MedalIcon = i === 0 ? Crown : Medal;
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          i === 0 ? "bg-yellow-400/20 text-yellow-400" :
                          i === 1 ? "bg-gray-300/20 text-gray-300" :
                          i === 2 ? "bg-orange-400/20 text-orange-400" :
                          "bg-white/10 text-white/50"
                        )}>
                          {i < 3 ? <MedalIcon className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className="flex-1 text-white/90 font-medium truncate">{s.nickname}</span>
                        <span className="text-primary font-bold text-lg">{s.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-white/40 text-lg text-center"
          >
            Apri l'app dal tuo telefono per giocare 🎮
          </motion.p>

          {/* Available games */}
          {enabledGames.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-4"
            >
              {enabledGames.map(g => (
                <div key={g.id} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                  <span className="text-xl">{g.game_icon}</span>
                  <span className="text-white/70 text-sm font-medium">{g.game_name}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
};

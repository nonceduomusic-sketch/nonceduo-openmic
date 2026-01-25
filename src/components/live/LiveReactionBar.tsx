import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLiveReactions } from '@/hooks/useLiveInteraction';
import { triggerHaptic } from '@/lib/haptics';

interface LiveReactionBarProps {
  className?: string;
}

const EMOJIS = ['🔥', '❤️', '👏', '⭐', '🎤', '🎉'];

/**
 * LiveReactionBar - Barra per inviare reazioni durante l'evento
 * Le emoji volano verso l'alto e vengono trasmesse in realtime
 */
export const LiveReactionBar: React.FC<LiveReactionBarProps> = ({ className }) => {
  const { recentEmojis, sendReaction } = useLiveReactions();
  const [localEmojis, setLocalEmojis] = useState<{ emoji: string; id: string; x: number }[]>([]);

  const handleReaction = async (emoji: string) => {
    triggerHaptic('light');
    
    // Add local flying emoji immediately for responsive feel
    const id = `local_${Date.now()}_${Math.random()}`;
    const x = Math.random() * 60 + 20;
    setLocalEmojis((prev) => [...prev, { emoji, id, x }]);
    
    // Send to server
    await sendReaction(emoji);
    
    // Remove after animation
    setTimeout(() => {
      setLocalEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Flying emojis container */}
      <div className="absolute inset-x-0 bottom-full h-60 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {/* Local emojis (instant feedback) */}
          {localEmojis.map((item) => (
            <motion.div
              key={item.id}
              className="absolute text-3xl"
              style={{ left: `${item.x}%`, bottom: 0 }}
              initial={{ y: 0, opacity: 1, scale: 0.5 }}
              animate={{ 
                y: -200, 
                opacity: 0, 
                scale: 1.2,
                rotate: Math.random() * 30 - 15,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2, 
                ease: "easeOut",
              }}
            >
              {item.emoji}
            </motion.div>
          ))}
          
          {/* Remote emojis (from other users) */}
          {recentEmojis.map((item) => (
            <motion.div
              key={item.id}
              className="absolute text-2xl opacity-70"
              style={{ left: `${Math.random() * 80 + 10}%`, bottom: 20 }}
              initial={{ y: 0, opacity: 0.7, scale: 0.8 }}
              animate={{ 
                y: -180, 
                opacity: 0, 
                scale: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.5, 
                ease: "easeOut",
              }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction bar */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-full bg-card/90 backdrop-blur-md border border-border/50 shadow-lg">
        {EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="w-11 h-11 rounded-full flex items-center justify-center text-xl hover:bg-muted/50 transition-colors active:scale-90"
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.15 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

interface FloatingReactionsProps {
  className?: string;
}

/**
 * FloatingReactions - Display delle reazioni che volano sullo schermo
 * Da usare come overlay full-screen durante l'evento
 */
export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ className }) => {
  const { recentEmojis } = useLiveReactions();

  return (
    <div className={cn("fixed inset-0 pointer-events-none z-40", className)}>
      <AnimatePresence>
        {recentEmojis.map((item) => (
          <motion.div
            key={item.id}
            className="absolute text-4xl"
            style={{ 
              left: `${Math.random() * 80 + 10}%`, 
              bottom: '10%',
            }}
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{ 
              y: -400 - Math.random() * 200, 
              x: Math.random() * 100 - 50,
              opacity: 0, 
              scale: 1.5,
              rotate: Math.random() * 40 - 20,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 3, 
              ease: "easeOut",
            }}
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveReactionBar;

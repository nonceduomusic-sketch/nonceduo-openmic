import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fireEmojiRain } from '@/lib/confetti';
import { triggerHaptic } from '@/lib/haptics';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

interface EmojiReactionProps {
  className?: string;
  onReaction?: (emoji: string) => void;
}

const EMOJIS = ['🔥', '❤️', '👏', '🎤', '⭐', '🎉'];

/**
 * EmojiReaction - Barra reazioni emoji per eventi live
 * Gli emoji volano verso l'alto quando cliccati
 */
export const EmojiReaction: React.FC<EmojiReactionProps> = ({
  className,
  onReaction,
}) => {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  const handleEmojiClick = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = Math.random() * 60 + 20; // 20-80% from left

    // Add floating emoji
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);

    // Fire confetti rain
    fireEmojiRain(emoji);

    // Haptic feedback
    triggerHaptic('light');

    // Callback
    onReaction?.(emoji);

    // Remove after animation
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  }, [onReaction]);

  return (
    <div className={cn("relative", className)}>
      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {floatingEmojis.map((item) => (
            <motion.div
              key={item.id}
              className="absolute text-2xl"
              style={{ left: `${item.x}%`, bottom: 0 }}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ 
                y: -200, 
                opacity: 0, 
                scale: 1.5,
                rotate: Math.random() * 40 - 20,
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
        </AnimatePresence>
      </div>

      {/* Emoji buttons */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-full bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
        {EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-muted/50 transition-colors"
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.2 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default EmojiReaction;

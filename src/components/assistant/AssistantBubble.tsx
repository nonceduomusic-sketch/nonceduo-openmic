import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssistantBubbleProps {
  isOpen: boolean;
  showProactive: boolean;
  isMobile: boolean;
  welcomeMessage?: string;
  onOpen: () => void;
  onDismissProactive: () => void;
}

export const AssistantBubble: React.FC<AssistantBubbleProps> = ({
  isOpen,
  showProactive,
  isMobile,
  welcomeMessage = 'Ciao! Posso aiutarti? 🎶',
  onOpen,
  onDismissProactive,
}) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Proactive message - Mini card on desktop, tooltip on mobile */}
      <AnimatePresence>
        {showProactive && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              "relative",
              isMobile ? "max-w-[200px]" : "max-w-[280px]"
            )}
          >
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissProactive();
              }}
              className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Message card */}
            <button
              onClick={onOpen}
              className={cn(
                "glass-card p-4 rounded-2xl text-left",
                "border-2 border-primary/30 hover:border-primary/50",
                "transition-all duration-300 hover:scale-[1.02]",
                "shadow-lg shadow-primary/10"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {welcomeMessage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clicca per chattare
                  </p>
                </div>
              </div>
            </button>

            {/* Arrow pointing to bubble */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-card border-r border-b border-primary/30 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble button */}
      <motion.button
        onClick={onOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-primary to-secondary",
          "flex items-center justify-center",
          "shadow-lg shadow-primary/30",
          "transition-shadow duration-300",
          "hover:shadow-xl hover:shadow-primary/40",
          "relative overflow-hidden"
        )}
      >
        {/* Animated ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
};

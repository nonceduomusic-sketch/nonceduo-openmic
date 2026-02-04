import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { MessageCircle, X, Sparkles, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

interface AssistantBubbleProps {
  isOpen: boolean;
  showProactive: boolean;
  isMobile: boolean;
  welcomeMessage?: string;
  onOpen: () => void;
  onDismissProactive: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

const POSITION_STORAGE_KEY = 'assistant_bubble_position';

export const AssistantBubble: React.FC<AssistantBubbleProps> = ({
  isOpen,
  showProactive,
  isMobile,
  welcomeMessage = 'Ciao! Posso aiutarti? 🎶',
  onOpen,
  onDismissProactive,
  isMinimized = false,
  onMinimize,
}) => {
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  // Load saved position
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    const saved = safeGetItem('local', POSITION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Save new position relative to initial position
    const newPos = {
      x: (position?.x || 0) + info.offset.x,
      y: (position?.y || 0) + info.offset.y,
    };
    setPosition(newPos);
    safeSetItem('local', POSITION_STORAGE_KEY, JSON.stringify(newPos));
  };

  // When chat is open, don't show bubble (unless minimized)
  if (isOpen && !isMinimized) return null;

  // Minimized state: tiny draggable dot
  if (isMinimized) {
    return (
      <>
        {/* Invisible constraints container */}
        <div 
          ref={constraintsRef} 
          className="fixed inset-4 pointer-events-none z-[59]"
        />
        
        <motion.button
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragConstraints={constraintsRef}
          onDragEnd={handleDragEnd}
          onClick={onOpen}
          initial={position || { x: 0, y: 0 }}
          animate={position || { x: 0, y: 0 }}
          whileTap={{ scale: 1.1 }}
          className={cn(
            "fixed right-4 z-[60] cursor-grab active:cursor-grabbing",
            isMobile ? "bottom-20" : "bottom-4",
            "w-10 h-10 rounded-full",
            "bg-gradient-to-br from-primary/80 to-secondary/80",
            "flex items-center justify-center",
            "shadow-md shadow-primary/20",
            "border-2 border-white/30",
            "backdrop-blur-sm"
          )}
          style={{ touchAction: 'none' }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </motion.div>
          
          {/* Notification dot */}
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        </motion.button>
      </>
    );
  }

  return (
    <>
      {/* Invisible constraints container for dragging */}
      <div 
        ref={constraintsRef} 
        className="fixed inset-4 pointer-events-none z-[59]"
      />
      
      <motion.div 
        drag={isMobile}
        dragControls={dragControls}
        dragMomentum={false}
        dragConstraints={constraintsRef}
        onDragEnd={handleDragEnd}
        initial={position || { x: 0, y: 0 }}
        animate={position || { x: 0, y: 0 }}
        className={cn(
          "fixed right-4 z-[60] flex flex-col items-end gap-3",
          isMobile ? "bottom-20" : "bottom-4",
          isMobile && "cursor-grab active:cursor-grabbing"
        )}
        style={{ touchAction: isMobile ? 'none' : 'auto' }}
      >
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

              {/* Minimize button on mobile */}
              {isMobile && onMinimize && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMinimize();
                  }}
                  className="absolute -top-2 right-6 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
              )}

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
                      {isMobile ? 'Tap per chattare • Trascina per spostare' : 'Clicca per chattare'}
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
        <div className="relative">
          {/* Minimize button (only on mobile when bubble is visible) */}
          {isMobile && onMinimize && !showProactive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-muted/90 border border-border flex items-center justify-center"
            >
              <Minimize2 className="w-3 h-3" />
            </motion.button>
          )}
          
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
      </motion.div>
    </>
  );
};

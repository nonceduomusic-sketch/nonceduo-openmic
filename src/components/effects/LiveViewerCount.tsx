import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveViewerCountProps {
  count: number;
  className?: string;
  variant?: 'minimal' | 'full';
  showTrend?: boolean;
}

/**
 * LiveViewerCount - Counter live "X persone stanno guardando"
 * Con animazione quando il numero cambia
 */
export const LiveViewerCount: React.FC<LiveViewerCountProps> = ({
  count,
  className,
  variant = 'minimal',
  showTrend = false,
}) => {
  const [prevCount, setPrevCount] = useState(count);
  const [isIncreasing, setIsIncreasing] = useState(false);

  useEffect(() => {
    if (count !== prevCount) {
      setIsIncreasing(count > prevCount);
      setPrevCount(count);
    }
  }, [count, prevCount]);

  if (variant === 'minimal') {
    return (
      <motion.div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          "bg-secondary/10 border border-secondary/20 text-secondary",
          className
        )}
        animate={count !== prevCount ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
        </span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            initial={{ y: isIncreasing ? 10 : -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: isIncreasing ? -10 : 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-semibold tabular-nums"
          >
            {count}
          </motion.span>
        </AnimatePresence>
        <Eye className="w-3.5 h-3.5" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl",
        "bg-gradient-to-r from-secondary/10 to-secondary/5",
        "border border-secondary/20",
        className
      )}
      animate={count !== prevCount ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-secondary" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
        </span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={count}
              initial={{ y: isIncreasing ? 20 : -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: isIncreasing ? -20 : 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xl font-bold text-foreground tabular-nums"
            >
              {count}
            </motion.span>
          </AnimatePresence>
          
          {showTrend && isIncreasing && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="flex items-center gap-0.5 text-secondary"
            >
              <TrendingUp className="w-4 h-4" />
            </motion.div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          persone stanno guardando
        </p>
      </div>
    </motion.div>
  );
};

export default LiveViewerCount;

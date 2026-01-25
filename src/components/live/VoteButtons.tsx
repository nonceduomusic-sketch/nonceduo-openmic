import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Heart, ThumbsUp, Trophy, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePerformanceVotes, useTopPerformances } from '@/hooks/useLiveInteraction';
import { triggerHaptic } from '@/lib/haptics';
import { fireEmojiRain } from '@/lib/confetti';
import { useFormatActiveCheck } from '@/hooks/useGlobalFormatSettings';

interface VoteButtonsProps {
  reservationId: string;
  className?: string;
  compact?: boolean;
}

/**
 * VoteButtons - Bottoni per votare una performance
 */
export const VoteButtons: React.FC<VoteButtonsProps> = ({
  reservationId,
  className,
  compact = false,
}) => {
  const { voteCounts, hasVoted, vote } = usePerformanceVotes(reservationId);
  const { isActive: votingEnabled, loading: votingLoading } = useFormatActiveCheck('voting');

  // useCallback must be called before any conditional returns (React hooks rules)
  const handleVote = useCallback(async (type: 'up' | 'fire' | 'heart') => {
    triggerHaptic('medium');
    const success = await vote(type);
    if (success) {
      if (type === 'fire') fireEmojiRain('🔥');
      else if (type === 'heart') fireEmojiRain('❤️');
      else fireEmojiRain('👍');
    }
  }, [vote]);

  // Don't render if voting is disabled (after all hooks are called)
  if (votingLoading) return null;
  if (!votingEnabled) return null;

  const buttons = [
    { type: 'up' as const, icon: ThumbsUp, label: 'Bravo!', color: 'text-secondary' },
    { type: 'fire' as const, icon: Flame, label: 'Fuoco!', color: 'text-orange-500' },
    { type: 'heart' as const, icon: Heart, label: 'Amore!', color: 'text-primary' },
  ];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {buttons.map((btn) => (
          <motion.button
            key={btn.type}
            onClick={() => handleVote(btn.type)}
            disabled={hasVoted}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              hasVoted 
                ? "bg-muted/50 text-muted-foreground cursor-not-allowed" 
                : "bg-card hover:bg-muted border border-border/50 hover:scale-110",
              btn.color
            )}
            whileTap={{ scale: 0.9 }}
          >
            <btn.icon className="w-5 h-5" />
          </motion.button>
        ))}
        {voteCounts && voteCounts.total_votes > 0 && (
          <span className="text-sm font-semibold text-muted-foreground ml-1">
            {voteCounts.total_votes}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card/50 p-4", className)}>
      <p className="text-sm text-muted-foreground mb-3 text-center">
        {hasVoted ? 'Hai già votato!' : 'Vota questa performance!'}
      </p>
      <div className="flex items-center justify-center gap-3">
        {buttons.map((btn) => (
          <motion.button
            key={btn.type}
            onClick={() => handleVote(btn.type)}
            disabled={hasVoted}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
              hasVoted 
                ? "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50" 
                : "bg-card hover:bg-muted border border-border/50 hover:scale-105",
            )}
            whileTap={{ scale: 0.95 }}
          >
            <btn.icon className={cn("w-6 h-6", btn.color)} />
            <span className="text-xs font-medium">{btn.label}</span>
          </motion.button>
        ))}
      </div>
      
      {voteCounts && voteCounts.total_votes > 0 && (
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border/30">
          <div className="text-center">
            <span className="text-xl font-bold text-foreground">{voteCounts.total_votes}</span>
            <p className="text-xs text-muted-foreground">voti totali</p>
          </div>
          {voteCounts.fire_votes > 0 && (
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="w-4 h-4" />
              <span className="font-semibold">{voteCounts.fire_votes}</span>
            </div>
          )}
          {voteCounts.heart_votes > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <Heart className="w-4 h-4" />
              <span className="font-semibold">{voteCounts.heart_votes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface TopPerformancesCardProps {
  className?: string;
  limit?: number;
}

/**
 * TopPerformancesCard - Classifica delle performance più votate
 */
export const TopPerformancesCard: React.FC<TopPerformancesCardProps> = ({
  className,
  limit = 5,
}) => {
  const { topPerformances, loading } = useTopPerformances(limit);

  if (loading) {
    return (
      <div className={cn("rounded-xl border bg-card/50 p-6 text-center", className)}>
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (topPerformances.length === 0) {
    return (
      <div className={cn("rounded-xl border bg-card/50 p-6 text-center", className)}>
        <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Nessun voto ancora</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Vota le performance per farle salire in classifica!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card/50 overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-secondary/5 border-b border-border/50">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-sm">Top Performance</h3>
      </div>

      <div className="divide-y divide-border/30">
        {topPerformances.map((perf, index) => (
          <motion.div
            key={perf.reservation_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3"
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              index === 0 && "bg-yellow-500/20 text-yellow-500",
              index === 1 && "bg-gray-400/20 text-gray-400",
              index === 2 && "bg-amber-600/20 text-amber-600",
              index > 2 && "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                <p className="text-sm font-medium truncate">{perf.song_title}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {perf.customer_name} • {perf.song_artist}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {perf.fire_votes > 0 && (
                <span className="flex items-center gap-0.5 text-orange-500 text-xs">
                  <Flame className="w-3 h-3" />
                  {perf.fire_votes}
                </span>
              )}
              <span className="font-bold text-primary">{perf.total_votes}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default VoteButtons;

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Crown, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeLeaderboard } from '@/hooks/useGamification';

interface LeaderboardCardProps {
  className?: string;
  limit?: number;
  showTitle?: boolean;
}

/**
 * LeaderboardCard - Classifica Top Cantanti in tempo reale
 */
export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  className,
  limit = 5,
  showTitle = true,
}) => {
  const leaderboard = useRealtimeLeaderboard(limit);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30';
      default:
        return 'bg-card/50 border-border/50';
    }
  };

  if (leaderboard.length === 0) {
    return (
      <div className={cn("rounded-xl border bg-card/50 p-6 text-center", className)}>
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">Nessun partecipante ancora</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Prenota una canzone per apparire in classifica!</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card/50 overflow-hidden", className)}>
      {showTitle && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-secondary/5 border-b border-border/50">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-sm">Top Cantanti</h3>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Live
          </span>
        </div>
      )}

      <div className="divide-y divide-border/30">
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 p-3 transition-colors",
              getRankBg(index + 1),
              "border-l-2"
            )}
          >
            {/* Rank */}
            <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">
              {getRankIcon(index + 1)}
            </div>

            {/* Name & Stats */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-semibold text-sm truncate",
                index === 0 && "text-yellow-500",
                index === 1 && "text-gray-400",
                index === 2 && "text-amber-600"
              )}>
                {entry.participant_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{entry.total_songs} 🎤</span>
                {entry.total_dedications > 0 && (
                  <span>{entry.total_dedications} ❤️</span>
                )}
                {entry.current_streak >= 3 && (
                  <span className="flex items-center gap-0.5 text-orange-500">
                    <Flame className="w-3 h-3" />
                    {entry.current_streak}
                  </span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <p className="font-bold text-sm text-primary">{entry.total_points}</p>
              <p className="text-xs text-muted-foreground">punti</p>
            </div>

            {/* Badges */}
            {entry.badges_count > 0 && (
              <div className="flex items-center gap-0.5">
                {[...Array(Math.min(entry.badges_count, 3))].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                ))}
                {entry.badges_count > 3 && (
                  <span className="text-xs text-muted-foreground">+{entry.badges_count - 3}</span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardCard;

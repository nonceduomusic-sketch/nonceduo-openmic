import React from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp, Music, Heart, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStats } from '@/hooks/useGamification';
import { BadgeDisplay } from './BadgeDisplay';

interface UserStatsCardProps {
  participantName: string;
  className?: string;
  compact?: boolean;
}

/**
 * UserStatsCard - Card con statistiche personali del partecipante
 */
export const UserStatsCard: React.FC<UserStatsCardProps> = ({
  participantName,
  className,
  compact = false,
}) => {
  const { data, isLoading } = useUserStats(participantName);

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card/50 p-4 animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-muted rounded w-3/4"></div>
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className={cn("rounded-xl border bg-card/50 p-4 text-center", className)}>
        <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Ciao <span className="font-semibold">{participantName}</span>!
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Prenota la tua prima canzone per iniziare a guadagnare punti.
        </p>
      </div>
    );
  }

  const { stats, badges, rank } = data;

  if (compact) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-card/50 p-3",
          className
        )}
      >
        {/* Rank */}
        {rank && (
          <div className="flex items-center gap-1.5 text-primary">
            <Trophy className="w-4 h-4" />
            <span className="font-bold text-sm">#{rank}</span>
          </div>
        )}

        {/* Points */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-primary">{stats.total_points}</span>
          <span className="text-xs text-muted-foreground">pts</span>
        </div>

        {/* Streak */}
        {stats.current_streak >= 2 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-semibold">{stats.current_streak}</span>
          </div>
        )}

        {/* Badges */}
        <BadgeDisplay badges={badges} maxVisible={3} size="sm" className="ml-auto" />
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border bg-card/50 overflow-hidden", className)}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold">{participantName}</p>
            <p className="text-xs text-muted-foreground">
              {rank ? `#${rank} in classifica` : 'Non in classifica'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{stats.total_points}</p>
            <p className="text-xs text-muted-foreground">punti totali</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-px bg-border/30">
        <div className="bg-card/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-foreground mb-1">
            <Music className="w-4 h-4 text-secondary" />
            <span className="font-bold">{stats.total_songs}</span>
          </div>
          <p className="text-xs text-muted-foreground">Canzoni</p>
        </div>
        <div className="bg-card/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-foreground mb-1">
            <Heart className="w-4 h-4 text-primary" />
            <span className="font-bold">{stats.total_dedications}</span>
          </div>
          <p className="text-xs text-muted-foreground">Dediche</p>
        </div>
        <div className="bg-card/50 p-3 text-center">
          <div className={cn(
            "flex items-center justify-center gap-1.5 mb-1",
            stats.current_streak >= 3 ? "text-orange-500" : "text-foreground"
          )}>
            <Flame className="w-4 h-4" />
            <span className="font-bold">{stats.current_streak}</span>
          </div>
          <p className="text-xs text-muted-foreground">Streak</p>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="p-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Badge guadagnati
          </p>
          <BadgeDisplay badges={badges} maxVisible={5} size="md" />
        </div>
      )}
    </motion.div>
  );
};

export default UserStatsCard;

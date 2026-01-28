import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Heart, ThumbsUp, Trophy, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePerformanceVotes, useTopPerformances } from '@/hooks/useLiveInteraction';
import { triggerHaptic } from '@/lib/haptics';
import { fireEmojiRain } from '@/lib/confetti';
import { supabase } from '@/integrations/supabase/client';
interface VoteButtonsProps {
  reservationId: string;
  className?: string;
  compact?: boolean;
}

/**
 * VoteButtons - Bottoni per votare una performance (stile social)
 * - Ogni utente può votare una sola volta per canzone
 * - Può cambiare il voto cliccando su un'altra opzione
 * - Il voto scelto viene evidenziato con il conteggio
 */
export const VoteButtons: React.FC<VoteButtonsProps> = ({
  reservationId,
  className,
  compact = false,
}) => {
  const { voteCounts, userVoteType, vote, isLoading } = usePerformanceVotes(reservationId);
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [votingLoading, setVotingLoading] = useState(true);

  // Direct real-time subscription for voting flag
  useEffect(() => {
    const fetchSetting = async () => {
      const { data, error } = await supabase
        .from('global_format_settings')
        .select('is_active')
        .eq('format_key', 'voting')
        .maybeSingle();
      
      if (!error && data) {
        setVotingEnabled(data.is_active);
      }
      setVotingLoading(false);
    };
    
    fetchSetting();
    
    // Subscribe to real-time changes with unique channel name
    const channel = supabase
      .channel(`voting-setting-live-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_format_settings',
          filter: 'format_key=eq.voting',
        },
        (payload) => {
          if (payload.new && 'is_active' in payload.new) {
            setVotingEnabled((payload.new as { is_active: boolean }).is_active);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVote = useCallback(async (type: 'up' | 'fire' | 'heart') => {
    if (userVoteType === type) return; // Already selected this
    
    triggerHaptic('medium');
    const success = await vote(type);
    if (success) {
      if (type === 'fire') fireEmojiRain('🔥');
      else if (type === 'heart') fireEmojiRain('❤️');
      else fireEmojiRain('👍');
    }
  }, [vote, userVoteType]);

  if (votingLoading) return null;
  if (!votingEnabled) return null;

  const getVoteCount = (type: 'up' | 'fire' | 'heart') => {
    if (!voteCounts) return 0;
    if (type === 'fire') return voteCounts.fire_votes;
    if (type === 'heart') return voteCounts.heart_votes;
    // 'up' = total - fire - heart
    return voteCounts.total_votes - voteCounts.fire_votes - voteCounts.heart_votes;
  };

  const buttons = [
    { type: 'up' as const, icon: ThumbsUp, label: 'Bravo!', activeColor: 'bg-secondary text-secondary-foreground', iconColor: 'text-secondary' },
    { type: 'fire' as const, icon: Flame, label: 'Fuoco!', activeColor: 'bg-orange-500 text-white', iconColor: 'text-orange-500' },
    { type: 'heart' as const, icon: Heart, label: 'Amore!', activeColor: 'bg-primary text-primary-foreground', iconColor: 'text-primary' },
  ];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {buttons.map((btn) => {
          const isSelected = userVoteType === btn.type;
          const count = getVoteCount(btn.type);
          
          return (
            <motion.button
              key={btn.type}
              onClick={() => handleVote(btn.type)}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full transition-all text-sm font-medium",
                isSelected 
                  ? cn(btn.activeColor, "shadow-md") 
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:scale-105",
                isLoading && "opacity-50 cursor-wait"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <btn.icon className={cn("w-4 h-4", isSelected ? "" : btn.iconColor)} fill={isSelected ? "currentColor" : "none"} />
              {(count > 0 || isSelected) && (
                <span className="text-xs">{count}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card/50 p-4", className)}>
      <p className="text-sm text-muted-foreground mb-3 text-center">
        {userVoteType ? 'Tocca per cambiare voto' : 'Vota questa performance!'}
      </p>
      <div className="flex items-center justify-center gap-3">
        {buttons.map((btn) => {
          const isSelected = userVoteType === btn.type;
          const count = getVoteCount(btn.type);
          
          return (
            <motion.button
              key={btn.type}
              onClick={() => handleVote(btn.type)}
              disabled={isLoading}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl transition-all min-w-[70px]",
                isSelected 
                  ? cn(btn.activeColor, "shadow-lg scale-105") 
                  : "bg-card hover:bg-muted border border-border/50 hover:scale-105",
                isLoading && "opacity-50 cursor-wait"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <btn.icon 
                className={cn("w-6 h-6", isSelected ? "" : btn.iconColor)} 
                fill={isSelected ? "currentColor" : "none"} 
              />
              <span className="text-xs font-medium">{btn.label}</span>
              {(count > 0 || isSelected) && (
                <span className={cn(
                  "text-sm font-bold mt-0.5",
                  isSelected ? "" : "text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {voteCounts && voteCounts.total_votes > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border/30">
          <span className="text-sm text-muted-foreground">Totale:</span>
          <span className="text-lg font-bold text-foreground">{voteCounts.total_votes}</span>
          <span className="text-sm text-muted-foreground">voti</span>
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

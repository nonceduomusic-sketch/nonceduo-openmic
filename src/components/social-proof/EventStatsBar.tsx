import React from 'react';
import { motion } from 'framer-motion';
import { Music, Heart, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsCounter } from '@/components/effects/AnimatedCounter';
import { useEventStats } from '@/hooks/useSocialProof';

interface EventStatsBarProps {
  className?: string;
}

/**
 * EventStatsBar - Barra con statistiche animate
 * "500+ serate, 10.000+ canzoni cantate"
 */
export const EventStatsBar: React.FC<EventStatsBarProps> = ({ className }) => {
  const { totalEvents, totalSongs, totalParticipants, isLoading } = useEventStats();

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-3 gap-4 animate-pulse", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-3 gap-3 md:gap-4", className)}>
      <StatsCounter
        value={totalEvents}
        label="Serate Live"
        icon={<Calendar className="w-6 h-6" />}
        suffix="+"
      />
      <StatsCounter
        value={totalSongs}
        label="Canzoni Cantate"
        icon={<Music className="w-6 h-6" />}
        suffix="+"
      />
      <StatsCounter
        value={totalParticipants}
        label="Partecipanti"
        icon={<Users className="w-6 h-6" />}
        suffix="+"
      />
    </div>
  );
};

interface SocialProofBannerProps {
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

/**
 * SocialProofBanner - Banner compatto con social proof
 */
export const SocialProofBanner: React.FC<SocialProofBannerProps> = ({ 
  className,
  variant = 'horizontal',
}) => {
  const { totalEvents, totalSongs, totalParticipants } = useEventStats();

  const stats = [
    { value: totalEvents, label: 'serate', icon: '🎤' },
    { value: totalSongs, label: 'canzoni', icon: '🎵' },
    { value: totalParticipants, label: 'cantanti', icon: '👥' },
  ];

  if (variant === 'vertical') {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
          >
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <span className="text-xl font-bold text-primary">{stat.value.toLocaleString()}+</span>
              <span className="text-sm text-muted-foreground ml-1">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "flex items-center justify-center gap-4 md:gap-8 py-4 px-6",
        "rounded-xl bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10",
        "border border-border/50",
        className
      )}
    >
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {index > 0 && <div className="h-8 w-px bg-border/50" />}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span>{stat.icon}</span>
              <span className="text-lg md:text-xl font-bold text-foreground">
                {stat.value.toLocaleString()}+
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </React.Fragment>
      ))}
    </motion.div>
  );
};

export default EventStatsBar;

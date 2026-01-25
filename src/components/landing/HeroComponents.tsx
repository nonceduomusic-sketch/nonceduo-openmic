import React from 'react';
import { motion } from 'framer-motion';
import { Music, Calendar, Users, Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/effects/ScrollAnimations';
import { AnimatedCounter } from '@/components/effects/AnimatedCounter';

interface HeroStatsProps {
  className?: string;
}

/**
 * HeroStats - Statistiche animate nella hero section
 * "500+ serate, 10.000+ canzoni, 2.500+ cantanti"
 */
export const HeroStats: React.FC<HeroStatsProps> = ({ className }) => {
  const stats = [
    { value: 500, suffix: '+', label: 'Serate Live', icon: Calendar },
    { value: 10000, suffix: '+', label: 'Canzoni Cantate', icon: Music },
    { value: 2500, suffix: '+', label: 'Partecipanti', icon: Users },
  ];

  return (
    <ScrollReveal delay={0.3}>
      <div className={cn(
        "flex flex-wrap items-center justify-center gap-6 md:gap-10",
        "py-6 px-4 md:px-8 rounded-2xl",
        "bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5",
        "border border-border/30",
        className
      )}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            {index > 0 && (
              <div className="hidden sm:block h-12 w-px bg-border/50" />
            )}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <stat.icon className="w-5 h-5 text-primary" />
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  className="text-2xl md:text-3xl font-display font-bold text-foreground"
                  duration={2}
                />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">
                {stat.label}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </ScrollReveal>
  );
};

interface HeroBadgeProps {
  text: string;
  icon?: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

/**
 * HeroBadge - Badge animato per la hero section
 */
export const HeroBadge: React.FC<HeroBadgeProps> = ({
  text,
  icon,
  className,
  pulse = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-primary/10 border border-primary/30",
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
        </span>
      )}
      {icon}
      <span className="text-primary font-bold text-sm uppercase tracking-wider">
        {text}
      </span>
    </motion.div>
  );
};

interface HeroTitleProps {
  line1: string;
  line2: string;
  className?: string;
}

/**
 * HeroTitle - Titolo animato a due righe
 */
export const HeroTitle: React.FC<HeroTitleProps> = ({
  line1,
  line2,
  className,
}) => {
  return (
    <motion.div
      className={cn("mb-6", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1]">
        <motion.span
          className="text-foreground block"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {line1}
        </motion.span>
        <motion.span
          className="neon-text-pink block"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {line2}
        </motion.span>
      </h1>
    </motion.div>
  );
};

interface AnimatedBackgroundProps {
  className?: string;
}

/**
 * AnimatedBackground - Sfondo animato con gradients pulsanti
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden z-0", className)}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/25 rounded-full blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-secondary/25 rounded-full blur-[100px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/15 rounded-full blur-[120px]"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export default HeroStats;

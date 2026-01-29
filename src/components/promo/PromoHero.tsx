import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PromoHeroProps {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: 'pink' | 'cyan' | 'gold';
  backgroundImage?: string;
  children?: React.ReactNode;
}

const accentStyles = {
  pink: {
    badge: 'bg-primary/20 text-primary border-primary/30',
    title: 'neon-text-pink',
    glow: 'from-primary/30 via-primary/10 to-transparent',
    orb1: 'bg-primary/30',
    orb2: 'bg-accent/20',
  },
  cyan: {
    badge: 'bg-secondary/20 text-secondary border-secondary/30',
    title: 'neon-text-cyan',
    glow: 'from-secondary/30 via-secondary/10 to-transparent',
    orb1: 'bg-secondary/30',
    orb2: 'bg-primary/20',
  },
  gold: {
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    title: 'text-amber-400',
    glow: 'from-amber-500/30 via-amber-500/10 to-transparent',
    orb1: 'bg-amber-500/30',
    orb2: 'bg-rose-500/20',
  },
};

export const PromoHero: React.FC<PromoHeroProps> = ({
  badge,
  title,
  subtitle,
  description,
  accentColor,
  backgroundImage,
  children,
}) => {
  const styles = accentStyles[accentColor];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      
      {/* Animated orbs */}
      <motion.div
        className={cn("absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]", styles.orb1)}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn("absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]", styles.orb2)}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <span className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border mb-6",
            styles.badge
          )}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {badge}
          </span>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight">
            <span className="text-foreground block">{subtitle}</span>
            <span className={cn("block", styles.title)}>{title}</span>
          </h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            {description}
          </motion.p>

          {/* CTA / Children */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <motion.div 
            className="w-1.5 h-3 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default PromoHero;

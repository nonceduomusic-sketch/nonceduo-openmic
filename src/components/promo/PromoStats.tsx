import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/effects/AnimatedCounter';
import { cn } from '@/lib/utils';

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  icon?: React.ReactNode;
}

interface PromoStatsProps {
  stats: Stat[];
  accentColor?: 'pink' | 'cyan' | 'gold';
  className?: string;
}

const accentStyles = {
  pink: 'from-primary/10 to-primary/5 border-primary/20',
  cyan: 'from-secondary/10 to-secondary/5 border-secondary/20',
  gold: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
};

export const PromoStats: React.FC<PromoStatsProps> = ({
  stats,
  accentColor = 'pink',
  className,
}) => {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className={cn(
            "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 p-6 md:p-10 rounded-3xl",
            "bg-gradient-to-br border backdrop-blur-sm",
            accentStyles[accentColor]
          )}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center p-4"
            >
              {stat.icon && (
                <div className="mb-3 flex justify-center text-muted-foreground">
                  {stat.icon}
                </div>
              )}
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-foreground"
                duration={2.5}
              />
              <p className="text-sm md:text-base text-muted-foreground font-medium mt-2">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PromoStats;

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface PromoFeaturesProps {
  title: string;
  subtitle?: string;
  features: Feature[];
  accentColor?: 'pink' | 'cyan' | 'gold';
  className?: string;
}

const accentStyles = {
  pink: {
    iconBg: 'bg-primary/10 text-primary',
    border: 'hover:border-primary/30',
  },
  cyan: {
    iconBg: 'bg-secondary/10 text-secondary',
    border: 'hover:border-secondary/30',
  },
  gold: {
    iconBg: 'bg-amber-500/10 text-amber-400',
    border: 'hover:border-amber-500/30',
  },
};

export const PromoFeatures: React.FC<PromoFeaturesProps> = ({
  title,
  subtitle,
  features,
  accentColor = 'pink',
  className,
}) => {
  const styles = accentStyles[accentColor];

  return (
    <section className={cn("py-16 md:py-24 bg-card/30", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={cn(
                "p-6 md:p-8 rounded-2xl bg-card border border-border/50 transition-all duration-300",
                styles.border
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center mb-5",
                styles.iconBg
              )}>
                {feature.icon}
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoFeatures;

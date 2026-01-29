import React from 'react';
import { motion } from 'framer-motion';
import { Mic2, MessageSquareHeart, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromoFormatsProps {
  showOpenMic?: boolean;
  showDediche?: boolean;
  showBand?: boolean;
  variant?: 'locali' | 'eventi' | 'matrimoni';
  className?: string;
}

const formats = [
  {
    key: 'openmic',
    icon: Mic2,
    title: 'Open Mic',
    description: 'I tuoi ospiti salgono sul palco e cantano con noi. Prenoti la canzone dal telefono, noi suoniamo, loro cantano!',
    color: 'pink',
    highlight: 'Il pubblico diventa protagonista',
  },
  {
    key: 'dediche',
    icon: MessageSquareHeart,
    title: 'Dediche Live',
    description: 'Dedica una canzone a qualcuno di speciale. Il messaggio appare sul nostro schermo e noi suoniamo la canzone.',
    color: 'cyan',
    highlight: 'Momenti emozionanti garantiti',
  },
  {
    key: 'band',
    icon: Music,
    title: 'Live Band',
    description: 'Show musicale energetico con repertorio vastissimo. Pop, rock, dance anni 80-90-2000 fino ai successi di oggi.',
    color: 'purple',
    highlight: 'Energia pura sul palco',
  },
];

const colorStyles = {
  pink: {
    bg: 'bg-primary/10',
    border: 'border-primary/30 hover:border-primary/50',
    icon: 'text-primary',
    highlight: 'bg-primary/20 text-primary',
  },
  cyan: {
    bg: 'bg-secondary/10',
    border: 'border-secondary/30 hover:border-secondary/50',
    icon: 'text-secondary',
    highlight: 'bg-secondary/20 text-secondary',
  },
  purple: {
    bg: 'bg-accent/10',
    border: 'border-accent/30 hover:border-accent/50',
    icon: 'text-accent',
    highlight: 'bg-accent/20 text-accent',
  },
};

export const PromoFormats: React.FC<PromoFormatsProps> = ({
  showOpenMic = true,
  showDediche = true,
  showBand = true,
  variant = 'locali',
  className,
}) => {
  const visibleFormats = formats.filter((f) => {
    if (f.key === 'openmic') return showOpenMic;
    if (f.key === 'dediche') return showDediche;
    if (f.key === 'band') return showBand;
    return false;
  });

  const titles = {
    locali: 'I Nostri Format Interattivi',
    eventi: 'Esperienze Uniche per i Tuoi Ospiti',
    matrimoni: 'Momenti Indimenticabili',
  };

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            {titles[variant]}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {visibleFormats.map((format, index) => {
            const style = colorStyles[format.color as keyof typeof colorStyles];
            const Icon = format.icon;
            
            return (
              <motion.div
                key={format.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className={cn(
                  "relative p-8 rounded-3xl bg-card border-2 transition-all duration-300",
                  style.border
                )}
              >
                {/* Icon */}
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", style.bg)}>
                  <Icon className={cn("w-8 h-8", style.icon)} />
                </div>

                {/* Content */}
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                  {format.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {format.description}
                </p>

                {/* Highlight badge */}
                <span className={cn(
                  "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                  style.highlight
                )}>
                  {format.highlight}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PromoFormats;

import React from 'react';
import { motion } from 'framer-motion';
import { Mic2, MessageSquareHeart, Music, Guitar, Heart, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PromoFormatsProps {
  showDuo?: boolean;
  showOpenMic?: boolean;
  showDediche?: boolean;
  showBand?: boolean;
  showGames?: boolean;
  variant?: 'locali' | 'eventi' | 'matrimoni' | 'piazza';
  className?: string;
}

const formatLinks: Record<string, string> = {
  duo: '/partyband',
  openmic: '/openmic',
  dediche: '/messaggi',
  band: '/partyband',
  games: '/app/giochi',
};

const formats = [
  {
    key: 'duo',
    icon: Guitar,
    title: 'Non c\'è Duo',
    description: 'Il cuore del progetto: voce e chitarra che riempiono qualsiasi spazio. Eleganza, emozione e repertorio vastissimo in formato acustico.',
    color: 'gold',
    highlight: '❤️ Il nostro cuore pulsante',
    featured: true,
  },
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
  {
    key: 'games',
    icon: Gamepad2,
    title: 'Non C\'è Furore',
    description: 'Quiz musicali e giochi interattivi dal vivo! Sfida gli altri ospiti dal tuo telefono mentre aspetti il tuo turno.',
    color: 'green',
    highlight: '🎮 Divertimento assicurato',
  },
];

const colorStyles = {
  gold: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40 hover:border-amber-500/70',
    icon: 'text-amber-500',
    highlight: 'bg-amber-500/20 text-amber-600',
    glow: 'shadow-amber-500/20',
  },
  pink: {
    bg: 'bg-primary/10',
    border: 'border-primary/30 hover:border-primary/50',
    icon: 'text-primary',
    highlight: 'bg-primary/20 text-primary',
    glow: '',
  },
  cyan: {
    bg: 'bg-secondary/10',
    border: 'border-secondary/30 hover:border-secondary/50',
    icon: 'text-secondary',
    highlight: 'bg-secondary/20 text-secondary',
    glow: '',
  },
  purple: {
    bg: 'bg-accent/10',
    border: 'border-accent/30 hover:border-accent/50',
    icon: 'text-accent',
    highlight: 'bg-accent/20 text-accent',
    glow: '',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    icon: 'text-emerald-500',
    highlight: 'bg-emerald-500/20 text-emerald-600',
    glow: '',
  },
};

export const PromoFormats: React.FC<PromoFormatsProps> = ({
  showDuo = true,
  showOpenMic = true,
  showDediche = true,
  showBand = true,
  showGames = true,
  variant = 'locali',
  className,
}) => {
  const navigate = useNavigate();
  
  const visibleFormats = formats.filter((f) => {
    if (f.key === 'duo') return showDuo;
    if (f.key === 'openmic') return showOpenMic;
    if (f.key === 'dediche') return showDediche;
    if (f.key === 'band') return showBand;
    if (f.key === 'games') return showGames;
    return false;
  });

  const titles = {
    locali: 'I Nostri Format Interattivi',
    eventi: 'Esperienze Uniche per i Tuoi Ospiti',
    matrimoni: 'Momenti Indimenticabili',
    piazza: 'Le Nostre Formule',
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

        <div className={cn(
          "grid gap-6 max-w-6xl mx-auto",
          visibleFormats.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : 
          visibleFormats.length === 3 ? "md:grid-cols-2 lg:grid-cols-3" : 
          "md:grid-cols-2"
        )}>
          {visibleFormats.map((format, index) => {
            const style = colorStyles[format.color as keyof typeof colorStyles];
            const Icon = format.icon;
            const isFeatured = 'featured' in format && format.featured;
            
            return (
              <motion.div
                key={format.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => navigate(formatLinks[format.key])}
                className={cn(
                  "relative p-6 md:p-8 rounded-3xl bg-card border-2 transition-all duration-300 hover:-translate-y-1 cursor-pointer",
                  style.border,
                  isFeatured && "ring-2 ring-amber-500/30 shadow-lg",
                  isFeatured && style.glow
                )}
              >
                {/* Featured badge */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-lg">
                      <Heart className="w-3 h-3 fill-current" />
                      IL CUORE
                    </span>
                  </div>
                )}
                
                {/* Icon */}
                <div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-5", style.bg)}>
                  <Icon className={cn("w-7 h-7 md:w-8 md:h-8", style.icon)} />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
                  {format.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4 text-sm md:text-base">
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

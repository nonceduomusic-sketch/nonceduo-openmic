import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import real event photos
import eventCrowdEnergy from '@/assets/promo/event-crowd-energy.jpg';
import duoStageBlue from '@/assets/promo/duo-stage-blue.jpg';
import duoSingingDaylight from '@/assets/promo/duo-singing-daylight.jpg';
import eventOutdoorCrowd from '@/assets/promo/event-outdoor-crowd.jpg';

interface PromoGalleryProps {
  variant?: 'locali' | 'eventi' | 'matrimoni';
  className?: string;
}

const accentStyles = {
  locali: {
    overlay: 'from-primary/20 to-transparent',
    border: 'hover:border-primary/50',
  },
  eventi: {
    overlay: 'from-secondary/20 to-transparent',
    border: 'hover:border-secondary/50',
  },
  matrimoni: {
    overlay: 'from-amber-500/20 to-transparent',
    border: 'hover:border-amber-500/50',
  },
};

export const PromoGallery: React.FC<PromoGalleryProps> = ({
  variant = 'locali',
  className,
}) => {
  const styles = accentStyles[variant];

  const images = [
    { src: eventCrowdEnergy, alt: 'Pubblico coinvolto durante performance live' },
    { src: duoStageBlue, alt: 'Non c\'è Duo sul palco' },
    { src: duoSingingDaylight, alt: 'Performance acustica del duo' },
    { src: eventOutdoorCrowd, alt: 'Evento outdoor con pubblico' },
  ];

  return (
    <section className={cn("py-16 md:py-24 bg-card/30", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Dal Vivo, Sul Serio
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Non sono stock photos. Siamo noi, nei nostri eventi, con il nostro pubblico.
          </p>
        </motion.div>

        {/* Gallery Grid - Masonry style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border/50 transition-all duration-300",
                styles.border,
                index === 0 ? "col-span-2 row-span-2" : "",
              )}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover aspect-square"
              />
              {/* Gradient overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t opacity-0 hover:opacity-100 transition-opacity duration-300",
                styles.overlay
              )} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoGallery;

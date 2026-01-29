import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Import real event photos
import eventCrowdEnergy from '@/assets/promo/event-crowd-energy.jpg';
import duoStageBlue from '@/assets/promo/duo-stage-blue.jpg';
import duoSingingDaylight from '@/assets/promo/duo-singing-daylight.jpg';
import eventOutdoorCrowd from '@/assets/promo/event-outdoor-crowd.jpg';
import duoDaytimeSmile from '@/assets/promo/duo-daytime-smile.jpg';
import duoCloseupStage from '@/assets/promo/duo-closeup-stage.jpg';
import guitaristSolo from '@/assets/promo/guitarist-solo.jpg';

interface PromoGalleryProps {
  variant?: 'locali' | 'eventi' | 'matrimoni';
  className?: string;
}

const accentStyles = {
  locali: {
    filter: 'saturate-110 contrast-105 brightness-95', // Slightly vibrant, party vibes
    overlay: 'from-primary/30 to-transparent',
    border: 'hover:border-primary/50',
  },
  eventi: {
    filter: 'saturate-90 contrast-110 brightness-100', // Professional, clean
    overlay: 'from-secondary/30 to-transparent',
    border: 'hover:border-secondary/50',
  },
  matrimoni: {
    filter: 'saturate-80 contrast-100 brightness-105 sepia-[0.1]', // Warm, romantic
    overlay: 'from-amber-500/30 to-transparent',
    border: 'hover:border-amber-500/50',
  },
};

export const PromoGallery: React.FC<PromoGalleryProps> = ({
  variant = 'locali',
  className,
}) => {
  const styles = accentStyles[variant];

  // Different image selections based on variant for best visual match
  const imagesByVariant = {
    locali: [
      { src: eventCrowdEnergy, alt: 'Pubblico coinvolto durante performance live', featured: true },
      { src: duoStageBlue, alt: 'Non c\'è Duo sul palco con luci blu' },
      { src: duoCloseupStage, alt: 'Performance intima del duo' },
      { src: eventOutdoorCrowd, alt: 'Evento outdoor con pubblico' },
      { src: duoDaytimeSmile, alt: 'Performance acustica diurna' },
      { src: guitaristSolo, alt: 'Chitarrista in performance' },
    ],
    eventi: [
      { src: duoCloseupStage, alt: 'Performance professionale del duo', featured: true },
      { src: eventCrowdEnergy, alt: 'Pubblico coinvolto all\'evento' },
      { src: duoDaytimeSmile, alt: 'Duo in performance acustica' },
      { src: duoStageBlue, alt: 'Sul palco con atmosfera elegante' },
      { src: guitaristSolo, alt: 'Musicista concentrato' },
      { src: duoSingingDaylight, alt: 'Performance outdoor' },
    ],
    matrimoni: [
      { src: duoDaytimeSmile, alt: 'Atmosfera elegante e sorrisi', featured: true },
      { src: guitaristSolo, alt: 'Musica acustica romantica' },
      { src: duoCloseupStage, alt: 'Performance intima' },
      { src: duoSingingDaylight, alt: 'Duo in armonia' },
      { src: eventOutdoorCrowd, alt: 'Celebrazione con ospiti' },
      { src: eventCrowdEnergy, alt: 'Momenti di gioia condivisa' },
    ],
  };

  const images = imagesByVariant[variant];

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

        {/* Gallery Grid - Masonry style with 6 images */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border/50 transition-all duration-300 group",
                styles.border,
                // Featured image (first one) spans 2 columns on desktop
                image.featured ? "col-span-2 md:col-span-2 row-span-1 md:row-span-2" : "",
              )}
            >
              <img
                src={image.src}
                alt={image.alt}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                  image.featured ? "aspect-video md:aspect-square" : "aspect-square",
                  // Apply color grading filter for consistency
                  styles.filter
                )}
              />
              {/* Gradient overlay on hover */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                styles.overlay
              )} />
              {/* Subtle vignette for cinematic look */}
              <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoGallery;

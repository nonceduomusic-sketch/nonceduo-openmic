import React, { forwardRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/effects/ScrollAnimations';

interface Testimonial {
  quote: string;
  author: string;
  event: string;
  rating?: number;
}

interface AnimatedTestimonialsSectionProps {
  testimonials?: Testimonial[];
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'partyband';
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const defaultTestimonials: Testimonial[] = [
  {
    quote: "Hanno reso il nostro matrimonio indimenticabile! Tutti gli ospiti ne parlano ancora.",
    author: "Marco & Sara",
    event: "Matrimonio 2024",
    rating: 5
  },
  {
    quote: "Energia pura dal primo all'ultimo minuto. Il locale era in delirio!",
    author: "Luca R.",
    event: "Compleanno 40 anni",
    rating: 5
  },
  {
    quote: "Professionali, puntuali e super coinvolgenti. Consigliatissimi!",
    author: "Giulia M.",
    event: "Evento Aziendale",
    rating: 5
  },
  {
    quote: "La serata perfetta per il nostro anniversario. Repertorio vastissimo!",
    author: "Paolo & Anna",
    event: "Anniversario 25 anni",
    rating: 5
  },
  {
    quote: "Open Mic fantastico! Ho cantato la mia canzone preferita, emozione unica!",
    author: "Francesco D.",
    event: "Serata Karaoke",
    rating: 5
  }
];

/**
 * AnimatedTestimonialsSection - Versione animata con carousel automatico
 */
export const AnimatedTestimonialsSection = forwardRef<HTMLElement, AnimatedTestimonialsSectionProps>(({
  testimonials,
  title = "Cosa Dicono di Noi",
  subtitle = "Le parole dei nostri clienti valgono più di mille descrizioni",
  variant = 'default',
  autoPlay = true,
  autoPlayInterval = 5000,
}, ref) => {
  const displayTestimonials = testimonials || defaultTestimonials;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-play carousel
  useEffect(() => {
    if (!autoPlay) return;
    
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % displayTestimonials.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, displayTestimonials.length]);

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % displayTestimonials.length);
  };

  const goToPrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + displayTestimonials.length) % displayTestimonials.length);
  };

  const currentTestimonial = displayTestimonials[currentIndex];

  // Show 3 testimonials at a time on desktop
  const getVisibleTestimonials = () => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const idx = (currentIndex + i) % displayTestimonials.length;
      result.push({ ...displayTestimonials[idx], originalIndex: idx });
    }
    return result;
  };

  return (
    <section ref={ref} className="py-16 md:py-24 bg-card/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal className="text-center mb-10 md:mb-16">
          <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-foreground">
            <span className={variant === 'partyband' ? 'neon-text-cyan' : 'neon-text-pink'}>{title}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {subtitle}
          </p>
        </ScrollReveal>

        {/* Mobile: Single carousel */}
        <div className="md:hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative p-6 rounded-2xl bg-card border border-border"
            >
              {/* Quote icon */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Quote className="w-4 h-4 text-primary-foreground" />
              </div>

              {/* Rating */}
              {currentTestimonial.rating && (
                <div className="flex gap-1 mb-4">
                  {[...Array(currentTestimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Star className="w-4 h-4 fill-primary text-primary" />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Quote */}
              <p className="text-foreground/90 italic mb-6 leading-relaxed text-lg">
                "{currentTestimonial.quote}"
              </p>

              {/* Author */}
              <div className="border-t border-border pt-4">
                <p className="font-semibold text-foreground">{currentTestimonial.author}</p>
                <p className="text-sm text-muted-foreground">{currentTestimonial.event}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={goToPrev}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex gap-2">
              {displayTestimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentIndex 
                      ? "bg-primary w-6" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
            
            <button
              onClick={goToNext}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop: Grid with stagger animation */}
        <StaggerContainer className="hidden md:grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {displayTestimonials.slice(0, 3).map((testimonial, index) => (
            <StaggerItem key={index}>
              <motion.div
                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full"
                whileHover={{ y: -5 }}
              >
                {/* Quote icon */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Quote className="w-4 h-4 text-primary-foreground" />
                </div>

                {/* Rating */}
                {testimonial.rating && (
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                )}

                {/* Quote */}
                <p className="text-foreground/90 italic mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-foreground">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.event}</p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
});

AnimatedTestimonialsSection.displayName = 'AnimatedTestimonialsSection';

export default AnimatedTestimonialsSection;

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rating?: number;
}

interface PromoTestimonialsProps {
  title: string;
  testimonials: Testimonial[];
  accentColor?: 'pink' | 'cyan' | 'gold';
  className?: string;
}

const accentStyles = {
  pink: {
    quote: 'from-primary to-accent',
    star: 'text-primary fill-primary',
  },
  cyan: {
    quote: 'from-secondary to-primary',
    star: 'text-secondary fill-secondary',
  },
  gold: {
    quote: 'from-amber-500 to-rose-500',
    star: 'text-amber-400 fill-amber-400',
  },
};

export const PromoTestimonials: React.FC<PromoTestimonialsProps> = ({
  title,
  testimonials,
  accentColor = 'pink',
  className,
}) => {
  const styles = accentStyles[accentColor];

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            {title}
          </h2>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative p-6 md:p-8 rounded-2xl bg-card border border-border/50 hover:border-border transition-all duration-300"
            >
              {/* Quote icon */}
              <div className={cn(
                "absolute -top-4 -left-2 w-10 h-10 rounded-full flex items-center justify-center",
                "bg-gradient-to-br",
                styles.quote
              )}>
                <Quote className="w-5 h-5 text-white" />
              </div>

              {/* Rating */}
              {testimonial.rating && (
                <div className="flex gap-1 mb-4 pt-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className={cn("w-4 h-4", styles.star)} />
                  ))}
                </div>
              )}

              {/* Quote text */}
              <p className="text-foreground/90 italic leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="border-t border-border pt-4">
                <p className="font-semibold text-foreground">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoTestimonials;

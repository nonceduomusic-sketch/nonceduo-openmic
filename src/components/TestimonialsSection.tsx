import React from 'react';
import { Quote, Star } from 'lucide-react';

interface Testimonial {
  quote: string;
  author: string;
  event: string;
  rating?: number;
}

interface TestimonialsSectionProps {
  testimonials?: Testimonial[];
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'partyband';
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
  }
];

const partybandTestimonials: Testimonial[] = [
  {
    quote: "La band ha fatto saltare tutti! Un sound incredibile che ha trasformato la serata.",
    author: "Andrea & Francesca",
    event: "Matrimonio 2024",
    rating: 5
  },
  {
    quote: "Avevamo 300 invitati e la pista era sempre piena. Semplicemente perfetti!",
    author: "Roberto T.",
    event: "Festa Aziendale",
    rating: 5
  },
  {
    quote: "Dal momento romantico alla festa scatenata, hanno gestito tutto alla perfezione.",
    author: "Elena & Matteo",
    event: "Matrimonio 2023",
    rating: 5
  }
];

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  testimonials,
  title = "Cosa Dicono di Noi",
  subtitle = "Le parole dei nostri clienti valgono più di mille descrizioni",
  variant = 'default'
}) => {
  const displayTestimonials = testimonials || (variant === 'partyband' ? partybandTestimonials : defaultTestimonials);

  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
            <span className={variant === 'partyband' ? 'neon-text-cyan' : 'neon-text-pink'}>{title}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {displayTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

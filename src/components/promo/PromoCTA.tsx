import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Instagram, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PromoCTAProps {
  title: string;
  subtitle: string;
  whatsappMessage?: string;
  accentColor?: 'pink' | 'cyan' | 'gold';
  className?: string;
}

const accentStyles = {
  pink: {
    gradient: 'from-primary/20 via-transparent to-accent/20',
    button: 'neon-button-pink',
    orb1: 'bg-primary/30',
    orb2: 'bg-accent/20',
  },
  cyan: {
    gradient: 'from-secondary/20 via-transparent to-primary/20',
    button: 'neon-button-cyan',
    orb1: 'bg-secondary/30',
    orb2: 'bg-primary/20',
  },
  gold: {
    gradient: 'from-amber-500/20 via-transparent to-rose-500/20',
    button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold',
    orb1: 'bg-amber-500/30',
    orb2: 'bg-rose-500/20',
  },
};

export const PromoCTA: React.FC<PromoCTAProps> = ({
  title,
  subtitle,
  whatsappMessage = "Ciao! Vorrei informazioni su Non c'è Duo",
  accentColor = 'pink',
  className,
}) => {
  const styles = accentStyles[accentColor];
  const whatsappUrl = `https://wa.me/393807911941?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <section className={cn("relative py-20 md:py-32 overflow-hidden", className)}>
      {/* Background */}
      <div className={cn("absolute inset-0 bg-gradient-to-r", styles.gradient)} />
      <motion.div
        className={cn("absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px]", styles.orb1)}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className={cn("absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full blur-[80px]", styles.orb2)}
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className={cn("text-lg px-8 py-6 rounded-full", styles.button)}>
                <Phone className="w-5 h-5 mr-2" />
                Contattaci su WhatsApp
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>

          {/* Secondary contacts */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex items-center justify-center gap-6 text-muted-foreground"
          >
            <a 
              href="mailto:nonceduo.music@gmail.com" 
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="hidden sm:inline">nonceduo.music@gmail.com</span>
            </a>
            <a 
              href="https://www.instagram.com/nonceduo.music/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="hidden sm:inline">@nonceduo.music</span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default PromoCTA;

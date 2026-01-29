import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, PartyPopper, Heart, ArrowRight, Music, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import brandLogo from '@/assets/brand-logo-text.png';

const collaborationOptions = [
  {
    icon: <Building2 className="w-10 h-10" />,
    title: 'Locali & Club',
    description: 'Serate che riempiono il locale. Open Mic, Dediche Live e tanta energia.',
    link: '/promo/locali',
    accentClass: 'from-primary to-accent',
    hoverBorder: 'hover:border-primary/50',
  },
  {
    icon: <PartyPopper className="w-10 h-10" />,
    title: 'Eventi Privati & Aziendali',
    description: 'Compleanni, cene aziendali, feste private. Intrattenimento che coinvolge.',
    link: '/promo/eventi',
    accentClass: 'from-secondary to-primary',
    hoverBorder: 'hover:border-secondary/50',
  },
  {
    icon: <Heart className="w-10 h-10" />,
    title: 'Matrimoni',
    description: 'Il giorno più bello merita musica indimenticabile. Emozioni vere.',
    link: '/promo/matrimoni',
    accentClass: 'from-amber-500 to-rose-500',
    hoverBorder: 'hover:border-amber-500/50',
  },
];

const Collabora: React.FC = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Collabora con Non c'è Duo | Musica Live per Locali, Eventi e Matrimoni</title>
        <meta name="description" content="Scopri come portare Non c'è Duo nel tuo locale, al tuo evento o al tuo matrimonio. Open Mic, Dediche Live e intrattenimento musicale unico." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/30 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src={brandLogo} alt="Non c'è Duo" className="h-8 md:h-10 w-auto" />
            </Link>
            <Link 
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Torna al sito
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <Music className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Collabora con Noi
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Portiamo la nostra musica e i nostri format interattivi ovunque ci sia voglia di 
                <span className="text-foreground font-medium"> far cantare le persone</span>.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Options Grid */}
        <section className="py-8 md:py-16 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {collaborationOptions.map((option, index) => (
                <motion.div
                  key={option.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                >
                  <Link to={option.link}>
                    <div className={cn(
                      "group relative p-8 rounded-2xl bg-card border border-border/50 transition-all duration-300",
                      "hover:shadow-xl hover:-translate-y-1",
                      option.hoverBorder
                    )}>
                      {/* Gradient icon background */}
                      <div className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center mb-6",
                        "bg-gradient-to-br text-white",
                        option.accentClass
                      )}>
                        {option.icon}
                      </div>

                      <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                        {option.title}
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        {option.description}
                      </p>

                      {/* Arrow CTA */}
                      <div className="flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                        <span>Scopri di più</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Direct Contact */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Hai un'idea diversa?
              </h3>
              <p className="text-muted-foreground mb-8">
                Festival, rassegne, eventi speciali... contattaci e raccontaci il tuo progetto!
              </p>
              <a
                href="https://wa.me/393807911941?text=Ciao! Ho un progetto speciale da proporvi..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#25D366] text-white font-bold text-lg hover:bg-[#20BD5A] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Scrivici su WhatsApp
              </a>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Collabora;

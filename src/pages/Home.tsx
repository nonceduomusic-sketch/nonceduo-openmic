import React from 'react';
import { Link } from 'react-router-dom';
import { Music, MapPin, PartyPopper, Heart, Users, Phone, Mail, Instagram, ChevronDown, Mic2, MessageCircle, Sparkles, Star, ArrowRight, Zap, Gamepad2, Guitar, Volume2, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { SEO } from '@/components/SEO';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { useFormatActiveCheck } from '@/hooks/useGlobalFormatSettings';

import duoPhoto1 from '@/assets/duo-photo-1.png';
import duoPhoto2 from '@/assets/duo-photo-2.png';
import duoPhoto3 from '@/assets/duo-photo-3.png';
import duoPhoto4 from '@/assets/duo-photo-4.png';

const FormatGrid: React.FC<{ isOpenmicVisible: boolean; isDedicheVisible: boolean; isFuroreVisible: boolean; isGiochiVisible: boolean; isCommunityVisible: boolean }> = ({ isOpenmicVisible, isDedicheVisible, isFuroreVisible, isGiochiVisible, isCommunityVisible }) => {
  const formats = [
    isOpenmicVisible && { key: 'openmic', to: '/openmic', icon: Mic2, label: 'Open Mic', sub: 'Il pubblico canta con noi', colorClass: 'secondary' },
    isDedicheVisible && { key: 'dediche', to: '/messaggi', icon: MessageCircle, label: 'Dediche', sub: 'Dedica una canzone live', colorClass: 'primary' },
    isFuroreVisible && { key: 'furore', to: '/app/furore', icon: Zap, label: "Non C'è Furore", sub: 'Quiz musicale dal vivo', colorClass: 'destructive' },
    isGiochiVisible && { key: 'giochi', to: '/app/giochi', icon: Gamepad2, label: 'Giochi', sub: 'Sfide tra il pubblico', colorClass: 'emerald-500' },
    isCommunityVisible && { key: 'community', to: '/social', icon: Users, label: 'Community', sub: 'Entra nel club', colorClass: 'accent' },
  ].filter(Boolean) as { key: string; to: string; icon: React.ElementType; label: string; sub: string; colorClass: string }[];

  if (formats.length === 0) return null;

  const gridCols = formats.length <= 2 ? 'grid-cols-2' 
    : formats.length === 3 ? 'grid-cols-3' 
    : formats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' 
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <div className={`grid ${gridCols} gap-3 max-w-4xl mx-auto px-4`}>
      {formats.map((f, i) => {
        const isLastOdd = formats.length % 2 !== 0 && i === formats.length - 1 && formats.length > 3;
        return (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Link to={f.to} className={`group block touch-manipulation ${isLastOdd ? 'col-span-2 sm:col-span-1' : ''}`}>
              <Card className={`bg-card/70 backdrop-blur-sm border-${f.colorClass}/40 hover:border-${f.colorClass} hover:scale-105 transition-all duration-300 overflow-hidden cursor-pointer h-full`}>
                <CardContent className="p-4 md:p-5 text-center relative">
                  <div className={`absolute inset-0 bg-gradient-to-t from-${f.colorClass}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-${f.colorClass}/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-${f.colorClass}/30 transition-all pointer-events-none`}>
                    <f.icon className={`w-6 h-6 text-${f.colorClass} pointer-events-none`} />
                  </div>
                  <span className="text-sm font-bold text-foreground block pointer-events-none">{f.label}</span>
                  <p className={`text-[10px] text-${f.colorClass} font-medium mt-0.5 pointer-events-none`}>{f.sub}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};

const Home: React.FC = () => {
  const { isActive: isFuroreVisible } = useFormatActiveCheck('furore');
  const { isActive: isGiochiVisible } = useFormatActiveCheck('giochi');
  const { isActive: isCommunityVisible } = useFormatActiveCheck('community');
  const { isActive: isOpenmicVisible } = useFormatActiveCheck('openmic');
  const { isActive: isDedicheVisible } = useFormatActiveCheck('dediche');

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasAnyFormat = isOpenmicVisible || isDedicheVisible || isFuroreVisible || isGiochiVisible || isCommunityVisible;

  return (
    <>
      <SEO 
        title="Non C'è Duo | Musica Live per Eventi"
        description="Musica live che accende la serata. Un duo acustico che trasforma ogni evento in un'esperienza indimenticabile. Locali, eventi, matrimoni, feste."
      />

      <div className="min-h-screen bg-background">
        <SiteHeader />

        {/* ═══════════════════════════════════════════════════════════════
            HERO SECTION — IL LIVE È IL PROTAGONISTA
        ═══════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Background image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${duoPhoto1})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
          
          {/* Animated orbs */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <motion.div
              className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-secondary/20 rounded-full blur-[100px]"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10 py-8">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 mb-6"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-primary font-bold text-sm uppercase tracking-wider">Musica Live</span>
            </motion.div>

            {/* Main headline — LIVE SHOW centered */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6"
            >
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1]">
                <span className="text-foreground block">La tua serata merita</span>
                <span className="neon-text-pink block">musica dal vivo vera</span>
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed px-4"
            >
              Voce, chitarra, energia e un repertorio che spacca. <strong className="text-foreground">Non C'è Duo</strong> porta 
              il palco ovunque e trasforma ogni evento in un'esperienza da ricordare.
            </motion.p>

            {/* Live Show highlights — quick value props */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-10 px-4"
            >
              {[
                { icon: Guitar, text: 'Duo Acustico' },
                { icon: Music, text: 'Ogni Evento, Ogni Mood' },
                { icon: Volume2, text: 'Show Personalizzato' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </motion.div>

            {/* Primary CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center mb-10 px-4"
            >
              <Button 
                size="lg" 
                className="neon-button-pink text-lg px-8 py-6 touch-target group"
                onClick={() => scrollToSection('contact')}
              >
                <Phone className="w-5 h-5 mr-2" />
                Contattaci
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link to="/partyband" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full text-lg px-8 py-6 border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground touch-target"
                >
                  <PartyPopper className="w-5 h-5 mr-2" />
                  Scopri Party Band
                </Button>
              </Link>
            </motion.div>

            <button 
              onClick={() => scrollToSection('about')}
              className="animate-bounce text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            ABOUT SECTION — Chi siamo, cosa facciamo dal vivo
        ═══════════════════════════════════════════════════════════════ */}
        <section id="about" className="py-16 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                  <img 
                    src={duoPhoto4} 
                    alt="Non C'è Duo dal vivo" 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 w-32 h-32 md:w-48 md:h-48 bg-gradient-to-br from-primary to-secondary rounded-2xl -z-10 blur-sm" />
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Chi Siamo</span>
                </div>
                
                <h2 className="font-display text-2xl md:text-4xl font-bold mb-4 md:mb-6 text-foreground leading-tight">
                  Non C'è Duo è energia acustica <span className="neon-text-cyan">allo stato puro</span>
                </h2>
                
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Un duo musicale che trasforma ogni evento in un'esperienza da ricordare, 
                    con un mix di emozione, ritmo e atmosfera.
                  </p>
                  <p>
                    Dall'atmosfera intima alla festa che decolla, ci adattiamo al mood della serata.
                  </p>
                  <p>
                    In duo acustico o con una formazione più ampia, portiamo sempre la giusta energia: 
                    <strong className="text-foreground"> elegante quando serve, travolgente quando si balla.</strong>
                  </p>
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                  <p className="text-primary font-semibold text-lg flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Con Non C'è Duo ogni serata diventa un'esperienza unica.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FORMAT SECTION — Complementari al live, non alternativi
        ═══════════════════════════════════════════════════════════════ */}
        {hasAnyFormat && (
          <section className="py-16 md:py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
            
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-10 md:mb-14"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 mb-4">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Il tocco in più</span>
                </div>
                
                <h2 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                  Rendi unico il tuo evento con i nostri{' '}
                  <span className="neon-text-cyan">Format Esclusivi</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                  Noi suoniamo dal vivo, e se vuoi, puoi abbinare questi format originali 
                  per <strong className="text-foreground">arricchire la serata</strong> e sorprendere i tuoi ospiti.
                </p>
                
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Music className="w-4 h-4 text-primary" />
                  <span>Modulari e combinabili con il live show</span>
                </div>
              </motion.div>

              <FormatGrid 
                isOpenmicVisible={isOpenmicVisible} 
                isDedicheVisible={isDedicheVisible} 
                isFuroreVisible={isFuroreVisible}
                isGiochiVisible={isGiochiVisible} 
                isCommunityVisible={isCommunityVisible} 
              />
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SERVICES — Dove Suoniamo
        ═══════════════════════════════════════════════════════════════ */}
        <section id="services" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-foreground">
                Dove <span className="neon-text-pink">Suoniamo</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Siamo disponibili in tutta Italia e ci adattiamo a ogni contesto.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: MapPin, title: "Locali & Club", description: "Serate live di qualità", color: "primary", link: "/promo/locali" },
                { icon: PartyPopper, title: "Eventi Privati", description: "Feste e cene aziendali", color: "secondary", link: "/promo/eventi" },
                { icon: Users, title: "Piazze & Festival", description: "Grandi eventi pubblici", color: "accent", link: "/promo/feste-piazza" },
                { icon: Heart, title: "Matrimoni", description: "Il tuo giorno speciale", color: "primary", link: "/promo/matrimoni" }
              ].map((service, index) => (
                <Link key={index} to={service.link}>
                  <Card 
                    className="group bg-card/80 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full"
                  >
                    <CardContent className="p-5 md:p-6">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-${service.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <service.icon className={`w-6 h-6 md:w-7 md:h-7 text-${service.color}`} />
                      </div>
                      <h3 className="font-display text-base md:text-xl font-semibold mb-1 md:mb-2 text-foreground">{service.title}</h3>
                      <p className="text-muted-foreground text-sm">{service.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* CTA Collabora */}
            <div className="mt-10 md:mt-16">
              <Link to="/collabora">
                <div className="relative p-6 md:p-10 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/15 to-secondary/20 border-2 border-primary/30 hover:border-primary/60 transition-all duration-300 hover:scale-[1.02] group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 mb-3">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">Organizzi eventi?</span>
                      </div>
                      <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
                        🤝 Collabora con Noi
                      </h3>
                      <p className="text-muted-foreground">
                        Sei un locale, un'azienda, un comitato? Scopri come portarci al tuo prossimo evento!
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold group-hover:gap-3 transition-all">
                        <span>Scopri di più</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            PARTY BAND SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
          <div className="absolute inset-0">
            <motion.div
              className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/30 rounded-full blur-[100px]"
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-secondary/30 rounded-full blur-[80px]"
              animate={{ scale: [1.15, 1, 1.15], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-6 md:mb-8">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="text-primary font-bold text-sm uppercase tracking-wider">Novità</span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight">
                <span className="text-foreground">Vuoi una festa</span>
                <br />
                <span className="neon-text-pink">che spacca?</span>
              </h2>

              <p className="text-xl md:text-2xl text-muted-foreground mb-6 md:mb-8">
                Non C'è Duo diventa <span className="text-secondary font-bold">Non C'è Band</span>
              </p>

              <div className="gradient-border rounded-2xl p-[2px] mb-8 md:mb-10 max-w-2xl mx-auto">
                <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
                  <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
                    Il duo funziona alla grande, ma quando vuoi <strong className="text-primary">alzare il volume</strong>, 
                    possiamo espanderci fino a <strong className="text-secondary">4-6 musicisti</strong> per un sound travolgente.
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-8 md:gap-12 mb-8 md:mb-10">
                <div className="text-center">
                  <div className="font-display text-3xl md:text-5xl font-black neon-text-pink">2</div>
                  <div className="text-sm text-muted-foreground font-medium">Duo</div>
                </div>
                <div className="text-2xl md:text-3xl text-muted-foreground self-center">→</div>
                <div className="text-center">
                  <div className="font-display text-3xl md:text-5xl font-black neon-text-cyan">4-6</div>
                  <div className="text-sm text-muted-foreground font-medium">Band</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
                <Link to="/partyband" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full neon-button-pink text-lg px-10 py-6 group touch-target"
                  >
                    <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    Scopri Party Band
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a 
                  href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20formazione%20Party%20Band"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full text-lg px-10 py-6 border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground touch-target"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp Diretto
                  </Button>
                </a>
              </div>

              <p className="mt-8 text-sm text-muted-foreground">
                💡 Stesso stile, stessa energia, <span className="text-primary font-semibold">volume massimo</span>
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Gallery Section */}
        <section id="gallery" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-foreground">
                <span className="neon-text-cyan">Gallery</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Alcuni momenti catturati durante i nostri eventi
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[duoPhoto1, duoPhoto2, duoPhoto3, duoPhoto4].map((photo, index) => (
                <div 
                  key={index}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer shadow-lg"
                >
                  <img 
                    src={photo} 
                    alt={`Non C'è Duo performance ${index + 1}`}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-foreground">
                Pronto a far <span className="neon-text-pink">decollare</span> la tua serata?
              </h2>
              <p className="text-muted-foreground mb-8 md:mb-12">
                Contattaci per info e preventivi.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 md:mb-12 px-4">
                <a 
                  href="https://wa.me/393807911941"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button size="lg" className="w-full neon-button-pink text-lg px-8 py-6 touch-target">
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp
                  </Button>
                </a>
                <a href="mailto:nonceduo.music@gmail.com" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full text-lg px-8 py-6 touch-target"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Email
                  </Button>
                </a>
              </div>

              {/* Social Links */}
              <div className="flex justify-center gap-6">
                <a 
                  href="https://www.instagram.com/nonceduo.music/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all hover:scale-110"
                >
                  <Instagram className="w-6 h-6" />
                </a>
                <a 
                  href="https://wa.me/393807911941"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all hover:scale-110"
                >
                  <Phone className="w-6 h-6" />
                </a>
                <a 
                  href="mailto:nonceduo.music@gmail.com"
                  className="w-14 h-14 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all hover:scale-110"
                >
                  <Mail className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <SiteFooter />

      </div>
    </>
  );
};

export default Home;

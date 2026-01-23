import React from 'react';
import { Link } from 'react-router-dom';
import { Music, MapPin, PartyPopper, Heart, Users, Phone, Mail, Instagram, ChevronDown, Mic2, MessageCircle, Sparkles, Star, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { SEO } from '@/components/SEO';
import { SiteHeader } from '@/components/site/SiteHeader';

import duoPhoto1 from '@/assets/duo-photo-1.png';
import duoPhoto2 from '@/assets/duo-photo-2.png';
import duoPhoto3 from '@/assets/duo-photo-3.png';
import duoPhoto4 from '@/assets/duo-photo-4.png';

const Home: React.FC = () => {

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SEO 
        title="Non C'è Duo | Musica Live per Eventi"
        description="Energia acustica allo stato puro. Musica live per locali, eventi privati, matrimoni e feste."
      />

      <div className="min-h-screen bg-background">
        <SiteHeader />

        {/* Hero Section - Maximum Impact */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Animated background gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background z-0" />
          <div className="absolute inset-0 overflow-hidden z-0">
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/25 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-secondary/25 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10 py-8">
            {/* Main headline */}
            <div className="mb-6 animate-fade-in">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-[1.1]">
                <span className="text-foreground">I migliori successi</span>
                <br />
                <span className="neon-text-pink">ora sai dove ascoltarli</span>
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed px-4">
              Energia acustica allo stato puro. Un duo musicale che trasforma 
              ogni evento in un'esperienza <strong className="text-foreground">indimenticabile</strong>.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 px-4">
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
            </div>

            {/* Format Cards - WOW experience teaser */}
            <div className="mb-10">
              <p className="text-sm text-muted-foreground mb-4 uppercase tracking-wider font-medium">
                Scopri i nostri format interattivi
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto px-4">
                <Link to="/openmic" className="group">
                  <Card className="bg-card/70 backdrop-blur-sm border-secondary/40 hover:border-secondary hover:scale-105 transition-all duration-300 overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-secondary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-secondary/30 transition-all">
                        <Mic2 className="w-6 h-6 text-secondary" />
                      </div>
                      <span className="text-sm font-bold text-foreground block">Open Mic</span>
                      <p className="text-[10px] text-secondary font-medium mt-0.5">Canta con noi</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link to="/messaggi" className="group">
                  <Card className="bg-card/70 backdrop-blur-sm border-primary/40 hover:border-primary hover:scale-105 transition-all duration-300 overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/30 transition-all">
                        <MessageCircle className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground block">Dediche</span>
                      <p className="text-[10px] text-primary font-medium mt-0.5">Invia messaggi</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link to="/social" className="group">
                  <Card className="bg-card/70 backdrop-blur-sm border-accent/40 hover:border-accent hover:scale-105 transition-all duration-300 overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/30 transition-all">
                        <Users className="w-6 h-6 text-accent" />
                      </div>
                      <span className="text-sm font-bold text-foreground block">Community</span>
                      <p className="text-[10px] text-accent font-medium mt-0.5">Entra nel club</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>

            <button 
              onClick={() => scrollToSection('about')}
              className="animate-bounce text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                  <img 
                    src={duoPhoto4} 
                    alt="Non C'è Duo" 
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

        {/* Services Section */}
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
                { icon: MapPin, title: "Locali & Club", description: "Serate live di qualità", color: "primary" },
                { icon: PartyPopper, title: "Eventi Privati", description: "Feste e cene aziendali", color: "secondary" },
                { icon: Users, title: "Piazze & Festival", description: "Grandi eventi", color: "accent" },
                { icon: Heart, title: "Matrimoni", description: "Il tuo giorno speciale", color: "primary" }
              ].map((service, index) => (
                <Card 
                  key={index}
                  className="group bg-card/80 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <CardContent className="p-5 md:p-6">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-${service.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <service.icon className={`w-6 h-6 md:w-7 md:h-7 text-${service.color}`} />
                    </div>
                    <h3 className="font-display text-base md:text-xl font-semibold mb-1 md:mb-2 text-foreground">{service.title}</h3>
                    <p className="text-muted-foreground text-sm">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 md:mt-16 p-5 md:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-border text-center">
              <p className="text-base md:text-lg text-foreground">
                🎤 Non solo musica: <strong>coinvolgiamo il pubblico</strong> con giochi, dediche e momenti interattivi.
              </p>
            </div>
          </div>
        </section>

        {/* Party Band Section - Maximum WOW */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/30 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-secondary/30 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-6 md:mb-8 animate-float">
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
        <footer className="py-8 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Mic2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold neon-text-pink">Non C'è Duo</span>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                © 2026 Non C'è Duo. Tutti i diritti riservati.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/openmic" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Open Mic
                </Link>
                <Link to="/social" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Community
                </Link>
                <Link to="/partyband" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Party Band
                </Link>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Home;

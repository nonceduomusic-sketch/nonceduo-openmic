import React from 'react';
import { Link } from 'react-router-dom';
import { Music, MapPin, PartyPopper, Heart, Users, Phone, Mail, Instagram, ChevronDown, Mic2, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { PageLayout } from '@/components/layout/PageLayout';
import { SEO } from '@/components/SEO';

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
      
      <PageLayout variant="main" showAdmin>
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background z-0" />
          
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 md:w-80 h-48 md:h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10 py-8">
            <h1 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
              <span className="text-foreground">I migliori successi di sempre</span>
              <br />
              <span className="neon-text-pink">Ora sai dove ascoltarli!</span>
            </h1>
            
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed px-4">
              Energia acustica allo stato puro. Un duo musicale che trasforma ogni evento 
              in un'esperienza da ricordare.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 px-4">
              <Button 
                size="lg" 
                className="neon-button-pink text-base md:text-lg px-6 md:px-8 touch-target"
                onClick={() => scrollToSection('contact')}
              >
                <Phone className="w-5 h-5 mr-2" />
                Contattaci
              </Button>
              <Link to="/partyband" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full text-base md:text-lg px-6 md:px-8 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground touch-target"
                >
                  <PartyPopper className="w-5 h-5 mr-2" />
                  Party Band
                </Button>
              </Link>
            </div>

            {/* Quick Access Cards - Mobile First */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8 px-4">
              <Link to="/openmic" className="block">
                <Card className="bg-card/60 border-primary/30 hover:border-primary transition-colors group">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mic2 className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Open Mic</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Canta con noi</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link to="/messaggi" className="block">
                <Card className="bg-card/60 border-secondary/30 hover:border-secondary transition-colors group">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-5 h-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Dediche</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Invia messaggi</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link to="/social" className="block col-span-2 sm:col-span-1">
                <Card className="bg-card/60 border-accent/30 hover:border-accent transition-colors group">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Community</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Unisciti a noi</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <button 
              onClick={() => scrollToSection('about')}
              className="animate-bounce text-muted-foreground hover:text-primary transition-colors hidden md:inline-block"
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
                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src={duoPhoto4} 
                    alt="Non C'è Duo" 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 w-32 h-32 md:w-48 md:h-48 bg-gradient-to-br from-primary to-secondary rounded-2xl -z-10" />
              </div>

              <div className="order-1 lg:order-2">
                <h2 className="font-display text-2xl md:text-4xl font-bold mb-4 md:mb-6 text-foreground">
                  Non C'è Duo è energia acustica <span className="neon-text-cyan">allo stato puro</span>
                </h2>
                
                <div className="space-y-3 md:space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
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
                  <p className="text-primary font-medium text-base md:text-lg pt-2 md:pt-4">
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
              <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
                Siamo disponibili in tutta Italia e ci adattiamo a ogni contesto.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {[
                { icon: MapPin, title: "Locali & Club", description: "Serate live di qualità" },
                { icon: PartyPopper, title: "Eventi Privati", description: "Feste e cene aziendali" },
                { icon: Users, title: "Piazze & Festival", description: "Grandi eventi" },
                { icon: Heart, title: "Matrimoni", description: "Il tuo giorno speciale" }
              ].map((service, index) => (
                <Card 
                  key={index}
                  className="group bg-card border-border hover:border-primary/50 transition-all duration-300"
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                      <service.icon className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                    </div>
                    <h3 className="font-display text-sm md:text-xl font-semibold mb-1 md:mb-2 text-foreground">{service.title}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 md:mt-16 p-4 md:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-border text-center">
              <p className="text-sm md:text-lg text-foreground">
                🎤 Non solo musica: <strong>coinvolgiamo il pubblico</strong> con giochi, dediche e momenti interattivi.
              </p>
            </div>
          </div>
        </section>

        {/* Party Band Section - WOW Effect */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/30 rounded-full blur-[80px] md:blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-secondary/30 rounded-full blur-[60px] md:blur-[100px] animate-pulse delay-700" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/20 border border-primary/40 mb-6 md:mb-8 animate-float">
                <span className="relative flex h-2 w-2 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-primary"></span>
                </span>
                <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">Novità</span>
              </div>

              <h2 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
                <span className="text-foreground">Vuoi una festa</span>
                <br />
                <span className="neon-text-pink animate-neon-pulse">che spacca?</span>
              </h2>

              <p className="text-lg md:text-2xl text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                Non C'è Duo diventa <span className="text-secondary font-semibold">Non C'è Band</span>
              </p>

              <div className="gradient-border rounded-2xl p-[2px] mb-8 md:mb-10 max-w-2xl mx-auto">
                <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 md:p-8">
                  <p className="text-sm md:text-lg text-foreground/90 leading-relaxed">
                    Il duo funziona alla grande, ma quando vuoi <strong className="text-primary">alzare il volume</strong>, 
                    possiamo espanderci a <strong className="text-secondary">4-6 musicisti</strong> per un sound travolgente.
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-6 md:gap-8 mb-8 md:mb-10">
                <div className="text-center">
                  <div className="font-display text-2xl md:text-4xl font-bold neon-text-pink">2</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Duo</div>
                </div>
                <div className="text-xl md:text-2xl text-muted-foreground self-center">→</div>
                <div className="text-center">
                  <div className="font-display text-2xl md:text-4xl font-bold neon-text-cyan">4-6</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Band</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                <Link to="/partyband" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full neon-button-pink text-base md:text-lg px-6 md:px-10 py-5 md:py-6 group touch-target"
                  >
                    <PartyPopper className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                    Scopri Party Band
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
                    className="w-full text-base md:text-lg px-6 md:px-10 py-5 md:py-6 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground touch-target"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp Diretto
                  </Button>
                </a>
              </div>

              <p className="mt-6 md:mt-8 text-xs md:text-sm text-muted-foreground">
                💡 Stesso stile, stessa energia, <span className="text-primary">volume massimo</span>
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* Gallery Section */}
        <section id="gallery" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-foreground">
                <span className="neon-text-cyan">Gallery</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
                Alcuni momenti catturati durante i nostri eventi
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[duoPhoto1, duoPhoto2, duoPhoto3, duoPhoto4].map((photo, index) => (
                <div 
                  key={index}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
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
              <p className="text-muted-foreground mb-8 md:mb-12 text-sm md:text-base">
                Contattaci per info e preventivi.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 md:mb-12 px-4">
                <a 
                  href="https://wa.me/393807911941"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button size="lg" className="w-full neon-button-pink touch-target">
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp
                  </Button>
                </a>
                <a 
                  href="mailto:nonceduo@gmail.com"
                  className="w-full sm:w-auto"
                >
                  <Button size="lg" variant="outline" className="w-full border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground touch-target">
                    <Mail className="w-5 h-5 mr-2" />
                    Email
                  </Button>
                </a>
                <a 
                  href="https://instagram.com/nonceduo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button size="lg" variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground touch-target">
                    <Instagram className="w-5 h-5 mr-2" />
                    Instagram
                  </Button>
                </a>
              </div>

              <p className="text-muted-foreground text-sm">
                📍 Disponibili in tutta Italia
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Music className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">Non C'è Duo</span>
            </div>
            <p className="text-muted-foreground text-xs md:text-sm">
              © 2025 Non C'è Duo. Tutti i diritti riservati.
            </p>
          </div>
        </footer>
      </PageLayout>
    </>
  );
};

export default Home;

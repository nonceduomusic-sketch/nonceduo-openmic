import React from 'react';
import { Link } from 'react-router-dom';
import { Music, MapPin, PartyPopper, Heart, Users, Phone, Mail, Instagram, ChevronDown, Mic2, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SocialCTA } from '@/components/SocialCTA';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { UserLoginIndicator } from '@/components/UserLoginIndicator';

import duoPhoto1 from '@/assets/duo-photo-1.png';
import duoPhoto2 from '@/assets/duo-photo-2.png';
import duoPhoto3 from '@/assets/duo-photo-3.png';
import duoPhoto4 from '@/assets/duo-photo-4.png';

const Home: React.FC = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">Non C'è Duo</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('about')} className="text-muted-foreground hover:text-foreground transition-colors">Chi Siamo</button>
              <button onClick={() => scrollToSection('services')} className="text-muted-foreground hover:text-foreground transition-colors">Dove Suoniamo</button>
              <button onClick={() => scrollToSection('gallery')} className="text-muted-foreground hover:text-foreground transition-colors">Gallery</button>
              <button onClick={() => scrollToSection('contact')} className="text-muted-foreground hover:text-foreground transition-colors">Contatti</button>
              <Link to="/partyband">
                <Button variant="outline" size="sm" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
                  <PartyPopper className="w-4 h-4 mr-2" />
                  Party Band
                </Button>
              </Link>
              <Link to="/openmic">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Mic2 className="w-4 h-4 mr-2" />
                  Open Mic
                </Button>
              </Link>
              <SocialCTA />
              <UserLoginIndicator />
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Area Admin">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <UserLoginIndicator compact />
              <Link to="/partyband">
                <Button variant="outline" size="sm" className="border-secondary text-secondary">
                  <PartyPopper className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/openmic">
                <Button variant="outline" size="sm" className="border-primary text-primary">
                  <Mic2 className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Area Admin">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background z-0" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="text-foreground">I migliori successi di sempre</span>
            <br />
            <span className="neon-text-pink">Ora sai dove ascoltarli!</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Energia acustica allo stato puro. Un duo musicale che trasforma ogni evento 
            in un'esperienza da ricordare, con un mix di emozione, ritmo e atmosfera.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="neon-button-pink text-lg px-8"
              onClick={() => scrollToSection('contact')}
            >
              <Phone className="w-5 h-5 mr-2" />
              Contattaci
            </Button>
            <Link to="/openmic">
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Mic2 className="w-5 h-5 mr-2" />
                Open Mic
              </Button>
            </Link>
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
      <section id="about" className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={duoPhoto4} 
                  alt="Non C'è Duo" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-gradient-to-br from-primary to-secondary rounded-2xl -z-10" />
            </div>

            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 text-foreground">
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
                <p className="text-primary font-medium text-lg pt-4">
                  Con Non C'è Duo ogni serata diventa un'esperienza unica.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Dove <span className="neon-text-pink">Suoniamo</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Siamo disponibili in tutta Italia e ci adattiamo a ogni contesto, anche logisticamente.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: MapPin, 
                title: "Locali & Club", 
                description: "Per serate live di qualità e atmosfera indimenticabile" 
              },
              { 
                icon: PartyPopper, 
                title: "Eventi Privati", 
                description: "Feste, cene aziendali, compleanni, anniversari" 
              },
              { 
                icon: Users, 
                title: "Piazze & Festival", 
                description: "Energia e coinvolgimento anche per grandi eventi" 
              },
              { 
                icon: Heart, 
                title: "Matrimoni", 
                description: "Colonna sonora perfetta per il tuo giorno speciale" 
              }
            ].map((service, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">{service.title}</h3>
                <p className="text-muted-foreground text-sm">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-border text-center">
            <p className="text-lg text-foreground">
              🎤 Non solo musica: <strong>coinvolgiamo il pubblico</strong> con giochi, dediche e momenti interattivi.
            </p>
          </div>
        </div>
      </section>

      {/* Party Band Section - WOW Effect */}
      <section className="py-24 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/30 rounded-full blur-[100px] animate-pulse delay-700" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px] animate-pulse delay-1000" />
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-8 animate-float">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Novità</span>
            </div>

            {/* Main Title with Glow */}
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-foreground">Vuoi una festa</span>
              <br />
              <span className="neon-text-pink animate-neon-pulse">che spacca?</span>
            </h2>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Non C'è Duo diventa <span className="text-secondary font-semibold">Non C'è Band</span>
            </p>

            {/* Description with gradient border */}
            <div className="gradient-border rounded-2xl p-[2px] mb-10 max-w-2xl mx-auto">
              <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-8">
                <p className="text-lg text-foreground/90 leading-relaxed">
                  Il duo funziona alla grande, ma quando vuoi <strong className="text-primary">alzare il volume</strong>, 
                  possiamo espanderci a <strong className="text-secondary">4-6 musicisti</strong> con batteria, basso e tastiere 
                  per un sound pieno e travolgente.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 max-w-lg mx-auto mb-10">
              <div className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold neon-text-pink">2</div>
                <div className="text-sm text-muted-foreground">Duo</div>
              </div>
              <div className="text-center text-2xl text-muted-foreground self-center">→</div>
              <div className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold neon-text-cyan">4-6</div>
                <div className="text-sm text-muted-foreground">Band</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/partyband">
                <Button 
                  size="lg" 
                  className="neon-button-pink text-lg px-10 py-6 group w-full sm:w-auto"
                >
                  <PartyPopper className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  Scopri Party Band
                </Button>
              </Link>
              <a 
                href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20formazione%20Party%20Band"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-10 py-6 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground w-full sm:w-auto"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  WhatsApp Diretto
                </Button>
              </a>
            </div>

            {/* Bottom note */}
            <p className="mt-8 text-sm text-muted-foreground">
              💡 Stesso stile, stessa energia, <span className="text-primary">volume massimo</span>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Gallery Section */}
      <section id="gallery" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              <span className="neon-text-cyan">Gallery</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Alcuni momenti catturati durante i nostri eventi
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[duoPhoto1, duoPhoto2, duoPhoto3, duoPhoto4].map((photo, index) => (
              <div 
                key={index}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
              >
                <img 
                  src={photo} 
                  alt={`Non C'è Duo performance ${index + 1}`}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Pronto a far <span className="neon-text-pink">decollare</span> la tua serata?
            </h2>
            <p className="text-muted-foreground mb-12">
              Contattaci per info e preventivi. Risponderemo il prima possibile!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a 
                href="https://wa.me/393807911941"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="neon-button-pink w-full sm:w-auto">
                  <Phone className="w-5 h-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <a href="mailto:nonceduo.music@gmail.com">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
                  <Mail className="w-5 h-5 mr-2" />
                  Email
                </Button>
              </a>
            </div>

            <div className="flex justify-center gap-6">
              <a 
                href="https://www.instagram.com/nonceduo.music/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-4 rounded-full bg-card border border-border hover:border-primary transition-colors"
              >
                <Instagram className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Music className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">Non C'è Duo</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2025 Non C'è Duo. Tutti i diritti riservati.
            </p>

            <Link to="/openmic" className="text-sm text-primary hover:text-primary/80 transition-colors">
              Vai all'Open Mic →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

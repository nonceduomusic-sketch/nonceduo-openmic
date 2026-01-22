import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Phone, Mail, Instagram, PartyPopper, Users, Sparkles, Volume2, ArrowLeft, ChevronDown, Mic2, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { TestimonialsSection } from '@/components/TestimonialsSection';

const PartyBand: React.FC = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Non C'è Band | Formazione Completa per Grandi Eventi"
        description="Quando il duo non basta, alziamo il volume. Batteria, basso, tastiere per un sound potente e travolgente."
        image="/og-partyband.jpg"
        url="/partyband"
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-xl font-bold text-foreground">Non C'è Band</span>
                <span className="block text-xs text-muted-foreground">by Non C'è Duo</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Torna al sito</span>
                </Button>
              </Link>
              <a 
                href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20formazione%20Party%20Band"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="neon-button-pink">
                  <Phone className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Contattaci</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-accent/10 to-background z-0" />
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[120px] animate-pulse delay-700" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-20 left-10 text-6xl animate-float opacity-20">🎸</div>
          <div className="absolute top-40 right-20 text-5xl animate-float delay-500 opacity-20">🥁</div>
          <div className="absolute bottom-40 left-20 text-4xl animate-float delay-1000 opacity-20">🎹</div>
          <div className="absolute bottom-20 right-10 text-5xl animate-float delay-300 opacity-20">🎤</div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/20 border border-primary/40 mb-8 animate-float">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Formazione Completa</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Non C'è</span>
            <br />
            <span className="neon-text-pink animate-neon-pulse">Band</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            Quando il duo non basta, alziamo il volume.
          </p>
          <p className="text-lg text-foreground/70 max-w-xl mx-auto mb-10">
            La stessa energia di <span className="text-primary">Non C'è Duo</span>, amplificata con una formazione completa per feste che non dimenticherai.
          </p>

          {/* Stats inline */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold neon-text-pink">2</div>
              <div className="text-sm text-muted-foreground mt-1">Duo</div>
            </div>
            <div className="text-center text-3xl text-muted-foreground self-center">→</div>
            <div className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold neon-text-cyan">4-6</div>
              <div className="text-sm text-muted-foreground mt-1">Band</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a 
              href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20formazione%20Party%20Band"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="neon-button-pink text-lg px-10 py-6 group w-full sm:w-auto">
                <Phone className="w-5 h-5 mr-2" />
                Richiedi Preventivo
              </Button>
            </a>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-10 py-6 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              onClick={() => scrollToSection('formazioni')}
            >
              <Users className="w-5 h-5 mr-2" />
              Scopri le Formazioni
            </Button>
          </div>

          <button 
            onClick={() => scrollToSection('formazioni')}
            className="animate-bounce text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
        </div>
      </section>

      {/* Formazioni Section */}
      <section id="formazioni" className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Scegli la <span className="neon-text-cyan">Formazione</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Ci adattiamo al tuo evento: dall'intimo al travolgente
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Duo - The Star */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-primary/10 to-card border-2 border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground">Il Nostro Cuore</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 text-foreground">Non C'è Duo</h3>
              <p className="text-3xl font-bold neon-text-pink mb-4">2 musicisti</p>
              <p className="text-muted-foreground text-sm mb-6">
                Il nostro format originale. Voce e chitarra che creano magia: dalla ballata intima al rock che fa saltare tutti. <strong className="text-foreground">Funziona sempre.</strong>
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Versatilità totale</li>
                <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Setup veloce e leggero</li>
                <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Perfetto per ogni contesto</li>
                <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Interazione col pubblico</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-border">
                <Link to="/">
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    Scopri Non C'è Duo →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Party Band */}
            <div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-secondary/20 text-secondary">Extra Power</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Volume2 className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 text-foreground">Non C'è Band</h3>
              <p className="text-3xl font-bold neon-text-cyan mb-4">4-6 musicisti</p>
              <p className="text-muted-foreground text-sm mb-6">
                Quando vuoi alzare il volume. Aggiungiamo batteria, basso, tastiere per un sound pieno e <strong className="text-foreground">travolgente</strong>.
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Sound potente e pieno</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Batteria e basso live</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Perfetto per feste grandi</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Impatto massimo</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-border">
                <a 
                  href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20formazione%20Party%20Band"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full neon-button-cyan">
                    <Phone className="w-4 h-4 mr-2" />
                    Richiedi Info
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              💡 <strong className="text-foreground">Stesso repertorio, stessa energia</strong> — solo con più strumenti quando serve
            </p>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Cosa <span className="neon-text-pink">Offriamo</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: PartyPopper, title: "Feste Private", description: "Compleanni, anniversari, lauree e ogni occasione speciale" },
              { icon: Users, title: "Eventi Aziendali", description: "Team building, cene di gala, convention e inaugurazioni" },
              { icon: Heart, title: "Matrimoni", description: "Cerimonia, aperitivo, ricevimento e festa serale" },
              { icon: Volume2, title: "Locali & Festival", description: "Concerti live con sound professionale" }
            ].map((item, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection variant="partyband" />

      {/* CTA Section */}
      <section id="contact" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/20 rounded-full blur-[80px]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Pronto a far <span className="neon-text-pink">esplodere</span> la tua festa?
            </h2>
            <p className="text-muted-foreground mb-10 text-lg">
              Contattaci per un preventivo personalizzato. Ti risponderemo entro 24 ore!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a 
                href="https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20sulla%20formazione%20Party%20Band%20per%20il%20mio%20evento"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="neon-button-pink w-full sm:w-auto text-lg px-8">
                  <Phone className="w-5 h-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <a href="mailto:nonceduo.music@gmail.com?subject=Richiesta%20info%20Party%20Band">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground text-lg px-8">
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
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Music className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">Non C'è Band</span>
            </Link>
            
            <p className="text-sm text-muted-foreground">
              © 2025 Non C'è Duo. Tutti i diritti riservati.
            </p>

            <Link to="/" className="text-sm text-primary hover:text-primary/80 transition-colors">
              ← Torna al sito principale
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PartyBand;

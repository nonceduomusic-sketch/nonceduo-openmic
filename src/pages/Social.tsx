import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { UserLoginIndicator } from '@/components/UserLoginIndicator';
import { 
  Users, 
  MessageCircle, 
  Shield, 
  Sparkles, 
  ArrowRight,
  Heart,
  Zap,
  Crown
} from 'lucide-react';

const Social: React.FC = () => {
  // Always show the promotional landing page - gating happens on /social/auth

  const features = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Chat Private",
      description: "Messaggia privatamente con altri membri della community"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Gruppi",
      description: "Unisciti a gruppi tematici e conosci nuove persone"
    },
    {
      icon: <Crown className="w-8 h-8" />,
      title: "Profilo Personale",
      description: "Crea il tuo profilo unico e condividi chi sei"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Ambiente Sicuro",
      description: "Moderazione attiva per una community rispettosa"
    }
  ];

  return (
    <>
      <SEO 
        title="Community | Non C'è Duo"
        description="Unisciti alla community di Non C'è Duo. Chat private, gruppi tematici e tanto divertimento!"
        image="/og-community.jpg"
        url="/social"
      />
      
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="container py-6">
            <nav className="flex items-center justify-between">
              <Link to="/" className="text-2xl font-bold font-orbitron neon-text-pink">
                NON CE DUO
              </Link>
              <UserLoginIndicator />
            </nav>
          </header>

          {/* Hero Section */}
          <section className="container py-16 md:py-24">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Nuova Community</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-orbitron mb-6 leading-tight">
                <span className="neon-text-pink">Unisciti</span>
                <br />
                <span className="text-foreground">alla </span>
                <span className="neon-text-cyan">Community</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Connettiti con altri fan, chatta privatamente, partecipa ai gruppi e vivi 
                l'esperienza Non Ce Duo al massimo!
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/social/auth">
                  <Button 
                    size="lg" 
                    className="group bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-lg px-8 py-6 rounded-2xl neon-glow-pink transition-all duration-300"
                  >
                    <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    Registrati Gratis
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/messaggi">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="text-lg px-8 py-6 rounded-2xl border-muted-foreground/30 hover:border-secondary hover:text-secondary"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Invia una Dedica
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="container py-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2 font-orbitron">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="container py-16 md:py-24">
            <Card className="relative overflow-hidden border-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20" />
              <div className="absolute inset-0 backdrop-blur-xl" />
              <CardContent className="relative z-10 p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-orbitron mb-4">
                  Pronto a far parte della famiglia?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                  La registrazione è gratuita e richiede solo pochi secondi.
                </p>
                <Link to="/social/auth">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-lg px-10 py-6 rounded-2xl neon-glow-cyan"
                  >
                    Inizia Ora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <footer className="container py-8 border-t border-border/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                © 2026 Non Ce Duo. Tutti i diritti riservati.
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Home
                </Link>
                <Link to="/messaggi" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Dediche
                </Link>
                <Link to="/openmic" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Open Mic
                </Link>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                  Privacy
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Social;

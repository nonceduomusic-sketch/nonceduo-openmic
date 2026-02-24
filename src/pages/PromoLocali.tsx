import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, Calendar, TrendingUp, Zap, Repeat, BarChart3 } from 'lucide-react';
import { PromoHero } from '@/components/promo/PromoHero';
import { PromoStats } from '@/components/promo/PromoStats';
import { PromoFormats } from '@/components/promo/PromoFormats';
import { PromoFeatures } from '@/components/promo/PromoFeatures';
import { PromoTestimonials } from '@/components/promo/PromoTestimonials';
import { PromoCTA } from '@/components/promo/PromoCTA';
import { PromoGallery } from '@/components/promo/PromoGallery';
import { PromoHeader } from '@/components/promo/PromoHeader';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

const PromoLocali: React.FC = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stats = [
    { value: 500, suffix: '+', label: 'Serate Live' },
    { value: 50, suffix: '+', label: 'Locali Partner' },
    { value: 10000, suffix: '+', label: 'Persone Coinvolte' },
    { value: 98, suffix: '%', label: 'Ritorno Clienti' },
  ];

  const features = [
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Pubblico Attivo',
      description: 'I tuoi clienti non stanno seduti a guardare. Salgono sul palco, prenotano canzoni, diventano protagonisti.',
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      title: 'Più Consumazioni',
      description: 'Quando il pubblico è coinvolto, resta più a lungo. Più tempo = più ordini al bancone.',
    },
    {
      icon: <Repeat className="w-7 h-7" />,
      title: 'Fidelizzazione',
      description: 'Chi sale sul palco non dimentica. Tornano, portano amici, parlano di voi.',
    },
    {
      icon: <Calendar className="w-7 h-7" />,
      title: 'Date Flessibili',
      description: 'Disponibili per serate singole, residenze settimanali o eventi speciali.',
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: 'Setup Veloce',
      description: 'Arriviamo, montiamo, spacchiamo. Nessuna complicazione tecnica per voi.',
    },
    {
      icon: <BarChart3 className="w-7 h-7" />,
      title: 'Social Proof',
      description: 'Stories e contenuti che i clienti condividono spontaneamente. Marketing gratuito per il tuo locale.',
    },
  ];

  const testimonials = [
    {
      quote: "Da quando abbiamo Non c'è Duo il giovedì sera, è diventato il nostro giorno più forte. Il locale è sempre pieno!",
      author: "Marco R.",
      role: "Proprietario - Bar Luna Rossa",
      rating: 5,
    },
    {
      quote: "Finalmente qualcosa di diverso dal solito DJ set. La gente impazzisce quando sale sul palco!",
      author: "Sara M.",
      role: "Event Manager - Disco Club",
      rating: 5,
    },
    {
      quote: "Professionali, puntuali e il pubblico li adora. Ormai sono un appuntamento fisso dell'estate.",
      author: "Andrea T.",
      role: "Direttore - Lido Estivo",
      rating: 5,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Non c'è Duo per Locali | Serate Interattive che Riempiono il Locale</title>
        <meta name="description" content="Open Mic e Dediche Live per bar, pub e discoteche. Il pubblico diventa protagonista. Più coinvolgimento, più consumazioni, più passaparola." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Fixed Header */}
        <PromoHeader accentColor="pink" />
        
        {/* Hero - with top padding for fixed header */}
        <div className="pt-14">
          <PromoHero
            badge="Per Locali & Club"
            subtitle="Trasforma le tue serate in"
            title="Eventi Virali"
            description="Basta serate piatte. Con Open Mic e Dediche Live il tuo pubblico diventa protagonista. Più coinvolgimento, più consumazioni, più passaparola."
            accentColor="pink"
          >
            <a href="https://wa.me/393807911941?text=Ciao! Ho un locale e vorrei informazioni su Non c'è Duo" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="neon-button-pink text-lg px-8 py-6 rounded-full">
                <Phone className="w-5 h-5 mr-2" />
                Parliamo della tua serata
              </Button>
            </a>
          </PromoHero>
        </div>

        {/* Stats */}
        <PromoStats stats={stats} accentColor="pink" />

        {/* Real Photos Gallery */}
        <PromoGallery variant="locali" />

        {/* Formats */}
        <PromoFormats variant="locali" showDuo={true} showBand={true} showOpenMic={true} showDediche={true} showGames={true} />

        {/* Features */}
        <PromoFeatures
          title="Perché Funziona nei Locali"
          subtitle="Non siamo solo musicisti. Siamo un sistema per riempire il tuo locale."
          features={features}
          accentColor="pink"
        />

        {/* Testimonials */}
        <PromoTestimonials
          title="Cosa Dicono i Locali"
          testimonials={testimonials}
          accentColor="pink"
        />

        {/* CTA */}
        <PromoCTA
          title="Pronti a Riempire il Tuo Locale?"
          subtitle="Contattaci per scoprire disponibilità e pacchetti per la tua prossima serata."
          whatsappMessage="Ciao! Ho un locale e vorrei informazioni su Non c'è Duo per le nostre serate."
          accentColor="pink"
        />
      </div>
    </>
  );
};

export default PromoLocali;

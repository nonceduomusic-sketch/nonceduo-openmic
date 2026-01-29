import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Award, Briefcase, Clock, Shield, HeartHandshake, Target } from 'lucide-react';
import { PromoHero } from '@/components/promo/PromoHero';
import { PromoStats } from '@/components/promo/PromoStats';
import { PromoFormats } from '@/components/promo/PromoFormats';
import { PromoFeatures } from '@/components/promo/PromoFeatures';
import { PromoTestimonials } from '@/components/promo/PromoTestimonials';
import { PromoCTA } from '@/components/promo/PromoCTA';
import { PromoGallery } from '@/components/promo/PromoGallery';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

const PromoEventi: React.FC = () => {
  const stats = [
    { value: 200, suffix: '+', label: 'Eventi Privati' },
    { value: 50, suffix: '+', label: 'Aziende Servite' },
    { value: 5000, suffix: '+', label: 'Ospiti Intrattenuti' },
    { value: 100, suffix: '%', label: 'Soddisfazione' },
  ];

  const features = [
    {
      icon: <Briefcase className="w-7 h-7" />,
      title: 'Eventi Corporate',
      description: 'Cene aziendali, team building, convention. Intrattenimento che rompe il ghiaccio e crea ricordi.',
    },
    {
      icon: <Award className="w-7 h-7" />,
      title: 'Feste Private',
      description: 'Compleanni importanti, anniversari, lauree. Momenti speciali che meritano un palco.',
    },
    {
      icon: <Target className="w-7 h-7" />,
      title: 'Su Misura',
      description: 'Playlist personalizzata, durata flessibile, format adattabile alle tue esigenze.',
    },
    {
      icon: <Clock className="w-7 h-7" />,
      title: 'Puntualità',
      description: 'Setup discreto, timing perfetto. Ci integriamo nel tuo programma senza intoppi.',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Affidabilità',
      description: 'Assicurazione, contratti chiari, backup tecnico. Zero sorprese il giorno dell\'evento.',
    },
    {
      icon: <HeartHandshake className="w-7 h-7" />,
      title: 'Coinvolgimento',
      description: 'I tuoi ospiti non guardano solo. Partecipano, cantano, si emozionano insieme.',
    },
  ];

  const testimonials = [
    {
      quote: "Per i 50 anni del CEO abbiamo voluto qualcosa di speciale. I colleghi ancora ne parlano!",
      author: "Giulia M.",
      role: "HR Director - Tech Company",
      rating: 5,
    },
    {
      quote: "L'evento aziendale più riuscito di sempre. Il team si è unito come mai prima.",
      author: "Roberto F.",
      role: "Event Manager - Multinazionale",
      rating: 5,
    },
    {
      quote: "Mia madre è salita sul palco e ha cantato Mina. Non la dimenticherà mai.",
      author: "Laura B.",
      role: "Organizzatrice - Festa 70 anni",
      rating: 5,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Non c'è Duo per Eventi | Feste Private e Corporate Indimenticabili</title>
        <meta name="description" content="Intrattenimento musicale interattivo per eventi aziendali, feste private e occasioni speciali. Gli ospiti diventano protagonisti." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <PromoHero
          badge="Eventi Privati & Corporate"
          subtitle="Trasforma il tuo evento in"
          title="Un'Esperienza Unica"
          description="Non il solito intrattenimento. I tuoi ospiti salgono sul palco, dedicano canzoni, creano momenti che resteranno per sempre."
          accentColor="cyan"
        >
          <a href="https://wa.me/393807911941?text=Ciao! Sto organizzando un evento e vorrei informazioni su Non c'è Duo" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="neon-button-cyan text-lg px-8 py-6 rounded-full">
              <Phone className="w-5 h-5 mr-2" />
              Parliamo del tuo evento
            </Button>
          </a>
        </PromoHero>

        {/* Stats */}
        <PromoStats stats={stats} accentColor="cyan" />

        {/* Real Photos Gallery */}
        <PromoGallery variant="eventi" />

        {/* Formats */}
        <PromoFormats variant="eventi" showBand={true} showOpenMic={true} showDediche={true} />

        {/* Features */}
        <PromoFeatures
          title="Perché Sceglierci per il Tuo Evento"
          subtitle="Professionalità, flessibilità e un'energia che contagia tutti gli ospiti."
          features={features}
          accentColor="cyan"
        />

        {/* Testimonials */}
        <PromoTestimonials
          title="Cosa Dicono i Nostri Clienti"
          testimonials={testimonials}
          accentColor="cyan"
        />

        {/* CTA */}
        <PromoCTA
          title="Rendiamo Indimenticabile il Tuo Evento?"
          subtitle="Contattaci per un preventivo personalizzato e scopri come possiamo trasformare la tua occasione speciale."
          whatsappMessage="Ciao! Sto organizzando un evento privato/aziendale e vorrei informazioni su Non c'è Duo."
          accentColor="cyan"
        />
      </div>
    </>
  );
};

export default PromoEventi;

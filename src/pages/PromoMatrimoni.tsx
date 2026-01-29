import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Heart, Music, Clock, Sparkles, Camera, Star, Users } from 'lucide-react';
import { PromoHero } from '@/components/promo/PromoHero';
import { PromoStats } from '@/components/promo/PromoStats';
import { PromoFormats } from '@/components/promo/PromoFormats';
import { PromoFeatures } from '@/components/promo/PromoFeatures';
import { PromoTestimonials } from '@/components/promo/PromoTestimonials';
import { PromoCTA } from '@/components/promo/PromoCTA';
import { PromoGallery } from '@/components/promo/PromoGallery';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { motion } from 'framer-motion';

const PromoMatrimoni: React.FC = () => {
  const stats = [
    { value: 150, suffix: '+', label: 'Matrimoni' },
    { value: 100, suffix: '%', label: 'Piste Piene' },
    { value: 8, suffix: '+', label: 'Anni di Esperienza' },
    { value: 5, suffix: '★', label: 'Recensioni' },
  ];

  const features = [
    {
      icon: <Heart className="w-7 h-7" />,
      title: 'Momenti Romantici',
      description: 'Dal primo ballo alle dediche degli ospiti. Creiamo l\'atmosfera perfetta per ogni momento.',
    },
    {
      icon: <Music className="w-7 h-7" />,
      title: 'Repertorio Infinito',
      description: 'Da Battisti ai Måneskin, dalla tarantella al rock. Ogni generazione trova la sua canzone.',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Ospiti Coinvolti',
      description: 'Lo zio che canta Vasco, la nonna che dedica una canzone. Momenti spontanei e autentici.',
    },
    {
      icon: <Clock className="w-7 h-7" />,
      title: 'Timeline Perfetta',
      description: 'Coordinamento con wedding planner, fotografi, catering. Integrazione impeccabile.',
    },
    {
      icon: <Camera className="w-7 h-7" />,
      title: 'Foto & Video Ready',
      description: 'Setup visivamente elegante. Ogni scatto sarà perfetto per il vostro album.',
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: 'Magia Garantita',
      description: 'Non è solo musica. È l\'emozione di vedere i vostri cari cantare per voi.',
    },
  ];

  const testimonials = [
    {
      quote: "Il momento in cui mio padre è salito sul palco a cantarmi una canzone... non lo dimenticherò mai. Grazie di cuore.",
      author: "Francesca & Marco",
      role: "Matrimonio Giugno 2024",
      rating: 5,
    },
    {
      quote: "300 invitati e la pista sempre piena. Dal primo ballo all'ultima canzone, energia pura!",
      author: "Giulia & Andrea",
      role: "Matrimonio Settembre 2023",
      rating: 5,
    },
    {
      quote: "Professionali, eleganti e incredibilmente coinvolgenti. I nostri ospiti ne parlano ancora.",
      author: "Sara & Luca",
      role: "Matrimonio Maggio 2024",
      rating: 5,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Non c'è Duo per Matrimoni | Il Giorno Più Bello Merita Musica Indimenticabile</title>
        <meta name="description" content="Musica live per matrimoni con Open Mic e Dediche. I vostri ospiti cantano, dedicano canzoni, creano momenti magici. Pista sempre piena garantita." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero with elegant gold accent */}
        <PromoHero
          badge="Matrimoni & Ricevimenti"
          subtitle="Il Vostro Grande Giorno"
          title="Indimenticabile"
          description="Non solo musica. Emozioni vere, momenti spontanei, ospiti che cantano per voi. Il matrimonio che avete sempre sognato."
          accentColor="gold"
        >
          <a href="https://wa.me/393807911941?text=Ciao! Mi sposo e vorrei informazioni su Non c'è Duo per il matrimonio" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-lg px-8 py-6 rounded-full shadow-lg shadow-amber-500/25">
              <Phone className="w-5 h-5 mr-2" />
              Parliamo del vostro matrimonio
            </Button>
          </a>
        </PromoHero>

        {/* Emotional moment section */}
        <section className="py-16 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
                <Heart className="w-10 h-10 text-amber-400" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Immagina Questo Momento
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                Tuo padre sale sul palco. Prende il microfono. Inizia a cantare la canzone che ti cantava 
                da bambina. La sala è in silenzio, tutti commossi. Tu piangi di gioia. 
                <strong className="text-foreground block mt-4">Questo è quello che creiamo.</strong>
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-amber-400" />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <PromoStats stats={stats} accentColor="gold" />

        {/* Real Photos Gallery */}
        <PromoGallery variant="matrimoni" />

        {/* Formats - matrimoni focused */}
        <PromoFormats variant="matrimoni" showBand={true} showOpenMic={true} showDediche={true} />

        {/* Features */}
        <PromoFeatures
          title="Perché Sceglierci per il Vostro Matrimonio"
          subtitle="Esperienza, eleganza e la capacità di creare momenti che resteranno per sempre."
          features={features}
          accentColor="gold"
        />

        {/* Testimonials */}
        <PromoTestimonials
          title="Le Parole degli Sposi"
          testimonials={testimonials}
          accentColor="gold"
        />

        {/* CTA */}
        <PromoCTA
          title="Pronti a Rendere Magico il Vostro Giorno?"
          subtitle="Contattateci per scoprire disponibilità e creare insieme il matrimonio dei vostri sogni."
          whatsappMessage="Ciao! Mi sposo e vorrei informazioni su Non c'è Duo per il mio matrimonio."
          accentColor="gold"
        />
      </div>
    </>
  );
};

export default PromoMatrimoni;

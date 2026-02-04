import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, MapPin, Volume2, Lightbulb, Shield, Clock, Mic2, Music, Truck } from 'lucide-react';
import { PromoHero } from '@/components/promo/PromoHero';
import { PromoStats } from '@/components/promo/PromoStats';
import { PromoFormats } from '@/components/promo/PromoFormats';
import { PromoFeatures } from '@/components/promo/PromoFeatures';
import { PromoTestimonials } from '@/components/promo/PromoTestimonials';
import { PromoCTA } from '@/components/promo/PromoCTA';
import { PromoHeader } from '@/components/promo/PromoHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import piazzaFestival from '@/assets/promo/piazza-festival-stage.jpg';
import serviceAudio from '@/assets/promo/service-audio-stage.jpg';
import crowdEnergy from '@/assets/promo/event-crowd-energy.jpg';

const PromoFestePiazza: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stats = [
    { value: 100, suffix: '+', label: 'Eventi Pubblici' },
    { value: 50, suffix: 'k+', label: 'Persone Intrattenute' },
    { value: 10, suffix: '+', label: 'Comuni Partner' },
    { value: 100, suffix: '%', label: 'Eventi Riusciti' },
  ];

  const features = [
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Piazze Grandi e Piccole',
      description: 'Ci adattiamo a qualsiasi dimensione: dal piccolo borgo alla grande piazza cittadina.',
    },
    {
      icon: <Volume2 className="w-7 h-7" />,
      title: 'Service Audio Professionale',
      description: 'Possiamo fornire impianto audio completo con PA, mixer e microfoneria per ogni esigenza.',
    },
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: 'Luci da Palco',
      description: 'Illuminazione professionale con fari LED, teste mobili e effetti scenografici.',
    },
    {
      icon: <Truck className="w-7 h-7" />,
      title: 'Noleggio Palco',
      description: 'Non avete un palco? Ci pensiamo noi. Palchi modulari per ogni tipo di evento.',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Esperienza con Pro Loco',
      description: 'Collaboriamo regolarmente con Pro Loco, comitati e associazioni. Conosciamo le dinamiche.',
    },
    {
      icon: <Clock className="w-7 h-7" />,
      title: 'Chiavi in Mano',
      description: 'Dall\'organizzazione tecnica alla performance. Un unico interlocutore per tutto.',
    },
  ];

  const testimonials = [
    {
      quote: "Hanno gestito tutto loro: palco, audio, luci e spettacolo. La piazza era strapiena! Un successo totale.",
      author: "Giuseppe L.",
      role: "Presidente Pro Loco - Festa Patronale",
      rating: 5,
    },
    {
      quote: "Finalmente un gruppo che capisce le esigenze delle feste di paese. Professionali e alla mano.",
      author: "Maria C.",
      role: "Assessore alla Cultura",
      rating: 5,
    },
    {
      quote: "Tre anni che li chiamiamo per la sagra estiva. Il pubblico li adora e tornano sempre in tanti!",
      author: "Antonio R.",
      role: "Comitato Festeggiamenti",
      rating: 5,
    },
  ];

  const services = [
    { title: 'Solo Musica Live', description: 'Portiamo la band, voi avete già il resto', icon: Mic2 },
    { title: 'Musica + Audio', description: 'Band + impianto audio professionale', icon: Volume2 },
    { title: 'Pacchetto Completo', description: 'Palco + Audio + Luci + Band', icon: Sparkles },
  ];

  return (
    <>
      <Helmet>
        <title>Non c'è Duo per Feste di Piazza | Eventi Pubblici e Festival</title>
        <meta name="description" content="Musica live per feste di piazza, sagre, eventi patronali e festival. Offriamo anche noleggio palco, service audio e luci. Perfetti per Pro Loco, comitati e associazioni." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <PromoHeader accentColor="cyan" />
        
        {/* Hero */}
        <div className="pt-14">
          <PromoHero
            badge="Eventi Pubblici & Festival"
            subtitle="La tua piazza merita"
            title="Musica che Spacca"
            description="Feste patronali, sagre, eventi di piazza, rassegne estive. Portiamo energia, coinvolgimento e - se serve - anche palco, audio e luci."
            accentColor="cyan"
            backgroundImage={piazzaFestival}
          >
            <a href="https://wa.me/393807911941?text=Ciao! Organizzo un evento pubblico e vorrei informazioni su Non c'è Duo" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="neon-button-cyan text-lg px-8 py-6 rounded-full">
                <Phone className="w-5 h-5 mr-2" />
                Parliamo del tuo evento
              </Button>
            </a>
          </PromoHero>
        </div>

        {/* Stats */}
        <PromoStats stats={stats} accentColor="cyan" />

        {/* Service Packages Section */}
        <section className="py-16 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Cosa <span className="neon-text-cyan">Possiamo Offrirti</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  Dalla semplice esibizione al servizio completo "chiavi in mano". Scegli cosa ti serve.
                </p>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full bg-card border-border hover:border-accent/50 transition-all hover:-translate-y-1">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                        <service.icon className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-foreground mb-2">{service.title}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Equipment Showcase */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-2xl overflow-hidden"
            >
              <img 
                src={serviceAudio} 
                alt="Service audio e palco professionale" 
                className="w-full h-[300px] md:h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                  Servizio Tecnico Completo
                </h3>
                <div className="flex flex-wrap gap-3">
                  {['Palchi Modulari', 'PA System 5000W+', 'Luci LED Professionali', 'Mixer Digitale', 'Microfoneria'].map((item) => (
                    <span 
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Gallery with real crowd photo */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <img 
                  src={crowdEnergy} 
                  alt="Pubblico entusiasta durante un evento" 
                  className="rounded-2xl shadow-2xl"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  Perfetti per <span className="neon-text-cyan">Ogni Tipo di Evento</span>
                </h2>
                <ul className="space-y-4">
                  {[
                    'Feste patronali e sagre',
                    'Eventi organizzati da Pro Loco',
                    'Rassegne estive e festival',
                    'Inaugurazioni e celebrazioni',
                    'Eventi di comitati e associazioni',
                    'Notti bianche e feste di paese',
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3 text-lg">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <a href="https://wa.me/393807911941?text=Ciao! Sto organizzando un evento pubblico e vorrei un preventivo" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="neon-button-cyan">
                      <Phone className="w-5 h-5 mr-2" />
                      Richiedi Preventivo
                    </Button>
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Formats */}
        <PromoFormats variant="locali" showBand={true} showOpenMic={true} showDediche={true} />

        {/* Features */}
        <PromoFeatures
          title="Perché Scegliere Noi"
          subtitle="Esperienza, flessibilità e servizio completo per i vostri eventi pubblici."
          features={features}
          accentColor="cyan"
        />

        {/* Testimonials */}
        <PromoTestimonials
          title="Cosa Dicono gli Organizzatori"
          testimonials={testimonials}
          accentColor="cyan"
        />

        {/* CTA */}
        <PromoCTA
          title="Organizzi un Evento Pubblico?"
          subtitle="Contattaci per un preventivo personalizzato. Anche solo per la musica o con servizio tecnico completo."
          whatsappMessage="Ciao! Sto organizzando un evento pubblico (festa di piazza/sagra/festival) e vorrei informazioni su Non c'è Duo."
          accentColor="cyan"
        />
      </div>
    </>
  );
};

export default PromoFestePiazza;

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  Instagram,
  Guitar,
  Mic2,
  Music2,
  Drum,
  Flame,
  Volume2,
  Calendar,
  MapPin,
  ChevronDown,
  Users,
  Sparkles,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import bandFullStage from '@/assets/band/band-full-stage.jpg.asset.json';
import bandSinger1 from '@/assets/band/band-singer-1.jpg.asset.json';
import bandSinger2 from '@/assets/band/band-singer-2.jpg.asset.json';
import bandSinger3 from '@/assets/band/band-singer-3.jpg.asset.json';
import bandGuitarVocal from '@/assets/band/band-guitar-vocal.jpg.asset.json';
import bandGuitar2 from '@/assets/band/band-guitar-2.jpg.asset.json';
import bandGuitarDrums from '@/assets/band/band-guitar-drums.jpg.asset.json';
import bandBass from '@/assets/band/band-bass.jpg.asset.json';
import bandBassBack from '@/assets/band/band-bass-back.jpg.asset.json';
import bandDrums from '@/assets/band/band-drums.jpg.asset.json';
import bandDrums2 from '@/assets/band/band-drums-2.jpg.asset.json';
import bandDuel from '@/assets/band/band-duel.jpg.asset.json';

const WA_LINK =
  'https://wa.me/393807911941?text=Ciao!%20Vorrei%20info%20su%20Non%20C%27%C3%A8%20Band%20per%20il%20mio%20evento';

const lineup = [
  { icon: Mic2, role: 'Voce', tag: 'Frontline', photo: bandSinger1.url },
  { icon: Guitar, role: 'Chitarra & Voce', tag: 'Frontline', photo: bandGuitarVocal.url },
  { icon: Music2, role: 'Basso', tag: 'Groove', photo: bandBass.url },
  { icon: Drum, role: 'Batteria', tag: 'Motore', photo: bandDrums.url },
];

const galleryTop = [
  { src: bandFullStage.url, alt: "Non C'è Band - formazione completa sul palco" },
  { src: bandDuel.url, alt: 'Chitarra e voce in duetto' },
  { src: bandDrums2.url, alt: 'Batteria live' },
];

const galleryGrid = [
  { src: bandSinger2.url, alt: 'Voce sotto le luci' },
  { src: bandBassBack.url, alt: 'Basso di spalle' },
  { src: bandGuitar2.url, alt: 'Chitarra live' },
  { src: bandSinger3.url, alt: 'Cantante al microfono' },
  { src: bandGuitarDrums.url, alt: 'Chitarra e batteria' },
  { src: bandDrums.url, alt: 'Batterista' },
];

const setlist = [
  'Rock italiano anni 70/80/90',
  'Hit internazionali senza tempo',
  'Pop attuale in versione band',
  'Grandi classici che fanno saltare',
  'Ballate che uniscono il pubblico',
  'Medley esplosivi di fine serata',
];

const eventi = [
  { icon: Flame, title: 'Feste in Piazza', desc: 'Sagre, patronali, capodanni. Impianto e luci pro.' },
  { icon: Users, title: 'Matrimoni & Ricevimenti', desc: 'La festa serale che gli ospiti ricorderanno.' },
  { icon: Radio, title: 'Locali & Live Club', desc: 'Serate rock/pop con sound da concerto vero.' },
  { icon: Sparkles, title: 'Eventi Aziendali', desc: 'Gala, inaugurazioni, party di fine anno.' },
];

const NonCeBand: React.FC = () => {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEO
        title="Non C'è Band | Live Rock/Pop per feste, matrimoni, piazze"
        description="Non C'è Band: 4-6 musicisti live. Voce, chitarra, basso, batteria. Rock, pop e hit italiane/internazionali per feste in piazza, matrimoni, locali ed eventi."
        url="/band"
      />

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/band" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-black tracking-tight">NON C'È BAND</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Live Rock / Pop
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo('lineup')}
              className="hidden md:inline-flex px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Formazione
            </button>
            <button
              onClick={() => scrollTo('gallery')}
              className="hidden md:inline-flex px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Live
            </button>
            <button
              onClick={() => scrollTo('booking')}
              className="hidden md:inline-flex px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Booking
            </button>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="neon-button-pink">
                <Phone className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Prenota la band</span>
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-end pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={bandFullStage.url}
            alt="Non C'è Band live"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/50 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_hsl(var(--background))_90%)]" />
        </div>

        {/* Vertical tag */}
        <div className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 flex-col items-center gap-4 z-10">
          <div className="w-px h-24 bg-gradient-to-b from-transparent to-primary" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground rotate-180 [writing-mode:vertical-rl]">
            Live band · Since day one
          </span>
          <div className="w-px h-24 bg-gradient-to-t from-transparent to-primary" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/40 mb-6 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Formazione live · 4-6 elementi
              </span>
            </div>

            <h1 className="font-display font-black leading-[0.85] tracking-tight mb-6 text-[clamp(3.5rem,12vw,10rem)]">
              <span className="block text-foreground">NON C'È</span>
              <span className="block neon-text-pink animate-neon-pulse">BAND</span>
            </h1>

            <p className="text-lg md:text-2xl text-foreground/85 max-w-2xl mb-3 font-medium">
              Rock, pop e hit senza tempo — <span className="text-primary">volume vero</span>,
              luci accese, gente che canta.
            </p>
            <p className="text-base text-muted-foreground max-w-xl mb-10">
              Batteria, basso, chitarra e voce sul palco. Impianto pro, luci pro, professionisti
              live che fanno ballare qualunque tipo di pubblico.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="neon-button-pink text-base px-8 py-6 w-full sm:w-auto">
                  <Phone className="w-5 h-5 mr-2" />
                  Prenota per il tuo evento
                </Button>
              </a>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo('gallery')}
                className="text-base px-8 py-6 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Volume2 className="w-5 h-5 mr-2" />
                Guarda i live
              </Button>
            </div>
          </div>
        </div>

        <button
          onClick={() => scrollTo('lineup')}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-primary animate-bounce z-10"
          aria-label="Scorri"
        >
          <ChevronDown className="w-7 h-7" />
        </button>
      </section>

      {/* MARQUEE STRIP */}
      <div className="border-y border-border bg-card/50 overflow-hidden">
        <div className="flex gap-12 py-4 animate-[marquee_35s_linear_infinite] whitespace-nowrap font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground/40">
          {Array.from({ length: 2 }).map((_, i) => (
            <React.Fragment key={i}>
              <span>Rock</span><span className="text-primary">★</span>
              <span>Pop</span><span className="text-primary">★</span>
              <span>Hit italiane</span><span className="text-primary">★</span>
              <span>Anni 80/90</span><span className="text-primary">★</span>
              <span>Live band</span><span className="text-primary">★</span>
              <span>Feste in piazza</span><span className="text-primary">★</span>
              <span>Matrimoni</span><span className="text-primary">★</span>
              <span>Locali</span><span className="text-primary">★</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* LINEUP */}
      <section id="lineup" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-primary mb-3">
                / La formazione
              </div>
              <h2 className="font-display text-4xl md:text-6xl font-black leading-tight">
                Sul palco <br className="md:hidden" />
                <span className="neon-text-cyan">solo musicisti</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md text-lg">
              Due voci al centro del palco, chitarra e voce insieme. Nessuna base preregistrata: ogni nota è suonata dal vivo, ogni sera.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto">
            {lineup.map((m, i) => (
              <div
                key={i}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-border hover:border-primary/60 transition-all duration-500"
              >
                <img
                  src={m.photo}
                  alt={m.role}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <m.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {m.tag}
                    </span>
                  </div>
                  <div className="font-display text-xl md:text-2xl font-black text-foreground">
                    {m.role}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            + tastiere e fiati disponibili su richiesta per eventi speciali
          </p>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="py-24 bg-card/30 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.4em] text-primary mb-3">/ Live</div>
            <h2 className="font-display text-4xl md:text-6xl font-black leading-tight mb-4">
              Così suona una <span className="neon-text-pink">nostra serata</span>
            </h2>
          </div>

          {/* Featured 3 top */}
          <div className="grid md:grid-cols-3 gap-3 md:gap-4 mb-4">
            {galleryTop.map((p, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl border border-border group ${
                  i === 0 ? 'md:col-span-2 md:row-span-2 aspect-[16/10]' : 'aspect-[4/3]'
                }`}
              >
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {galleryGrid.map((p, i) => (
              <div
                key={i}
                className="aspect-[4/3] relative overflow-hidden rounded-2xl border border-border group"
              >
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SETLIST + EVENTI split */}
      <section className="py-24">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-primary mb-3">/ Repertorio</div>
            <h2 className="font-display text-4xl md:text-5xl font-black mb-6 leading-tight">
              Che musica suoniamo?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Un repertorio pensato per far ballare tre generazioni nella stessa serata.
            </p>
            <ul className="space-y-3">
              {setlist.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <span className="font-display text-2xl font-black text-primary w-10">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-foreground font-medium">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-primary mb-3">/ Per chi</div>
            <h2 className="font-display text-4xl md:text-5xl font-black mb-6 leading-tight">
              Dove ci trovate a suonare
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Dalla sagra di paese al matrimonio da mille invitati: adattiamo impianto, scaletta e
              formazione all'evento.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {eventi.map((e, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/10 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                    <e.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{e.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BIG QUOTE / STATEMENT */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={bandSinger1.url}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <div className="text-6xl md:text-8xl font-display font-black text-primary/40 leading-none mb-4">
            "
          </div>
          <p className="font-display text-3xl md:text-5xl font-black leading-tight mb-6">
            Non facciamo <span className="neon-text-pink">musica di sottofondo</span>. <br />
            Facciamo la sera che poi <span className="neon-text-cyan">ti ricordi</span>.
          </p>
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            — Non C'è Band
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section id="booking" className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="text-xs uppercase tracking-[0.4em] text-primary mb-3">/ Booking</div>
            <h2 className="font-display text-4xl md:text-6xl font-black leading-tight mb-6">
              Facciamo <span className="neon-text-pink">esplodere</span> il tuo evento
            </h2>
            <p className="text-muted-foreground text-lg">
              Scrivici la data, il luogo e due parole sull'evento. Ti rispondiamo entro 24 ore con
              disponibilità, formazione consigliata e preventivo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="font-display text-lg font-bold mb-1">Data</div>
              <p className="text-sm text-muted-foreground">Weekend o infrasettimanale, prenota per tempo</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="font-display text-lg font-bold mb-1">Luogo</div>
              <p className="text-sm text-muted-foreground">Centro Italia base, ci muoviamo ovunque</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="font-display text-lg font-bold mb-1">Pubblico</div>
              <p className="text-sm text-muted-foreground">Adattiamo scaletta e volume al tuo evento</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="neon-button-pink text-base px-10 py-6 w-full sm:w-auto">
                <Phone className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
            </a>
            <a href="mailto:nonceduo.music@gmail.com?subject=Richiesta%20Non%20C%27%C3%A8%20Band">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-10 py-6 w-full sm:w-auto border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email
              </Button>
            </a>
            <a
              href="https://www.instagram.com/nonceduo.music/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="ghost" className="text-base px-10 py-6 w-full sm:w-auto">
                <Instagram className="w-5 h-5 mr-2" />
                Instagram
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-border">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-black tracking-wide text-foreground">
              NON C'È BAND
            </span>
          </div>
          <div>© {new Date().getFullYear()} Non C'è Band · Live rock/pop</div>
          <Link to="/" className="hover:text-primary transition-colors">
            Altre formazioni & progetti →
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default NonCeBand;

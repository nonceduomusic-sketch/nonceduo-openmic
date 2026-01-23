import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { ArrowLeft, Shield, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy: React.FC = () => {
  return (
    <>
      <SEO 
        title="Informativa Privacy | Non C'è Duo"
        description="Informativa sul trattamento dei dati personali ai sensi del GDPR per la community Non C'è Duo"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <div className="container mx-auto px-4 h-14 flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-semibold text-lg">Informativa Privacy</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="prose prose-invert max-w-none">
            
            {/* Intro */}
            <div className="bg-card/50 rounded-2xl p-6 mb-8 border border-border/50">
              <p className="text-muted-foreground text-base leading-relaxed m-0">
                Questa informativa descrive come trattiamo i tuoi dati personali quando usi 
                <strong className="text-foreground"> nonceduo.com</strong>, la nostra community 
                per appassionati di musica e karaoke.
              </p>
            </div>

            {/* Titolare */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">1</span>
                Titolare del trattamento
              </h2>
              <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                <p className="text-base mb-2"><strong>Iacopo</strong></p>
                <p className="text-muted-foreground mb-1">Residente in Lazio, Italia</p>
                <p className="flex items-center gap-2 text-primary">
                  <Mail className="w-4 h-4" />
                  <a href="mailto:nonceduo.music@gmail.com" className="hover:underline">
                    nonceduo.music@gmail.com
                  </a>
                </p>
              </div>
            </section>

            {/* Finalità */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">2</span>
                Finalità del trattamento
              </h2>
              <p className="text-muted-foreground mb-3">I dati personali sono trattati per:</p>
              <ul className="space-y-2 text-base">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Fornire il servizio di community (registrazione account, pubblicazione post/commenti, amicizie, notifiche, messaggi privati, moderazione)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Migliorare la sicurezza e prevenire abusi</span>
                </li>
              </ul>
            </section>

            {/* Base giuridica */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">3</span>
                Base giuridica
              </h2>
              <ul className="space-y-2 text-base">
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span><strong>Consenso dell'utente</strong> (registrazione e contenuti condivisi)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span><strong>Esecuzione del contratto</strong> (uso della piattaforma)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span><strong>Interesse legittimo</strong> (sicurezza, moderazione abusi)</span>
                </li>
              </ul>
            </section>

            {/* Categorie dati */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">4</span>
                Categorie di dati personali raccolti
              </h2>
              <div className="grid gap-3">
                <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                  <h4 className="font-medium text-foreground mb-1">Dati identificativi</h4>
                  <p className="text-muted-foreground text-sm">Username, email</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                  <h4 className="font-medium text-foreground mb-1">Metadati</h4>
                  <p className="text-muted-foreground text-sm">Indirizzo IP, timestamp, dispositivo</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                  <h4 className="font-medium text-foreground mb-1">Contenuti generati</h4>
                  <p className="text-muted-foreground text-sm">Post, commenti, messaggi privati (DM), interazioni (like, amicizie)</p>
                </div>
              </div>
            </section>

            {/* Destinatari */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">5</span>
                Destinatari dei dati
              </h2>
              <ul className="space-y-2 text-base">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Supabase</strong> (provider DB e storage, USA – trasferimento extra-UE con Standard Contractual Clauses)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Nessun altro terzo, salvo obblighi legali</span>
                </li>
              </ul>
            </section>

            {/* Conservazione */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">6</span>
                Periodo di conservazione
              </h2>
              <p className="text-base">
                I dati sono conservati fino alla cancellazione dell'account + un periodo limitato per backup 
                e log di sicurezza (<strong>massimo 12 mesi</strong> dopo cancellazione).
              </p>
            </section>

            {/* Diritti */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">7</span>
                Diritti degli interessati
              </h2>
              <p className="text-base mb-4">Hai diritto di:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {['Accesso', 'Rettifica', 'Cancellazione', 'Limitazione', 'Opposizione', 'Portabilità'].map((right) => (
                  <div key={right} className="bg-secondary/10 text-secondary rounded-lg px-3 py-2 text-sm text-center">
                    {right}
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-base">
                Per esercitare i tuoi diritti, contattami a{' '}
                <a href="mailto:nonceduo.music@gmail.com" className="text-primary hover:underline">
                  nonceduo.music@gmail.com
                </a>
              </p>
            </section>

            {/* Reclamo */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">8</span>
                Reclamo
              </h2>
              <p className="text-base">
                Puoi proporre reclamo al{' '}
                <a 
                  href="https://www.garanteprivacy.it" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Garante per la protezione dei dati personali
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </section>

            {/* DM */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">9</span>
                Messaggi privati (DM)
              </h2>
              <p className="text-base">
                I messaggi privati sono accessibili solo ai partecipanti. L'owner accede solo in caso di 
                report di abusi o obblighi legali, per tutelare la community.
              </p>
            </section>

            {/* Minori */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">10</span>
                Minori
              </h2>
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
                <p className="text-base m-0">
                  Il servizio <strong>non è rivolto a minori sotto i 16 anni</strong>. Non raccogliamo 
                  consapevolmente dati di minori senza consenso dei genitori.
                </p>
              </div>
            </section>

            {/* Trasferimenti extra-UE */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">11</span>
                Trasferimenti extra-UE
              </h2>
              <p className="text-base">
                I dati sono ospitati su Supabase (USA) con garanzie adeguate (Standard Contractual Clauses - SCC).
              </p>
            </section>

            {/* Aggiornamento */}
            <div className="bg-muted/50 rounded-2xl p-6 mt-12 border border-border/50 text-center">
              <p className="text-muted-foreground text-sm m-0">
                <strong>Ultimo aggiornamento:</strong> Gennaio 2026
              </p>
            </div>

            {/* Back links */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Torna alla Home
                </Button>
              </Link>
              <Link to="/social" className="flex-1">
                <Button variant="default" className="w-full bg-gradient-to-r from-primary to-secondary">
                  Vai alla Community
                </Button>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © 2026 Non C'è Duo. Tutti i diritti riservati.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Privacy;

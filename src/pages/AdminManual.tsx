import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Book, 
  Users, 
  Music, 
  MessageSquare, 
  Calendar,
  Zap,
  Bell,
  Shield,
  Settings,
  Radio,
  Power,
  Lock,
  Clock,
  ChevronDown,
  ChevronRight,
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  HelpCircle,
  Ban,
  Crown,
  Undo2,
  Wifi,
  WifiOff,
  Server,
  Footprints,
  Monitor,
  Download,
  FileText,
  QrCode,
  Trophy,
  Heart,
  Megaphone,
  Bot,
  Image,
  Layers,
  GitBranch,
  Globe,
  Headphones,
  BookOpen,
  Play,
  Square,
  ArrowUpDown,
  Vote,
  UserCheck,
  ClipboardList,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/SEO';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';

// Helper Components
const ManualCollapsible: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => (
  <Collapsible open={isOpen} onOpenChange={onToggle}>
    <Card className={cn(
      "transition-all",
      isOpen && "ring-1 ring-primary/20"
    )}>
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent className="pt-0 pb-4">
          {children}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>
);

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
    <div className="shrink-0 mt-0.5">{icon}</div>
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{
  status: 'draft' | 'ready' | 'live' | 'closed';
  label: string;
  description: string;
}> = ({ status, label, description }) => {
  const colors = {
    draft: 'bg-muted text-muted-foreground',
    ready: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    live: 'bg-primary/20 text-primary',
    closed: 'bg-secondary/20 text-secondary',
  };
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
      <Badge className={colors[status]}>{label}</Badge>
      <span className="text-muted-foreground">{description}</span>
    </div>
  );
};

// PDF Download helpers
const handlePrintSection = (sectionId: string, title: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Gather all content from the manual
  const content = document.getElementById(sectionId);
  if (!content) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>${title} - Non C'è Duo</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
      h1 { font-size: 24px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 24px; }
      h3 { font-size: 15px; margin-top: 16px; }
      p, li { font-size: 13px; line-height: 1.6; }
      ul, ol { padding-left: 20px; }
      code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
      .badge { display: inline-block; background: #e0e0e0; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
      .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin: 8px 0; }
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; }
      @media print { body { padding: 20px; } }
    </style>
    </head><body>
    <h1>🎵 Non C'è Duo — ${title}</h1>
    <p style="color:#666;margin-bottom:24px">Generato il ${new Date().toLocaleDateString('it-IT')}</p>
    ${content.innerHTML}
    <div class="footer">Non C'è Duo — Manuale Operativo</div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

const AdminManualContent: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { isLoggedIn, isLoading } = useAdmin();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['user-intro']));

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = useCallback((prefix: string) => {
    const allIds = prefix === 'user' 
      ? ['user-intro','user-openmic','user-dediche','user-community','user-states','user-install']
      : ['admin-overview','admin-freemode','admin-events','admin-centro','admin-notifications','admin-dediche','admin-trasmetti','admin-songbook','admin-dual','admin-telecomando','admin-catalogo','admin-local-wifi','admin-pedal','admin-community-admin','admin-assistente','admin-grafiche','admin-qrcodes','admin-gamification','admin-user-limits','admin-staff','admin-operators','admin-block','admin-audit','admin-reset','admin-impostazioni'];
    setOpenSections(prev => {
      const next = new Set(prev);
      allIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  if (!embedded && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!embedded && !isLoggedIn) {
    return <AdminLogin />;
  }

  const manualContent = (
    <main className={embedded ? "px-2 py-4 pb-24" : "max-w-4xl mx-auto px-4 py-6 pb-24"}>
      {/* PDF Download Header */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Scarica il Manuale
          </CardTitle>
          <CardDescription className="text-xs">
            Stampa o salva come PDF le guide per consultarle offline
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              expandAll('user');
              setTimeout(() => handlePrintSection('manual-user-content', 'Guida Utente'), 400);
            }}
          >
            <FileText className="w-4 h-4" />
            Guida Utente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              expandAll('admin');
              setTimeout(() => handlePrintSection('manual-admin-content', 'Guida Admin'), 400);
            }}
          >
            <Shield className="w-4 h-4" />
            Guida Admin
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => {
              expandAll('user');
              expandAll('admin');
              setTimeout(() => handlePrintSection('manual-full-content', 'Manuale Completo'), 400);
            }}
          >
            <Book className="w-4 h-4" />
            Manuale Completo
          </Button>
        </CardContent>
      </Card>

      <div id="manual-full-content">
        <Tabs defaultValue="user" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user" className="gap-2">
              <Users className="w-4 h-4" />
              Guida Utente
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="w-4 h-4" />
              Guida Admin
            </TabsTrigger>
          </TabsList>

          {/* ==================== GUIDA UTENTE ==================== */}
          <TabsContent value="user" className="space-y-4">
            <div id="manual-user-content" className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Benvenuto!
                  </CardTitle>
                  <CardDescription>
                    Questa guida ti spiega come usare l'app durante gli eventi
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Come funziona */}
              <ManualCollapsible id="user-intro" title="Come funziona" icon={<Zap className="w-5 h-5 text-accent" />} isOpen={openSections.has('user-intro')} onToggle={() => toggleSection('user-intro')}>
                <div className="space-y-4 text-sm">
                  <p>L'app ti permette di interagire con gli eventi in diversi modi:</p>
                  <div className="grid gap-3">
                    <FeatureCard icon={<Music className="w-5 h-5 text-primary" />} title="Open Mic 🎤" description="Prenota una canzone da cantare durante la serata" />
                    <FeatureCard icon={<MessageSquare className="w-5 h-5 text-secondary" />} title="Dediche 💌" description="Invia un messaggio o una dedica alla band" />
                    <FeatureCard icon={<Users className="w-5 h-5 text-accent" />} title="Community 👥" description="Gruppi di chat, bacheca sociale e amicizie" />
                    <FeatureCard icon={<Trophy className="w-5 h-5 text-amber-500" />} title="Gamification 🏆" description="Guadagna punti e sali in classifica partecipando" />
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">💡 Suggerimento</p>
                    <p className="text-muted-foreground">Apri l'app quando sei al locale e vedrai automaticamente cosa è disponibile!</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Prenotare una canzone */}
              <ManualCollapsible id="user-openmic" title="Prenotare una canzone" icon={<Music className="w-5 h-5 text-primary" />} isOpen={openSections.has('user-openmic')} onToggle={() => toggleSection('user-openmic')}>
                <div className="space-y-4 text-sm">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Apri la sezione <strong>Open Mic</strong></li>
                    <li>Cerca la canzone che vuoi cantare</li>
                    <li>Inserisci il tuo nome</li>
                    <li>Se richiesto, inserisci il <strong>PIN</strong> dell'evento</li>
                    <li>Conferma la prenotazione</li>
                  </ol>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="font-medium mb-2">Cosa vedrai:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Scaletta Live:</strong> le canzoni in coda</li>
                      <li>• <strong>Posti rimanenti:</strong> quante prenotazioni sono ancora disponibili</li>
                      <li>• <strong>Timer:</strong> quanto tempo hai per prenotare</li>
                      <li>• <strong>Voti:</strong> vota le canzoni in scaletta (se abilitato)</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-primary font-medium"><Lock className="w-4 h-4 inline mr-1" />PIN richiesto?</p>
                    <p className="text-muted-foreground mt-1">Alcuni eventi richiedono un PIN. Chiedi allo staff il codice d'accesso!</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">⏳ Limiti per utente</p>
                    <p className="text-muted-foreground text-xs">L'admin può impostare limiti: massimo canzoni per serata, cooldown tra una prenotazione e l'altra, o un limite di prenotazioni consecutive. Se raggiungi un limite, vedrai un messaggio con il tempo di attesa.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Inviare una dedica */}
              <ManualCollapsible id="user-dediche" title="Inviare una dedica" icon={<MessageSquare className="w-5 h-5 text-secondary" />} isOpen={openSections.has('user-dediche')} onToggle={() => toggleSection('user-dediche')}>
                <div className="space-y-4 text-sm">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Apri la sezione <strong>Dediche</strong></li>
                    <li>Scrivi il tuo messaggio</li>
                    <li>Inserisci il tuo nome</li>
                    <li>Invia la dedica</li>
                  </ol>
                  <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                    <p className="font-medium text-secondary mb-1">💌 Tipi di dediche</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Messaggi privati:</strong> solo lo staff li vede</li>
                      <li>• <strong>Dediche pubbliche:</strong> possono essere lette durante l'evento</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Community */}
              <ManualCollapsible id="user-community" title="Community" icon={<Users className="w-5 h-5 text-accent" />} isOpen={openSections.has('user-community')} onToggle={() => toggleSection('user-community')}>
                <div className="space-y-4 text-sm">
                  <p>La sezione Community è uno spazio sociale per gli habitué:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Bacheca sociale:</strong> Posta aggiornamenti, foto e commenti</li>
                    <li>• <strong>Gruppi di chat:</strong> Entra in gruppi pubblici o con password</li>
                    <li>• <strong>Chat private:</strong> Messaggia direttamente altri utenti</li>
                    <li>• <strong>Amicizie:</strong> Invia e accetta richieste di amicizia</li>
                    <li>• <strong>Ricerca utenti:</strong> Trova persone nella community</li>
                  </ul>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">🔒 Accesso</p>
                    <p className="text-muted-foreground text-xs">Per partecipare alla Community devi registrarti con email e password. Alcune funzionalità richiedono l'approvazione di un moderatore.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Badge e stati */}
              <ManualCollapsible id="user-states" title="Cosa significano i badge" icon={<Radio className="w-5 h-5 text-primary" />} isOpen={openSections.has('user-states')} onToggle={() => toggleSection('user-states')}>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <Badge className="bg-primary text-primary-foreground"><Radio className="w-3 h-3 mr-1 animate-pulse" />LIVE</Badge>
                    <span>Evento in corso con regole attive</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <Badge className="bg-accent text-accent-foreground"><Zap className="w-3 h-3 mr-1" />Serata Aperta</Badge>
                    <span>Puoi prenotare senza limiti!</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                    <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Prossimamente</Badge>
                    <span>Nessun evento attivo, ma ce ne sono in programma</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                    <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />Consultabile</Badge>
                    <span>Puoi vedere il catalogo ma non prenotare</span>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Installare l'app */}
              <ManualCollapsible id="user-install" title="Installare l'app (PWA)" icon={<Smartphone className="w-5 h-5 text-blue-500" />} isOpen={openSections.has('user-install')} onToggle={() => toggleSection('user-install')}>
                <div className="space-y-4 text-sm">
                  <p>L'app può essere installata come un'app nativa sul tuo telefono:</p>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">📱 iPhone / iPad:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                      <li>Apri l'app in Safari</li>
                      <li>Tocca l'icona <strong>Condividi</strong> (quadrato con freccia)</li>
                      <li>Seleziona <strong>"Aggiungi a Home"</strong></li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">🤖 Android:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                      <li>Apri l'app in Chrome</li>
                      <li>Tocca il banner <strong>"Installa"</strong> che appare in basso</li>
                      <li>Oppure: menu ⋮ → <strong>"Installa app"</strong></li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="font-medium text-blue-500 mb-1">🔔 Vantaggi</p>
                    <p className="text-muted-foreground text-xs">Installando l'app ricevi notifiche push, si apre a schermo intero e funziona meglio offline.</p>
                  </div>
                </div>
              </ManualCollapsible>
            </div>
          </TabsContent>

          {/* ==================== GUIDA ADMIN ==================== */}
          <TabsContent value="admin" className="space-y-4">
            <div id="manual-admin-content" className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Pannello Admin
                  </CardTitle>
                  <CardDescription>Gestisci eventi, formati, broadcast e il tuo team</CardDescription>
                </CardHeader>
              </Card>

              {/* Panoramica */}
              <ManualCollapsible id="admin-overview" title="Panoramica del pannello" icon={<Settings className="w-5 h-5 text-muted-foreground" />} isOpen={openSections.has('admin-overview')} onToggle={() => toggleSection('admin-overview')}>
                <div className="space-y-4 text-sm">
                  <p>Il pannello è organizzato in tre aree principali:</p>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="font-bold text-primary mb-2">🔴 LIVE</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><strong>Centro:</strong> Dashboard in tempo reale con notifiche</li>
                        <li><strong>Evento:</strong> Gestione eventi programmati</li>
                        <li><strong>Formati:</strong> Toggle rapidi e notifiche</li>
                        <li><strong>Trasmetti:</strong> Broadcast TV, SongBook e partiture</li>
                        <li><strong>Notifiche Live:</strong> Email e Telegram</li>
                        <li><strong>Grafiche:</strong> Locandine e storie social</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="font-bold text-secondary mb-2">📋 OPERATIVO</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><strong>Open Mic:</strong> Lista prenotazioni canzoni</li>
                        <li><strong>Canzoni:</strong> Catalogo brani + SongBook (.cho)</li>
                        <li><strong>Dediche:</strong> Messaggi e chat con utenti</li>
                        <li><strong>Community:</strong> Gruppi, bacheca e moderazione</li>
                        <li><strong>Assistente:</strong> Chat automatica e gestione lead</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-muted border">
                      <p className="font-bold mb-2">⚙️ GESTIONE</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><strong>Impostazioni:</strong> Connessione, pedale, temi</li>
                        <li><strong>Operatori:</strong> Account con accesso limitato</li>
                        <li><strong>Staff:</strong> Gestione team (solo Owner)</li>
                        <li><strong>Permessi:</strong> Controllo accessi (solo Owner)</li>
                        <li><strong>Audit:</strong> Log attività (solo Owner)</li>
                        <li><strong>Manuale:</strong> Questa guida</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">📱 Navigazione mobile</p>
                    <p className="text-muted-foreground text-xs">Da telefono, le 5 sezioni principali sono nella barra in basso. Tutto il resto è nel <strong>menu hamburger</strong> in alto a sinistra.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Serata Aperta */}
              <ManualCollapsible id="admin-freemode" title="Serata Aperta (Free Mode)" icon={<Zap className="w-5 h-5 text-accent" />} isOpen={openSections.has('admin-freemode')} onToggle={() => toggleSection('admin-freemode')}>
                <div className="space-y-4 text-sm">
                  <p>La <strong>Serata Aperta</strong> attiva i formati senza evento programmato. Perfetta per serate improvvisate e test.</p>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-2">Come attivare:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Vai su <strong>Formati</strong></li>
                      <li>Usa la card <strong>"Serata Aperta"</strong></li>
                      <li>Attiva Open Mic, Dediche o entrambi</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">⚠️ Nota</p>
                    <p className="text-muted-foreground">Se c'è un evento LIVE, la Serata Aperta viene ignorata. L'evento LIVE ha sempre priorità!</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Eventi Programmati */}
              <ManualCollapsible id="admin-events" title="Eventi Programmati" icon={<Calendar className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-events')} onToggle={() => toggleSection('admin-events')}>
                <div className="space-y-4 text-sm">
                  <p>Gli eventi hanno 4 stati:</p>
                  <div className="grid gap-2">
                    <StatusBadge status="draft" label="Bozza" description="In lavorazione, non visibile" />
                    <StatusBadge status="ready" label="Pronto" description="Configurato, visibile come 'prossimamente'" />
                    <StatusBadge status="live" label="LIVE" description="Attivo, le regole sono applicate" />
                    <StatusBadge status="closed" label="Chiuso" description="Terminato, archivio" />
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-2">Configurazioni disponibili:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Tipo evento:</strong> Open Mic, Dediche o entrambi</li>
                      <li>• <strong>Finestra temporale:</strong> Quando aprono/chiudono le prenotazioni</li>
                      <li>• <strong>Limiti globali:</strong> Max canzoni e dediche totali</li>
                      <li>• <strong>Limiti per utente:</strong> Max per persona, cooldown, consecutivi</li>
                      <li>• <strong>PIN:</strong> Codice d'accesso opzionale</li>
                      <li>• <strong>Riapertura:</strong> Slot extra temporanei dopo la chiusura</li>
                      <li>• <strong>Chiusura automatica:</strong> Minuti prima della fine evento</li>
                      <li>• <strong>Countdown:</strong> Timer visibile agli utenti</li>
                      <li>• <strong>Modalità consultabile:</strong> Catalogo visibile ma non prenotabile</li>
                      <li>• <strong>Anteprima catalogo:</strong> Mostra i brani prima dell'apertura</li>
                      <li>• <strong>Protezione repertorio:</strong> Nascondi brani non disponibili</li>
                      <li>• <strong>Votazioni:</strong> Abilita i voti sulla scaletta</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">🔄 Riapertura evento</p>
                    <p className="text-muted-foreground text-xs">Dopo la chiusura puoi riaprire temporaneamente con slot extra. Modalità disponibili: timer (si richiude dopo X minuti) o manuale (chiudi quando vuoi).</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Centro Notifiche */}
              <ManualCollapsible id="admin-centro" title="Centro Notifiche" icon={<Bell className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-centro')} onToggle={() => toggleSection('admin-centro')}>
                <div className="space-y-4 text-sm">
                  <p>Il <strong>Centro</strong> è la dashboard operativa per gestire le richieste in tempo reale.</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Feed unificato:</strong> Canzoni e dediche in un'unica lista</li>
                    <li>• <strong>Filtri:</strong> In coda, Canzoni, Dediche, Tutte</li>
                    <li>• <strong>Swipe:</strong> Scorri per completare o eliminare</li>
                    <li>• <strong>Tap:</strong> Tocca per vedere i testi delle canzoni</li>
                    <li>• <strong>Contatore:</strong> Quante canzoni hai fatto nella serata</li>
                    <li>• <strong>Utenti connessi:</strong> Numero di dispositivi collegati</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Notifiche Push */}
              <ManualCollapsible id="admin-notifications" title="Notifiche Push" icon={<Smartphone className="w-5 h-5 text-blue-500" />} isOpen={openSections.has('admin-notifications')} onToggle={() => toggleSection('admin-notifications')}>
                <div className="space-y-4 text-sm">
                  <p>Ricevi notifiche anche quando l'app è chiusa:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Vai su <strong>Formati → Notifiche</strong></li>
                    <li>Clicca <strong>"Attiva"</strong></li>
                    <li>Attiva <strong>"Notifiche Background"</strong> per riceverle a app chiusa</li>
                    <li>Usa <strong>"Test ritardato"</strong> per verificare</li>
                  </ol>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="font-medium text-blue-500 mb-1">📱 Android + iOS</p>
                    <p className="text-muted-foreground text-xs">Le notifiche background funzionano meglio su Android. Su iOS, aggiungi l'app alla schermata home.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Dediche */}
              <ManualCollapsible id="admin-dediche" title="Gestione Dediche" icon={<Heart className="w-5 h-5 text-secondary" />} isOpen={openSections.has('admin-dediche')} onToggle={() => toggleSection('admin-dediche')}>
                <div className="space-y-4 text-sm">
                  <p>Ogni dedica ha una visibilità e stati di gestione:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <Eye className="w-4 h-4 text-emerald-500" />
                      <div><p className="font-medium">Pubblica</p><p className="text-xs text-muted-foreground">Visibile a tutti</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <div><p className="font-medium">Solo Staff</p><p className="text-xs text-muted-foreground">Visibile solo agli admin</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      <div><p className="font-medium">Solo Autore</p><p className="text-xs text-muted-foreground">Visibile solo a chi l'ha inviata</p></div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">Dalla sezione Dediche puoi anche espandere ogni messaggio, rispondere via chat e gestire le conversazioni.</p>
                </div>
              </ManualCollapsible>

              {/* Trasmetti (Broadcast TV) */}
              <ManualCollapsible id="admin-trasmetti" title="Trasmetti (Broadcast TV)" icon={<Monitor className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-trasmetti')} onToggle={() => toggleSection('admin-trasmetti')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">📺 A cosa serve?</p>
                    <p className="text-muted-foreground">Proietta i testi delle canzoni sulla TV del locale in tempo reale.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Modalità di visualizzazione TV:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Compatta:</strong> Testo puro, massima leggibilità</li>
                      <li>• <strong>Karaoke:</strong> Con evidenziazione riga attiva</li>
                      <li>• <strong>Spotify:</strong> Stile moderno con sfondo colorato</li>
                      <li>• <strong>ChordPro:</strong> Testo con accordi sopra le parole</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Personalizzazione TV:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Logo:</strong> Carica il logo della band visibile sulla TV</li>
                      <li>• <strong>QR Code:</strong> Mostra un QR sulla TV per far prenotare</li>
                      <li>• <strong>Titolo / Sottotitolo:</strong> Testi personalizzati</li>
                      <li>• <strong>Footer:</strong> Testo in basso nella schermata di attesa</li>
                      <li>• <strong>Posizioni elementi:</strong> Sposta logo, QR e titolo a piacere</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-2">🔗 Link rapidi</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>🌐 Link Online (Cloud):</strong> Per dispositivi con internet</li>
                      <li>• <strong>📡 Link Locali (LAN):</strong> Per rete WiFi locale senza internet</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Destinazioni broadcast:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>/trasmetti</strong> — Vista TV (testo grande, evidenziazione)</li>
                      <li>• <strong>/partiture</strong> — Vista musicisti (accordi, trasposizione)</li>
                      <li>• <strong>/telecomando</strong> — Controllo remoto per lo staff</li>
                      <li>• <strong>/songbook-live</strong> — Console leader per gestire tutto</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* SongBook Live */}
              <ManualCollapsible id="admin-songbook" title="SongBook Live (Console Leader)" icon={<BookOpen className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-songbook')} onToggle={() => toggleSection('admin-songbook')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🎸 A cosa serve?</p>
                    <p className="text-muted-foreground">SongBook Live è la console principale per il leader del gruppo. Da qui controlli quale brano viene trasmesso, scorri il testo e sincronizzi tutti i dispositivi.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Funzionalità:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Catalogo completo:</strong> Cerca e seleziona tra tutti i brani</li>
                      <li>• <strong>File .cho:</strong> Visualizza accordi con formato ChordPro</li>
                      <li>• <strong>Trasposizione:</strong> Cambia tonalità al volo, sincronizzata</li>
                      <li>• <strong>Evidenziazione:</strong> Muovi la riga attiva (toggle on/off)</li>
                      <li>• <strong>Trasmissione persistente:</strong> Uscendo dalla vista brano, la trasmissione resta attiva</li>
                      <li>• <strong>Banner LIVE:</strong> Quando un brano è in trasmissione, un banner ti permette di rientrare o interrompere</li>
                      <li>• <strong>Impostazioni rapide:</strong> Drawer laterale con tutti i controlli</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">💡 Pro Mode</p>
                    <p className="text-muted-foreground text-xs">Il design è ottimizzato per l'uso dal vivo. L'interfaccia è pulita, i pulsanti sono grandi e la lista brani è virtualizzata per gestire cataloghi con migliaia di file.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Dual Broadcast */}
              <ManualCollapsible id="admin-dual" title="Trasmissione Duale" icon={<Layers className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-dual')} onToggle={() => toggleSection('admin-dual')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🔀 Cos'è la modalità duale?</p>
                    <p className="text-muted-foreground">Invia contemporaneamente il <strong>testo pulito</strong> (dal Catalogo) alla TV e il <strong>file .cho con accordi</strong> ai musicisti su /partiture.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Come funziona:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• I brani del Catalogo devono essere <strong>collegati</strong> ai file SongBook</li>
                      <li>• Il collegamento si fa da <strong>Canzoni → Catalogo & SongBook</strong></li>
                      <li>• Quando trasmetti un brano collegato, la duale si attiva automaticamente</li>
                      <li>• La TV mostra il testo senza accordi (scroll proporzionale)</li>
                      <li>• Le partiture mostrano il file .cho con accordi (sync riga-per-riga)</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">📏 Allineamento</p>
                    <p className="text-muted-foreground text-xs">La TV usa scroll proporzionale (0-100%) perché il numero di righe del catalogo e del file .cho possono differire. L'allineamento è approssimativo ma efficace. Le partiture usano sync riga-per-riga preciso.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Telecomando */}
              <ManualCollapsible id="admin-telecomando" title="Telecomando" icon={<Smartphone className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-telecomando')} onToggle={() => toggleSection('admin-telecomando')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">📱 A cosa serve?</p>
                    <p className="text-muted-foreground">Il telecomando permette allo staff di controllare lo scorrimento del testo sulla TV e sulle partiture dal proprio smartphone.</p>
                  </div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Frecce su/giù:</strong> Muovi la riga evidenziata</li>
                    <li>• <strong>Testo visibile:</strong> Vedi il testo corrente con evidenziazione</li>
                    <li>• <strong>PIN protetto:</strong> Ogni telecomando ha il suo PIN</li>
                    <li>• <strong>Dual mode:</strong> In modalità duale, il telecomando muove sia le partiture che la TV</li>
                  </ul>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">⚙️ Impostazione Dual Mode</p>
                    <p className="text-muted-foreground text-xs">In SongBook Live → Impostazioni → "Controllo TV in Duale" puoi scegliere se il telecomando controlla anche la TV in modalità duale (default: attivo).</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">Creare telecomandi:</p>
                    <p className="text-muted-foreground text-xs">Vai in Admin → Trasmetti → sezione Telecomandi. Puoi creare più telecomandi con PIN diversi, attivarli/disattivarli e vederne i link (online e locali).</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Catalogo Brani */}
              <ManualCollapsible id="admin-catalogo" title="Catalogo Brani & SongBook" icon={<Music className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-catalogo')} onToggle={() => toggleSection('admin-catalogo')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Catalogo Brani:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Aggiungi brani:</strong> Manualmente o importa da CSV</li>
                      <li>• <strong>Campi:</strong> Titolo, artista, testo, lingua, genere</li>
                      <li>• <strong>Ricerca:</strong> Per titolo, artista o contenuto</li>
                      <li>• <strong>Testi:</strong> Cerca automaticamente i testi online</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">SongBook (file .cho):</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Importa file .cho:</strong> Singoli o cartelle intere</li>
                      <li>• <strong>Formato ChordPro:</strong> Accordi sopra le parole</li>
                      <li>• <strong>Duplicati:</strong> Rilevamento automatico tramite hash</li>
                      <li>• <strong>Versioni:</strong> Stesso brano, arrangiamenti diversi → conserva entrambi</li>
                      <li>• <strong>Master:</strong> Segna la versione preferita con ⭐</li>
                      <li>• <strong>Export:</strong> Scarica file .cho singoli o in blocco</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">🔗 Collegamento Catalogo ↔ SongBook</p>
                    <p className="text-muted-foreground text-xs">Nella tab "Catalogo & SongBook" puoi collegare ogni brano del catalogo al suo file .cho. Questo abilita la trasmissione duale automatica.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Setlist:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Crea scalette:</strong> Ordina i brani per la serata</li>
                      <li>• <strong>Drag & drop:</strong> Riordina trascinando</li>
                      <li>• <strong>Note:</strong> Aggiungi note per ogni brano</li>
                      <li>• <strong>Default:</strong> Segna una setlist come predefinita</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* WiFi Locale */}
              <ManualCollapsible id="admin-local-wifi" title="WiFi Locale (senza internet)" icon={<Server className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-local-wifi')} onToggle={() => toggleSection('admin-local-wifi')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🌐 A cosa serve?</p>
                    <p className="text-muted-foreground">Sincronizza TV, partiture e telecomando usando solo la rete WiFi locale, senza bisogno di internet.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-3">📋 Guida rapida:</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-xs">
                      <li>Accendi il router WiFi (non serve internet)</li>
                      <li>Collega TUTTI i dispositivi allo stesso WiFi</li>
                      <li>Sul PC: avvia il server locale (<code className="bg-muted-foreground/20 px-1 rounded">node server.js</code> nella cartella local-server)</li>
                      <li>Leggi l'IP che appare (es. 192.168.1.100)</li>
                      <li>Su ogni dispositivo: Impostazioni → "Locale (WiFi)" → inserisci l'IP</li>
                      <li>Aspetta il badge verde "Connesso"</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">💡 Cosa funziona offline:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>✅ Sincronizzazione testo tra SongBook, TV e Partiture</li>
                      <li>✅ Cambio brano e trasposizione in tempo reale</li>
                      <li>✅ Scroll e highlight sincronizzato</li>
                      <li>✅ Telecomando</li>
                      <li>❌ Prenotazioni (servono internet)</li>
                      <li>❌ Chat, dediche e community (servono internet)</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-destructive mb-1">❌ Non funziona?</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Tutti sullo <strong>stesso WiFi</strong>?</li>
                      <li>• Server <strong>acceso</strong>?</li>
                      <li>• IP <strong>copiato correttamente</strong>?</li>
                      <li>• Su Android: disattiva i <strong>dati mobili</strong></li>
                      <li>• Router con "Client Isolation" → disattivala</li>
                      <li>• Test: apri <code className="bg-muted-foreground/20 px-1 rounded">http://IP:8080/api/ping</code> dal telefono</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Pedale Bluetooth */}
              <ManualCollapsible id="admin-pedal" title="Pedale Bluetooth" icon={<Footprints className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-pedal')} onToggle={() => toggleSection('admin-pedal')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🦶 A cosa serve?</p>
                    <p className="text-muted-foreground">Scorri il testo del brano con i piedi mentre suoni, usando un pedale Bluetooth (es. IK Multimedia BlueTurn).</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Configurazione:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                      <li>Collega il pedale via Bluetooth al tablet</li>
                      <li>Impostazioni → "Pedale Bluetooth" → Attiva</li>
                      <li>Scegli modalità: <strong>🎯 Evidenziazione</strong> (muove TV) o <strong>📜 Scroll locale</strong></li>
                      <li>Imposta righe per pressione (1-15)</li>
                      <li>Scegli dove attivarlo (SongBook, Trasmetti, Partiture, Telecomando)</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">⌨️ Tasti supportati:</p>
                    <ul className="space-y-0.5 text-muted-foreground text-xs">
                      <li>• <strong>Avanti:</strong> PageDown, Freccia Giù, Freccia Destra</li>
                      <li>• <strong>Indietro:</strong> PageUp, Freccia Su, Freccia Sinistra</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Community Admin */}
              <ManualCollapsible id="admin-community-admin" title="Community (Admin)" icon={<Users className="w-5 h-5 text-accent" />} isOpen={openSections.has('admin-community-admin')} onToggle={() => toggleSection('admin-community-admin')}>
                <div className="space-y-4 text-sm">
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Bacheca sociale:</strong> Modera post e commenti</li>
                    <li>• <strong>Gruppi:</strong> Crea, gestisci e modera gruppi di chat</li>
                    <li>• <strong>Inviti:</strong> Genera link d'invito con scadenza e max utilizzi</li>
                    <li>• <strong>Blocco utenti:</strong> Blocca utenti dalla community (temporaneo o permanente)</li>
                    <li>• <strong>Approvazioni:</strong> Approva richieste di accesso a gruppi privati</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Assistente */}
              <ManualCollapsible id="admin-assistente" title="Assistente Virtuale" icon={<Bot className="w-5 h-5 text-accent" />} isOpen={openSections.has('admin-assistente')} onToggle={() => toggleSection('admin-assistente')}>
                <div className="space-y-4 text-sm">
                  <p>L'assistente virtuale è un chatbot che aiuta i visitatori del sito:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Flussi guidati:</strong> Risposte automatiche per domande frequenti</li>
                    <li>• <strong>Lead generation:</strong> Raccoglie contatti e li classifica</li>
                    <li>• <strong>Sezioni configurabili:</strong> Attiva/disattiva per Sito, Open Mic, Dediche, Community</li>
                    <li>• <strong>Messaggio di benvenuto:</strong> Personalizzabile per ogni sezione</li>
                    <li>• <strong>Notifiche Telegram:</strong> Ricevi alert quando qualcuno scrive</li>
                    <li>• <strong>Gestione conversazioni:</strong> Vedi tutte le chat, rispondi, chiudi</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Grafiche */}
              <ManualCollapsible id="admin-grafiche" title="Grafiche (Locandine e Storie)" icon={<Image className="w-5 h-5 text-accent" />} isOpen={openSections.has('admin-grafiche')} onToggle={() => toggleSection('admin-grafiche')}>
                <div className="space-y-4 text-sm">
                  <p>Genera automaticamente materiale promozionale:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Locandine evento:</strong> Poster con data, luogo e QR code</li>
                    <li>• <strong>Storie social:</strong> Formato verticale per Instagram/WhatsApp</li>
                    <li>• <strong>Personalizzazione:</strong> Scegli foto, colori e testi</li>
                    <li>• <strong>Download diretto:</strong> Scarica l'immagine generata</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* QR Codes */}
              <ManualCollapsible id="admin-qrcodes" title="QR Codes Evento" icon={<QrCode className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-qrcodes')} onToggle={() => toggleSection('admin-qrcodes')}>
                <div className="space-y-4 text-sm">
                  <p>Genera QR code per far accedere velocemente i partecipanti:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>QR con PIN integrato:</strong> Scansiona e accedi direttamente</li>
                    <li>• <strong>Multipli QR:</strong> Crea QR diversi per tavoli o zone</li>
                    <li>• <strong>Statistiche:</strong> Quante volte è stato usato ogni QR</li>
                    <li>• <strong>Attiva/disattiva:</strong> Controlla quali QR sono validi</li>
                    <li>• <strong>Stampa:</strong> Scarica e stampa per i tavoli del locale</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Gamification */}
              <ManualCollapsible id="admin-gamification" title="Gamification e Classifiche" icon={<Trophy className="w-5 h-5 text-amber-500" />} isOpen={openSections.has('admin-gamification')} onToggle={() => toggleSection('admin-gamification')}>
                <div className="space-y-4 text-sm">
                  <p>Il sistema di gamification premia la partecipazione:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Punti:</strong> Guadagna punti per prenotazioni, dediche e partecipazione</li>
                    <li>• <strong>Badge:</strong> Sbloccati al raggiungimento di traguardi</li>
                    <li>• <strong>Classifiche:</strong> Leaderboard con i partecipanti più attivi</li>
                    <li>• <strong>Statistiche personali:</strong> Ogni utente vede i suoi progressi</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Limiti per utente */}
              <ManualCollapsible id="admin-user-limits" title="Limiti per Utente" icon={<UserCheck className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-user-limits')} onToggle={() => toggleSection('admin-user-limits')}>
                <div className="space-y-4 text-sm">
                  <p>Controlla quante prenotazioni può fare ogni persona:</p>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Tipologie di limite:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Limite totale:</strong> Max canzoni per serata per utente</li>
                      <li>• <strong>Limite dediche:</strong> Max dediche per serata per utente</li>
                      <li>• <strong>Intervallo:</strong> Max N canzoni ogni X minuti</li>
                      <li>• <strong>Consecutivo:</strong> Max N canzoni di fila, poi aspetta il turno</li>
                      <li>• <strong>Cooldown:</strong> Messaggio personalizzato quando l'utente raggiunge il limite</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">💡 Sblocco consecutivo</p>
                    <p className="text-muted-foreground text-xs">Quando un brano consecutivo viene completato, l'utente in attesa riceve una notifica che lo sblocca.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Gestione Staff */}
              <ManualCollapsible id="admin-staff" title="Gestione Staff (Owner)" icon={<Crown className="w-5 h-5 text-amber-500" />} isOpen={openSections.has('admin-staff')} onToggle={() => toggleSection('admin-staff')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="font-medium text-amber-600 dark:text-amber-400"><Lock className="w-4 h-4 inline mr-1" />Solo Owner</p>
                    <p className="text-muted-foreground mt-1">Accessibile solo al proprietario dell'account.</p>
                  </div>
                  <p>Dalla sezione <strong>Staff</strong>:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Creare account Admin o Staff con ruoli diversi</li>
                    <li>• Modificare password</li>
                    <li>• Eliminare account</li>
                  </ul>
                  <p>Dalla sezione <strong>Permessi</strong>:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Decidere quali sezioni può vedere ogni ruolo</li>
                    <li>• Abilitare/disabilitare singole funzionalità</li>
                    <li>• Preset "Consigliato" o "Completo"</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Operatori */}
              <ManualCollapsible id="admin-operators" title="Operatori" icon={<UserCheck className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-operators')} onToggle={() => toggleSection('admin-operators')}>
                <div className="space-y-4 text-sm">
                  <p>Gli operatori sono utenti della Community con permessi speciali nell'admin:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Accesso limitato:</strong> Vedono solo le sezioni assegnate</li>
                    <li>• <strong>Login social:</strong> Accedono con il loro account Community</li>
                    <li>• <strong>Ruolo "operator":</strong> Non possono modificare impostazioni sensibili</li>
                    <li>• <strong>Assegnazione:</strong> L'Owner promuove utenti dalla sezione Operatori</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Blocco Utenti */}
              <ManualCollapsible id="admin-block" title="Blocco Utenti" icon={<Ban className="w-5 h-5 text-destructive" />} isOpen={openSections.has('admin-block')} onToggle={() => toggleSection('admin-block')}>
                <div className="space-y-4 text-sm">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><Ban className="w-4 h-4 text-destructive" /><span><strong>Blocco temporaneo:</strong> 1 ora, 24 ore, ecc.</span></li>
                    <li className="flex items-center gap-2"><Ban className="w-4 h-4 text-destructive" /><span><strong>Blocco permanente:</strong> Senza scadenza</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span><strong>Sblocco:</strong> Riabilita immediatamente</span></li>
                  </ul>
                  <p className="text-muted-foreground text-xs">Il blocco funziona sia per gli utenti anonimi (Open Mic/Dediche) basato su session ID, sia per utenti registrati (Community) basato su user ID.</p>
                </div>
              </ManualCollapsible>

              {/* Audit */}
              <ManualCollapsible id="admin-audit" title="Audit Log (Owner)" icon={<ClipboardList className="w-5 h-5 text-muted-foreground" />} isOpen={openSections.has('admin-audit')} onToggle={() => toggleSection('admin-audit')}>
                <div className="space-y-4 text-sm">
                  <p>Il log di audit registra ogni azione importante nel pannello:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Chi ha fatto cosa, quando e da dove</li>
                    <li>• Login/logout degli admin</li>
                    <li>• Modifiche a eventi, formati e impostazioni</li>
                    <li>• Reset, blocchi e azioni sulle prenotazioni</li>
                    <li>• Filtri per sezione, azione e data</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Reset e Undo */}
              <ManualCollapsible id="admin-reset" title="Reset e Undo" icon={<Undo2 className="w-5 h-5 text-warning" />} isOpen={openSections.has('admin-reset')} onToggle={() => toggleSection('admin-reset')}>
                <div className="space-y-4 text-sm">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><Music className="w-4 h-4 text-primary" /><span><strong>Reset Open Mic:</strong> Elimina tutte le prenotazioni</span></li>
                    <li className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-secondary" /><span><strong>Reset Dediche:</strong> Elimina tutti i messaggi</span></li>
                    <li className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-destructive" /><span><strong>Reset Totale:</strong> Pulisce tutto</span></li>
                  </ul>
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="font-medium text-warning">⏱️ Sistema Undo</p>
                    <p className="text-muted-foreground mt-1">Ogni azione ha un pulsante "Annulla" (8-10 secondi). Non aver paura di sbagliare!</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-destructive">⚠️ Attenzione</p>
                    <p className="text-muted-foreground mt-1">I reset sono irreversibili dopo la finestra di undo! Tutto viene registrato nel log Audit.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Impostazioni */}
              <ManualCollapsible id="admin-impostazioni" title="Impostazioni" icon={<Settings className="w-5 h-5 text-muted-foreground" />} isOpen={openSections.has('admin-impostazioni')} onToggle={() => toggleSection('admin-impostazioni')}>
                <div className="space-y-4 text-sm">
                  <p>La sezione Impostazioni racchiude tutte le configurazioni globali:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Connessione trasmissione:</strong> Cloud o Locale (WiFi)</li>
                    <li>• <strong>IP server locale:</strong> Per la modalità offline</li>
                    <li>• <strong>Pedale Bluetooth:</strong> Configurazione completa del pedale</li>
                    <li>• <strong>Sincronizzazione catalogo:</strong> Sync brani con il server locale</li>
                    <li>• <strong>Sincronizzazione SongBook:</strong> Sync file .cho con il server locale</li>
                    <li>• <strong>Credenziali admin:</strong> Cambio username e password</li>
                  </ul>
                </div>
              </ManualCollapsible>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tips Footer */}
      <Card className="mt-6 border-warning/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-warning">
            <Bell className="w-4 h-4" />
            Suggerimenti Rapidi
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>🔄 <strong>Ogni azione ha Undo</strong> - non aver paura di sbagliare!</p>
          <p>📱 <strong>Mobile-first</strong> - tutto è ottimizzato per telefono.</p>
          <p>🔔 <strong>Attiva notifiche</strong> - non perderti prenotazioni o messaggi.</p>
          <p>👥 <strong>Delega con permessi</strong> - usa i ruoli per dividere il lavoro.</p>
          <p>📺 <strong>Dual mode</strong> - testo alla TV, accordi ai musicisti, tutto sincronizzato.</p>
          <p>🦶 <strong>Pedale Bluetooth</strong> - scorri con i piedi mentre suoni.</p>
        </CardContent>
      </Card>
    </main>
  );

  if (embedded) return manualContent;

  return (
    <>
      <SEO 
        title="Manuale | Non C'è Duo"
        description="Guida completa per utenti e amministratori"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-primary" />
              <h1 className="font-display text-lg font-bold">Manuale</h1>
            </div>
          </div>
        </header>
        {manualContent}
      </div>
    </>
  );
};

const AdminManual: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  if (embedded) return <AdminManualContent embedded />;
  return (
    <AdminProvider>
      <AdminManualContent />
    </AdminProvider>
  );
};

export default AdminManual;

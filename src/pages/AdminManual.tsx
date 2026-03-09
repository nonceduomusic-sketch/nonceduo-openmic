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
  Gamepad2,
  Guitar,
  Link2,
  Send,
  Mail,
  SlidersHorizontal,
  Tv,
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

// TXT Download helper
const handleDownloadTxt = (sectionId: string, title: string) => {
  const content = document.getElementById(sectionId);
  if (!content) return;

  const textContent = content.innerText
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const header = `🎵 Non C'è Duo — ${title}\nGenerato il ${new Date().toLocaleDateString('it-IT')}\n${'='.repeat(50)}\n\n`;
  const footer = `\n\n${'='.repeat(50)}\nNon C'è Duo — Manuale Operativo`;

  const blob = new Blob([header + textContent + footer], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-nonceduo.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Word (.doc) Download helper
const handleDownloadWord = (sectionId: string, title: string) => {
  const content = document.getElementById(sectionId);
  if (!content) return;

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; padding: 20px; color: #1a1a1a; font-size: 11pt; }
      h1 { font-size: 20pt; color: #2563eb; margin-bottom: 4pt; }
      h2 { font-size: 14pt; color: #1e40af; margin-top: 18pt; }
      h3 { font-size: 12pt; margin-top: 12pt; }
      p, li { font-size: 11pt; line-height: 1.5; }
      ul, ol { padding-left: 18pt; }
      table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
      td, th { border: 1px solid #d1d5db; padding: 4pt 8pt; font-size: 10pt; }
      th { background: #f3f4f6; font-weight: bold; }
      .section { page-break-inside: avoid; margin-bottom: 12pt; }
    </style>
    </head><body>
    <h1>🎵 Non C'è Duo — ${title}</h1>
    <p style="color:#666;margin-bottom:18pt">Generato il ${new Date().toLocaleDateString('it-IT')}</p>
    ${content.innerHTML}
    <p style="margin-top:30pt;text-align:center;color:#888;font-size:9pt;">Non C'è Duo — Manuale Operativo</p>
    </body></html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-nonceduo.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// All section IDs
const USER_SECTION_IDS = ['user-intro','user-openmic','user-dediche','user-community','user-states','user-install'];
const ADMIN_SECTION_IDS = [
  // Live
  'admin-overview','admin-centro','admin-events','admin-freemode','admin-formati','admin-trasmetti','admin-songbook','admin-dual','admin-catalogo-sb','admin-notifiche-live','admin-grafiche','admin-qrcodes',
  // Operativo
  'admin-openmic-ops','admin-catalogo','admin-furore','admin-dediche','admin-quiz','admin-giochi','admin-community-admin','admin-assistente','admin-gamification','admin-user-limits',
  // Gestione
  'admin-impostazioni','admin-local-wifi','admin-pedal','admin-operators','admin-staff','admin-permissions','admin-audit','admin-block','admin-reset',
];

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
    const allIds = prefix === 'user' ? USER_SECTION_IDS : ADMIN_SECTION_IDS;
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
      {/* Download Header */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Scarica il Manuale
          </CardTitle>
          <CardDescription className="text-xs">
            Stampa come PDF, scarica come Word o TXT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">📄 Salva come PDF (stampa)</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { expandAll('user'); setTimeout(() => handlePrintSection('manual-user-content', 'Guida Utente'), 400); }}>
                <FileText className="w-4 h-4" />Guida Utente
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { expandAll('admin'); setTimeout(() => handlePrintSection('manual-admin-content', 'Guida Admin'), 400); }}>
                <Shield className="w-4 h-4" />Guida Admin
              </Button>
              <Button variant="default" size="sm" className="gap-2" onClick={() => { expandAll('user'); expandAll('admin'); setTimeout(() => handlePrintSection('manual-full-content', 'Manuale Completo'), 400); }}>
                <Book className="w-4 h-4" />Manuale Completo
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">📝 Scarica come Word (.doc)</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { expandAll('user'); setTimeout(() => handleDownloadWord('manual-user-content', 'Guida Utente'), 400); }}>
                <FileText className="w-4 h-4" />Guida Utente
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { expandAll('admin'); setTimeout(() => handleDownloadWord('manual-admin-content', 'Guida Admin'), 400); }}>
                <Shield className="w-4 h-4" />Guida Admin
              </Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => { expandAll('user'); expandAll('admin'); setTimeout(() => handleDownloadWord('manual-full-content', 'Manuale Completo'), 400); }}>
                <FileText className="w-4 h-4" />Manuale Completo
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">📋 Scarica come TXT</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { expandAll('user'); setTimeout(() => handleDownloadTxt('manual-user-content', 'Guida Utente'), 400); }}>
                <Download className="w-4 h-4" />Guida Utente
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { expandAll('admin'); setTimeout(() => handleDownloadTxt('manual-admin-content', 'Guida Admin'), 400); }}>
                <Download className="w-4 h-4" />Guida Admin
              </Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => { expandAll('user'); expandAll('admin'); setTimeout(() => handleDownloadTxt('manual-full-content', 'Manuale Completo'), 400); }}>
                <Download className="w-4 h-4" />Manuale Completo
              </Button>
            </div>
          </div>
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
                    <FeatureCard icon={<Zap className="w-5 h-5 text-amber-500" />} title="Non C'è Furore ⚡" description="Gioco buzzer live: prenota e schiaccia!" />
                    <FeatureCard icon={<Users className="w-5 h-5 text-accent" />} title="Community 👥" description="Gruppi di chat, bacheca sociale e amicizie" />
                    <FeatureCard icon={<Gamepad2 className="w-5 h-5 text-emerald-500" />} title="Giochi 🎮" description="Quiz musicali e giochi passatempo" />
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
                    Pannello Admin — Guida Completa
                  </CardTitle>
                  <CardDescription>Ogni sezione, ogni pulsante, ogni funzione documentata</CardDescription>
                </CardHeader>
              </Card>

              {/* ===== PANORAMICA ===== */}
              <ManualCollapsible id="admin-overview" title="Panoramica del pannello" icon={<Settings className="w-5 h-5 text-muted-foreground" />} isOpen={openSections.has('admin-overview')} onToggle={() => toggleSection('admin-overview')}>
                <div className="space-y-4 text-sm">
                  <p>Il pannello è organizzato in <strong>tre aree</strong> principali nella sidebar:</p>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="font-bold text-primary mb-2">🔴 LIVE (8 sezioni)</p>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li><strong>Centro:</strong> Dashboard in tempo reale con notifiche</li>
                        <li><strong>Eventi:</strong> Gestione eventi programmati e liberi</li>
                        <li><strong>Formati:</strong> Toggle visibilità, votazioni, community, giochi</li>
                        <li><strong>Trasmetti:</strong> Broadcast TV, standby, QR e personalizzazione</li>
                        <li><strong>SongBook Live:</strong> Console ChordPro per il leader</li>
                        <li><strong>Catalogo ↔ SB:</strong> Collegamento brani catalogo ↔ file .cho</li>
                        <li><strong>Notifiche Live:</strong> Email e Telegram automatiche</li>
                        <li><strong>Grafiche:</strong> Locandine e storie social</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="font-bold text-secondary mb-2">📋 OPERATIVO (8 sezioni)</p>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li><strong>Open Mic:</strong> Lista prenotazioni canzoni</li>
                        <li><strong>Canzoni:</strong> Catalogo brani + SongBook (.cho)</li>
                        <li><strong>Non C'è Furore:</strong> Pulsantiera live buzzer</li>
                        <li><strong>Dediche:</strong> Messaggi e chat con utenti</li>
                        <li><strong>Quiz:</strong> Elenchi domande, set e filtri</li>
                        <li><strong>Giochi:</strong> Impostazioni e classifiche passatempo</li>
                        <li><strong>Community:</strong> Gruppi, bacheca e moderazione</li>
                        <li><strong>Assistente:</strong> Chat automatica e gestione lead</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-muted border">
                      <p className="font-bold mb-2">⚙️ GESTIONE (5 sezioni, Owner-only)</p>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li><strong>Impostazioni:</strong> Connessione, pedale, temi, credenziali</li>
                        <li><strong>Operatori:</strong> Account con accesso limitato</li>
                        <li><strong>Staff:</strong> Gestione team</li>
                        <li><strong>Permessi:</strong> Controllo accessi granulare</li>
                        <li><strong>Audit:</strong> Log attività completo</li>
                        <li><strong>Manuale:</strong> Questa guida</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">📱 Navigazione mobile</p>
                    <p className="text-muted-foreground text-xs">Da telefono, le 5 sezioni principali sono nella barra in basso. Tutto il resto è nel <strong>menu hamburger</strong> in alto a sinistra. Su tablet e computer la sidebar è sempre visibile.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* ===== SEZIONE LIVE ===== */}
              <div className="pt-2">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 mb-3">
                  🔴 Sezione LIVE
                </h3>
              </div>

              {/* Centro Notifiche */}
              <ManualCollapsible id="admin-centro" title="Centro Notifiche" icon={<Bell className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-centro')} onToggle={() => toggleSection('admin-centro')}>
                <div className="space-y-4 text-sm">
                  <p>Il <strong>Centro</strong> è la dashboard operativa principale per gestire tutto in tempo reale.</p>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Elementi della schermata:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Feed unificato:</strong> Canzoni e dediche in un'unica lista cronologica</li>
                      <li>• <strong>Filtri tab:</strong> In coda, Canzoni, Dediche, Tutte</li>
                      <li>• <strong>Swipe:</strong> Scorri a destra per completare, a sinistra per eliminare</li>
                      <li>• <strong>Tap canzone:</strong> Tocca per vedere il testo/accordi</li>
                      <li>• <strong>Contatore serate:</strong> Quante canzoni hai completato stasera</li>
                      <li>• <strong>Utenti connessi:</strong> Numero di dispositivi collegati in tempo reale</li>
                      <li>• <strong>Badge LIVE:</strong> Indica se c'è un evento attivo</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">⚡ Realtime</p>
                    <p className="text-muted-foreground text-xs">Le prenotazioni e dediche arrivano istantaneamente via Realtime. Nessun refresh necessario.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Eventi Programmati */}
              <ManualCollapsible id="admin-events" title="Eventi" icon={<Calendar className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-events')} onToggle={() => toggleSection('admin-events')}>
                <div className="space-y-4 text-sm">
                  <p>Gli eventi hanno 4 stati:</p>
                  <div className="grid gap-2">
                    <StatusBadge status="draft" label="Bozza" description="In lavorazione, non visibile agli utenti" />
                    <StatusBadge status="ready" label="Pronto" description="Configurato, visibile come 'prossimamente'" />
                    <StatusBadge status="live" label="LIVE" description="Attivo, le regole sono applicate" />
                    <StatusBadge status="closed" label="Chiuso" description="Terminato, archivio" />
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Pulsanti e opzioni:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Tipo evento:</strong> Selettore tra diversi formati (Open Mic, Party, ecc.)</li>
                      <li>• <strong>Data e orari:</strong> Data evento, ora inizio/fine</li>
                      <li>• <strong>Formati attivi:</strong> Toggle per Open Mic e/o Dediche</li>
                      <li>• <strong>Limite canzoni:</strong> Max prenotazioni totali Open Mic</li>
                      <li>• <strong>Limite dediche:</strong> Max dediche totali</li>
                      <li>• <strong>PIN:</strong> Toggle + campo per il codice d'accesso</li>
                      <li>• <strong>Finestra prenotazione:</strong> Apertura/chiusura automatica</li>
                      <li>• <strong>Chiusura automatica:</strong> X minuti prima della fine evento</li>
                      <li>• <strong>Countdown:</strong> Mostra/nascondi timer finale per gli utenti</li>
                      <li>• <strong>Limite finale:</strong> Riduce gli slot disponibili negli ultimi minuti</li>
                      <li>• <strong>Modalità consultabile:</strong> Gli utenti vedono il catalogo ma non prenotano</li>
                      <li>• <strong>Protezione repertorio:</strong> Nascondi brani non nel repertorio</li>
                      <li>• <strong>Votazioni:</strong> Abilita/disabilita i voti del pubblico</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">🔄 Riapertura evento</p>
                    <p className="text-muted-foreground text-xs">Dopo la chiusura puoi riaprire temporaneamente con slot extra. Modalità: timer (si richiude dopo X minuti) o manuale (chiudi quando vuoi).</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Serata Aperta */}
              <ManualCollapsible id="admin-freemode" title="Serata Aperta (Free Mode)" icon={<Zap className="w-5 h-5 text-accent" />} isOpen={openSections.has('admin-freemode')} onToggle={() => toggleSection('admin-freemode')}>
                <div className="space-y-4 text-sm">
                  <p>La <strong>Serata Aperta</strong> attiva i formati senza evento programmato. Perfetta per serate improvvisate.</p>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-2">Come attivare:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Vai su <strong>Eventi</strong></li>
                      <li>Usa la card <strong>"Serata Aperta"</strong></li>
                      <li>Attiva Open Mic, Dediche o entrambi</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">⚠️ Priorità</p>
                    <p className="text-muted-foreground">Se c'è un evento LIVE, la Serata Aperta viene ignorata. L'evento LIVE ha sempre priorità!</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Formati */}
              <ManualCollapsible id="admin-formati" title="Formati & Notifiche" icon={<SlidersHorizontal className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-formati')} onToggle={() => toggleSection('admin-formati')}>
                <div className="space-y-4 text-sm">
                  <p>La sezione <strong>Formati</strong> gestisce la visibilità globale delle funzionalità e le notifiche admin.</p>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Toggle Visibilità Sito:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Mostra Open Mic nel menu:</strong> Visibilità della voce Open Mic nel menu principale</li>
                      <li>• <strong>Mostra Dediche nel menu:</strong> Visibilità della voce Dediche nel menu</li>
                      <li>• <strong>Mostra Community nel menu:</strong> Visibilità della voce Community</li>
                      <li>• <strong>Mostra Furore nel menu:</strong> Visibilità di Non C'è Furore</li>
                      <li>• <strong>Mostra Giochi nel menu:</strong> Visibilità dei giochi passatempo</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Toggle Visibilità App:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Mostra nell'app:</strong> Toggle separati per ogni formato nella pagina /app</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Funzionalità:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Scaletta Live:</strong> Mostra/nascondi la scaletta in coda agli utenti</li>
                      <li>• <strong>Votazioni Pubblico:</strong> Abilita/disabilita i voti sulle canzoni in coda</li>
                      <li>• <strong>Giochi singoli:</strong> Toggle individuale per ogni gioco (Quiz, ecc.)</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="font-bold mb-2">🔔 Notifiche Admin Push:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Attiva:</strong> Abilita le notifiche push sul dispositivo</li>
                      <li>• <strong>Background:</strong> Ricevi notifiche anche a app chiusa</li>
                      <li>• <strong>Test ritardato:</strong> Invia una notifica di prova dopo 5 secondi</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">💡 Nota</p>
                    <p className="text-muted-foreground text-xs">Open Mic e Dediche come formati attivi si gestiscono dalla sezione <strong>Eventi</strong>. Qui si controlla solo la visibilità nel menu e le votazioni.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Trasmetti (Broadcast TV) */}
              <ManualCollapsible id="admin-trasmetti" title="Trasmetti (Broadcast TV)" icon={<Tv className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-trasmetti')} onToggle={() => toggleSection('admin-trasmetti')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">📺 A cosa serve?</p>
                    <p className="text-muted-foreground">Proietta i testi delle canzoni sulla TV del locale in tempo reale.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Modalità Standby TV:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Solo Logo:</strong> Mostra solo il logo della band centrato su sfondo scuro</li>
                      <li>• <strong>Open Mic:</strong> Titolo "Open Mic" con QR che punta a /app/openmic</li>
                      <li>• <strong>Non C'è Furore:</strong> Schermata gioco standard</li>
                      <li>• <strong>Non C'è Furore + QR:</strong> Tema Furore con QR verso /app/furore</li>
                      <li>• <strong>Pagina APP:</strong> Tema indaco/viola con QR verso /app</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Modalità di visualizzazione testo:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Compatta:</strong> Testo puro, massima leggibilità</li>
                      <li>• <strong>Karaoke:</strong> Con evidenziazione riga attiva</li>
                      <li>• <strong>Spotify:</strong> Stile moderno con sfondo colorato</li>
                      <li>• <strong>ChordPro:</strong> Testo con accordi sopra le parole</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Personalizzazione elementi TV:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Logo:</strong> Upload del logo della band, visibile sulla TV con scala regolabile</li>
                      <li>• <strong>QR Code:</strong> Toggle mostra/nascondi, URL e testo CTA personalizzabili</li>
                      <li>• <strong>Titolo / Sottotitolo:</strong> Testi personalizzati per la schermata di attesa</li>
                      <li>• <strong>Footer:</strong> Testo in basso nella schermata di attesa</li>
                      <li>• <strong>Dimensione font TV:</strong> Slider 50%–300% per calibrare la leggibilità</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Telecomandi:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Crea telecomando:</strong> Genera un nuovo accesso remoto con PIN</li>
                      <li>• <strong>PIN:</strong> Codice per proteggere l'accesso al telecomando</li>
                      <li>• <strong>Attiva/disattiva:</strong> Controlla quali telecomandi sono validi</li>
                      <li>• <strong>Link online e locali:</strong> URL da dare allo staff per il controllo remoto</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-2">🔗 Destinazioni broadcast:</p>
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
              <ManualCollapsible id="admin-songbook" title="SongBook Live (Console Leader)" icon={<Guitar className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-songbook')} onToggle={() => toggleSection('admin-songbook')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🎸 A cosa serve?</p>
                    <p className="text-muted-foreground">Console principale per il leader. Controlla quale brano viene trasmesso, scorri il testo e sincronizzi tutti i dispositivi.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Pulsanti e funzionalità:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Catalogo completo:</strong> Cerca e seleziona tra tutti i file .cho</li>
                      <li>• <strong>File .cho:</strong> Visualizza accordi con formato ChordPro</li>
                      <li>• <strong>Trasposizione:</strong> Cambia tonalità (+/- semitoni), sincronizzata su tutti</li>
                      <li>• <strong>Evidenziazione:</strong> Toggle on/off per la riga attiva, muovibile con frecce/pedale</li>
                      <li>• <strong>Trasmetti/Interrompi:</strong> Avvia o ferma la trasmissione del brano corrente</li>
                      <li>• <strong>Banner LIVE:</strong> Quando un brano è in trasmissione, un banner permette di rientrare o interrompere</li>
                      <li>• <strong>Drawer impostazioni:</strong> Pannello laterale con controlli avanzati (font, scroll, duale)</li>
                      <li>• <strong>Setlist:</strong> Seleziona e naviga tra le scalette</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Trasmissione Duale */}
              <ManualCollapsible id="admin-dual" title="Trasmissione Duale" icon={<Layers className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-dual')} onToggle={() => toggleSection('admin-dual')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🔀 Cos'è?</p>
                    <p className="text-muted-foreground">Invia contemporaneamente il <strong>testo pulito</strong> (dal Catalogo) alla TV e il <strong>file .cho con accordi</strong> ai musicisti su /partiture.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Come funziona:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• I brani del Catalogo devono essere <strong>collegati</strong> ai file SongBook tramite Catalogo ↔ SB</li>
                      <li>• Quando trasmetti un brano collegato, la duale si attiva automaticamente</li>
                      <li>• La TV mostra il testo senza accordi (scroll proporzionale)</li>
                      <li>• Le partiture mostrano il file .cho con accordi (sync riga-per-riga)</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Catalogo ↔ SB */}
              <ManualCollapsible id="admin-catalogo-sb" title="Catalogo ↔ SongBook" icon={<Link2 className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-catalogo-sb')} onToggle={() => toggleSection('admin-catalogo-sb')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🔗 A cosa serve?</p>
                    <p className="text-muted-foreground">Collega ogni brano del catalogo al suo file .cho nel SongBook. Questo abilita la trasmissione duale automatica.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Pulsanti e funzionalità:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Vista affiancata:</strong> Catalogo a sinistra, SongBook a destra</li>
                      <li>• <strong>Ricerca:</strong> Cerca per titolo/artista in entrambe le colonne</li>
                      <li>• <strong>Filtro stato:</strong> Tutti, Collegati, Non collegati</li>
                      <li>• <strong>Collega:</strong> Seleziona un brano catalogo e un file .cho per collegarli</li>
                      <li>• <strong>Scollega:</strong> Rimuovi un collegamento esistente</li>
                      <li>• <strong>Auto-match:</strong> Suggerimenti automatici basati su titolo/artista</li>
                      <li>• <strong>Trasmetti da qui:</strong> Avvia la trasmissione direttamente dalla vista collegamento</li>
                      <li>• <strong>Anteprima:</strong> Visualizza il testo del brano o del file .cho</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">📱 Mobile</p>
                    <p className="text-muted-foreground text-xs">Su telefono la vista è impilata (catalogo sopra, songbook sotto). Su tablet/desktop è affiancata.</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Notifiche Live */}
              <ManualCollapsible id="admin-notifiche-live" title="Notifiche Live (Email e Telegram)" icon={<Send className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-notifiche-live')} onToggle={() => toggleSection('admin-notifiche-live')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">📩 A cosa serve?</p>
                    <p className="text-muted-foreground">Ricevi notifiche automatiche via email e/o Telegram quando arrivano prenotazioni o dediche.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Configurazione Email:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Abilita email:</strong> Toggle generale per le notifiche email</li>
                      <li>• <strong>Destinatario:</strong> Indirizzo email dove ricevere le notifiche</li>
                      <li>• <strong>Open Mic:</strong> Toggle per notifiche su nuove prenotazioni</li>
                      <li>• <strong>Dediche:</strong> Toggle per notifiche su nuove dediche</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Configurazione Telegram:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Abilita Telegram:</strong> Toggle generale per Telegram</li>
                      <li>• <strong>Chat ID Open Mic:</strong> ID del gruppo/canale per le prenotazioni</li>
                      <li>• <strong>Chat ID Dediche:</strong> ID del gruppo/canale per le dediche</li>
                      <li>• <strong>Open Mic:</strong> Toggle per notifiche Telegram su prenotazioni</li>
                      <li>• <strong>Dediche:</strong> Toggle per notifiche Telegram su dediche</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Log notifiche:</p>
                    <p className="text-muted-foreground text-xs">In basso vedrai lo storico delle notifiche inviate con stato (inviato/fallito), canale e orario.</p>
                  </div>
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
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>QR con PIN integrato:</strong> Scansiona e accedi direttamente</li>
                    <li>• <strong>Multipli QR:</strong> Crea QR diversi per tavoli o zone</li>
                    <li>• <strong>Statistiche:</strong> Quante volte è stato usato ogni QR</li>
                    <li>• <strong>Attiva/disattiva:</strong> Controlla quali QR sono validi</li>
                    <li>• <strong>Stampa:</strong> Scarica e stampa per i tavoli del locale</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* ===== SEZIONE OPERATIVO ===== */}
              <div className="pt-4">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2 mb-3">
                  📋 Sezione OPERATIVO
                </h3>
              </div>

              {/* Open Mic (Operativo) */}
              <ManualCollapsible id="admin-openmic-ops" title="Open Mic (Gestione Prenotazioni)" icon={<Music className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-openmic-ops')} onToggle={() => toggleSection('admin-openmic-ops')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Pulsanti e azioni:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Lista prenotazioni:</strong> Tutte le canzoni prenotate in ordine cronologico</li>
                      <li>• <strong>Completa (✓):</strong> Segna una canzone come cantata</li>
                      <li>• <strong>Elimina (✕):</strong> Rimuovi una prenotazione dalla coda</li>
                      <li>• <strong>Undo (↩):</strong> Annulla l'ultima azione (8-10 secondi)</li>
                      <li>• <strong>Reset Open Mic:</strong> Elimina tutte le prenotazioni (con conferma)</li>
                      <li>• <strong>Seleziona multipli:</strong> Checkbox per azioni in blocco</li>
                      <li>• <strong>Filtro artista:</strong> Filtra per artista dinamico dalla coda</li>
                      <li>• <strong>Cerca:</strong> Cerca per nome partecipante o canzone</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Catalogo Brani */}
              <ManualCollapsible id="admin-catalogo" title="Canzoni (Catalogo & SongBook)" icon={<Music className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-catalogo')} onToggle={() => toggleSection('admin-catalogo')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Catalogo Brani:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Aggiungi brani:</strong> Manualmente o importa da CSV</li>
                      <li>• <strong>Campi:</strong> Titolo, artista, testo, lingua, genere</li>
                      <li>• <strong>Ricerca:</strong> Per titolo, artista o contenuto</li>
                      <li>• <strong>Testi:</strong> Cerca automaticamente i testi online</li>
                      <li>• <strong>Modifica/Elimina:</strong> Modifica ogni campo o elimina brani</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">SongBook (file .cho):</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Importa file .cho:</strong> Singoli o cartelle intere (.zip)</li>
                      <li>• <strong>Formato ChordPro:</strong> Accordi sopra le parole</li>
                      <li>• <strong>Duplicati:</strong> Rilevamento automatico tramite hash</li>
                      <li>• <strong>Versioni:</strong> Stesso brano, arrangiamenti diversi → conserva entrambi</li>
                      <li>• <strong>Master:</strong> Segna la versione preferita con ⭐</li>
                      <li>• <strong>Export:</strong> Scarica file .cho singoli o in blocco (.zip)</li>
                    </ul>
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

              {/* Non C'è Furore */}
              <ManualCollapsible id="admin-furore" title="Non C'è Furore (Buzzer Live)" icon={<Zap className="w-5 h-5 text-amber-500" />} isOpen={openSections.has('admin-furore')} onToggle={() => toggleSection('admin-furore')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">⚡ A cosa serve?</p>
                    <p className="text-muted-foreground">Gioco live con pulsantiera buzzer. I giocatori entrano con il telefono e schiacciano per primo!</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Pannello Admin:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Stato sessione:</strong> Aperta / In attesa / In corso / Chiusa</li>
                      <li>• <strong>Apri sessione:</strong> Crea una nuova sessione di gioco</li>
                      <li>• <strong>Chiudi sessione:</strong> Termina il gioco corrente</li>
                      <li>• <strong>Reset sessione:</strong> Azzera punteggi e giocatori</li>
                      <li>• <strong>Max giocatori:</strong> Imposta il limite massimo di partecipanti</li>
                      <li>• <strong>Suono buzzer:</strong> Scegli tra diversi suoni (synth, classici)</li>
                      <li>• <strong>Auto-scoring:</strong> Punti assegnati automaticamente al primo che schiaccia</li>
                      <li>• <strong>Mostra classifica:</strong> Toggle per rendere visibile la classifica ai giocatori</li>
                      <li>• <strong>Mostra prenotazioni:</strong> Mostra l'ordine di prenotazione ai giocatori</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Gestione giocatori:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Lista giocatori:</strong> Vedi tutti con nickname, colore e punteggio</li>
                      <li>• <strong>Modifica punteggio:</strong> Assegna o sottrai punti manualmente</li>
                      <li>• <strong>Espelli giocatore:</strong> Rimuovi un giocatore dalla sessione</li>
                      <li>• <strong>Ordine prenotazione:</strong> Chi ha prenotato il buzzer per primo</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Regole punteggio:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>1° posto:</strong> Punti configurabili (default: 3)</li>
                      <li>• <strong>2° posto:</strong> Punti configurabili (default: 2)</li>
                      <li>• <strong>3° posto:</strong> Punti configurabili (default: 1)</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">📺 TV e Remoto</p>
                    <p className="text-muted-foreground text-xs">Il gioco può essere trasmesso sulla TV (standby "Furore + QR"). Il link remoto permette di controllare la sessione da un altro dispositivo.</p>
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
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Azioni:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Espandi:</strong> Vedi il testo completo della dedica</li>
                      <li>• <strong>Rispondi:</strong> Invia una risposta via chat</li>
                      <li>• <strong>Elimina:</strong> Rimuovi la dedica</li>
                      <li>• <strong>Reset Dediche:</strong> Elimina tutti i messaggi (con conferma)</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Quiz */}
              <ManualCollapsible id="admin-quiz" title="Quiz Musicale" icon={<HelpCircle className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-quiz')} onToggle={() => toggleSection('admin-quiz')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">❓ A cosa serve?</p>
                    <p className="text-muted-foreground">Gestisci le domande del quiz musicale: crea set tematici, importa da CSV, e configura le opzioni di gioco.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Tab "Set di domande":</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Crea set:</strong> Nuovo set tematico (es. "Anni 80", "Rock", "Italiano")</li>
                      <li>• <strong>Modifica nome:</strong> Rinomina un set esistente</li>
                      <li>• <strong>Elimina set:</strong> Rimuovi un set e tutte le sue domande</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Tab "Domande":</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Aggiungi domanda:</strong> Testo, 4 opzioni, risposta corretta, difficoltà</li>
                      <li>• <strong>Filtro per set:</strong> Visualizza domande di un set specifico</li>
                      <li>• <strong>Filtro per decade:</strong> Filtra per epoca musicale</li>
                      <li>• <strong>Modifica:</strong> Modifica qualsiasi campo della domanda</li>
                      <li>• <strong>Elimina:</strong> Rimuovi singole domande</li>
                      <li>• <strong>Importa CSV:</strong> Carica domande in blocco da file CSV</li>
                      <li>• <strong>Esporta CSV:</strong> Scarica tutte le domande come CSV</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">📋 Formato CSV</p>
                    <p className="text-muted-foreground text-xs">Colonne: domanda, opzione1, opzione2, opzione3, opzione4, risposta_corretta (1-4), difficoltà, decade, set_id</p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Giochi */}
              <ManualCollapsible id="admin-giochi" title="Giochi Passatempo" icon={<Gamepad2 className="w-5 h-5 text-emerald-500" />} isOpen={openSections.has('admin-giochi')} onToggle={() => toggleSection('admin-giochi')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Tab "Impostazioni":</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Giochi abilitati:</strong> Toggle globale per attivare/disattivare i giochi</li>
                      <li>• <strong>Mostra su app:</strong> Visibilità nella pagina app</li>
                      <li>• <strong>Mostra su TV:</strong> Visualizzazione sulla schermata TV</li>
                      <li>• <strong>Disponibile quando chiuso:</strong> Giochi accessibili anche senza evento live</li>
                      <li>• <strong>Disponibile in consultabile:</strong> Giochi in modalità solo consultazione</li>
                      <li>• <strong>Giochi singoli:</strong> Toggle individuale per ogni gioco (Quiz, ecc.)</li>
                      <li>• <strong>Sorgente quiz:</strong> Generale, per set specifici, o random</li>
                      <li>• <strong>Ordine domande:</strong> Sequenziale o casuale</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-2">Tab "Classifiche":</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <strong>Leaderboard:</strong> Classifica per ogni gioco con nickname e punteggio</li>
                      <li>• <strong>Filtra per gioco:</strong> Seleziona quale classifica visualizzare</li>
                      <li>• <strong>Reset classifica:</strong> Azzera i punteggi di un gioco specifico</li>
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

              {/* Gamification */}
              <ManualCollapsible id="admin-gamification" title="Gamification e Classifiche" icon={<Trophy className="w-5 h-5 text-amber-500" />} isOpen={openSections.has('admin-gamification')} onToggle={() => toggleSection('admin-gamification')}>
                <div className="space-y-4 text-sm">
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

              {/* ===== SEZIONE GESTIONE ===== */}
              <div className="pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                  ⚙️ Sezione GESTIONE
                </h3>
              </div>

              {/* Impostazioni */}
              <ManualCollapsible id="admin-impostazioni" title="Impostazioni" icon={<Settings className="w-5 h-5 text-muted-foreground" />} isOpen={openSections.has('admin-impostazioni')} onToggle={() => toggleSection('admin-impostazioni')}>
                <div className="space-y-4 text-sm">
                  <p>Tutte le configurazioni globali del sistema:</p>
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

              {/* Operatori */}
              <ManualCollapsible id="admin-operators" title="Operatori" icon={<UserCheck className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-operators')} onToggle={() => toggleSection('admin-operators')}>
                <div className="space-y-4 text-sm">
                  <p>Gli operatori sono utenti della Community con permessi speciali nell'admin:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Accesso limitato:</strong> Vedono solo le sezioni assegnate (Centro, Open Mic, Dediche, Assistente, Trasmetti)</li>
                    <li>• <strong>Login social:</strong> Accedono con il loro account Community</li>
                    <li>• <strong>Ruolo "operator":</strong> Non possono modificare impostazioni sensibili</li>
                    <li>• <strong>Assegnazione:</strong> L'Owner promuove utenti dalla sezione Operatori</li>
                  </ul>
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
                </div>
              </ManualCollapsible>

              {/* Permessi */}
              <ManualCollapsible id="admin-permissions" title="Permessi (Owner)" icon={<Shield className="w-5 h-5 text-primary" />} isOpen={openSections.has('admin-permissions')} onToggle={() => toggleSection('admin-permissions')}>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="font-medium text-amber-600 dark:text-amber-400"><Lock className="w-4 h-4 inline mr-1" />Solo Owner</p>
                  </div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Decidere quali sezioni può vedere ogni ruolo</li>
                    <li>• Abilitare/disabilitare singole funzionalità per ruolo</li>
                    <li>• Preset "Consigliato" o "Completo"</li>
                    <li>• Gerarchia a 4 livelli per i moduli core</li>
                  </ul>
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

              {/* Blocco Utenti */}
              <ManualCollapsible id="admin-block" title="Blocco Utenti" icon={<Ban className="w-5 h-5 text-destructive" />} isOpen={openSections.has('admin-block')} onToggle={() => toggleSection('admin-block')}>
                <div className="space-y-4 text-sm">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><Ban className="w-4 h-4 text-destructive" /><span><strong>Blocco temporaneo:</strong> 1 ora, 24 ore, ecc.</span></li>
                    <li className="flex items-center gap-2"><Ban className="w-4 h-4 text-destructive" /><span><strong>Blocco permanente:</strong> Senza scadenza</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span><strong>Sblocco:</strong> Riabilita immediatamente</span></li>
                  </ul>
                  <p className="text-muted-foreground text-xs">Il blocco funziona sia per utenti anonimi (session ID) sia per utenti registrati (user ID).</p>
                </div>
              </ManualCollapsible>

              {/* Reset e Undo */}
              <ManualCollapsible id="admin-reset" title="Reset e Undo" icon={<Undo2 className="w-5 h-5 text-amber-600" />} isOpen={openSections.has('admin-reset')} onToggle={() => toggleSection('admin-reset')}>
                <div className="space-y-4 text-sm">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><Music className="w-4 h-4 text-primary" /><span><strong>Reset Open Mic:</strong> Elimina tutte le prenotazioni</span></li>
                    <li className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-secondary" /><span><strong>Reset Dediche:</strong> Elimina tutti i messaggi</span></li>
                    <li className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-destructive" /><span><strong>Reset Totale:</strong> Pulisce tutto</span></li>
                  </ul>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="font-medium text-amber-600 dark:text-amber-400">⏱️ Sistema Undo</p>
                    <p className="text-muted-foreground mt-1">Ogni azione ha un pulsante "Annulla" (8-10 secondi). Non aver paura di sbagliare!</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-destructive">⚠️ Attenzione</p>
                    <p className="text-muted-foreground mt-1">I reset sono irreversibili dopo la finestra di undo! Tutto viene registrato nel log Audit.</p>
                  </div>
                </div>
              </ManualCollapsible>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tips Footer */}
      <Card className="mt-6 border-amber-500/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Bell className="w-4 h-4" />
            Suggerimenti Rapidi
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>🔄 <strong>Ogni azione ha Undo</strong> — non aver paura di sbagliare!</p>
          <p>📱 <strong>Mobile-first</strong> — tutto funziona su telefono, tablet e computer.</p>
          <p>🔔 <strong>Attiva notifiche</strong> — non perderti prenotazioni o messaggi.</p>
          <p>👥 <strong>Delega con permessi</strong> — usa i ruoli per dividere il lavoro.</p>
          <p>📺 <strong>Dual mode</strong> — testo alla TV, accordi ai musicisti, tutto sincronizzato.</p>
          <p>🦶 <strong>Pedale Bluetooth</strong> — scorri con i piedi mentre suoni.</p>
          <p>⚡ <strong>Non C'è Furore</strong> — gioco buzzer live per animare la serata.</p>
          <p>❓ <strong>Quiz</strong> — crea domande personalizzate per sfidare il pubblico.</p>
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

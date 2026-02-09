import React, { useState } from 'react';
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

/**
 * Manuale completo riorganizzato per utenti e amministratori
 * 
 * Struttura:
 * - Guida Utente: come usare l'app durante gli eventi
 * - Guida Admin: come gestire eventi, formati e staff
 */

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

const AdminManualContent: React.FC = () => {
  const { isLoggedIn, isLoading } = useAdmin();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['user-intro']));

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLogin />;
  }

  return (
    <>
      <SEO 
        title="Manuale | Non C'è Duo"
        description="Guida completa per utenti e amministratori"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
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

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
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

              {/* Sezione: Come funziona */}
              <ManualCollapsible
                id="user-intro"
                title="Come funziona"
                icon={<Zap className="w-5 h-5 text-accent" />}
                isOpen={openSections.has('user-intro')}
                onToggle={() => toggleSection('user-intro')}
              >
                <div className="space-y-4 text-sm">
                  <p>
                    L'app ti permette di interagire con gli eventi in due modi:
                  </p>
                  
                  <div className="grid gap-3">
                    <FeatureCard
                      icon={<Music className="w-5 h-5 text-primary" />}
                      title="Open Mic 🎤"
                      description="Prenota una canzone da cantare durante la serata"
                    />
                    <FeatureCard
                      icon={<MessageSquare className="w-5 h-5 text-secondary" />}
                      title="Dediche 💌"
                      description="Invia un messaggio o una dedica alla band"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">💡 Suggerimento</p>
                    <p className="text-muted-foreground">
                      Apri l'app quando sei al locale e vedrai automaticamente 
                      cosa è disponibile in quel momento!
                    </p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Prenotare una canzone */}
              <ManualCollapsible
                id="user-openmic"
                title="Prenotare una canzone"
                icon={<Music className="w-5 h-5 text-primary" />}
                isOpen={openSections.has('user-openmic')}
                onToggle={() => toggleSection('user-openmic')}
              >
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
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-primary font-medium">
                      <Lock className="w-4 h-4 inline mr-1" />
                      PIN richiesto?
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Alcuni eventi richiedono un PIN per prenotare. 
                      Chiedi allo staff il codice di accesso!
                    </p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Inviare una dedica */}
              <ManualCollapsible
                id="user-dediche"
                title="Inviare una dedica"
                icon={<MessageSquare className="w-5 h-5 text-secondary" />}
                isOpen={openSections.has('user-dediche')}
                onToggle={() => toggleSection('user-dediche')}
              >
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

              {/* Sezione: Stati dell'app */}
              <ManualCollapsible
                id="user-states"
                title="Cosa significano i badge"
                icon={<Radio className="w-5 h-5 text-primary" />}
                isOpen={openSections.has('user-states')}
                onToggle={() => toggleSection('user-states')}
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <Badge className="bg-primary text-primary-foreground">
                      <Radio className="w-3 h-3 mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                    <span>Evento in corso con regole attive</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <Badge className="bg-accent text-accent-foreground">
                      <Zap className="w-3 h-3 mr-1" />
                      Serata Aperta
                    </Badge>
                    <span>Puoi prenotare senza limiti!</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Prossimamente
                    </Badge>
                    <span>Nessun evento attivo, ma ce ne sono in programma</span>
                  </div>
                </div>
              </ManualCollapsible>
            </TabsContent>

            {/* ==================== GUIDA ADMIN ==================== */}
            <TabsContent value="admin" className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Pannello Admin
                  </CardTitle>
                  <CardDescription>
                    Gestisci eventi, formati e il tuo team
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Sezione: Panoramica */}
              <ManualCollapsible
                id="admin-overview"
                title="Panoramica del pannello"
                icon={<Settings className="w-5 h-5 text-muted-foreground" />}
                isOpen={openSections.has('admin-overview')}
                onToggle={() => toggleSection('admin-overview')}
              >
                <div className="space-y-4 text-sm">
                  <p>Il pannello è organizzato in tre aree principali:</p>
                  
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="font-bold text-primary mb-2">🔴 LIVE</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><strong>Centro:</strong> Dashboard in tempo reale con notifiche</li>
                        <li><strong>Evento:</strong> Gestione eventi programmati</li>
                        <li><strong>Formati:</strong> Toggle rapidi e notifiche</li>
                      </ul>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="font-bold text-secondary mb-2">📋 OPERATIVO</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><strong>Open Mic:</strong> Lista prenotazioni canzoni</li>
                        <li><strong>Canzoni:</strong> Catalogo brani disponibili</li>
                        <li><strong>Dediche:</strong> Messaggi e chat con utenti</li>
                        <li><strong>Community:</strong> Gruppi e bacheca sociale</li>
                      </ul>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-muted border">
                      <p className="font-bold mb-2">⚙️ GESTIONE</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><strong>Impostazioni:</strong> Configurazione generale</li>
                        <li><strong>Staff:</strong> Gestione team (solo Owner)</li>
                        <li><strong>Permessi:</strong> Controllo accessi (solo Owner)</li>
                        <li><strong>Audit:</strong> Log attività (solo Owner)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Serata Aperta */}
              <ManualCollapsible
                id="admin-freemode"
                title="Serata Aperta (Free Mode)"
                icon={<Zap className="w-5 h-5 text-accent" />}
                isOpen={openSections.has('admin-freemode')}
                onToggle={() => toggleSection('admin-freemode')}
              >
                <div className="space-y-4 text-sm">
                  <p>
                    La <strong>Serata Aperta</strong> permette di attivare i formati 
                    senza creare un evento programmato. È perfetta per:
                  </p>
                  
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Serate improvvisate</li>
                    <li>Test rapidi del sistema</li>
                    <li>Eventi senza limiti numerici</li>
                  </ul>

                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-2">Come attivare:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Vai su <strong>Formati</strong></li>
                      <li>Usa la card <strong>"Serata Aperta"</strong></li>
                      <li>Attiva Open Mic, Dediche o entrambi</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">⚠️ Nota importante</p>
                    <p className="text-muted-foreground">
                      Se c'è un evento LIVE, la Serata Aperta viene ignorata. 
                      L'evento LIVE ha sempre priorità!
                    </p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Eventi Programmati */}
              <ManualCollapsible
                id="admin-events"
                title="Eventi Programmati"
                icon={<Calendar className="w-5 h-5 text-primary" />}
                isOpen={openSections.has('admin-events')}
                onToggle={() => toggleSection('admin-events')}
              >
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
                      <li>• <strong>Finestra temporale:</strong> Quando aprono/chiudono le prenotazioni</li>
                      <li>• <strong>Limiti:</strong> Max canzoni e dediche</li>
                      <li>• <strong>PIN:</strong> Codice d'accesso opzionale</li>
                      <li>• <strong>Riapertura:</strong> Slot extra temporanei</li>
                      <li>• <strong>Chiusura:</strong> Messaggio per gli utenti</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Centro Notifiche */}
              <ManualCollapsible
                id="admin-centro"
                title="Centro Notifiche"
                icon={<Bell className="w-5 h-5 text-primary" />}
                isOpen={openSections.has('admin-centro')}
                onToggle={() => toggleSection('admin-centro')}
              >
                <div className="space-y-4 text-sm">
                  <p>
                    Il <strong>Centro</strong> è la dashboard operativa per gestire 
                    le richieste in tempo reale durante gli eventi.
                  </p>

                  <div className="space-y-2">
                    <p className="font-medium">Funzionalità:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Feed unificato:</strong> Canzoni e dediche in un'unica lista</li>
                      <li>• <strong>Filtri:</strong> In coda, Canzoni, Dediche, Tutte</li>
                      <li>• <strong>Swipe:</strong> Scorri per completare o eliminare</li>
                      <li>• <strong>Tap:</strong> Tocca per vedere i testi delle canzoni</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Completate oggi
                    </p>
                    <p className="text-muted-foreground">
                      Il contatore in alto a destra mostra quante canzoni hai fatto!
                    </p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Notifiche Push */}
              <ManualCollapsible
                id="admin-notifications"
                title="Notifiche Push"
                icon={<Smartphone className="w-5 h-5 text-blue-500" />}
                isOpen={openSections.has('admin-notifications')}
                onToggle={() => toggleSection('admin-notifications')}
              >
                <div className="space-y-4 text-sm">
                  <p>
                    Ricevi notifiche anche quando l'app è chiusa:
                  </p>

                  <ol className="list-decimal list-inside space-y-2">
                    <li>Vai su <strong>Formati → Notifiche</strong></li>
                    <li>Clicca <strong>"Attiva"</strong> per abilitare le notifiche</li>
                    <li>Attiva <strong>"Notifiche Background"</strong> per riceverle a app chiusa</li>
                    <li>Usa <strong>"Test ritardato"</strong> per verificare</li>
                  </ol>

                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="font-medium text-blue-500 mb-1">📱 Android + iOS</p>
                    <p className="text-muted-foreground">
                      Le notifiche background funzionano meglio su Android. 
                      Su iOS, assicurati di aggiungere l'app alla schermata home.
                    </p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Visibilità Dediche */}
              <ManualCollapsible
                id="admin-dediche"
                title="Visibilità Dediche"
                icon={<Eye className="w-5 h-5 text-secondary" />}
                isOpen={openSections.has('admin-dediche')}
                onToggle={() => toggleSection('admin-dediche')}
              >
                <div className="space-y-4 text-sm">
                  <p>Ogni dedica può avere una visibilità diversa:</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <Eye className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="font-medium">Pubblica</p>
                        <p className="text-xs text-muted-foreground">Visibile a tutti</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Solo Staff</p>
                        <p className="text-xs text-muted-foreground">Visibile solo agli admin</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Solo Autore</p>
                        <p className="text-xs text-muted-foreground">Visibile solo a chi l'ha inviata</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Gestione Staff */}
              <ManualCollapsible
                id="admin-staff"
                title="Gestione Staff (Owner)"
                icon={<Crown className="w-5 h-5 text-amber-500" />}
                isOpen={openSections.has('admin-staff')}
                onToggle={() => toggleSection('admin-staff')}
              >
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Solo Owner
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Questa sezione è accessibile solo al proprietario dell'account.
                    </p>
                  </div>

                  <p>Dalla sezione <strong>Staff</strong> puoi:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Creare nuovi account Admin o Staff</li>
                    <li>• Modificare le password</li>
                    <li>• Eliminare account (tranne il tuo)</li>
                  </ul>

                  <p>Dalla sezione <strong>Permessi</strong> puoi:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Decidere quali sezioni può vedere ogni ruolo</li>
                    <li>• Abilitare/disabilitare singole funzionalità</li>
                    <li>• Usare preset "Consigliato" o "Completo"</li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Sezione: Blocco Utenti */}
              <ManualCollapsible
                id="admin-block"
                title="Blocco Utenti"
                icon={<Ban className="w-5 h-5 text-destructive" />}
                isOpen={openSections.has('admin-block')}
                onToggle={() => toggleSection('admin-block')}
              >
                <div className="space-y-4 text-sm">
                  <p>Gestisci utenti problematici:</p>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-destructive" />
                      <span><strong>Blocco temporaneo:</strong> 1 ora, 24 ore, ecc.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-destructive" />
                      <span><strong>Blocco permanente:</strong> Senza scadenza</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span><strong>Sblocco:</strong> Riabilita immediatamente</span>
                    </li>
                  </ul>
                </div>
              </ManualCollapsible>

              {/* Sezione: WiFi Locale (senza internet) */}
              <ManualCollapsible
                id="admin-local-wifi"
                title="WiFi Locale (senza internet)"
                icon={<Server className="w-5 h-5 text-primary" />}
                isOpen={openSections.has('admin-local-wifi')}
                onToggle={() => toggleSection('admin-local-wifi')}
              >
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🌐 A cosa serve?</p>
                    <p className="text-muted-foreground">
                      Quando sei in un locale <strong>senza internet</strong> ma hai un <strong>router WiFi</strong> acceso, 
                      puoi sincronizzare TV, partiture e telecomando usando solo la rete locale.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-2">⚠️ Cosa ti serve:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Un <strong>router WiFi</strong> acceso (anche senza internet!)</li>
                      <li>• Un <strong>computer</strong> (Windows, Mac o Linux) collegato al WiFi</li>
                      <li>• Il <strong>tablet/telefono</strong> collegato allo <strong>stesso WiFi</strong></li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-3">📋 Guida passo passo:</p>
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                      <li>
                        <strong>Accendi il router WiFi</strong>
                        <p className="ml-5 text-xs">Non serve che abbia internet. Basta che sia acceso e faccia la rete WiFi.</p>
                      </li>
                      <li>
                        <strong>Collega TUTTI i dispositivi allo stesso WiFi</strong>
                        <p className="ml-5 text-xs">Computer, tablet, telefono, TV — tutti sulla stessa rete!</p>
                      </li>
                      <li>
                        <strong>Sul computer: avvia il server locale</strong>
                        <p className="ml-5 text-xs">
                          Apri la cartella <code className="bg-muted-foreground/20 px-1 rounded">local-server</code> e fai doppio clic su:
                        </p>
                        <ul className="ml-5 text-xs mt-1 space-y-0.5">
                          <li>• Windows → <code className="bg-muted-foreground/20 px-1 rounded">start.bat</code></li>
                          <li>• Mac/Linux → <code className="bg-muted-foreground/20 px-1 rounded">start.sh</code></li>
                        </ul>
                      </li>
                      <li>
                        <strong>Leggi l'indirizzo IP che appare</strong>
                        <p className="ml-5 text-xs">
                          Il server stampa qualcosa tipo: <code className="bg-muted-foreground/20 px-1 rounded">ws://192.168.1.100:3456</code>
                        </p>
                        <p className="ml-5 text-xs">
                          Il numero dopo <code className="bg-muted-foreground/20 px-1 rounded">ws://</code> è l'IP (es. <strong>192.168.1.100</strong>).
                        </p>
                      </li>
                      <li>
                        <strong>Nell'app: vai su Impostazioni</strong>
                        <p className="ml-5 text-xs">Pannello Admin → Impostazioni → "Connessione Trasmissione"</p>
                      </li>
                      <li>
                        <strong>Seleziona "Locale (WiFi)"</strong>
                        <p className="ml-5 text-xs">Apparirà un campo per l'IP. Inserisci quello del punto 4.</p>
                      </li>
                      <li>
                        <strong>Premi "Salva" e aspetta il badge verde "Connesso"</strong>
                        <p className="ml-5 text-xs">Se vedi "Connesso" con i millisecondi, sei pronto!</p>
                      </li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-destructive mb-1">❌ Non funziona?</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Controlla che TUTTI i dispositivi siano sullo <strong>stesso WiFi</strong></li>
                      <li>• Controlla che il server sia <strong>acceso</strong> (deve mostrare "In attesa di connessioni...")</li>
                      <li>• Controlla che l'IP sia <strong>copiato giusto</strong> (senza spazi)</li>
                      <li>• Alcuni router bloccano la comunicazione tra dispositivi → prova a disabilitare "Client Isolation" nelle impostazioni del router</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">💡 Cosa funziona in modalità locale:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>✅ Sincronizzazione testo tra SongBook, TV e Partiture</li>
                      <li>✅ Cambio brano in tempo reale</li>
                      <li>✅ Trasposizione sincronizzata</li>
                      <li>✅ Scroll sincronizzato</li>
                      <li>❌ Prenotazioni (servono internet)</li>
                      <li>❌ Chat e dediche (servono internet)</li>
                    </ul>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Pedale Bluetooth */}
              <ManualCollapsible
                id="admin-pedal"
                title="Pedale Bluetooth"
                icon={<Footprints className="w-5 h-5 text-primary" />}
                isOpen={openSections.has('admin-pedal')}
                onToggle={() => toggleSection('admin-pedal')}
              >
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary mb-1">🦶 A cosa serve?</p>
                    <p className="text-muted-foreground">
                      Se hai un pedale Bluetooth (come <strong>IK Multimedia BlueTurn</strong>), 
                      puoi scorrere il testo del brano con i piedi mentre suoni!
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-bold mb-3">📋 Come configurarlo:</p>
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                      <li>
                        <strong>Collega il pedale via Bluetooth al tablet</strong>
                        <p className="ml-5 text-xs">Vai nelle impostazioni Bluetooth del tablet, cerca il pedale e collegalo.</p>
                      </li>
                      <li>
                        <strong>Nell'app: Impostazioni → "Pedale Bluetooth"</strong>
                        <p className="ml-5 text-xs">Attiva il toggle principale.</p>
                      </li>
                      <li>
                        <strong>Scegli la modalità:</strong>
                        <ul className="ml-5 text-xs mt-1 space-y-0.5">
                          <li>• <strong>🎯 Evidenziazione</strong> — Muove la riga evidenziata in TV (come il telecomando)</li>
                          <li>• <strong>📜 Scroll locale</strong> — Scorre solo sul tuo schermo</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Imposta quante righe saltare</strong>
                        <p className="ml-5 text-xs">Usa lo slider "Righe per pressione" (1-15). Se suoni, metti 3-5 righe così non devi premere troppo spesso.</p>
                      </li>
                      <li>
                        <strong>Scegli dove attivarlo</strong>
                        <p className="ml-5 text-xs">Puoi abilitare il pedale su SongBook Live, Trasmetti (TV) e/o Partiture.</p>
                      </li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent mb-1">🎯 Pedale + Telecomando insieme?</p>
                    <p className="text-muted-foreground text-xs">
                      Sì! Se sono entrambi attivi in modalità "Evidenziazione", <strong>l'ultimo che agisce vince</strong>. 
                      Puoi usare il pedale per le righe e il telecomando (o il pannello Admin) per correzioni manuali.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted border">
                    <p className="font-medium mb-1">⌨️ Tasti supportati:</p>
                    <ul className="space-y-0.5 text-muted-foreground text-xs">
                      <li>• <strong>Avanti:</strong> PageDown, Freccia Giù, Freccia Destra</li>
                      <li>• <strong>Indietro:</strong> PageUp, Freccia Su, Freccia Sinistra</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Il BlueTurn può essere impostato su diverse modalità (PageUp/Down, Arrow, ecc.) — tutte funzionano!
                    </p>
                  </div>
                </div>
              </ManualCollapsible>

              {/* Sezione: Reset e Sicurezza */}
              <ManualCollapsible
                id="admin-reset"
                title="Reset e Undo"
                icon={<Undo2 className="w-5 h-5 text-warning" />}
                isOpen={openSections.has('admin-reset')}
                onToggle={() => toggleSection('admin-reset')}
              >
                <div className="space-y-4 text-sm">
                  <p>Dal menu in alto a destra puoi eseguire reset:</p>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span><strong>Reset Open Mic:</strong> Elimina tutte le prenotazioni</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-secondary" />
                      <span><strong>Reset Dediche:</strong> Elimina tutti i messaggi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-destructive" />
                      <span><strong>Reset Totale:</strong> Pulisce tutto</span>
                    </li>
                  </ul>

                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="font-medium text-warning">⏱️ Sistema Undo</p>
                    <p className="text-muted-foreground mt-1">
                      Ogni azione ha un pulsante "Annulla" (8-10 secondi). 
                      Non aver paura di sbagliare!
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-destructive">⚠️ Attenzione</p>
                    <p className="text-muted-foreground mt-1">
                      I reset sono irreversibili dopo la finestra di undo! 
                      Tutte le azioni vengono registrate nel log Audit.
                    </p>
                  </div>
                </div>
              </ManualCollapsible>
            </TabsContent>
          </Tabs>

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
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

const AdminManual: React.FC = () => (
  <AdminProvider>
    <AdminManualContent />
  </AdminProvider>
);

export default AdminManual;

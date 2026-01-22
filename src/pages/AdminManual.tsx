import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Book, 
  Mic2, 
  MessageCircle, 
  Users, 
  Shield, 
  Settings, 
  Music, 
  Ban, 
  Crown,
  RefreshCw,
  Undo2,
  Bell,
  Lock,
  UserPlus,
  Newspaper,
  CheckCircle,
  Trash2,
  Edit,
  Eye,
  Search,
  Key,
  Globe,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEO } from '@/components/SEO';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  subsections: {
    title: string;
    content: string[];
  }[];
}

const renderBold = (text: string) => {
  // Supports simple **bold** segments without injecting HTML.
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const AdminManualContent: React.FC = () => {
  const { isLoggedIn, isLoading } = useAdmin();

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

  const sections: ManualSection[] = [
    {
      id: 'openmic',
      title: 'Open Mic',
      icon: <Mic2 className="w-5 h-5" />,
      color: 'text-secondary',
      description: 'Gestione prenotazioni karaoke e canzoni',
      subsections: [
        {
          title: 'Prenotazioni in Corso',
          content: [
            '✅ **Completa**: segna una canzone come cantata. Clicca "Annulla" nel toast per ripristinare.',
            '🗑️ **Elimina**: rimuove la prenotazione. Usa "Annulla" per recuperarla.',
            '📋 **Selezione multipla**: attiva dal menu ⋮ per eliminare più prenotazioni insieme.',
          ]
        },
        {
          title: 'Prenotazioni Completate',
          content: [
            '🔄 **Riattiva**: riporta una canzone in coda. Annullabile.',
            '🗑️ **Elimina**: rimuove definitivamente (con undo).',
          ]
        },
        {
          title: 'Gestione Canzoni (tab Canzoni)',
          content: [
            '🔍 **Cerca**: filtra per titolo o artista.',
            '📊 **Filtri**: Tutte / Prenotate / Completate / Disponibili.',
            '🔄 **Reset Globale**: sblocca tutte le canzoni (conferma richiesta).',
          ]
        },
        {
          title: 'Reset Serata',
          content: [
            '🎤 **Reset Open Mic**: elimina solo prenotazioni.',
            '📄 **Ripristina Canzoni**: sblocca tutte le canzoni senza toccare altro.',
            '⚠️ **Reset Totale**: elimina TUTTO (prenotazioni + messaggi + stati). Solo Owner.',
          ]
        }
      ]
    },
    {
      id: 'dediche',
      title: 'Dediche / Messaggi',
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'text-primary',
      description: 'Chat con utenti e gruppi temporanei',
      subsections: [
        {
          title: 'Conversazioni',
          content: [
            '💬 **Rispondi**: clicca su una conversazione per rispondere.',
            '✏️ **Modifica**: modifica i tuoi messaggi (non quelli degli utenti).',
            '🗑️ **Elimina**: rimuove messaggi singoli o intere conversazioni.',
            '👁️ **Letto/Non letto**: marca le conversazioni per tenerne traccia.',
          ]
        },
        {
          title: 'Gruppi Dediche (temporanei)',
          content: [
            '➕ **Crea gruppo**: solo admin può creare gruppi Dediche per la serata.',
            '🔐 **Password**: opzionale, per gruppi riservati a tavoli specifici.',
            '🔗 **Link invito**: genera link da condividere (QR code).',
            '🗑️ **Elimina gruppo**: a fine serata elimina i gruppi temporanei.',
          ]
        },
        {
          title: 'Moderazione',
          content: [
            '🚫 **Blocca utente**: impedisce all\'utente di scrivere.',
            '📛 **Segnala**: evidenzia messaggi problematici.',
            '♻️ **Annulla**: ogni eliminazione ha la funzione "Annulla".',
          ]
        }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      icon: <Users className="w-5 h-5" />,
      color: 'text-accent',
      description: 'Gestione utenti registrati, gruppi permanenti e feed',
      subsections: [
        {
          title: 'Utenti (tab Utenti)',
          content: [
            '🔍 **Cerca**: trova utenti per nome o username.',
            '✏️ **Modifica profilo**: cambia nome visualizzato.',
            '🔑 **Reset password**: invia link di reset (non visualizzi la password).',
            '🗑️ **Elimina account**: rimuove l\'utente dalla community.',
          ]
        },
        {
          title: 'Gruppi Community (permanenti)',
          content: [
            '🌐 **Pubblici**: chiunque può entrare.',
            '🔒 **Privati**: richiedono password o approvazione.',
            '👥 **Richieste**: approva/rifiuta richieste di ingresso.',
            '✏️ **Modifica**: rinomina, cambia visibilità, imposta password.',
            '🔗 **Link invito**: genera link illimitati o con scadenza.',
          ]
        },
        {
          title: 'Bacheca (tab Bacheca)',
          content: [
            '📰 **Visualizza**: tutti i post della community.',
            '❤️ **Interazioni**: vedi like e commenti.',
            '🗑️ **Elimina post**: rimuove con possibilità di "Annulla" (8 sec).',
            '🔄 **Reset bacheca**: elimina tutti i post (10 sec per annullare).',
          ]
        }
      ]
    },
    {
      id: 'permissions',
      title: 'Permessi & Staff',
      icon: <Crown className="w-5 h-5" />,
      color: 'text-warning',
      description: 'Gestione ruoli e permessi granulari',
      subsections: [
        {
          title: 'Ruoli',
          content: [
            '👑 **Owner**: accesso completo, gestisce admin e owner.',
            '🛡️ **Admin**: gestisce tutto tranne gli altri admin/owner.',
            '🔰 **Staff**: permessi limitati configurabili.',
            '👤 **User**: utente normale della community.',
          ]
        },
        {
          title: 'Permessi Granulari (25+)',
          content: [
            '🎤 **Open Mic**: openmic.view, openmic.complete, openmic.delete, openmic.reset',
            '💬 **Dediche**: dediche.view, dediche.reply, dediche.delete, dediche.groups',
            '👥 **Community**: community.view, community.manage_users, community.manage_groups, community.moderate',
            '⚙️ **Settings**: settings.rename_sections, settings.notifications',
          ]
        },
        {
          title: 'Gestione Staff',
          content: [
            '➕ **Aggiungi staff**: cerca utente e assegna ruolo.',
            '✏️ **Cambia ruolo**: promuovi/declassa (Admin → Moderator).',
            '🎛️ **Permessi per ruolo**: abilita/disabilita permessi per ogni ruolo.',
            '❌ **Revoca**: rimuovi ruolo staff.',
          ]
        }
      ]
    },
    {
      id: 'users-blocked',
      title: 'Blocco Utenti',
      icon: <Ban className="w-5 h-5" />,
      color: 'text-destructive',
      description: 'Gestione utenti bloccati nelle chat',
      subsections: [
        {
          title: 'Blocco',
          content: [
            '🚫 **Blocca**: impedisce all\'utente di inviare messaggi.',
            '⏰ **Temporaneo**: imposta scadenza (es. 1 ora, 24 ore).',
            '♾️ **Permanente**: blocco senza scadenza.',
            '📝 **Motivo**: aggiungi una nota per ricordare il motivo.',
          ]
        },
        {
          title: 'Sblocco',
          content: [
            '✅ **Sblocca**: riabilita l\'utente immediatamente.',
            '⏰ **Scadenza automatica**: i blocchi temporanei scadono da soli.',
          ]
        }
      ]
    },
    {
      id: 'settings',
      title: 'Impostazioni',
      icon: <Settings className="w-5 h-5" />,
      color: 'text-muted-foreground',
      description: 'Configurazione notifiche e preferenze',
      subsections: [
        {
          title: 'Notifiche',
          content: [
            '🔔 **Push**: attiva notifiche browser (richiede permesso).',
            '🔊 **Suoni**: abilita/disabilita suoni notifica.',
            '🌙 **Ore silenziose**: imposta fascia oraria senza notifiche.',
          ]
        },
        {
          title: 'Personalizzazione',
          content: [
            '📛 **Rinomina sezioni**: cambia nome a "Open Mic", "Dediche", "Community".',
            '🎨 **Tema**: futuro supporto per temi personalizzati.',
          ]
        }
      ]
    },
    {
      id: 'undo',
      title: 'Sistema Annulla (Undo)',
      icon: <Undo2 className="w-5 h-5" />,
      color: 'text-warning',
      description: 'Recupero azioni accidentali',
      subsections: [
        {
          title: 'Come Funziona',
          content: [
            '⏱️ **Finestra temporale**: 8 secondi per azioni singole, 10 per reset.',
            '🔔 **Toast notification**: appare un messaggio con pulsante "Annulla".',
            '♻️ **Ripristino completo**: i dati vengono recuperati dal database.',
          ]
        },
        {
          title: 'Azioni Annullabili',
          content: [
            '✅ Completamento prenotazioni',
            '🔄 Riattivazione prenotazioni',
            '🗑️ Eliminazione singola/multipla',
            '📝 Eliminazione messaggi/conversazioni',
            '📰 Eliminazione post bacheca',
            '🔄 Reset bacheca completo',
          ]
        }
      ]
    }
  ];

  return (
    <>
      <SEO 
        title="Manuale Admin | Non C'è Duo"
        description="Guida completa all'utilizzo del pannello di amministrazione"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border">
          <div className="container py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <Book className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-lg font-bold">Manuale Admin</h1>
                  <p className="text-xs text-muted-foreground">Guida Completa</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-6 pb-24">
          <div className="max-w-3xl mx-auto">
            {/* Intro */}
            <Card className="mb-6 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-0">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-semibold mb-1">Benvenuto nel Manuale</h2>
                    <p className="text-sm text-muted-foreground">
                      Questa guida spiega tutte le funzionalità del pannello admin. 
                      Clicca sulle sezioni per espandere i dettagli.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-primary">8</div>
                <div className="text-xs text-muted-foreground">Sezioni</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-secondary">25+</div>
                <div className="text-xs text-muted-foreground">Permessi</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-accent">∞</div>
                <div className="text-xs text-muted-foreground">Undo</div>
              </Card>
            </div>

            {/* Sections */}
            <Accordion type="multiple" className="space-y-3">
              {sections.map((section) => (
                <AccordionItem 
                  key={section.id} 
                  value={section.id}
                  className="border rounded-xl overflow-hidden bg-card"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${section.color}`}>
                        {section.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{section.title}</div>
                        <div className="text-xs text-muted-foreground">{section.description}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4 pt-2">
                      {section.subsections.map((sub, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-border">
                          <h4 className="font-medium mb-2 text-sm">{sub.title}</h4>
                          <ul className="space-y-1.5">
                            {sub.content.map((item, i) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                {renderBold(item)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Tips */}
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
          </div>
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

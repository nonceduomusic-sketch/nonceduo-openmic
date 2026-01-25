import React from 'react';
import {
  Settings,
  Zap,
  Radio,
  Lock,
  Info,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormatToggleCard } from '@/components/admin/FormatToggleCard';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { QuickFreeModeCard } from '@/components/admin/QuickFreeModeCard';
import { LiveStatusCard } from '@/components/admin/LiveStatusCard';
import { PinProtectionCard } from '@/components/admin/PinProtectionCard';
import { AdminNotificationsCard } from '@/components/admin/AdminNotificationsCard';
import { EventStoryGeneratorCard } from '@/components/admin/EventStoryGeneratorCard';
import { EventPosterGeneratorCard } from '@/components/admin/EventPosterGeneratorCard';
import { useFormatPreferences } from '@/hooks/useFormatPreferences';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminFormatsTabProps {
  access?: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
  };
  isOwner?: boolean;
}

export const AdminFormatsTab: React.FC<AdminFormatsTabProps> = ({
  access = { openmic: true, dediche: true, community: true },
  isOwner = false,
}) => {
  const { preferences, toggleFormat, loading: prefsLoading } = useFormatPreferences();
  const { permissions, isOwner: hookIsOwner, loading: permsLoading } = useCentroPermissions();
  
  // Permissions derived from hook
  const canMonitor = hookIsOwner || permissions.monitorFormats;
  const canManageActive = hookIsOwner || permissions.activeFormats;
  const canManageSerata = hookIsOwner || permissions.serataLive;

  if (prefsLoading || permsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Formati e Notifiche
        </h2>
        <p className="text-muted-foreground text-sm">
          Gestisci l'attivazione dei format, la serata live e tutte le notifiche
        </p>
      </div>

      {/* Section 0: Quick Free Mode - FIRST POSITION FOR EASY ACCESS */}
      {canManageActive && (access.openmic || access.dediche) && (
        <QuickFreeModeCard />
      )}

      {/* Section 1: Configurazione Monitoraggio */}
      {canMonitor && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Configurazione Monitoraggio
            </CardTitle>
            <CardDescription>
              Scegli quali format vuoi monitorare nel Centro. 
              Non influisce sulla visibilità pubblica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormatToggleCard 
              preferences={preferences} 
              onToggle={toggleFormat}
              access={access}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 2: Format Attivi (Pubblico) - Full Control */}
      {canManageActive && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-amber-400" />
              Controllo Dettagliato Format
            </CardTitle>
            <CardDescription>
              Gestione avanzata dei singoli formati. Include anche la Community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveFormatsCard />
          </CardContent>
        </Card>
      )}

      {/* Section 3: Notifiche (CONSOLIDATA) */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-blue-400" />
            Notifiche Admin
          </CardTitle>
          <CardDescription>
            Gestisci tutte le notifiche: permessi browser, suoni, vibrazione e push in background.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminNotificationsCard />
        </CardContent>
      </Card>

      {/* Section 4: Gestione Evento */}
      {canManageSerata && (access.openmic || access.dediche) && (
        <Card className="border-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="w-5 h-5 text-emerald-400" />
              Gestione Evento Programmato
              {isOwner && <Lock className="w-4 h-4 text-warning ml-auto" />}
            </CardTitle>
            <CardDescription>
              Controlla lo stato dell'evento programmato e la protezione PIN.
              Usa questo per eventi con limiti e timer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Card 1: Stato Evento (LIVE badge) */}
            <LiveStatusCard title="Stato Evento" />
            
            {/* Card 2: Protezione PIN */}
            <PinProtectionCard title="Protezione PIN" />
          </CardContent>
        </Card>
      )}

      {/* Section 5: Grafica Storia Evento */}
      <EventStoryGeneratorCard />

      {/* Section 6: Locandina Evento */}
      <EventPosterGeneratorCard />

      {/* Info Box */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong>Modalità di utilizzo:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Serata Aperta:</strong> Attiva i format al volo senza creare un evento. Nessun limite!</li>
            <li><strong>Evento Programmato:</strong> Crea un evento con limiti numerici, timer e PIN</li>
            <li><strong>Notifiche:</strong> Configura suoni, vibrazione e push background</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

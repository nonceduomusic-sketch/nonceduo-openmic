import React from 'react';
import {
  Settings,
  Zap,
  Radio,
  Lock,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormatToggleCard } from '@/components/admin/FormatToggleCard';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { UnifiedLiveSessionCard } from '@/components/admin/UnifiedLiveSessionCard';
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
          Impostazioni Formati
        </h2>
        <p className="text-muted-foreground text-sm">
          Gestisci l'attivazione dei format, il PIN serata e le opzioni di monitoraggio
        </p>
      </div>

      {/* Section 1: Format Attivi (Pubblico) */}
      {canManageActive && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-amber-400" />
              Format Attivi (Pubblico)
            </CardTitle>
            <CardDescription>
              Attiva/disattiva i format visibili agli utenti. Quando disattivato, 
              gli utenti vedranno una pagina informativa invece del contenuto live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveFormatsCard />
          </CardContent>
        </Card>
      )}

      {/* Section 2: Serata Live con PIN */}
      {canManageSerata && (access.openmic || access.dediche) && (
        <Card className="border-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="w-5 h-5 text-emerald-400" />
              Serata Live con PIN
              {isOwner && <Lock className="w-4 h-4 text-warning ml-auto" />}
            </CardTitle>
            <CardDescription>
              Attiva la modalità serata live e proteggi l'accesso con un PIN. 
              Il badge "Live" apparirà nell'app quando attivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UnifiedLiveSessionCard title="Serata Live" />
          </CardContent>
        </Card>
      )}

      {/* Section 3: Configurazione Monitoraggio */}
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

      {/* Info Box */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong>Differenza tra le sezioni:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Format Attivi:</strong> Controlla se gli utenti possono accedere al format</li>
            <li><strong>Serata Live:</strong> Attiva il badge "Live" e opzionalmente richiede il PIN</li>
            <li><strong>Monitoraggio:</strong> Scegli cosa vedere nel tuo Centro admin</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

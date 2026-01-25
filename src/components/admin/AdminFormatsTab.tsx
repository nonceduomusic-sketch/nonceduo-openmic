import React from 'react';
import {
  Zap,
  Radio,
  Lock,
  Info,
  Bell,
  Power,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QuickFreeModeCard } from '@/components/admin/QuickFreeModeCard';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { LiveStatusCard } from '@/components/admin/LiveStatusCard';
import { PinProtectionCard } from '@/components/admin/PinProtectionCard';
import { AdminNotificationsCard } from '@/components/admin/AdminNotificationsCard';
import { useFormatPreferences } from '@/hooks/useFormatPreferences';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { useLiveEvent } from '@/hooks/useLiveEvent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdminFormatsTabProps {
  access?: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
  };
  isOwner?: boolean;
}

/**
 * Tab Formati riorganizzato:
 * 
 * SEZIONE 1: Stato Attuale (banner informativo)
 * SEZIONE 2: Serata Aperta (QuickFreeModeCard) - PRIORITÀ MASSIMA
 * SEZIONE 3: Controllo Dettagliato Formati (ActiveFormatsCard)
 * SEZIONE 4: Notifiche Admin (consolidate)
 * SEZIONE 5: Stato Evento Live (se presente)
 * 
 * Obiettivo: rendere immediatamente chiaro lo stato corrente
 * e fornire toggle rapidi per la gestione operativa.
 */
export const AdminFormatsTab: React.FC<AdminFormatsTabProps> = ({
  access = { openmic: true, dediche: true, community: true },
  isOwner = false,
}) => {
  const { preferences, loading: prefsLoading } = useFormatPreferences();
  const { permissions, isOwner: hookIsOwner, loading: permsLoading } = useCentroPermissions();
  const { liveEvent, isFreeMode, freeMode } = useLiveEvent();
  
  // Permissions derived from hook
  const canManageActive = hookIsOwner || permissions.activeFormats;
  const canManageSerata = hookIsOwner || permissions.serataLive;

  if (prefsLoading || permsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasLiveEvent = Boolean(liveEvent);
  const hasAnyActive = freeMode.openmic || freeMode.dediche || hasLiveEvent;

  return (
    <div className="space-y-6 pb-6">
      {/* Header con stato corrente */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              hasLiveEvent 
                ? "bg-primary/20 text-primary" 
                : isFreeMode 
                  ? "bg-accent/20 text-accent"
                  : "bg-muted text-muted-foreground"
            )}>
              {hasLiveEvent ? (
                <Radio className="w-5 h-5 animate-pulse" />
              ) : isFreeMode ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Power className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">Formati e Controlli</h2>
              <p className="text-sm text-muted-foreground">
                {hasLiveEvent 
                  ? `Evento "${liveEvent?.event_name}" in corso`
                  : isFreeMode 
                    ? 'Serata Aperta attiva'
                    : 'Nessuna serata attiva'}
              </p>
            </div>
          </div>
          
          {/* Badge stato */}
          <div className="flex gap-2">
            {hasLiveEvent && (
              <Badge className="bg-primary text-primary-foreground animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            )}
            {isFreeMode && !hasLiveEvent && (
              <Badge className="bg-accent text-accent-foreground">
                <Zap className="w-3 h-3 mr-1" />
                Serata Aperta
              </Badge>
            )}
            {!hasAnyActive && !hasLiveEvent && (
              <Badge variant="secondary">
                <Power className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* SEZIONE 1: Serata Aperta - SEMPRE VISIBILE E IN PRIMO PIANO */}
      {canManageActive && (access.openmic || access.dediche) && (
        <QuickFreeModeCard />
      )}

      {/* SEZIONE 2: Controllo Dettagliato Formati */}
      {canManageActive && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="w-4 h-4 text-muted-foreground" />
              Controllo Dettagliato
            </CardTitle>
            <CardDescription className="text-xs">
              Attiva/disattiva singoli formati. Include anche la Community.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ActiveFormatsCard />
          </CardContent>
        </Card>
      )}

      {/* SEZIONE 3: Notifiche Admin */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-blue-500" />
            Notifiche
          </CardTitle>
          <CardDescription className="text-xs">
            Browser, suoni, vibrazione e push background
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <AdminNotificationsCard />
        </CardContent>
      </Card>

      {/* SEZIONE 4: Stato Evento Live (se presente) */}
      {canManageSerata && hasLiveEvent && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="w-4 h-4 text-primary animate-pulse" />
              Evento in Corso
              {isOwner && <Lock className="w-3 h-3 text-warning ml-auto" />}
            </CardTitle>
            <CardDescription className="text-xs">
              I formati sono controllati dalle regole dell'evento attivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <LiveStatusCard title="" />
            <PinProtectionCard title="" />
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <strong>Come funziona:</strong>
          <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
            <li><strong>Serata Aperta:</strong> Attiva i formati senza limiti</li>
            <li><strong>Evento LIVE:</strong> Usa limiti, timer e PIN configurati</li>
            <li><strong>Notifiche:</strong> Ricevi avvisi in tempo reale</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

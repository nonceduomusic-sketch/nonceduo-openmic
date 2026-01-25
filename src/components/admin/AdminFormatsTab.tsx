import React from 'react';
import {
  Zap,
  Radio,
  Info,
  Bell,
  Power,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QuickFreeModeCard } from '@/components/admin/QuickFreeModeCard';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
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
 * Tab Formati semplificato:
 * 
 * 1. Evento Live (QuickFreeModeCard) - Toggle rapido
 * 2. Controllo Dettagliato (ActiveFormatsCard) - Toggle singoli
 * 3. Notifiche Admin - Impostazioni avvisi
 * 
 * La gestione PIN e Evento programmato è delegata al tab "Evento".
 */
export const AdminFormatsTab: React.FC<AdminFormatsTabProps> = ({
  access = { openmic: true, dediche: true, community: true },
  isOwner = false,
}) => {
  const { preferences, loading: prefsLoading } = useFormatPreferences();
  const { permissions, isOwner: hookIsOwner, loading: permsLoading } = useCentroPermissions();
  const { liveEvent, isFreeMode, freeMode } = useLiveEvent();
  
  const canManageActive = hookIsOwner || permissions.activeFormats;

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
            <h2 className="text-xl font-bold">Formati</h2>
            <p className="text-sm text-muted-foreground">
              {hasLiveEvent 
                ? `Evento "${liveEvent?.event_name}" attivo`
                : isFreeMode 
                  ? 'Evento Live'
                  : 'Offline'}
            </p>
          </div>
        </div>
        
        {/* Badge stato */}
        {hasLiveEvent && (
          <Badge className="bg-primary text-primary-foreground animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        )}
        {isFreeMode && !hasLiveEvent && (
          <Badge className="bg-accent text-accent-foreground">
            <Zap className="w-3 h-3 mr-1" />
            Live
          </Badge>
        )}
        {!hasAnyActive && (
          <Badge variant="secondary">Offline</Badge>
        )}
      </div>

      {/* Evento Live - Toggle rapido */}
      {canManageActive && (access.openmic || access.dediche) && (
        <QuickFreeModeCard />
      )}

      {/* Controllo Dettagliato */}
      {canManageActive && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="w-4 h-4 text-muted-foreground" />
              Controllo Singoli
            </CardTitle>
            <CardDescription className="text-xs">
              Attiva/disattiva i formati individualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ActiveFormatsCard />
          </CardContent>
        </Card>
      )}

      {/* Notifiche Admin */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-blue-500" />
            Notifiche
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AdminNotificationsCard />
        </CardContent>
      </Card>

      {/* Info rapida */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <strong>Evento Live</strong> attiva i formati senza limiti. 
          Per eventi programmati con timer, limiti e PIN usa il tab <strong>Evento</strong>.
        </AlertDescription>
      </Alert>
    </div>
  );
};

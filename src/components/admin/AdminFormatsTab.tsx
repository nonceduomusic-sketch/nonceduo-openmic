import React from 'react';
import {
  Zap,
  Calendar,
  Info,
  Bell,
  Power,
  Settings2,
  Trophy,
  Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FreeModeControlPanel } from '@/components/admin/FreeModeControlPanel';
import { EventControlPanel } from '@/components/admin/EventControlPanel';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { AdminNotificationsCard } from '@/components/admin/AdminNotificationsCard';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { useLiveEvent } from '@/hooks/useLiveEvent';
import { useFreeModeActive } from '@/hooks/useFreeModeSettings';
import { useGlobalFormatSettings } from '@/hooks/useGlobalFormatSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminFormatsTabProps {
  access?: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
  };
  isOwner?: boolean;
  onNavigateToEvent?: () => void;
}

/**
 * Tab Formati riorganizzato:
 * 
 * 1. Evento Libero (FreeModeControlPanel) - Tutti i controlli per eventi live istantanei
 * 2. Evento Programmato (EventControlPanel) - Panoramica eventi programmati
 * 3. Controlli Globali (ActiveFormatsCard) - Toggle generali
 * 4. Notifiche Admin
 */
export const AdminFormatsTab: React.FC<AdminFormatsTabProps> = ({
  access = { openmic: true, dediche: true, community: true },
  isOwner = false,
  onNavigateToEvent,
}) => {
  const { permissions, isOwner: hookIsOwner, loading: permsLoading } = useCentroPermissions();
  const { liveEvent } = useLiveEvent();
  const { isActive: isFreeModeActive, settings: freeModeSettings } = useFreeModeActive();
  const { settings: globalSettings, toggleFormat: toggleGlobalFormat, loading: globalLoading } = useGlobalFormatSettings();
  const isMobile = useIsMobile();
  
  const canManageActive = hookIsOwner || permissions.activeFormats;

  if (permsLoading || globalLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasLiveEvent = Boolean(liveEvent);
  const hasAnyActive = isFreeModeActive || hasLiveEvent;

  // Determine current status
  const getCurrentStatus = () => {
    if (hasLiveEvent) {
      return { type: 'event', label: `Evento "${liveEvent?.event_name}"`, color: 'primary' };
    }
    if (isFreeModeActive) {
      return { type: 'freemode', label: 'Evento Libero', color: 'green' };
    }
    return { type: 'offline', label: 'Nessun evento attivo', color: 'muted' };
  };

  const status = getCurrentStatus();

  return (
    <div className="space-y-6 pb-6">
      {/* Header con stato corrente */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            status.type === 'event' && "bg-primary/20 text-primary",
            status.type === 'freemode' && "bg-green-500/20 text-green-500",
            status.type === 'offline' && "bg-muted text-muted-foreground"
          )}>
            {status.type === 'event' ? (
              <Calendar className="w-5 h-5" />
            ) : status.type === 'freemode' ? (
              <Zap className="w-5 h-5 animate-pulse" />
            ) : (
              <Power className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">Gestione Formati</h2>
            <p className="text-sm text-muted-foreground">{status.label}</p>
          </div>
        </div>
        
        {/* Badge stato */}
        {status.type === 'event' && (
          <Badge className="bg-primary text-primary-foreground animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        )}
        {status.type === 'freemode' && (
          <Badge className="bg-green-500 text-white animate-pulse">
            <Zap className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        )}
        {status.type === 'offline' && (
          <Badge variant="secondary">Offline</Badge>
        )}
      </div>

      {/* Main content - Tabs for mobile, Grid for desktop */}
      {canManageActive && (
        <>
          {isMobile ? (
            <Tabs defaultValue="freemode" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="freemode" className="flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5" />
                  Libero
                </TabsTrigger>
                <TabsTrigger value="event" className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  Evento
                </TabsTrigger>
                <TabsTrigger value="global" className="flex items-center gap-1.5 text-xs">
                  <Settings2 className="w-3.5 h-3.5" />
                  Globali
                </TabsTrigger>
              </TabsList>

              <TabsContent value="freemode" className="mt-0">
                <FreeModeControlPanel />
              </TabsContent>

              <TabsContent value="event" className="mt-0">
                <EventControlPanel onOpenEventConfig={onNavigateToEvent} />
              </TabsContent>

              <TabsContent value="global" className="mt-0 space-y-4">
                <ActiveFormatsCard />
                
                {/* Voting Toggle */}
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      Votazioni Pubblico
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Permetti al pubblico di votare le performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="voting-toggle-mobile" className="text-sm">
                          {globalSettings.voting ? 'Attive' : 'Disattivate'}
                        </Label>
                        {globalSettings.voting && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                            👍 🔥 ❤️
                          </Badge>
                        )}
                      </div>
                      <Switch
                        id="voting-toggle-mobile"
                        checked={globalSettings.voting}
                        onCheckedChange={() => toggleGlobalFormat('voting')}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* Desktop: Grid layout */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <FreeModeControlPanel />
              <EventControlPanel onOpenEventConfig={onNavigateToEvent} />
              <div className="space-y-4">
                <ActiveFormatsCard />
                
                {/* Voting Toggle */}
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      Votazioni Pubblico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="voting-toggle" className="text-sm">
                        {globalSettings.voting ? 'Attive' : 'Disattivate'}
                      </Label>
                      <Switch
                        id="voting-toggle"
                        checked={globalSettings.voting}
                        onCheckedChange={() => toggleGlobalFormat('voting')}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Notifiche Admin */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-secondary-foreground" />
            Notifiche Admin
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
          <ul className="space-y-1 mt-1">
            <li><strong>Evento Libero:</strong> Attiva formati con controlli opzionali (limiti, tempo, PIN) modificabili durante l'evento</li>
            <li><strong>Evento Programmato:</strong> Gestisci eventi con data, orario, finestre di prenotazione e riaperture nel tab Evento</li>
            <li><strong>Formati Globali:</strong> Disattiva completamente un formato per tutto il sistema</li>
          </ul>
          <p className="mt-2 text-muted-foreground/70">
            ⚠️ Gli Eventi Programmati hanno priorità sugli Eventi Liberi
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

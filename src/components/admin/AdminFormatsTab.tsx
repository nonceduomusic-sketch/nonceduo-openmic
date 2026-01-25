import React from 'react';
import { Power, Trophy, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { AdminNotificationsCard } from '@/components/admin/AdminNotificationsCard';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { useGlobalFormatSettings } from '@/hooks/useGlobalFormatSettings';

/**
 * Tab Formati Semplificato:
 * 
 * 1. Formati Pubblici - Toggle ON/OFF per i formati
 * 2. Votazioni Pubblico - Toggle per abilitare/disabilitare voti
 * 3. Notifiche Admin - Configurazione notifiche push
 */
export const AdminFormatsTab: React.FC = () => {
  const { permissions, isOwner: hookIsOwner, loading: permsLoading } = useCentroPermissions();
  const { settings: globalSettings, toggleFormat: toggleGlobalFormat, loading: globalLoading } = useGlobalFormatSettings();
  
  const canManageActive = hookIsOwner || permissions.activeFormats;

  if (permsLoading || globalLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Power className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Formati & Notifiche</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci visibilità formati e notifiche admin
          </p>
        </div>
      </div>

      {canManageActive && (
        <div className="space-y-4">
          {/* Formati Pubblici */}
          <ActiveFormatsCard />
          
          {/* Votazioni Pubblico */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-amber-500" />
                Votazioni Pubblico
              </CardTitle>
              <CardDescription className="text-xs">
                Permetti al pubblico di votare le performance con 🔥 e ❤️
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="voting-toggle" className="text-sm">
                    {globalSettings.voting ? 'Attive' : 'Disattivate'}
                  </Label>
                  {globalSettings.voting && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                      👍 🔥 ❤️
                    </Badge>
                  )}
                </div>
                <Switch
                  id="voting-toggle"
                  checked={globalSettings.voting}
                  onCheckedChange={() => toggleGlobalFormat('voting')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifiche Admin */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Notifiche Admin
          </CardTitle>
          <CardDescription className="text-xs">
            Ricevi avvisi push per nuove prenotazioni e messaggi
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <AdminNotificationsCard />
        </CardContent>
      </Card>

      {/* Info */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <ul className="space-y-1 mt-1">
            <li><strong>Formati Pubblici:</strong> Disattiva completamente un formato per tutto il sistema</li>
            <li><strong>Votazioni:</strong> Quando attive, il pubblico può votare le performance in tempo reale</li>
            <li><strong>Notifiche:</strong> Ricevi alert push sulle nuove prenotazioni e messaggi</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

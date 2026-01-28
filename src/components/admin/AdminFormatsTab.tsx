import React from 'react';
import { Power, Trophy, Info, Users, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdminNotificationsCard } from '@/components/admin/AdminNotificationsCard';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { useGlobalFormatSettings } from '@/hooks/useGlobalFormatSettings';

/**
 * Tab Formati Semplificato (senza conflitto con Eventi):
 * 
 * 1. Votazioni Pubblico - Toggle globale per abilitare/disabilitare voti
 * 2. Community - Toggle globale per abilitare/disabilitare la community
 * 3. Notifiche Admin - Configurazione notifiche push
 * 
 * NOTA: Open Mic e Dediche sono gestiti SOLO tramite Eventi (Programmato o Libero)
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
            Gestisci votazioni, community e notifiche admin
          </p>
        </div>
      </div>

      {canManageActive && (
        <div className="space-y-4">
          {/* Votazioni Pubblico */}
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-warning" />
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
                    <Badge variant="outline" className="text-warning border-warning/30 text-xs">
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

          {/* Mostra Nome Prenotante */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-blue-500" />
                Mostra Nome Prenotante
              </CardTitle>
              <CardDescription className="text-xs">
                Visualizza il nome di chi prenota nella Scaletta Live pubblica
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="booker-name-toggle" className="text-sm">
                    {globalSettings.show_booker_name ? 'Visibile' : 'Nascosto'}
                  </Label>
                  {globalSettings.show_booker_name && (
                    <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-xs">
                      🎤 Nome
                    </Badge>
                  )}
                </div>
                <Switch
                  id="booker-name-toggle"
                  checked={globalSettings.show_booker_name}
                  onCheckedChange={() => toggleGlobalFormat('show_booker_name')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Community */}
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-accent" />
                Community
              </CardTitle>
              <CardDescription className="text-xs">
                Abilita o disabilita l'accesso alla sezione Community
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="community-toggle" className="text-sm">
                    {globalSettings.community ? 'Attiva' : 'Disattivata'}
                  </Label>
                </div>
                <Switch
                  id="community-toggle"
                  checked={globalSettings.community}
                  onCheckedChange={() => toggleGlobalFormat('community')}
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
            <li><strong>Open Mic e Dediche:</strong> Gestiti tramite tab <em>Eventi</em> (Programmato o Libero)</li>
            <li><strong>Votazioni:</strong> Toggle globale per permettere al pubblico di votare le performance</li>
            <li><strong>Community:</strong> Toggle globale per abilitare/disabilitare la sezione social</li>
            <li><strong>Notifiche:</strong> Ricevi alert push sulle nuove prenotazioni e messaggi</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

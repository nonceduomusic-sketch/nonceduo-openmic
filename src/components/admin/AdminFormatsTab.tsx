import React from 'react';
import { Power, Trophy, Info, Users, User, ListMusic, ZoomIn, ArrowUpDown, Play, Calendar, Eye, Gamepad2, Globe, Mic2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AdminNotificationsCard } from '@/components/admin/AdminNotificationsCard';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { useGlobalFormatSettings } from '@/hooks/useGlobalFormatSettings';
import { useGameConfigs, useToggleGameConfig } from '@/hooks/useGames';

/**
 * Tab Formati Semplificato (senza conflitto con Eventi):
 * 
 * 1. Mostra Scaletta Live - Toggle per mostrare/nascondere la scaletta agli utenti
 * 2. Votazioni Pubblico - Toggle globale per abilitare/disabilitare voti
 * 3. Community - Toggle globale per abilitare/disabilitare la community
 * 4. Notifiche Admin - Configurazione notifiche push
 * 
 * NOTA: Open Mic e Dediche sono gestiti SOLO tramite Eventi (Programmato o Libero)
 */
export const AdminFormatsTab: React.FC = () => {
  const { permissions, isOwner: hookIsOwner, loading: permsLoading } = useCentroPermissions();
  const { settings: globalSettings, toggleFormat: toggleGlobalFormat, loading: globalLoading } = useGlobalFormatSettings();
  const { data: gameConfigs, isLoading: gamesLoading } = useGameConfigs();
  const toggleGameConfig = useToggleGameConfig();
  
  const canManageActive = hookIsOwner || permissions.activeFormats;

  if (permsLoading || globalLoading || gamesLoading) {
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
          {/* ===== VISIBILITÀ SUL SITO ===== */}
          <Separator className="my-2" />
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Visibilità Sezioni sul Sito</h3>
          </div>
          <Alert className="bg-muted/20 border-muted-foreground/10 mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Disattivando una sezione qui, il riquadro corrispondente <strong>scomparirà</strong> dalla homepage, dall'App Launcher e dalle pagine pubbliche.
            </AlertDescription>
          </Alert>

          {/* Open Mic */}
          <Card className="border-secondary/20 bg-secondary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic2 className="w-4 h-4 text-secondary" />
                Open Mic
              </CardTitle>
              <CardDescription className="text-xs">
                Mostra o nascondi la sezione Open Mic dal sito e dalle pagine pubbliche
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="openmic-site-toggle" className="text-sm">
                    {globalSettings.openmic ? 'Visibile sul sito' : 'Nascosto dal sito'}
                  </Label>
                  {globalSettings.openmic && (
                    <Badge variant="outline" className="text-secondary border-secondary/30 text-xs">
                      🎤 Pubblico
                    </Badge>
                  )}
                </div>
                <Switch
                  id="openmic-site-toggle"
                  checked={globalSettings.openmic}
                  onCheckedChange={() => toggleGlobalFormat('openmic')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dediche */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-4 h-4 text-primary" />
                Dediche
              </CardTitle>
              <CardDescription className="text-xs">
                Mostra o nascondi la sezione Dediche dal sito e dalle pagine pubbliche
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dediche-site-toggle" className="text-sm">
                    {globalSettings.dediche ? 'Visibile sul sito' : 'Nascoste dal sito'}
                  </Label>
                  {globalSettings.dediche && (
                    <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                      💌 Pubblico
                    </Badge>
                  )}
                </div>
                <Switch
                  id="dediche-site-toggle"
                  checked={globalSettings.dediche}
                  onCheckedChange={() => toggleGlobalFormat('dediche')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Giochi (Furore) */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gamepad2 className="w-4 h-4 text-emerald-500" />
                Non C'è Furore (Giochi)
              </CardTitle>
              <CardDescription className="text-xs">
                Mostra o nascondi la sezione Giochi dal sito, homepage e app
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="giochi-site-toggle" className="text-sm">
                    {globalSettings.giochi ? 'Visibile sul sito' : 'Nascosto dal sito'}
                  </Label>
                  {globalSettings.giochi && (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs">
                      🎮 Pubblico
                    </Badge>
                  )}
                </div>
                <Switch
                  id="giochi-site-toggle"
                  checked={globalSettings.giochi}
                  onCheckedChange={() => toggleGlobalFormat('giochi')}
                />
              </div>

              {/* Per-game toggles */}
              {globalSettings.giochi && gameConfigs && gameConfigs.length > 0 && (
                <div className="border-t border-emerald-500/10 pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Giochi visibili agli utenti:
                  </p>
                  {gameConfigs.map((game) => (
                    <div key={game.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{game.game_icon}</span>
                        <span className="text-sm font-medium">{game.game_name}</span>
                      </div>
                      <Switch
                        checked={game.is_enabled}
                        onCheckedChange={() => toggleGameConfig.mutate({ id: game.id, is_enabled: !game.is_enabled })}
                        className="scale-90"
                      />
                    </div>
                  ))}
                </div>
              )}
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
                Mostra o nascondi la sezione Community dal sito e dalle pagine pubbliche
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="community-site-toggle" className="text-sm">
                    {globalSettings.community ? 'Visibile sul sito' : 'Nascosta dal sito'}
                  </Label>
                  {globalSettings.community && (
                    <Badge variant="outline" className="text-accent border-accent/30 text-xs">
                      👥 Pubblica
                    </Badge>
                  )}
                </div>
                <Switch
                  id="community-site-toggle"
                  checked={globalSettings.community}
                  onCheckedChange={() => toggleGlobalFormat('community')}
                />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {/* ===== FUNZIONALITÀ LIVE ===== */}
          {/* Mostra Scaletta Live */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListMusic className="w-4 h-4 text-primary" />
                Mostra Scaletta Live
              </CardTitle>
              <CardDescription className="text-xs">
                Rendi visibile agli utenti l'ordine delle canzoni in coda
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="queue-toggle" className="text-sm">
                    {globalSettings.show_live_queue ? 'Visibile' : 'Nascosta'}
                  </Label>
                  {globalSettings.show_live_queue && (
                    <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                      📋 Pubblica
                    </Badge>
                  )}
                </div>
                <Switch
                  id="queue-toggle"
                  checked={globalSettings.show_live_queue}
                  onCheckedChange={() => toggleGlobalFormat('show_live_queue')}
                />
              </div>
            </CardContent>
          </Card>

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

          {/* Community toggle removed from here - now in Visibilità Sezioni section above */}

          {/* Separator for Lyrics section */}
          <Separator className="my-6" />
          
          <div className="flex items-center gap-2 mb-4">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Impostazioni Pagina Testi</h3>
          </div>

          {/* Lyrics Zoom Controls */}
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ZoomIn className="w-4 h-4 text-violet-500" />
                Zoom Testi (+ / -)
              </CardTitle>
              <CardDescription className="text-xs">
                Mostra i pulsanti per ingrandire/rimpicciolire il testo nella pagina testi
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="lyrics-zoom-toggle" className="text-sm">
                    {globalSettings.lyrics_zoom ? 'Visibili' : 'Nascosti'}
                  </Label>
                  {globalSettings.lyrics_zoom && (
                    <Badge variant="outline" className="text-violet-500 border-violet-500/30 text-xs">
                      🔍 Attivo
                    </Badge>
                  )}
                </div>
                <Switch
                  id="lyrics-zoom-toggle"
                  checked={globalSettings.lyrics_zoom}
                  onCheckedChange={() => toggleGlobalFormat('lyrics_zoom')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lyrics Highlight Arrows */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpDown className="w-4 h-4 text-amber-500" />
                Evidenziatore Testi (↑ ↓)
              </CardTitle>
              <CardDescription className="text-xs">
                Mostra frecce per evidenziare manualmente le righe del testo (stile karaoke)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="lyrics-highlight-toggle" className="text-sm">
                    {globalSettings.lyrics_highlight_arrows ? 'Visibili' : 'Nascosti'}
                  </Label>
                  {globalSettings.lyrics_highlight_arrows && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                      🎤 Karaoke
                    </Badge>
                  )}
                </div>
                <Switch
                  id="lyrics-highlight-toggle"
                  checked={globalSettings.lyrics_highlight_arrows}
                  onCheckedChange={() => toggleGlobalFormat('lyrics_highlight_arrows')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-scroll Testi */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="w-4 h-4 text-emerald-500" />
                Auto-Scroll Testi
              </CardTitle>
              <CardDescription className="text-xs">
                Mostra pulsante per scorrimento automatico del testo con velocità regolabile
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="lyrics-autoscroll-toggle" className="text-sm">
                    {globalSettings.lyrics_auto_scroll ? 'Visibile' : 'Nascosto'}
                  </Label>
                  {globalSettings.lyrics_auto_scroll && (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs">
                      ▶️ Play
                    </Badge>
                  )}
                </div>
                <Switch
                  id="lyrics-autoscroll-toggle"
                  checked={globalSettings.lyrics_auto_scroll}
                  onCheckedChange={() => toggleGlobalFormat('lyrics_auto_scroll')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Separator for Preview section */}
          <Separator className="my-6" />
          
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Anteprima Pubblica</h3>
          </div>

          {/* Mostra Eventi in Programma */}
          <Card className="border-cyan-500/20 bg-cyan-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-cyan-500" />
                Mostra Eventi in Programma
              </CardTitle>
              <CardDescription className="text-xs">
                Nella pagina anteprima catalogo, mostra gli eventi programmati con data e ora
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="upcoming-events-toggle" className="text-sm">
                    {globalSettings.show_upcoming_events ? 'Visibili' : 'Nascosti'}
                  </Label>
                  {globalSettings.show_upcoming_events && (
                    <Badge variant="outline" className="text-cyan-500 border-cyan-500/30 text-xs">
                      📅 Pubblico
                    </Badge>
                  )}
                </div>
                <Switch
                  id="upcoming-events-toggle"
                  checked={globalSettings.show_upcoming_events}
                  onCheckedChange={() => toggleGlobalFormat('show_upcoming_events')}
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
            <li><strong>Scaletta Live:</strong> Se visibile, gli utenti vedono l'ordine delle canzoni in coda</li>
            <li><strong>Votazioni:</strong> Toggle globale per permettere al pubblico di votare le performance</li>
            <li><strong>Community:</strong> Toggle globale per abilitare/disabilitare la sezione social</li>
            <li><strong>Notifiche:</strong> Ricevi alert push sulle nuove prenotazioni e messaggi</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, Music, MessageSquare, ThumbsUp, Clock, Hash, 
  Lock, Play, Square, Settings2, RefreshCw, AlertTriangle,
  Calendar, Timer, RotateCcw, X, Check, Edit2
} from 'lucide-react';
import { useFreeModeSettings } from '@/hooks/useFreeModeSettings';
import { cn } from '@/lib/utils';

export const FreeModeFullPanel: React.FC = () => {
  const { 
    settings, 
    loading, 
    activateFreeMode, 
    deactivateFreeMode,
    updateLiveSettings,
    activateReopen,
    deactivateReopen,
    resetCounters,
    generatePin,
    getTimeRemaining,
    getReopenTimeRemaining,
  } = useFreeModeSettings();

  // Setup config state
  const [config, setConfig] = useState({
    eventName: 'Evento Libero',
    openmic: true,
    dediche: true,
    voting: true,
    maxSongs: '',
    maxDediche: '',
    durationMinutes: '',
    pinCode: '',
    closureMode: 'overlay',
    closureTitle: 'Prenotazioni chiuse',
    closureMessage: 'Grazie per aver partecipato!',
  });

  // Live editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [liveEdit, setLiveEdit] = useState({
    eventName: '',
    maxSongs: '',
    maxDediche: '',
    durationMinutes: '',
    pinCode: '',
    closureTitle: '',
    closureMessage: '',
  });

  // Reopen config state
  const [reopenConfig, setReopenConfig] = useState({
    mode: 'time' as 'time' | 'count' | 'combo',
    minutes: '30',
    extraSongs: '5',
    extraDediche: '3',
    message: 'Riapertura straordinaria!',
  });

  const [showReopen, setShowReopen] = useState(false);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isActive = settings?.is_active;
  const timeRemaining = getTimeRemaining();
  const reopenTimeRemaining = getReopenTimeRemaining();

  const handleActivate = async () => {
    await activateFreeMode({
      eventName: config.eventName,
      openmic: config.openmic,
      dediche: config.dediche,
      voting: config.voting,
      maxSongs: config.maxSongs ? parseInt(config.maxSongs) : undefined,
      maxDediche: config.maxDediche ? parseInt(config.maxDediche) : undefined,
      durationMinutes: config.durationMinutes ? parseInt(config.durationMinutes) : undefined,
      pinCode: config.pinCode || undefined,
      closureMode: config.closureMode,
      closureTitle: config.closureTitle,
      closureMessage: config.closureMessage,
    });
  };

  const handleGeneratePin = () => {
    setConfig(prev => ({ ...prev, pinCode: generatePin() }));
  };

  const handleGenerateLivePin = () => {
    setLiveEdit(prev => ({ ...prev, pinCode: generatePin() }));
  };

  const startEditSection = (section: string) => {
    if (!settings) return;
    setLiveEdit({
      eventName: settings.event_name || '',
      maxSongs: settings.openmic_max_songs?.toString() || '',
      maxDediche: settings.dediche_max_total?.toString() || '',
      durationMinutes: settings.duration_minutes?.toString() || '',
      pinCode: settings.pin_code || '',
      closureTitle: settings.closure_title || '',
      closureMessage: settings.closure_message || '',
    });
    setEditingSection(section);
  };

  const cancelEdit = () => {
    setEditingSection(null);
  };

  const saveEdit = async (section: string) => {
    const updates: Record<string, unknown> = {};
    
    switch (section) {
      case 'name':
        updates.eventName = liveEdit.eventName;
        break;
      case 'limits':
        updates.maxSongs = liveEdit.maxSongs ? parseInt(liveEdit.maxSongs) : null;
        updates.maxDediche = liveEdit.maxDediche ? parseInt(liveEdit.maxDediche) : null;
        break;
      case 'duration':
        updates.durationMinutes = liveEdit.durationMinutes ? parseInt(liveEdit.durationMinutes) : null;
        break;
      case 'pin':
        updates.pinCode = liveEdit.pinCode || null;
        break;
      case 'closure':
        updates.closureTitle = liveEdit.closureTitle;
        updates.closureMessage = liveEdit.closureMessage;
        break;
    }
    
    await updateLiveSettings(updates);
    setEditingSection(null);
  };

  const handleLiveToggle = async (key: 'openmic' | 'dediche' | 'voting', value: boolean) => {
    await updateLiveSettings({ [key]: value });
  };

  const handleActivateReopen = async () => {
    await activateReopen({
      mode: reopenConfig.mode,
      minutes: reopenConfig.minutes ? parseInt(reopenConfig.minutes) : undefined,
      extraSongs: reopenConfig.extraSongs ? parseInt(reopenConfig.extraSongs) : undefined,
      extraDediche: reopenConfig.extraDediche ? parseInt(reopenConfig.extraDediche) : undefined,
      message: reopenConfig.message,
    });
    setShowReopen(false);
  };

  // ========== INACTIVE STATE: Setup Form ==========
  if (!isActive) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-muted-foreground" />
            Nuovo Evento Libero
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="base" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="base">Base</TabsTrigger>
              <TabsTrigger value="limits">Limiti</TabsTrigger>
              <TabsTrigger value="closure">Chiusura</TabsTrigger>
            </TabsList>

            <TabsContent value="base" className="space-y-4">
              {/* Nome Evento */}
              <div className="space-y-2">
                <Label>Nome Evento</Label>
                <Input
                  value={config.eventName}
                  onChange={(e) => setConfig(c => ({ ...c, eventName: e.target.value }))}
                  placeholder="Evento Libero"
                />
              </div>

              {/* Format toggles */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Formati attivi</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="text-sm">Open Mic</span>
                    </div>
                    <Switch
                      checked={config.openmic}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, openmic: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-pink-500" />
                      <span className="text-sm">Dediche</span>
                    </div>
                    <Switch
                      checked={config.dediche}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, dediche: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Votazioni</span>
                    </div>
                    <Switch
                      checked={config.voting}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, voting: v }))}
                    />
                  </div>
                </div>
              </div>

              {/* PIN Protection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PIN di Accesso
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={config.pinCode}
                    onChange={(e) => setConfig(c => ({ ...c, pinCode: e.target.value }))}
                    placeholder="Opzionale"
                    className="font-mono"
                    maxLength={6}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleGeneratePin}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              {/* Durata */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Durata (minuti)
                </Label>
                <Input
                  type="number"
                  value={config.durationMinutes}
                  onChange={(e) => setConfig(c => ({ ...c, durationMinutes: e.target.value }))}
                  placeholder="Illimitato"
                />
              </div>

              {/* Limiti numerici */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Max Canzoni
                  </Label>
                  <Input
                    type="number"
                    value={config.maxSongs}
                    onChange={(e) => setConfig(c => ({ ...c, maxSongs: e.target.value }))}
                    placeholder="∞"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Max Dediche
                  </Label>
                  <Input
                    type="number"
                    value={config.maxDediche}
                    onChange={(e) => setConfig(c => ({ ...c, maxDediche: e.target.value }))}
                    placeholder="∞"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="closure" className="space-y-4">
              <div className="space-y-2">
                <Label>Titolo Chiusura</Label>
                <Input
                  value={config.closureTitle}
                  onChange={(e) => setConfig(c => ({ ...c, closureTitle: e.target.value }))}
                  placeholder="Prenotazioni chiuse"
                />
              </div>
              <div className="space-y-2">
                <Label>Messaggio Chiusura</Label>
                <Textarea
                  value={config.closureMessage}
                  onChange={(e) => setConfig(c => ({ ...c, closureMessage: e.target.value }))}
                  placeholder="Grazie per aver partecipato!"
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleActivate}>
            <Play className="w-4 h-4 mr-2" />
            Avvia Evento Libero
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ========== ACTIVE STATE: Live Control Panel ==========
  return (
    <Card className={cn(
      "glass-card overflow-hidden transition-all duration-300",
      "ring-2 ring-green-500/50 shadow-lg shadow-green-500/10"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-green-500" />
            {settings?.event_name || 'Evento Libero'}
          </CardTitle>
          <Badge variant="default" className="bg-green-500 animate-pulse">LIVE</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{settings?.openmic_current_count || 0}</div>
            <div className="text-xs text-muted-foreground">
              Canzoni {settings?.openmic_max_songs ? `/ ${settings.openmic_max_songs}` : ''}
            </div>
          </div>
          <div className="bg-pink-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{settings?.dediche_current_count || 0}</div>
            <div className="text-xs text-muted-foreground">
              Dediche {settings?.dediche_max_total ? `/ ${settings.dediche_max_total}` : ''}
            </div>
          </div>
        </div>

        {/* Time remaining */}
        {timeRemaining !== null && (
          <div className={cn(
            "flex items-center justify-center gap-2 rounded-lg p-2",
            timeRemaining > 0 ? "text-orange-500 bg-orange-500/10" : "text-red-500 bg-red-500/10"
          )}>
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {timeRemaining > 0 ? `${timeRemaining} min rimanenti` : 'Tempo scaduto!'}
            </span>
          </div>
        )}

        {/* PIN display */}
        {settings?.pin_enabled && settings?.pin_code && (
          <div className="flex items-center justify-center gap-2 bg-secondary/20 rounded-lg p-2">
            <Lock className="w-4 h-4" />
            <span className="font-mono font-bold tracking-widest">{settings.pin_code}</span>
          </div>
        )}

        {/* Reopen banner */}
        {settings?.reopen_active && (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <RotateCcw className="w-4 h-4" />
                <span className="font-medium">Riapertura Attiva</span>
              </div>
              <Button variant="ghost" size="sm" onClick={deactivateReopen}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {reopenTimeRemaining !== null && reopenTimeRemaining > 0 && (
              <div className="text-sm text-amber-600">
                Tempo: {reopenTimeRemaining} min
              </div>
            )}
            {(settings?.reopen_extra_songs || settings?.reopen_extra_dediche) && (
              <div className="text-sm text-amber-600">
                Extra: {settings.reopen_songs_used || 0}/{settings.reopen_extra_songs || 0} canzoni, 
                {settings.reopen_dediche_used || 0}/{settings.reopen_extra_dediche || 0} dediche
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Live Controls Tabs */}
        <Tabs defaultValue="controls" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="controls" className="text-xs">Controlli</TabsTrigger>
            <TabsTrigger value="edit" className="text-xs">Modifica</TabsTrigger>
            <TabsTrigger value="reopen" className="text-xs">Riapertura</TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="space-y-3">
            {/* Format toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="text-sm">Open Mic</span>
                </div>
                <Switch
                  checked={settings?.openmic_enabled}
                  onCheckedChange={(v) => handleLiveToggle('openmic', v)}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                  <span className="text-sm">Dediche</span>
                </div>
                <Switch
                  checked={settings?.dediche_enabled}
                  onCheckedChange={(v) => handleLiveToggle('dediche', v)}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Votazioni</span>
                </div>
                <Switch
                  checked={settings?.voting_enabled}
                  onCheckedChange={(v) => handleLiveToggle('voting', v)}
                />
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={resetCounters}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Contatori
            </Button>
          </TabsContent>

          <TabsContent value="edit" className="space-y-3">
            {/* Edit Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Nome Evento</Label>
                {editingSection !== 'name' ? (
                  <Button variant="ghost" size="sm" onClick={() => startEditSection('name')}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => saveEdit('name')}>
                      <Check className="w-3 h-3 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editingSection === 'name' ? (
                <Input
                  value={liveEdit.eventName}
                  onChange={(e) => setLiveEdit(c => ({ ...c, eventName: e.target.value }))}
                  className="h-8"
                />
              ) : (
                <div className="text-sm p-2 bg-muted/30 rounded">{settings?.event_name}</div>
              )}
            </div>

            {/* Edit Limits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Limiti</Label>
                {editingSection !== 'limits' ? (
                  <Button variant="ghost" size="sm" onClick={() => startEditSection('limits')}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => saveEdit('limits')}>
                      <Check className="w-3 h-3 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editingSection === 'limits' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={liveEdit.maxSongs}
                    onChange={(e) => setLiveEdit(c => ({ ...c, maxSongs: e.target.value }))}
                    placeholder="Max canzoni"
                    className="h-8"
                  />
                  <Input
                    type="number"
                    value={liveEdit.maxDediche}
                    onChange={(e) => setLiveEdit(c => ({ ...c, maxDediche: e.target.value }))}
                    placeholder="Max dediche"
                    className="h-8"
                  />
                </div>
              ) : (
                <div className="text-sm p-2 bg-muted/30 rounded">
                  Canzoni: {settings?.openmic_max_songs || '∞'} | Dediche: {settings?.dediche_max_total || '∞'}
                </div>
              )}
            </div>

            {/* Edit Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Durata (min)</Label>
                {editingSection !== 'duration' ? (
                  <Button variant="ghost" size="sm" onClick={() => startEditSection('duration')}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => saveEdit('duration')}>
                      <Check className="w-3 h-3 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editingSection === 'duration' ? (
                <Input
                  type="number"
                  value={liveEdit.durationMinutes}
                  onChange={(e) => setLiveEdit(c => ({ ...c, durationMinutes: e.target.value }))}
                  placeholder="Illimitato"
                  className="h-8"
                />
              ) : (
                <div className="text-sm p-2 bg-muted/30 rounded">
                  {settings?.duration_minutes ? `${settings.duration_minutes} min` : 'Illimitato'}
                </div>
              )}
            </div>

            {/* Edit PIN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">PIN</Label>
                {editingSection !== 'pin' ? (
                  <Button variant="ghost" size="sm" onClick={() => startEditSection('pin')}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => saveEdit('pin')}>
                      <Check className="w-3 h-3 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editingSection === 'pin' ? (
                <div className="flex gap-2">
                  <Input
                    value={liveEdit.pinCode}
                    onChange={(e) => setLiveEdit(c => ({ ...c, pinCode: e.target.value }))}
                    placeholder="Nessun PIN"
                    className="h-8 font-mono"
                    maxLength={6}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerateLivePin}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm p-2 bg-muted/30 rounded font-mono">
                  {settings?.pin_code || 'Nessun PIN'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reopen" className="space-y-3">
            {!settings?.reopen_active ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Modalità Riapertura</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['time', 'count', 'combo'] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={reopenConfig.mode === mode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReopenConfig(c => ({ ...c, mode }))}
                        className="text-xs"
                      >
                        {mode === 'time' && <Timer className="w-3 h-3 mr-1" />}
                        {mode === 'count' && <Hash className="w-3 h-3 mr-1" />}
                        {mode === 'combo' && <Zap className="w-3 h-3 mr-1" />}
                        {mode === 'time' ? 'Tempo' : mode === 'count' ? 'Conteggio' : 'Combo'}
                      </Button>
                    ))}
                  </div>
                </div>

                {(reopenConfig.mode === 'time' || reopenConfig.mode === 'combo') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Minuti</Label>
                    <Input
                      type="number"
                      value={reopenConfig.minutes}
                      onChange={(e) => setReopenConfig(c => ({ ...c, minutes: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                )}

                {(reopenConfig.mode === 'count' || reopenConfig.mode === 'combo') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Extra Canzoni</Label>
                      <Input
                        type="number"
                        value={reopenConfig.extraSongs}
                        onChange={(e) => setReopenConfig(c => ({ ...c, extraSongs: e.target.value }))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Extra Dediche</Label>
                      <Input
                        type="number"
                        value={reopenConfig.extraDediche}
                        onChange={(e) => setReopenConfig(c => ({ ...c, extraDediche: e.target.value }))}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Messaggio</Label>
                  <Input
                    value={reopenConfig.message}
                    onChange={(e) => setReopenConfig(c => ({ ...c, message: e.target.value }))}
                    placeholder="Riapertura straordinaria!"
                    className="h-8"
                  />
                </div>

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  size="sm"
                  onClick={handleActivateReopen}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Attiva Riapertura
                </Button>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm">Riapertura già attiva</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={deactivateReopen}
                >
                  Disattiva
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Stop button */}
        <Button variant="destructive" className="w-full" onClick={deactivateFreeMode}>
          <Square className="w-4 h-4 mr-2" />
          Termina Evento
        </Button>
      </CardContent>
    </Card>
  );
};

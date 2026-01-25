import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, Music, MessageSquare, ThumbsUp, Clock, Hash, 
  Lock, Play, Square, Settings2, RefreshCw 
} from 'lucide-react';
import { useFreeModeSettings } from '@/hooks/useFreeModeSettings';
import { cn } from '@/lib/utils';

export const FreeModeControlPanel: React.FC = () => {
  const { 
    settings, 
    loading, 
    activateFreeMode, 
    deactivateFreeMode,
    updateLiveSettings,
    resetCounters,
    generatePin,
    getTimeRemaining,
  } = useFreeModeSettings();

  // Local state for configuration
  const [config, setConfig] = useState({
    openmic: true,
    dediche: true,
    voting: true,
    maxSongs: '',
    maxDediche: '',
    durationMinutes: '',
    pinCode: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const handleActivate = async () => {
    await activateFreeMode({
      openmic: config.openmic,
      dediche: config.dediche,
      voting: config.voting,
      maxSongs: config.maxSongs ? parseInt(config.maxSongs) : undefined,
      maxDediche: config.maxDediche ? parseInt(config.maxDediche) : undefined,
      durationMinutes: config.durationMinutes ? parseInt(config.durationMinutes) : undefined,
      pinCode: config.pinCode || undefined,
    });
  };

  const handleGeneratePin = () => {
    setConfig(prev => ({ ...prev, pinCode: generatePin() }));
  };

  // Live settings update handlers
  const handleLiveToggle = async (key: 'openmic' | 'dediche' | 'voting', value: boolean) => {
    await updateLiveSettings({ [key]: value });
  };

  return (
    <Card className={cn(
      "glass-card overflow-hidden transition-all duration-300",
      isActive && "ring-2 ring-green-500/50 shadow-lg shadow-green-500/10"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className={cn("w-5 h-5", isActive ? "text-green-500" : "text-muted-foreground")} />
            Evento Libero
          </CardTitle>
          {isActive && (
            <Badge variant="default" className="bg-green-500 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status when active */}
        {isActive && settings && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{settings.openmic_current_count}</div>
                <div className="text-xs text-muted-foreground">
                  Canzoni {settings.openmic_max_songs ? `/ ${settings.openmic_max_songs}` : ''}
                </div>
              </div>
              <div className="bg-pink-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{settings.dediche_current_count}</div>
                <div className="text-xs text-muted-foreground">
                  Dediche {settings.dediche_max_total ? `/ ${settings.dediche_max_total}` : ''}
                </div>
              </div>
            </div>

            {/* Time remaining */}
            {timeRemaining !== null && (
              <div className="flex items-center justify-center gap-2 text-orange-500 bg-orange-500/10 rounded-lg p-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  {timeRemaining > 0 ? `${timeRemaining} min rimanenti` : 'Tempo scaduto!'}
                </span>
              </div>
            )}

            {/* PIN display */}
            {settings.pin_enabled && settings.pin_code && (
              <div className="flex items-center justify-center gap-2 bg-secondary/20 rounded-lg p-2">
                <Lock className="w-4 h-4" />
                <span className="font-mono font-bold tracking-widest">{settings.pin_code}</span>
              </div>
            )}

            <Separator />

            {/* Live controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Controlli Live
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-sm">Open Mic</span>
                  </div>
                  <Switch
                    checked={settings.openmic_enabled}
                    onCheckedChange={(v) => handleLiveToggle('openmic', v)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-pink-500" />
                    <span className="text-sm">Dediche</span>
                  </div>
                  <Switch
                    checked={settings.dediche_enabled}
                    onCheckedChange={(v) => handleLiveToggle('dediche', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Votazioni</span>
                  </div>
                  <Switch
                    checked={settings.voting_enabled}
                    onCheckedChange={(v) => handleLiveToggle('voting', v)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={resetCounters}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Contatori
              </Button>
            </div>

            <Separator />

            {/* Stop button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={deactivateFreeMode}
            >
              <Square className="w-4 h-4 mr-2" />
              Termina Evento
            </Button>
          </div>
        )}

        {/* Configuration when not active */}
        {!isActive && (
          <div className="space-y-4">
            {/* Quick toggles */}
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

            {/* Advanced options toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              {showAdvanced ? 'Nascondi opzioni' : 'Opzioni avanzate'}
            </Button>

            {showAdvanced && (
              <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
                {/* Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Max Canzoni
                    </Label>
                    <Input
                      type="number"
                      placeholder="Illimitato"
                      value={config.maxSongs}
                      onChange={(e) => setConfig(c => ({ ...c, maxSongs: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Max Dediche
                    </Label>
                    <Input
                      type="number"
                      placeholder="Illimitato"
                      value={config.maxDediche}
                      onChange={(e) => setConfig(c => ({ ...c, maxDediche: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Durata (minuti)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Illimitato"
                    value={config.durationMinutes}
                    onChange={(e) => setConfig(c => ({ ...c, durationMinutes: e.target.value }))}
                    className="h-8"
                  />
                </div>

                {/* PIN */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" /> PIN di accesso
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Opzionale"
                      value={config.pinCode}
                      onChange={(e) => setConfig(c => ({ ...c, pinCode: e.target.value }))}
                      className="h-8 font-mono"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePin}
                      className="h-8 px-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Start button */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleActivate}
            >
              <Play className="w-4 h-4 mr-2" />
              Avvia Evento Libero
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, Music, MessageSquare, Play, Square, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import { cn } from '@/lib/utils';
import type { EventBookingRules } from '@/hooks/useEventBookingRules';

interface Props {
  rules: EventBookingRules;
  onUpdate: (updates: Partial<EventBookingRules>) => Promise<boolean>;
}

export const EventReopenControl: React.FC<Props> = ({ rules, onUpdate }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state - modalità base
  const [reopenMode, setReopenMode] = useState<'time' | 'songs' | 'dediche' | 'combo'>('time');
  const [reopenMinutes, setReopenMinutes] = useState('5');
  
  // Form state - canzoni e dediche separati
  const [enableSongs, setEnableSongs] = useState(true);
  const [enableDediche, setEnableDediche] = useState(false);
  const [reopenSongs, setReopenSongs] = useState('3');
  const [reopenDediche, setReopenDediche] = useState('5');
  const [reopenMessage, setReopenMessage] = useState('🎉 A grande richiesta, riapriamo per pochi minuti!');
  
  // Countdown state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate time remaining for active reopen
  useEffect(() => {
    if (!rules.reopen_active || !rules.reopen_until) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const until = new Date(rules.reopen_until!).getTime();
      const remaining = Math.max(0, Math.floor((until - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rules.reopen_active, rules.reopen_until]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartReopen = async () => {
    setIsSaving(true);

    const updates: Partial<EventBookingRules> = {
      reopen_active: true,
      reopen_mode: reopenMode,
      reopen_message: reopenMessage || null,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    };

    if (reopenMode === 'time') {
      const minutes = parseInt(reopenMinutes) || 5;
      updates.reopen_until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      updates.reopen_extra_songs = null;
      updates.reopen_extra_dediche = null;
    } else if (reopenMode === 'songs') {
      updates.reopen_extra_songs = parseInt(reopenSongs) || 3;
      updates.reopen_until = null;
      updates.reopen_extra_dediche = null;
    } else if (reopenMode === 'dediche') {
      updates.reopen_extra_dediche = parseInt(reopenDediche) || 5;
      updates.reopen_until = null;
      updates.reopen_extra_songs = null;
    } else if (reopenMode === 'combo') {
      // Combo mode: both songs and dediche with individual limits
      updates.reopen_extra_songs = enableSongs ? (parseInt(reopenSongs) || 3) : null;
      updates.reopen_extra_dediche = enableDediche ? (parseInt(reopenDediche) || 5) : null;
      updates.reopen_until = null;
    }

    const success = await onUpdate(updates);

    if (success) {
      toast({
        title: 'Riapertura attivata! 🎉',
        description: 'Le prenotazioni straordinarie sono ora aperte',
      });
      await adminAuditLog({
        action: 'event.reopen_started',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { 
          mode: reopenMode, 
          message: reopenMessage,
          songs: reopenMode === 'combo' && enableSongs ? reopenSongs : undefined,
          dediche: reopenMode === 'combo' && enableDediche ? reopenDediche : undefined,
        },
      });
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile attivare la riapertura',
        variant: 'destructive',
      });
    }

    setIsSaving(false);
  };

  const handleStopReopen = async () => {
    setIsSaving(true);

    const updates: Partial<EventBookingRules> = {
      reopen_active: false,
      reopen_until: null,
      reopen_mode: null,
      reopen_extra_songs: null,
      reopen_extra_dediche: null,
      reopen_message: null,
    };

    const success = await onUpdate(updates);

    if (success) {
      toast({
        title: 'Riapertura terminata',
        description: 'Le prenotazioni straordinarie sono state chiuse',
      });
      await adminAuditLog({
        action: 'event.reopen_stopped',
        entity: 'event_booking_rules',
        entity_id: rules.id,
      });
    }

    setIsSaving(false);
  };

  // Check if reopen slots are exhausted
  const isSlotsExhausted = () => {
    if (rules.reopen_mode === 'songs' && rules.reopen_extra_songs) {
      return rules.reopen_songs_used >= rules.reopen_extra_songs;
    }
    if (rules.reopen_mode === 'dediche' && rules.reopen_extra_dediche) {
      return rules.reopen_dediche_used >= rules.reopen_extra_dediche;
    }
    if (rules.reopen_mode === 'combo') {
      const songsExhausted = rules.reopen_extra_songs ? rules.reopen_songs_used >= rules.reopen_extra_songs : true;
      const dedicheExhausted = rules.reopen_extra_dediche ? rules.reopen_dediche_used >= rules.reopen_extra_dediche : true;
      return songsExhausted && dedicheExhausted;
    }
    return false;
  };

  // Check if combo mode is valid (at least one option selected)
  const isComboValid = reopenMode !== 'combo' || enableSongs || enableDediche;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Riapertura Straordinaria
        </CardTitle>
        <CardDescription>
          Riapri temporaneamente le prenotazioni dopo la chiusura. 
          Gli utenti vedranno un banner con countdown.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Active Reopen Status */}
        {rules.reopen_active && (
          <div className={cn(
            "p-4 rounded-lg border-2",
            isSlotsExhausted() 
              ? "border-orange-500/50 bg-orange-500/10" 
              : "border-green-500/50 bg-green-500/10 animate-pulse"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-500" />
                <span className="font-medium">Riapertura in corso</span>
                {rules.reopen_mode === 'combo' && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Combo
                  </Badge>
                )}
              </div>
              <Badge variant="default" className="bg-green-500">
                ATTIVA
              </Badge>
            </div>

            {rules.reopen_message && (
              <p className="text-sm text-muted-foreground mb-3 italic">
                "{rules.reopen_message}"
              </p>
            )}

            {/* Time-based countdown */}
            {rules.reopen_mode === 'time' && timeRemaining !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tempo rimanente</span>
                  <span className={cn(
                    "font-mono font-bold text-lg",
                    timeRemaining < 60 ? "text-red-500" : 
                    timeRemaining < 180 ? "text-amber-500" : "text-green-500"
                  )}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Single mode: songs only */}
            {rules.reopen_mode === 'songs' && rules.reopen_extra_songs && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Music className="w-4 h-4" />
                    Canzoni extra
                  </span>
                  <span className="font-medium">
                    {rules.reopen_songs_used} / {rules.reopen_extra_songs}
                  </span>
                </div>
                <Progress 
                  value={(rules.reopen_songs_used / rules.reopen_extra_songs) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Single mode: dediche only */}
            {rules.reopen_mode === 'dediche' && rules.reopen_extra_dediche && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    Dediche extra
                  </span>
                  <span className="font-medium">
                    {rules.reopen_dediche_used} / {rules.reopen_extra_dediche}
                  </span>
                </div>
                <Progress 
                  value={(rules.reopen_dediche_used / rules.reopen_extra_dediche) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Combo mode: both */}
            {rules.reopen_mode === 'combo' && (
              <div className="space-y-3">
                {rules.reopen_extra_songs && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <Music className="w-4 h-4" />
                        Canzoni extra
                      </span>
                      <span className="font-medium">
                        {rules.reopen_songs_used} / {rules.reopen_extra_songs}
                      </span>
                    </div>
                    <Progress 
                      value={(rules.reopen_songs_used / rules.reopen_extra_songs) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
                {rules.reopen_extra_dediche && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" />
                        Dediche extra
                      </span>
                      <span className="font-medium">
                        {rules.reopen_dediche_used} / {rules.reopen_extra_dediche}
                      </span>
                    </div>
                    <Progress 
                      value={(rules.reopen_dediche_used / rules.reopen_extra_dediche) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopReopen}
              disabled={isSaving}
              className="mt-4 w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              Termina Riapertura
            </Button>
          </div>
        )}

        {/* Configuration (when not active) */}
        {!rules.reopen_active && (
          <>
            <div className="space-y-4">
              <Label>Modalità riapertura</Label>
              
              <RadioGroup value={reopenMode} onValueChange={(v) => setReopenMode(v as 'time' | 'songs' | 'dediche' | 'combo')}>
                {/* Time mode */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="time" id="reopen-time" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="reopen-time" className="font-medium cursor-pointer flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Per tempo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Riapri tutto per un numero di minuti (Open Mic + Dediche)
                    </p>
                    {reopenMode === 'time' && (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={reopenMinutes}
                          onChange={(e) => setReopenMinutes(e.target.value)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">minuti</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Songs only */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="songs" id="reopen-songs" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="reopen-songs" className="font-medium cursor-pointer flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Solo Open Mic
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Riapri solo le prenotazioni canzoni
                    </p>
                    {reopenMode === 'songs' && (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={reopenSongs}
                          onChange={(e) => setReopenSongs(e.target.value)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">canzoni extra</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dediche only */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="dediche" id="reopen-dediche" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="reopen-dediche" className="font-medium cursor-pointer flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Solo Dediche
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Riapri solo le dediche
                    </p>
                    {reopenMode === 'dediche' && (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={reopenDediche}
                          onChange={(e) => setReopenDediche(e.target.value)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">dediche extra</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Combo mode */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <RadioGroupItem value="combo" id="reopen-combo" className="mt-1" />
                  <div className="flex-1 space-y-3">
                    <Label htmlFor="reopen-combo" className="font-medium cursor-pointer flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Open Mic + Dediche
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Riapri entrambi con limiti separati
                    </p>
                    
                    {reopenMode === 'combo' && (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        {/* Songs toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={enableSongs}
                              onCheckedChange={setEnableSongs}
                              id="combo-songs"
                            />
                            <Label htmlFor="combo-songs" className="text-sm flex items-center gap-1.5 cursor-pointer">
                              <Music className="w-3.5 h-3.5" />
                              Canzoni extra
                            </Label>
                          </div>
                          {enableSongs && (
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={reopenSongs}
                              onChange={(e) => setReopenSongs(e.target.value)}
                              className="w-16 h-8 text-sm"
                            />
                          )}
                        </div>

                        {/* Dediche toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={enableDediche}
                              onCheckedChange={setEnableDediche}
                              id="combo-dediche"
                            />
                            <Label htmlFor="combo-dediche" className="text-sm flex items-center gap-1.5 cursor-pointer">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Dediche extra
                            </Label>
                          </div>
                          {enableDediche && (
                            <Input
                              type="number"
                              min="1"
                              max="50"
                              value={reopenDediche}
                              onChange={(e) => setReopenDediche(e.target.value)}
                              className="w-16 h-8 text-sm"
                            />
                          )}
                        </div>

                        {!enableSongs && !enableDediche && (
                          <p className="text-xs text-destructive">
                            Seleziona almeno un'opzione
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reopenMessage">Messaggio per gli utenti</Label>
              <Textarea
                id="reopenMessage"
                value={reopenMessage}
                onChange={(e) => setReopenMessage(e.target.value)}
                placeholder="Es. A grande richiesta, riapriamo per pochi minuti!"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Questo messaggio apparirà nel banner di riapertura visibile agli utenti
              </p>
            </div>

            <Button
              onClick={handleStartReopen}
              disabled={isSaving || !isComboValid}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {isSaving ? 'Attivazione...' : 'Attiva Riapertura Straordinaria'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

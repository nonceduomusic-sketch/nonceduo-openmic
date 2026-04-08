import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Zap, Play, Square, Music, MessageSquare, Clock, RotateCcw, Trophy, Calendar, Timer, RefreshCw, QrCode, Eye, BookOpen
} from 'lucide-react';
import { useFreeModeSettings, FreeModeSettings } from '@/hooks/useFreeModeSettings';
import { useFreeModeScheduler } from '@/hooks/useFreeModeScheduler';
import { cn } from '@/lib/utils';
import type { EventBookingRules } from '@/hooks/useEventBookingRules';

// Import shared components from scheduled events
import { EventLimitsConfig } from './EventLimitsConfig';
import { EventReopenControl } from './EventReopenControl';
import { EventClosureConfig } from './EventClosureConfig';
import { EventPinConfig } from './EventPinConfig';
import { EventTimingConfig } from './EventTimingConfig';
import { UserLimitsConfig } from './UserLimitsConfig';
import { EventCountdownBanner } from '@/components/effects/EventCountdownBanner';
import { PinProtectionCard } from './PinProtectionCard';
import { EventQRCodesManager } from './EventQRCodesManager';

/**
 * Adapter che converte FreeModeSettings nel formato EventBookingRules
 * per poter riutilizzare gli stessi componenti dell'evento programmato
 */
const adaptToEventRules = (settings: FreeModeSettings | null): EventBookingRules => {
  if (!settings) {
    return {
      id: 'free-mode',
      event_name: 'EVENTO LIVE',
      event_status: 'draft',
      event_type: 'both',
      is_active: false,
      openmic_enabled: true,
      dediche_enabled: true,
      voting_enabled: true,
      openmic_max_songs: null,
      dediche_max_total: null,
      openmic_current_count: 0,
      dediche_current_count: 0,
      openmic_final_limit_enabled: false,
      openmic_final_limit_songs: null,
      openmic_final_limit_minutes: null,
      dediche_final_limit_enabled: false,
      dediche_final_limit_total: null,
      dediche_final_limit_minutes: null,
      pin_required: false,
      pin_code: null,
      reopen_active: false,
      reopen_mode: null,
      reopen_until: null,
      reopen_extra_songs: null,
      reopen_extra_dediche: null,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
      reopen_message: null,
      closure_mode: 'overlay',
      closure_title: 'Prenotazioni chiuse',
      closure_message: 'Grazie per aver partecipato!',
      closure_redirect_url: null,
      closure_preview_enabled: false,
      booking_opens_at: null,
      booking_closes_at: null,
      close_minutes_before_end: null,
      event_date: null,
      event_start_time: null,
      event_end_date: null,
      event_end_time: null,
      // User limits defaults
      user_limit_enabled: false,
      user_limit_mode: 'session',
      user_limit_songs_total: null,
      user_limit_dediche_total: null,
      user_limit_songs_interval: null,
      user_limit_interval_minutes: null,
      user_limit_consecutive_songs: null,
      user_limit_cooldown_message: null,
      // Countdown defaults
      countdown_start_show_minutes: null,
      countdown_end_show_minutes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    id: settings.id,
    event_name: settings.event_name || 'EVENTO LIVE',
    event_status: settings.is_active ? 'live' : 'draft',
    event_type: 'both',
    is_active: settings.is_active ?? false,
    openmic_enabled: settings.openmic_enabled ?? true,
    dediche_enabled: settings.dediche_enabled ?? true,
    voting_enabled: settings.voting_enabled ?? true,
    openmic_max_songs: settings.openmic_max_songs ?? null,
    dediche_max_total: settings.dediche_max_total ?? null,
    openmic_current_count: settings.openmic_current_count || 0,
    dediche_current_count: settings.dediche_current_count || 0,
    openmic_final_limit_enabled: settings.openmic_final_limit_enabled ?? false,
    openmic_final_limit_songs: settings.openmic_final_limit_songs ?? null,
    openmic_final_limit_minutes: settings.openmic_final_limit_minutes ?? null,
    dediche_final_limit_enabled: settings.dediche_final_limit_enabled ?? false,
    dediche_final_limit_total: settings.dediche_final_limit_total ?? null,
    dediche_final_limit_minutes: settings.dediche_final_limit_minutes ?? null,
    pin_required: settings.pin_enabled ?? false,
    pin_code: settings.pin_code ?? null,
    reopen_active: settings.reopen_active ?? false,
    reopen_mode: settings.reopen_mode ?? null,
    reopen_until: settings.reopen_until ?? null,
    reopen_extra_songs: settings.reopen_extra_songs ?? null,
    reopen_extra_dediche: settings.reopen_extra_dediche ?? null,
    reopen_songs_used: settings.reopen_songs_used || 0,
    reopen_dediche_used: settings.reopen_dediche_used || 0,
    reopen_message: settings.reopen_message ?? null,
    closure_mode: settings.closure_mode || 'overlay',
    closure_title: settings.closure_title || 'Prenotazioni chiuse',
    closure_message: settings.closure_message || 'Grazie per aver partecipato!',
    closure_redirect_url: settings.closure_redirect_url ?? null,
    closure_preview_enabled: settings.closure_preview_enabled ?? false,
    booking_opens_at: settings.booking_opens_at ?? null,
    booking_closes_at: settings.booking_closes_at ?? null,
    close_minutes_before_end: settings.close_minutes_before_end ?? null,
    event_date: settings.event_date ?? null,
    event_start_time: settings.event_start_time ?? null,
    event_end_date: settings.event_end_date ?? null,
    event_end_time: settings.event_end_time ?? null,
    // User limits
    user_limit_enabled: settings.user_limit_enabled ?? false,
    user_limit_mode: (settings.user_limit_mode as 'session' | 'session_name') || 'session',
    user_limit_songs_total: settings.user_limit_songs_total ?? null,
    user_limit_dediche_total: settings.user_limit_dediche_total ?? null,
    user_limit_songs_interval: settings.user_limit_songs_interval ?? null,
    user_limit_interval_minutes: settings.user_limit_interval_minutes ?? null,
    user_limit_consecutive_songs: settings.user_limit_consecutive_songs ?? null,
    user_limit_cooldown_message: settings.user_limit_cooldown_message ?? null,
    // Countdown
    countdown_start_show_minutes: settings.countdown_start_show_minutes ?? null,
    countdown_end_show_minutes: settings.countdown_end_show_minutes ?? null,
    created_at: settings.created_at || new Date().toISOString(),
    updated_at: settings.updated_at || new Date().toISOString(),
  };
};

export const FreeModeFullPanel: React.FC = () => {
  const { 
    settings, 
    loading, 
    activateFreeMode, 
    deactivateFreeMode,
    updateSettings,
    resetCounters,
    syncCounters,
    generatePin,
    getTimeRemaining,
  } = useFreeModeSettings();

  // Scheduler per auto-start e auto-end
  const scheduler = useFreeModeScheduler();

  const [activeSection, setActiveSection] = useState<'general' | 'timing' | 'limits' | 'user' | 'pin' | 'qr' | 'reopen' | 'closure'>('general');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings?.event_name || 'EVENTO LIVE');

  // Sync tempName when settings load
  useEffect(() => {
    if (settings?.event_name) {
      setTempName(settings.event_name);
    }
  }, [settings?.event_name]);

  // Convert settings to EventBookingRules format for shared components
  const rules = useMemo(() => adaptToEventRules(settings), [settings]);

  // Timing settings for EventTimingConfig
  const timingSettings = useMemo(() => ({
    start_mode: settings?.start_mode || 'manual',
    end_mode: settings?.end_mode || 'manual',
    event_date: settings?.event_date || null,
    event_start_time: settings?.event_start_time || null,
    event_end_date: settings?.event_end_date || null,
    event_end_time: settings?.event_end_time || null,
    duration_minutes: settings?.duration_minutes || null,
    expires_at: settings?.expires_at || null,
    countdown_start_show_minutes: settings?.countdown_start_show_minutes ?? null,
    countdown_end_show_minutes: settings?.countdown_end_show_minutes ?? null,
  }), [settings]);

  // Handler per timing settings
  const handleTimingUpdate = async (updates: Partial<FreeModeSettings>): Promise<boolean> => {
    return await updateSettings(updates);
  };

  // Handler che converte gli aggiornamenti EventBookingRules -> FreeModeSettings
  const handleUpdate = async (updates: Partial<EventBookingRules>): Promise<boolean> => {
    const freeModeUpdates: Partial<FreeModeSettings> = {};

    if (updates.event_name !== undefined) freeModeUpdates.event_name = updates.event_name;
    if (updates.openmic_enabled !== undefined) freeModeUpdates.openmic_enabled = updates.openmic_enabled;
    if (updates.dediche_enabled !== undefined) freeModeUpdates.dediche_enabled = updates.dediche_enabled;
    if (updates.voting_enabled !== undefined) freeModeUpdates.voting_enabled = updates.voting_enabled;
    if (updates.openmic_max_songs !== undefined) freeModeUpdates.openmic_max_songs = updates.openmic_max_songs;
    if (updates.dediche_max_total !== undefined) freeModeUpdates.dediche_max_total = updates.dediche_max_total;
    if (updates.openmic_final_limit_enabled !== undefined) freeModeUpdates.openmic_final_limit_enabled = updates.openmic_final_limit_enabled;
    if (updates.openmic_final_limit_songs !== undefined) freeModeUpdates.openmic_final_limit_songs = updates.openmic_final_limit_songs;
    if (updates.openmic_final_limit_minutes !== undefined) freeModeUpdates.openmic_final_limit_minutes = updates.openmic_final_limit_minutes;
    // Dediche final limit
    if (updates.dediche_final_limit_enabled !== undefined) freeModeUpdates.dediche_final_limit_enabled = updates.dediche_final_limit_enabled;
    if (updates.dediche_final_limit_total !== undefined) freeModeUpdates.dediche_final_limit_total = updates.dediche_final_limit_total;
    if (updates.dediche_final_limit_minutes !== undefined) freeModeUpdates.dediche_final_limit_minutes = updates.dediche_final_limit_minutes;
    // PIN
    if (updates.pin_required !== undefined) freeModeUpdates.pin_enabled = updates.pin_required;
    if (updates.pin_code !== undefined) freeModeUpdates.pin_code = updates.pin_code;
    // Reopen
    if (updates.reopen_active !== undefined) freeModeUpdates.reopen_active = updates.reopen_active;
    if (updates.reopen_mode !== undefined) freeModeUpdates.reopen_mode = updates.reopen_mode;
    if (updates.reopen_until !== undefined) freeModeUpdates.reopen_until = updates.reopen_until;
    if (updates.reopen_extra_songs !== undefined) freeModeUpdates.reopen_extra_songs = updates.reopen_extra_songs;
    if (updates.reopen_extra_dediche !== undefined) freeModeUpdates.reopen_extra_dediche = updates.reopen_extra_dediche;
    if (updates.reopen_songs_used !== undefined) freeModeUpdates.reopen_songs_used = updates.reopen_songs_used;
    if (updates.reopen_dediche_used !== undefined) freeModeUpdates.reopen_dediche_used = updates.reopen_dediche_used;
    if (updates.reopen_message !== undefined) freeModeUpdates.reopen_message = updates.reopen_message;
    // Closure
    if (updates.closure_mode !== undefined) freeModeUpdates.closure_mode = updates.closure_mode;
    if (updates.closure_title !== undefined) freeModeUpdates.closure_title = updates.closure_title;
    if (updates.closure_message !== undefined) freeModeUpdates.closure_message = updates.closure_message;
    if (updates.closure_redirect_url !== undefined) freeModeUpdates.closure_redirect_url = updates.closure_redirect_url;
    if (updates.closure_preview_enabled !== undefined) freeModeUpdates.closure_preview_enabled = updates.closure_preview_enabled;
    // Booking window
    if (updates.booking_opens_at !== undefined) freeModeUpdates.booking_opens_at = updates.booking_opens_at;
    if (updates.booking_closes_at !== undefined) freeModeUpdates.booking_closes_at = updates.booking_closes_at;
    if (updates.close_minutes_before_end !== undefined) freeModeUpdates.close_minutes_before_end = updates.close_minutes_before_end;

    return await updateSettings(freeModeUpdates);
  };

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
      eventName: settings?.event_name || 'EVENTO LIVE',
      openmic: settings?.openmic_enabled ?? true,
      dediche: settings?.dediche_enabled ?? true,
      voting: settings?.voting_enabled ?? true,
      maxSongs: settings?.openmic_max_songs ?? undefined,
      maxDediche: settings?.dediche_max_total ?? undefined,
      durationMinutes: settings?.duration_minutes ?? undefined,
      // Passa il PIN pre-configurato se attivato dall'admin prima dell'avvio
      pinCode: (settings?.pin_enabled && settings?.pin_code) ? settings.pin_code : undefined,
      closureMode: settings?.closure_mode || 'overlay',
      closureTitle: settings?.closure_title || 'Prenotazioni chiuse',
      closureMessage: settings?.closure_message || 'Grazie per aver partecipato!',
    });
  };

  // ========== INACTIVE STATE: Setup ==========
  if (!isActive) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-muted-foreground" />
            Configura Evento Libero
          </CardTitle>
          <CardDescription className="text-xs">
            Evento senza data programmata. Attivalo quando vuoi.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 gap-1 h-auto p-1">
              <TabsTrigger value="general" className="text-xs py-2">Generale</TabsTrigger>
              <TabsTrigger value="timing" className="text-xs py-2">Tempi</TabsTrigger>
              <TabsTrigger value="limits" className="text-xs py-2">Limiti</TabsTrigger>
              <TabsTrigger value="user" className="text-xs py-2">Utente</TabsTrigger>
              <TabsTrigger value="pin" className="text-xs py-2">PIN</TabsTrigger>
              <TabsTrigger value="qr" className="text-xs py-2">QR Code</TabsTrigger>
              <TabsTrigger value="reopen" className="text-xs py-2">Riapri</TabsTrigger>
              <TabsTrigger value="closure" className="text-xs py-2">Chiusura</TabsTrigger>
            </TabsList>

            {/* GENERAL TAB - Name, Voting, Formats */}
            <TabsContent value="general" className="mt-4 space-y-4">
              {/* Event Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome Evento</Label>
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={() => {
                    if (tempName !== settings?.event_name) {
                      handleUpdate({ event_name: tempName });
                    }
                  }}
                  placeholder="Es: Serata Karaoke"
                  className="h-10"
                />
              </div>

              {/* Format Toggles */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Formati Attivi</Label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="text-sm">Open Mic</span>
                    </div>
                    <Switch
                      checked={settings?.openmic_enabled ?? true}
                      onCheckedChange={(checked) => handleUpdate({ openmic_enabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-secondary" />
                      <span className="text-sm">Dediche</span>
                    </div>
                    <Switch
                      checked={settings?.dediche_enabled ?? true}
                      onCheckedChange={(checked) => handleUpdate({ dediche_enabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-warning" />
                      <span className="text-sm">Votazioni Pubblico</span>
                    </div>
                    <Switch
                      checked={settings?.voting_enabled ?? true}
                      onCheckedChange={(checked) => handleUpdate({ voting_enabled: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Consultable Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Modalità Consultabile</Label>
                <p className="text-xs text-muted-foreground">
                  Attiva per permettere agli utenti di sfogliare il catalogo senza poter prenotare
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-accent" />
                      <div>
                        <span className="text-sm">Solo Anteprima</span>
                        <p className="text-xs text-muted-foreground">Catalogo visibile, prenotazioni bloccate</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.is_consultable_mode ?? false}
                      onCheckedChange={(checked) => updateSettings({ is_consultable_mode: checked })}
                    />
                  </div>
                  {settings?.is_consultable_mode && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border ml-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm">Proteggi Testi</span>
                          <p className="text-xs text-muted-foreground">Nascondi i testi fino all'evento</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.protect_repertoire ?? true}
                        onCheckedChange={(checked) => updateSettings({ protect_repertoire: checked })}
                      />
                    </div>
                  )}
                  
                  {/* Catalog Preview Limit */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <div>
                        <span className="text-sm">Mostra Anteprima Catalogo</span>
                        <p className="text-xs text-muted-foreground">Visibile anche senza eventi attivi</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.catalog_preview_enabled ?? false}
                      onCheckedChange={(checked) => updateSettings({ catalog_preview_enabled: checked })}
                    />
                  </div>
                  
                  {settings?.catalog_preview_enabled && (
                    <div className="ml-4 space-y-3 p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm min-w-20">Mostra</Label>
                        <Input
                          type="number"
                          value={settings?.catalog_preview_limit_value ?? 30}
                          onChange={(e) => updateSettings({ catalog_preview_limit_value: parseInt(e.target.value) || 30 })}
                          className="w-20 h-8"
                          min={1}
                          max={100}
                        />
                        <select
                          value={settings?.catalog_preview_limit_type ?? 'percent'}
                          onChange={(e) => updateSettings({ catalog_preview_limit_type: e.target.value as 'percent' | 'count' })}
                          className="h-8 px-2 rounded border bg-background text-sm"
                        >
                          <option value="percent">% delle canzoni</option>
                          <option value="count">canzoni</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Messaggio teaser</Label>
                        <Input
                          value={settings?.catalog_preview_message ?? 'e molto altro...'}
                          onChange={(e) => updateSettings({ catalog_preview_message: e.target.value })}
                          placeholder="e molto altro..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TIMING TAB */}
            <TabsContent value="timing" className="mt-4">
              <EventTimingConfig 
                settings={timingSettings} 
                isActive={false}
                onUpdate={handleTimingUpdate}
              />
            </TabsContent>

            <TabsContent value="limits" className="mt-4">
              <EventLimitsConfig rules={rules} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="user" className="mt-4">
              <UserLimitsConfig 
                settings={{
                  user_limit_enabled: settings?.user_limit_enabled ?? false,
                  user_limit_mode: (settings?.user_limit_mode as 'session' | 'session_name') ?? 'session',
                  user_limit_songs_total: settings?.user_limit_songs_total ?? null,
                  user_limit_dediche_total: settings?.user_limit_dediche_total ?? null,
                  user_limit_songs_interval: settings?.user_limit_songs_interval ?? null,
                  user_limit_interval_minutes: settings?.user_limit_interval_minutes ?? null,
                  user_limit_consecutive_songs: settings?.user_limit_consecutive_songs ?? null,
                  user_limit_cooldown_message: settings?.user_limit_cooldown_message ?? 'Hai superato il limite di prenotazioni.',
                }}
                onUpdate={async (updates) => {
                  const success = await updateSettings(updates);
                  return success;
                }}
                entityId={settings?.id}
              />
            </TabsContent>

            <TabsContent value="pin" className="mt-4 space-y-4">
              <PinProtectionCard title="Protezione PIN" />
            </TabsContent>

            {/* QR CODE TAB - NUOVO */}
            <TabsContent value="qr" className="mt-4">
              <EventQRCodesManager 
                eventId="free-mode"
                eventType="freemode"
                eventName={settings?.event_name || 'Evento Libero'}
                isEventLive={settings?.is_active ?? false}
              />
            </TabsContent>

            <TabsContent value="reopen" className="mt-4">
              <EventReopenControl rules={rules} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="closure" className="mt-4">
              <EventClosureConfig rules={rules} onUpdate={handleUpdate} />
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Countdown partenza automatica - visibile in base a config */}
          {scheduler.isScheduledStart && scheduler.scheduledStartTimeISO && (
            <EventCountdownBanner
              type="start"
              targetTime={scheduler.scheduledStartTimeISO}
              showMinutesBefore={scheduler.countdownStartShowMinutes}
              label="Partenza automatica tra"
              animated
            />
          )}

          <Button variant="default" className="w-full" onClick={handleActivate}>
            <Play className="w-4 h-4 mr-2" />
            {scheduler.isScheduledStart ? 'Avvia Ora (Ignora Programmazione)' : 'Avvia Evento Libero'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ========== ACTIVE STATE: Live Control Panel ==========
  return (
    <Card className={cn(
      "glass-card overflow-hidden transition-all duration-300",
      "ring-2 ring-primary/50 shadow-lg shadow-primary/10"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            {settings?.event_name || 'EVENTO LIVE'}
          </CardTitle>
          <Badge variant="default" className="animate-pulse">LIVE</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Music className="w-3.5 h-3.5" />
              <span>Canzoni</span>
            </div>
            <div className="text-xl font-bold">
              {settings?.openmic_current_count || 0}
              {settings?.openmic_max_songs && (
                <span className="text-muted-foreground font-normal text-sm">
                  /{settings.openmic_max_songs}
                </span>
              )}
            </div>
          </div>
          <div className="bg-secondary/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Dediche</span>
            </div>
            <div className="text-xl font-bold">
              {settings?.dediche_current_count || 0}
              {settings?.dediche_max_total && (
                <span className="text-muted-foreground font-normal text-sm">
                  /{settings.dediche_max_total}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Countdown fine evento con banner animato - sempre visibile per admin (null = sempre) */}
        {scheduler.isScheduledEnd && scheduler.scheduledEndTimeISO && (
          <EventCountdownBanner
            type="end"
            targetTime={scheduler.scheduledEndTimeISO}
            showMinutesBefore={null}
            label="Chiusura automatica tra"
            animated
          />
        )}

        {/* Fallback: mostra tempo rimanente solo se countdown non visibile */}
        {!scheduler.isScheduledEnd && timeRemaining !== null && (
          <div className={cn(
            "flex items-center justify-center gap-2 rounded-lg p-2",
            timeRemaining > 0 
              ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" 
              : "text-destructive bg-destructive/10"
          )}>
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {(() => {
                if (timeRemaining > 0) {
                  const hours = Math.floor(timeRemaining / 60);
                  const mins = timeRemaining % 60;
                  if (hours > 0) {
                    return `${hours}h ${mins}m rimanenti`;
                  }
                  return `${mins} min rimanenti`;
                }
                return 'Tempo scaduto!';
              })()}
            </span>
          </div>
        )}

        {/* Reopen banner */}
        {settings?.reopen_active && (
          <div className="bg-warning/20 border border-warning/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-warning">
              <RotateCcw className="w-4 h-4" />
              <span className="font-medium">Riapertura Attiva</span>
            </div>
          </div>
        )}

        {/* Reset/Sync contatori */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={syncCounters}
            title="Sincronizza contatori con prenotazioni reali"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizza
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetCounters}
            disabled={(settings?.openmic_current_count === 0 && settings?.dediche_current_count === 0)}
            title="Azzera tutti i contatori"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Azzera
          </Button>
        </div>

        <Separator />

        {/* Live Controls Tabs - using shared components */}
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 gap-1 h-auto p-1">
            <TabsTrigger value="general" className="text-xs py-2">Generale</TabsTrigger>
            <TabsTrigger value="timing" className="text-xs py-2">Tempi</TabsTrigger>
            <TabsTrigger value="limits" className="text-xs py-2">Limiti</TabsTrigger>
            <TabsTrigger value="user" className="text-xs py-2">Utente</TabsTrigger>
            <TabsTrigger value="pin" className="text-xs py-2">PIN</TabsTrigger>
            <TabsTrigger value="reopen" className="text-xs py-2">Riapri</TabsTrigger>
            <TabsTrigger value="closure" className="text-xs py-2">Chiusura</TabsTrigger>
          </TabsList>

          {/* GENERAL TAB - Name, Voting, Formats */}
          <TabsContent value="general" className="mt-3 space-y-4">
            {/* Event Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome Evento</Label>
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => {
                  if (tempName !== settings?.event_name) {
                    handleUpdate({ event_name: tempName });
                  }
                }}
                placeholder="Es: Serata Karaoke"
                className="h-10"
              />
            </div>

            {/* Format Toggles */}
            {/* Format Toggles */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Formati Attivi</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-sm">Open Mic</span>
                  </div>
                  <Switch
                    checked={settings?.openmic_enabled ?? true}
                    onCheckedChange={(checked) => handleUpdate({ openmic_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    <span className="text-sm">Dediche</span>
                  </div>
                  <Switch
                    checked={settings?.dediche_enabled ?? true}
                    onCheckedChange={(checked) => handleUpdate({ dediche_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-warning" />
                    <span className="text-sm">Votazioni Pubblico</span>
                  </div>
                  <Switch
                    checked={settings?.voting_enabled ?? true}
                    onCheckedChange={(checked) => handleUpdate({ voting_enabled: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Consultable Mode - also visible during live event */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Modalità Consultabile</Label>
              <p className="text-xs text-muted-foreground">
                Attiva per permettere agli utenti di sfogliare il catalogo senza poter prenotare
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-accent" />
                    <div>
                      <span className="text-sm">Solo Anteprima</span>
                      <p className="text-xs text-muted-foreground">Catalogo visibile, prenotazioni bloccate</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.is_consultable_mode ?? false}
                    onCheckedChange={(checked) => updateSettings({ is_consultable_mode: checked })}
                  />
                </div>
                {settings?.is_consultable_mode && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border ml-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm">Proteggi Testi</span>
                        <p className="text-xs text-muted-foreground">Nascondi i testi fino all'evento</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.protect_repertoire ?? true}
                      onCheckedChange={(checked) => updateSettings({ protect_repertoire: checked })}
                    />
                  </div>
                )}
                
                {/* Catalog Preview Limit */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <div>
                      <span className="text-sm">Mostra Anteprima Catalogo</span>
                      <p className="text-xs text-muted-foreground">Visibile anche senza eventi attivi</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.catalog_preview_enabled ?? false}
                    onCheckedChange={(checked) => updateSettings({ catalog_preview_enabled: checked })}
                  />
                </div>
                
                {settings?.catalog_preview_enabled && (
                  <div className="ml-4 space-y-3 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm min-w-20">Mostra</Label>
                      <Input
                        type="number"
                        value={settings?.catalog_preview_limit_value ?? 30}
                        onChange={(e) => updateSettings({ catalog_preview_limit_value: parseInt(e.target.value) || 30 })}
                        className="w-20 h-8"
                        min={1}
                        max={100}
                      />
                      <select
                        value={settings?.catalog_preview_limit_type ?? 'percent'}
                        onChange={(e) => updateSettings({ catalog_preview_limit_type: e.target.value as 'percent' | 'count' })}
                        className="h-8 px-2 rounded border bg-background text-sm"
                      >
                        <option value="percent">% delle canzoni</option>
                        <option value="count">canzoni</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Messaggio teaser</Label>
                      <Input
                        value={settings?.catalog_preview_message ?? 'e molto altro...'}
                        onChange={(e) => updateSettings({ catalog_preview_message: e.target.value })}
                        placeholder="e molto altro..."
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TIMING TAB (read-only during live, but shown for info) */}
          <TabsContent value="timing" className="mt-3">
            <EventTimingConfig 
              settings={timingSettings} 
              isActive={true}
              onUpdate={handleTimingUpdate}
            />
          </TabsContent>

          <TabsContent value="limits" className="mt-3">
            <EventLimitsConfig rules={rules} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="user" className="mt-3">
            <UserLimitsConfig 
              settings={{
                user_limit_enabled: settings?.user_limit_enabled ?? false,
                user_limit_mode: (settings?.user_limit_mode as 'session' | 'session_name') ?? 'session',
                user_limit_songs_total: settings?.user_limit_songs_total ?? null,
                user_limit_dediche_total: settings?.user_limit_dediche_total ?? null,
                user_limit_songs_interval: settings?.user_limit_songs_interval ?? null,
                user_limit_interval_minutes: settings?.user_limit_interval_minutes ?? null,
                user_limit_consecutive_songs: settings?.user_limit_consecutive_songs ?? null,
                user_limit_cooldown_message: settings?.user_limit_cooldown_message ?? 'Hai superato il limite di prenotazioni.',
              }}
              onUpdate={async (updates) => {
                const success = await updateSettings(updates);
                return success;
              }}
              entityId={settings?.id}
            />
          </TabsContent>

          <TabsContent value="pin" className="mt-3 space-y-4">
            <PinProtectionCard title="Protezione PIN" />
          </TabsContent>

          <TabsContent value="reopen" className="mt-3">
            <EventReopenControl rules={rules} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="closure" className="mt-3">
            <EventClosureConfig rules={rules} onUpdate={handleUpdate} />
          </TabsContent>
        </Tabs>

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
      </CardContent>
    </Card>
  );
};

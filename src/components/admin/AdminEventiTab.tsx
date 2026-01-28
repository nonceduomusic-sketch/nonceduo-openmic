import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Zap,
  ChevronDown,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Radio,
  Power,
  Info,
  Clock,
  Music,
  MessageSquare,
  Sparkles,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEventBookingRules, EventBookingRules } from '@/hooks/useEventBookingRules';
import { useFreeModeActive } from '@/hooks/useFreeModeSettings';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import { cn } from '@/lib/utils';
import { EventBookingWindowConfig } from './EventBookingWindowConfig';
import { EventLimitsConfig } from './EventLimitsConfig';
import { EventReopenControl } from './EventReopenControl';
import { EventClosureConfig } from './EventClosureConfig';
import { EventStatusControl } from './EventStatusControl';
import { EventPinConfig } from './EventPinConfig';
import { EventTypeSelector } from './EventTypeSelector';
import { EventTimingConfig } from './EventTimingConfig';
import { UserLimitsConfig } from './UserLimitsConfig';
import { FreeModeFullPanel } from './FreeModeFullPanel';
import { PinProtectionCard } from './PinProtectionCard';

/**
 * Tab Eventi Unificato:
 * - Gestisce sia Eventi Programmati che Eventi Liberi
 * - Mostra stato corrente (quale tipo di evento è attivo)
 * - Non possono coesistere: se uno è attivo, l'altro è bloccato
 */
export const AdminEventiTab: React.FC = () => {
  const { toast } = useToast();
  const [eventType, setEventType] = useState<'freemode' | 'scheduled'>('freemode');
  
  // Hook per eventi programmati
  const { 
    rules, 
    allRules,
    liveEvent,
    loading: loadingScheduled, 
    updateRules, 
    setEventStatus,
    selectEvent,
    createRules,
    duplicateEvent,
    deleteEvent,
    resetCounters: resetScheduledCounters,
    syncCounters: syncScheduledCounters,
    updatePin,
    generatePin,
  } = useEventBookingRules();

  // Hook per eventi liberi
  const { isActive: isFreeModeActive } = useFreeModeActive();

  const [activeSection, setActiveSection] = useState<'general' | 'timing' | 'limits' | 'user' | 'pin' | 'reopen' | 'closure'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tempName, setTempName] = useState(rules?.event_name || 'EVENTO LIVE');

  // Sync tempName when rules load or change
  useEffect(() => {
    if (rules?.event_name) {
      setTempName(rules.event_name);
    }
  }, [rules?.event_name]);

  // Timing settings adapter for EventTimingConfig (used in scheduled events)
  const timingSettings = useMemo(() => ({
    start_mode: 'scheduled' as const,
    end_mode: rules?.event_end_time ? 'scheduled' as const : 'manual' as const,
    event_date: rules?.event_date || null,
    event_start_time: rules?.event_start_time || null,
    event_end_time: rules?.event_end_time || null,
    duration_minutes: null,
    expires_at: null,
    countdown_start_show_minutes: rules?.countdown_start_show_minutes ?? null,
    countdown_end_show_minutes: rules?.countdown_end_show_minutes ?? null,
  }), [rules]);

  // Handler for timing updates
  const handleTimingUpdate = async (updates: Partial<EventBookingRules>): Promise<boolean> => {
    return await updateRules({
      event_date: updates.event_date,
      event_start_time: updates.event_start_time,
      event_end_time: updates.event_end_time,
    });
  };

  const loading = loadingScheduled;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasLiveScheduledEvent = liveEvent !== null;
  const hasOtherLiveEvent = liveEvent !== null && rules && liveEvent.id !== rules.id;

  // Determina stato corrente
  const getCurrentStatus = () => {
    if (hasLiveScheduledEvent) {
      return { 
        type: 'scheduled', 
        label: `Evento "${liveEvent?.event_name}"`, 
        color: 'primary',
        icon: Calendar 
      };
    }
    if (isFreeModeActive) {
      return { 
        type: 'freemode', 
        label: 'Evento Libero', 
        color: 'green',
        icon: Zap 
      };
    }
    return { 
      type: 'offline', 
      label: 'Nessun evento attivo', 
      color: 'muted',
      icon: Power 
    };
  };

  const status = getCurrentStatus();
  const StatusIcon = status.icon;

  // Handler per eventi programmati
  const handleCreateNew = async () => {
    setIsSaving(true);
    const newId = await createRules({
      event_name: 'EVENTO LIVE',
      event_status: 'draft',
      event_type: 'both',
    });
    
    if (newId) {
      toast({
        title: 'Evento creato',
        description: 'Nuovo evento creato in stato Bozza',
      });
      await adminAuditLog({
        action: 'event.created',
        entity: 'event_booking_rules',
        entity_id: newId,
      });
    }
    setIsSaving(false);
  };

  const handleDuplicate = async () => {
    if (!rules) return;
    setIsSaving(true);
    const newId = await duplicateEvent(rules.id);
    
    if (newId) {
      toast({
        title: 'Evento duplicato',
        description: 'Creata una copia dell\'evento in stato Bozza',
      });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!rules) return;
    if (rules.event_status === 'live') {
      toast({
        title: 'Impossibile eliminare',
        description: 'Non puoi eliminare un evento LIVE. Chiudilo prima.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    const success = await deleteEvent(rules.id);
    
    if (success) {
      toast({
        title: 'Evento eliminato',
        description: 'L\'evento è stato eliminato definitivamente',
      });
    }
    setIsSaving(false);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header con stato corrente */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            status.type === 'scheduled' && "bg-primary/20 text-primary",
            status.type === 'freemode' && "bg-green-500/20 text-green-500",
            status.type === 'offline' && "bg-muted text-muted-foreground"
          )}>
            <StatusIcon className={cn(
              "w-5 h-5",
              status.type !== 'offline' && "animate-pulse"
            )} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gestione Eventi</h2>
            <p className="text-sm text-muted-foreground">{status.label}</p>
          </div>
        </div>
        
        {/* Badge stato */}
        {status.type !== 'offline' && (
          <Badge className={cn(
            "animate-pulse",
            status.type === 'scheduled' && "bg-primary text-primary-foreground",
            status.type === 'freemode' && "bg-green-500 text-white"
          )}>
            <Radio className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        )}
      </div>

      {/* Alert conflitto */}
      {(hasLiveScheduledEvent && eventType === 'freemode') && (
        <Alert variant="destructive">
          <AlertDescription>
            Un evento programmato è già attivo. Chiudilo prima di avviare un evento libero.
          </AlertDescription>
        </Alert>
      )}
      {(isFreeModeActive && eventType === 'scheduled') && (
        <Alert variant="destructive">
          <AlertDescription>
            Un evento libero è già attivo. Terminalo prima di avviare un evento programmato.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principale */}
      <Tabs value={eventType} onValueChange={(v) => setEventType(v as 'freemode' | 'scheduled')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="freemode" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Evento Libero</span>
            {isFreeModeActive && (
              <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">LIVE</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Programmato</span>
            {hasLiveScheduledEvent && (
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1 py-0">LIVE</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ========== EVENTO LIBERO ========== */}
        <TabsContent value="freemode" className="mt-4 space-y-4">
          {hasLiveScheduledEvent && (
            <Alert variant="destructive">
              <AlertDescription>
                Un evento programmato è già attivo. Chiudilo prima di avviare un evento libero.
              </AlertDescription>
            </Alert>
          )}
          <div className={cn(hasLiveScheduledEvent && "opacity-50 pointer-events-none")}>
            <FreeModeFullPanel />
          </div>
        </TabsContent>

        {/* ========== EVENTO PROGRAMMATO ========== */}
        <TabsContent value="scheduled" className="mt-4 space-y-4">
          {/* Se non ci sono eventi, mostra prompt per crearne uno */}
          {!rules || allRules.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center py-12 space-y-4",
              isFreeModeActive && "opacity-50 pointer-events-none"
            )}>
              <Calendar className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Nessun evento configurato</h3>
                <p className="text-muted-foreground">Crea il tuo primo evento per iniziare</p>
              </div>
              <Button onClick={handleCreateNew} disabled={isSaving || isFreeModeActive}>
                <Plus className="w-4 h-4 mr-2" />
                Crea Evento
              </Button>
            </div>
          ) : (
            <div className={cn(
              "space-y-4",
              isFreeModeActive && "opacity-50 pointer-events-none"
            )}>
              {/* Header: Selettore evento + azioni */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Dropdown selettore evento */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="max-w-[200px] truncate">
                          {rules.event_name || 'Evento senza nome'}
                        </span>
                        <Badge 
                          variant={rules.event_status === 'live' ? 'default' : 'secondary'}
                          className={cn(
                            "ml-1",
                            rules.event_status === 'live' && "bg-green-500"
                          )}
                        >
                          {rules.event_status}
                        </Badge>
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {allRules.map((event) => (
                        <DropdownMenuItem
                          key={event.id}
                          onClick={() => selectEvent(event.id)}
                          className={cn(
                            "flex items-center justify-between",
                            event.id === rules.id && "bg-accent"
                          )}
                        >
                          <span className="truncate">{event.event_name || 'Senza nome'}</span>
                          <Badge 
                            variant={event.event_status === 'live' ? 'default' : 'secondary'}
                            className={cn(
                              "ml-2 shrink-0",
                              event.event_status === 'live' && "bg-green-500"
                            )}
                          >
                            {event.event_status}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleCreateNew}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuovo evento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Azioni evento */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isSaving}>
                    <Copy className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Duplica</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isSaving || rules.event_status === 'live'}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Elimina</span>
                  </Button>
                </div>
              </div>

              {/* Stats rapide */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
                        <Music className="w-3.5 h-3.5" />
                        <span>Canzoni</span>
                      </div>
                      <p className="text-xl font-bold">
                        {rules.openmic_current_count}
                        {rules.openmic_max_songs && (
                          <span className="text-muted-foreground font-normal text-sm">
                            /{rules.openmic_max_songs}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Dediche</span>
                      </div>
                      <p className="text-xl font-bold">
                        {rules.dediche_current_count}
                        {rules.dediche_max_total && (
                          <span className="text-muted-foreground font-normal text-sm">
                            /{rules.dediche_max_total}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Finestra</span>
                      </div>
                      <p className="text-sm font-medium">
                        {rules.booking_opens_at || rules.booking_closes_at ? (
                          <span className="text-green-600 dark:text-green-400">Configurata</span>
                        ) : (
                          <span className="text-muted-foreground">Non impostata</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Riapertura</span>
                      </div>
                      <p className="text-sm font-medium">
                        {rules.reopen_active ? (
                          <span className="text-amber-600 dark:text-amber-400">In corso</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Reset/Sync contatori */}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={syncScheduledCounters}
                      disabled={isSaving}
                      title="Sincronizza contatori con prenotazioni reali"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizza
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetScheduledCounters}
                      disabled={isSaving || (rules.openmic_current_count === 0 && rules.dediche_current_count === 0)}
                      title="Azzera tutti i contatori"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Azzera contatori
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs di configurazione - IDENTICI a Evento Libero */}
              <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 gap-1 h-auto p-1">
                  <TabsTrigger value="general" className="text-xs py-2">Generale</TabsTrigger>
                  <TabsTrigger value="timing" className="text-xs py-2">Tempi</TabsTrigger>
                  <TabsTrigger value="limits" className="text-xs py-2">Limiti</TabsTrigger>
                  <TabsTrigger value="user" className="text-xs py-2">Utente</TabsTrigger>
                  <TabsTrigger value="pin" className="text-xs py-2">PIN</TabsTrigger>
                  <TabsTrigger value="reopen" className="text-xs py-2">Riapri</TabsTrigger>
                  <TabsTrigger value="closure" className="text-xs py-2">Chiusura</TabsTrigger>
                </TabsList>

                {/* GENERALE TAB - Nome, Stato, Formati */}
                <TabsContent value="general" className="mt-4 space-y-4">
                  {/* Event Name */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nome Evento</Label>
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={() => {
                        if (tempName !== rules.event_name) {
                          updateRules({ event_name: tempName });
                        }
                      }}
                      placeholder="Es: Serata Karaoke"
                      className="h-10"
                    />
                  </div>

                  {/* Event Status Control */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Stato Evento</CardTitle>
                      <CardDescription className="text-xs">
                        Gestisci il ciclo di vita: Bozza → Pronto → LIVE → Chiuso
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EventStatusControl 
                        rules={rules} 
                        onStatusChange={setEventStatus}
                        hasOtherLiveEvent={hasOtherLiveEvent || isFreeModeActive}
                      />
                    </CardContent>
                  </Card>

                  {/* Format Toggles + Type selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Formati Attivi</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-primary" />
                          <span className="text-sm">Open Mic</span>
                        </div>
                        <Switch
                          checked={rules.openmic_enabled ?? true}
                          onCheckedChange={(checked) => updateRules({ openmic_enabled: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-secondary" />
                          <span className="text-sm">Dediche</span>
                        </div>
                        <Switch
                          checked={rules.dediche_enabled ?? true}
                          onCheckedChange={(checked) => updateRules({ dediche_enabled: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-warning" />
                          <span className="text-sm">Votazioni Pubblico</span>
                        </div>
                        <Switch
                          checked={rules.voting_enabled ?? true}
                          onCheckedChange={(checked) => updateRules({ voting_enabled: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Event Type Selector (per event specifico) */}
                  <EventTypeSelector rules={rules} onUpdate={updateRules} />
                </TabsContent>

                {/* TEMPI TAB */}
                <TabsContent value="timing" className="mt-4 space-y-4">
                  <EventTimingConfig 
                    settings={timingSettings} 
                    isActive={rules.event_status === 'live'}
                    onUpdate={handleTimingUpdate}
                  />
                  {/* Finestra prenotazioni (opzionale, come in Evento Libero) */}
                  <EventBookingWindowConfig rules={rules} onUpdate={updateRules} />
                </TabsContent>

                {/* LIMITI TAB */}
                <TabsContent value="limits" className="mt-4">
                  <EventLimitsConfig rules={rules} onUpdate={updateRules} />
                </TabsContent>

                {/* UTENTE TAB */}
                <TabsContent value="user" className="mt-4">
                  <UserLimitsConfig 
                    settings={{
                      user_limit_enabled: rules.user_limit_enabled ?? false,
                      user_limit_mode: rules.user_limit_mode ?? 'session',
                      user_limit_songs_total: rules.user_limit_songs_total ?? null,
                      user_limit_dediche_total: rules.user_limit_dediche_total ?? null,
                      user_limit_songs_interval: rules.user_limit_songs_interval ?? null,
                      user_limit_interval_minutes: rules.user_limit_interval_minutes ?? null,
                      user_limit_consecutive_songs: rules.user_limit_consecutive_songs ?? null,
                      user_limit_cooldown_message: rules.user_limit_cooldown_message ?? 'Hai superato il limite di prenotazioni.',
                    }}
                    onUpdate={async (updates) => {
                      const success = await updateRules(updates);
                      return success;
                    }}
                    entityId={rules.id}
                  />
                </TabsContent>

                {/* PIN TAB */}
                <TabsContent value="pin" className="mt-4 space-y-4">
                  <EventPinConfig 
                    rules={rules} 
                  onUpdate={async (updates) => {
                    // IMPORTANT: when changing PIN on a LIVE scheduled event we must also sync the active live_session,
                    // otherwise user-side validation (which checks live_sessions) will fail.
                    const nextPinRequired = updates.pin_required ?? rules.pin_required;
                    const nextPinCode = (updates.pin_code ?? rules.pin_code) ?? null;
                    return updatePin(nextPinRequired ? nextPinCode : null, nextPinRequired);
                  }}
                    generatePin={generatePin}
                  />
                  {/* Gestione sessioni PIN: mostrala sempre quando l'evento è LIVE.
                      La card gestisce internamente stato PIN e permessi (incl. "Sconnetti tutti"). */}
                  {rules.event_status === 'live' && <PinProtectionCard title="Gestione Sessioni PIN" />}
                </TabsContent>

                {/* RIAPRI TAB */}
                <TabsContent value="reopen" className="mt-4">
                  <EventReopenControl rules={rules} onUpdate={updateRules} />
                </TabsContent>

                {/* CHIUSURA TAB */}
                <TabsContent value="closure" className="mt-4">
                  <EventClosureConfig rules={rules} onUpdate={updateRules} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <p><strong>⚠️ Un solo evento alla volta:</strong> Evento Libero e Programmato non possono coesistere.</p>
          <p className="mt-1"><strong>Evento Libero:</strong> Avvio immediato, opzionalmente con limiti, durata e PIN.</p>
          <p><strong>Evento Programmato:</strong> Pianifica in anticipo con data, orario e finestre di prenotazione.</p>
        </AlertDescription>
      </Alert>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
            <AlertDialogDescription>
              L'evento "{rules?.event_name || 'Senza nome'}" e tutte le sue configurazioni 
              saranno eliminate definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

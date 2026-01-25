import React, { useState } from 'react';
import { 
  Calendar, 
  Zap,
  ChevronDown,
  Plus,
  Copy,
  Trash2,
  Clock,
  Music,
  MessageSquare,
  Sparkles,
  RotateCcw,
  RefreshCw,
  Radio,
  Power,
  Hash,
  Lock,
  Play,
  Square,
  Settings2,
  ThumbsUp,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useEventBookingRules } from '@/hooks/useEventBookingRules';
import { useFreeModeSettings, useFreeModeActive } from '@/hooks/useFreeModeSettings';
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
    generatePin,
  } = useEventBookingRules();

  // Hook per eventi liberi
  const { 
    settings: freeModeSettings, 
    loading: loadingFreeMode, 
    activateFreeMode, 
    deactivateFreeMode,
    updateLiveSettings,
    resetCounters: resetFreeModeCounters,
    generatePin: generateFreeModePin,
    getTimeRemaining,
  } = useFreeModeSettings();
  const { isActive: isFreeModeActive } = useFreeModeActive();

  const [activeSection, setActiveSection] = useState<'status' | 'window' | 'limits' | 'reopen' | 'closure'>('status');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Free mode config state
  const [freeModeConfig, setFreeModeConfig] = useState({
    openmic: true,
    dediche: true,
    voting: true,
    maxSongs: '',
    maxDediche: '',
    durationMinutes: '',
    pinCode: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loading = loadingScheduled || loadingFreeMode;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasLiveScheduledEvent = liveEvent !== null;
  const hasOtherLiveEvent = liveEvent !== null && rules && liveEvent.id !== rules.id;
  const timeRemaining = getTimeRemaining();

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

  // Handler per eventi liberi
  const handleActivateFreeMode = async () => {
    if (hasLiveScheduledEvent) {
      toast({
        title: 'Evento già attivo',
        description: 'Chiudi prima l\'evento programmato per avviare un evento libero.',
        variant: 'destructive',
      });
      return;
    }
    
    await activateFreeMode({
      openmic: freeModeConfig.openmic,
      dediche: freeModeConfig.dediche,
      voting: freeModeConfig.voting,
      maxSongs: freeModeConfig.maxSongs ? parseInt(freeModeConfig.maxSongs) : undefined,
      maxDediche: freeModeConfig.maxDediche ? parseInt(freeModeConfig.maxDediche) : undefined,
      durationMinutes: freeModeConfig.durationMinutes ? parseInt(freeModeConfig.durationMinutes) : undefined,
      pinCode: freeModeConfig.pinCode || undefined,
    });
  };

  const handleGenerateFreeModePin = () => {
    setFreeModeConfig(prev => ({ ...prev, pinCode: generateFreeModePin() }));
  };

  const handleLiveToggle = async (key: 'openmic' | 'dediche' | 'voting', value: boolean) => {
    await updateLiveSettings({ [key]: value });
  };

  // Handler per eventi programmati
  const handleCreateNew = async () => {
    setIsSaving(true);
    const newId = await createRules({
      event_name: 'Nuovo Evento',
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
          {isFreeModeActive && freeModeSettings ? (
            // Evento libero ATTIVO
            <Card className="ring-2 ring-green-500/50 shadow-lg shadow-green-500/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="w-5 h-5 text-green-500" />
                    Evento Libero in Corso
                  </CardTitle>
                  <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{freeModeSettings.openmic_current_count}</div>
                    <div className="text-xs text-muted-foreground">
                      Canzoni {freeModeSettings.openmic_max_songs ? `/ ${freeModeSettings.openmic_max_songs}` : ''}
                    </div>
                  </div>
                  <div className="bg-pink-500/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{freeModeSettings.dediche_current_count}</div>
                    <div className="text-xs text-muted-foreground">
                      Dediche {freeModeSettings.dediche_max_total ? `/ ${freeModeSettings.dediche_max_total}` : ''}
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
                {freeModeSettings.pin_enabled && freeModeSettings.pin_code && (
                  <div className="flex items-center justify-center gap-2 bg-secondary/20 rounded-lg p-2">
                    <Lock className="w-4 h-4" />
                    <span className="font-mono font-bold tracking-widest">{freeModeSettings.pin_code}</span>
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
                        checked={freeModeSettings.openmic_enabled}
                        onCheckedChange={(v) => handleLiveToggle('openmic', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">Dediche</span>
                      </div>
                      <Switch
                        checked={freeModeSettings.dediche_enabled}
                        onCheckedChange={(v) => handleLiveToggle('dediche', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Votazioni</span>
                      </div>
                      <Switch
                        checked={freeModeSettings.voting_enabled}
                        onCheckedChange={(v) => handleLiveToggle('voting', v)}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={resetFreeModeCounters}
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
              </CardContent>
            </Card>
          ) : (
            // Configurazione evento libero (non attivo)
            <Card className={cn(
              "transition-all",
              hasLiveScheduledEvent && "opacity-50 pointer-events-none"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  Configura Evento Libero
                </CardTitle>
                <CardDescription>
                  Avvia rapidamente un evento senza programmazione avanzata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick toggles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="text-sm">Open Mic</span>
                    </div>
                    <Switch
                      checked={freeModeConfig.openmic}
                      onCheckedChange={(v) => setFreeModeConfig(c => ({ ...c, openmic: v }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-pink-500" />
                      <span className="text-sm">Dediche</span>
                    </div>
                    <Switch
                      checked={freeModeConfig.dediche}
                      onCheckedChange={(v) => setFreeModeConfig(c => ({ ...c, dediche: v }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Votazioni</span>
                    </div>
                    <Switch
                      checked={freeModeConfig.voting}
                      onCheckedChange={(v) => setFreeModeConfig(c => ({ ...c, voting: v }))}
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
                          value={freeModeConfig.maxSongs}
                          onChange={(e) => setFreeModeConfig(c => ({ ...c, maxSongs: e.target.value }))}
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
                          value={freeModeConfig.maxDediche}
                          onChange={(e) => setFreeModeConfig(c => ({ ...c, maxDediche: e.target.value }))}
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
                        value={freeModeConfig.durationMinutes}
                        onChange={(e) => setFreeModeConfig(c => ({ ...c, durationMinutes: e.target.value }))}
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
                          value={freeModeConfig.pinCode}
                          onChange={(e) => setFreeModeConfig(c => ({ ...c, pinCode: e.target.value }))}
                          className="h-8 font-mono"
                          maxLength={6}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateFreeModePin}
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
                  onClick={handleActivateFreeMode}
                  disabled={hasLiveScheduledEvent}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Avvia Evento Libero
                </Button>
              </CardContent>
            </Card>
          )}
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

                  {/* Reset contatori */}
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetScheduledCounters}
                      disabled={isSaving || (rules.openmic_current_count === 0 && rules.dediche_current_count === 0)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Azzera contatori
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs di configurazione */}
              <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="status" className="text-xs sm:text-sm">
                    Stato
                  </TabsTrigger>
                  <TabsTrigger value="window" className="text-xs sm:text-sm">
                    Finestra
                  </TabsTrigger>
                  <TabsTrigger value="limits" className="text-xs sm:text-sm">
                    Limiti
                  </TabsTrigger>
                  <TabsTrigger value="reopen" className="text-xs sm:text-sm">
                    Riapertura
                  </TabsTrigger>
                  <TabsTrigger value="closure" className="text-xs sm:text-sm">
                    Chiusura
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Stato Evento</CardTitle>
                      <CardDescription>
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
                  <EventTypeSelector rules={rules} onUpdate={updateRules} />
                  <EventPinConfig 
                    rules={rules} 
                    onUpdate={updateRules}
                    generatePin={generatePin}
                  />
                </TabsContent>

                <TabsContent value="window" className="mt-4">
                  <EventBookingWindowConfig rules={rules} onUpdate={updateRules} />
                </TabsContent>

                <TabsContent value="limits" className="mt-4">
                  <EventLimitsConfig rules={rules} onUpdate={updateRules} />
                </TabsContent>

                <TabsContent value="reopen" className="mt-4">
                  <EventReopenControl rules={rules} onUpdate={updateRules} />
                </TabsContent>

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

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Music, 
  MessageSquare, 
  RefreshCw,
  RotateCcw,
  Hash,
  Sparkles,
  Plus,
  Copy,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export const AdminEventTab: React.FC = () => {
  const { 
    rules, 
    allRules,
    liveEvent,
    loading, 
    updateRules, 
    setEventStatus,
    selectEvent,
    createRules,
    duplicateEvent,
    deleteEvent,
    resetCounters,
    generatePin,
  } = useEventBookingRules();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<'status' | 'window' | 'limits' | 'reopen' | 'closure'>('status');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
      await adminAuditLog({
        action: 'event.duplicated',
        entity: 'event_booking_rules',
        entity_id: newId,
        metadata: { source_id: rules.id },
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
      await adminAuditLog({
        action: 'event.deleted',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { event_name: rules.event_name },
      });
    }
    setIsSaving(false);
    setDeleteDialogOpen(false);
  };

  const handleResetCounters = async () => {
    if (!rules) return;
    setIsSaving(true);
    const success = await resetCounters();
    if (success) {
      toast({
        title: 'Contatori azzerati',
        description: 'I contatori prenotazioni sono stati resettati',
      });
      await adminAuditLog({
        action: 'event.counters_reset',
        entity: 'event_booking_rules',
        entity_id: rules.id,
      });
    }
    setIsSaving(false);
  };

  // Se non ci sono eventi, mostra prompt per crearne uno
  if (!rules || allRules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Calendar className="w-12 h-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Nessun evento configurato</h3>
          <p className="text-muted-foreground">Crea il tuo primo evento per iniziare</p>
        </div>
        <Button onClick={handleCreateNew} disabled={isSaving}>
          <Plus className="w-4 h-4 mr-2" />
          Crea Evento
        </Button>
      </div>
    );
  }

  const hasOtherLiveEvent = liveEvent !== null && liveEvent.id !== rules.id;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
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
              onClick={handleResetCounters}
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
            <Clock className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Finestra
          </TabsTrigger>
          <TabsTrigger value="limits" className="text-xs sm:text-sm">
            <Hash className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Limiti
          </TabsTrigger>
          <TabsTrigger value="reopen" className="text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Riapertura
          </TabsTrigger>
          <TabsTrigger value="closure" className="text-xs sm:text-sm">
            Chiusura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4 space-y-4">
          {/* Controllo Stato */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Stato Evento</CardTitle>
              <CardDescription>
                Gestisci il ciclo di vita dell'evento: Bozza → Pronto → LIVE → Chiuso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventStatusControl 
                rules={rules} 
                onStatusChange={setEventStatus}
                hasOtherLiveEvent={hasOtherLiveEvent}
              />
            </CardContent>
          </Card>

          {/* Tipo Evento */}
          <EventTypeSelector rules={rules} onUpdate={updateRules} />

          {/* PIN Config */}
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

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
            <AlertDialogDescription>
              L'evento "{rules.event_name || 'Senza nome'}" e tutte le sue configurazioni 
              saranno eliminate definitivamente. Questa azione non può essere annullata.
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
import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  FileEdit, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import type { EventBookingRules, EventStatus } from '@/hooks/useEventBookingRules';
import { cn } from '@/lib/utils';

interface Props {
  rules: EventBookingRules;
  onStatusChange: (eventId: string, status: EventStatus) => Promise<boolean>;
  hasOtherLiveEvent?: boolean;
}

const STATUS_CONFIG: Record<EventStatus, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  draft: { 
    label: 'Bozza', 
    icon: FileEdit, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  ready: { 
    label: 'Pronto', 
    icon: CheckCircle2, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  live: { 
    label: 'LIVE', 
    icon: Play, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
  },
  closed: { 
    label: 'Chiuso', 
    icon: Square, 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
};

export const EventStatusControl: React.FC<Props> = ({ 
  rules, 
  onStatusChange,
  hasOtherLiveEvent = false,
}) => {
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);
  const currentStatus = rules.event_status;
  const config = STATUS_CONFIG[currentStatus];
  const StatusIcon = config.icon;

  const handleStatusChange = async (newStatus: EventStatus) => {
    setIsChanging(true);
    const success = await onStatusChange(rules.id, newStatus);
    
    if (success) {
      toast({
        title: `Stato aggiornato`,
        description: `L'evento è ora in stato "${STATUS_CONFIG[newStatus].label}"`,
      });
      await adminAuditLog({
        action: `event.status_changed`,
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { 
          event_name: rules.event_name,
          from: currentStatus,
          to: newStatus,
        },
      });
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile cambiare lo stato',
        variant: 'destructive',
      });
    }
    setIsChanging(false);
  };

  // Determina le azioni disponibili in base allo stato corrente
  const getAvailableActions = (): { status: EventStatus; label: string; variant: 'default' | 'destructive' | 'outline' }[] => {
    switch (currentStatus) {
      case 'draft':
        return [
          { status: 'ready', label: 'Segna come Pronto', variant: 'outline' },
        ];
      case 'ready':
        return [
          { status: 'live', label: 'Vai LIVE', variant: 'default' },
          { status: 'draft', label: 'Torna a Bozza', variant: 'outline' },
        ];
      case 'live':
        return [
          { status: 'closed', label: 'Chiudi Evento', variant: 'destructive' },
        ];
      case 'closed':
        return [
          { status: 'ready', label: 'Riapri (Pronto)', variant: 'outline' },
        ];
      default:
        return [];
    }
  };

  const actions = getAvailableActions();

  return (
    <div className="space-y-4">
      {/* Stato attuale */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-lg border-2",
        currentStatus === 'live' ? "border-green-500/50" : "border-border"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          config.bgColor
        )}>
          <StatusIcon className={cn("w-6 h-6", config.color)} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Stato Evento</p>
          <p className={cn("text-lg font-bold", config.color)}>
            {config.label}
          </p>
        </div>
        <Badge 
          variant={currentStatus === 'live' ? 'default' : 'secondary'}
          className={cn(
            currentStatus === 'live' && "bg-green-500 hover:bg-green-600 animate-pulse"
          )}
        >
          {config.label}
        </Badge>
      </div>

      {/* Warning se c'è un altro evento live */}
      {hasOtherLiveEvent && currentStatus !== 'live' && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Attenzione: c'è già un evento LIVE
            </p>
            <p className="text-muted-foreground">
              Attivando questo evento, l'altro verrà automaticamente chiuso.
            </p>
          </div>
        </div>
      )}

      {/* Azioni disponibili */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          // Se stiamo andando live, mostra conferma
          if (action.status === 'live') {
            return (
              <AlertDialog key={action.status}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant={action.variant}
                    disabled={isChanging}
                    className="gap-2"
                  >
                    {isChanging ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {action.label}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Attivare l'evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {hasOtherLiveEvent ? (
                        <>
                          <strong className="text-amber-600">Attenzione:</strong> c'è già un evento LIVE.
                          Attivando questo evento, l'altro verrà automaticamente chiuso.
                        </>
                      ) : (
                        <>
                          L'evento "{rules.event_name || 'Senza nome'}" diventerà visibile agli utenti.
                          {rules.pin_required && (
                            <span className="block mt-2">
                              🔐 Gli utenti dovranno inserire il PIN per accedere.
                            </span>
                          )}
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange('live')}>
                      Vai LIVE
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          }

          // Se stiamo chiudendo, mostra conferma
          if (action.status === 'closed') {
            return (
              <AlertDialog key={action.status}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant={action.variant}
                    disabled={isChanging}
                    className="gap-2"
                  >
                    {isChanging ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {action.label}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Chiudere l'evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'evento "{rules.event_name || 'Senza nome'}" non sarà più accessibile agli utenti.
                      I dati delle prenotazioni saranno mantenuti.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleStatusChange('closed')}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Chiudi Evento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          }

          // Altre azioni senza conferma
          return (
            <Button
              key={action.status}
              variant={action.variant}
              disabled={isChanging}
              onClick={() => handleStatusChange(action.status)}
              className="gap-2"
            >
              {isChanging && <Loader2 className="w-4 h-4 animate-spin" />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, Play, Square, Clock, Music, MessageSquare, 
  ThumbsUp, Lock, Users, RotateCcw, AlertCircle 
} from 'lucide-react';
import { useEventBookingRules, EventBookingRules } from '@/hooks/useEventBookingRules';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface EventControlPanelProps {
  onOpenEventConfig?: () => void;
}

export const EventControlPanel: React.FC<EventControlPanelProps> = ({ onOpenEventConfig }) => {
  const { 
    liveEvent, 
    allRules, 
    loading, 
    goLive, 
    closeEvent,
    updateRules,
  } = useEventBookingRules();

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

  // Get ready events (can be put live)
  const readyEvents = allRules.filter(e => e.event_status === 'ready');
  const draftEvents = allRules.filter(e => e.event_status === 'draft');

  const handleToggleVoting = async (enabled: boolean) => {
    if (liveEvent) {
      await updateRules({ voting_enabled: enabled });
    }
  };

  return (
    <Card className={cn(
      "glass-card overflow-hidden transition-all duration-300",
      liveEvent && "ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className={cn("w-5 h-5", liveEvent ? "text-blue-500" : "text-muted-foreground")} />
            Evento Programmato
          </CardTitle>
          {liveEvent && (
            <Badge variant="default" className="bg-blue-500 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Live event display */}
        {liveEvent && (
          <div className="space-y-4">
            {/* Event info */}
            <div className="bg-blue-500/10 rounded-lg p-3">
              <h4 className="font-semibold text-lg">{liveEvent.event_name || 'Evento Live'}</h4>
              {liveEvent.event_date && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(liveEvent.event_date), 'EEEE d MMMM', { locale: it })}
                  {liveEvent.event_start_time && ` • ${liveEvent.event_start_time.slice(0, 5)}`}
                  {liveEvent.event_end_time && ` - ${liveEvent.event_end_time.slice(0, 5)}`}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{liveEvent.openmic_current_count}</div>
                <div className="text-xs text-muted-foreground">
                  Canzoni {liveEvent.openmic_max_songs ? `/ ${liveEvent.openmic_max_songs}` : ''}
                </div>
              </div>
              <div className="bg-pink-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{liveEvent.dediche_current_count}</div>
                <div className="text-xs text-muted-foreground">
                  Dediche {liveEvent.dediche_max_total ? `/ ${liveEvent.dediche_max_total}` : ''}
                </div>
              </div>
            </div>

            {/* Format toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="text-sm">Open Mic</span>
                </div>
                <Badge variant={liveEvent.openmic_enabled ? "default" : "secondary"}>
                  {liveEvent.openmic_enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                  <span className="text-sm">Dediche</span>
                </div>
                <Badge variant={liveEvent.dediche_enabled ? "default" : "secondary"}>
                  {liveEvent.dediche_enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Votazioni</span>
                </div>
                <Switch
                  checked={liveEvent.voting_enabled ?? true}
                  onCheckedChange={handleToggleVoting}
                />
              </div>
            </div>

            {/* PIN */}
            {liveEvent.pin_required && liveEvent.pin_code && (
              <div className="flex items-center justify-center gap-2 bg-secondary/20 rounded-lg p-2">
                <Lock className="w-4 h-4" />
                <span className="font-mono font-bold tracking-widest">{liveEvent.pin_code}</span>
              </div>
            )}

            {/* Reopen status */}
            {liveEvent.reopen_active && (
              <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 rounded-lg p-2">
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm font-medium">Riapertura straordinaria attiva</span>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onOpenEventConfig}
              >
                Configura
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => closeEvent(liveEvent.id)}
              >
                <Square className="w-4 h-4 mr-2" />
                Chiudi
              </Button>
            </div>
          </div>
        )}

        {/* No live event */}
        {!liveEvent && (
          <div className="space-y-4">
            {readyEvents.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  {readyEvents.length} evento/i pronto/i per andare live
                </p>
                {readyEvents.slice(0, 3).map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{event.event_name || 'Evento'}</p>
                      {event.event_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.event_date), 'd MMM', { locale: it })}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => goLive(event.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Live
                    </Button>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nessun evento programmato pronto
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vai al tab "Evento" per creare o preparare eventi
                </p>
              </div>
            )}

            {draftEvents.length > 0 && (
              <div className="text-center">
                <Badge variant="secondary">
                  {draftEvents.length} bozza/e
                </Badge>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={onOpenEventConfig}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Gestisci Eventi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Music, 
  MessageSquare, 
  AlertTriangle,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Settings2,
  Timer,
  Hash,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventBookingRules } from '@/hooks/useEventBookingRules';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import { cn } from '@/lib/utils';
import { EventBookingWindowConfig } from './EventBookingWindowConfig';
import { EventLimitsConfig } from './EventLimitsConfig';
import { EventReopenControl } from './EventReopenControl';
import { EventClosureConfig } from './EventClosureConfig';

export const AdminEventTab: React.FC = () => {
  const { rules, loading, updateRules, toggleActive, resetCounters } = useEventBookingRules();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<'window' | 'limits' | 'reopen' | 'closure'>('window');
  const [isSaving, setIsSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <p className="text-muted-foreground">Nessuna regola evento configurata</p>
      </div>
    );
  }

  const handleToggleActive = async () => {
    setIsSaving(true);
    const success = await toggleActive(!rules.is_active);
    if (success) {
      toast({
        title: rules.is_active ? 'Regole disattivate' : 'Regole attivate',
        description: rules.is_active 
          ? 'Le limitazioni prenotazioni sono ora disattive' 
          : 'Le limitazioni prenotazioni sono ora attive',
      });
      await adminAuditLog({
        action: rules.is_active ? 'event.rules_deactivated' : 'event.rules_activated',
        entity: 'event_booking_rules',
        entity_id: rules.id,
        metadata: { event_name: rules.event_name },
      });
    }
    setIsSaving(false);
  };

  const handleResetCounters = async () => {
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

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header con stato e toggle */}
      <Card className={cn(
        "border-2 transition-colors",
        rules.is_active ? "border-green-500/50 bg-green-500/5" : "border-muted"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                rules.is_active ? "bg-green-500/20" : "bg-muted"
              )}>
                {rules.is_active ? (
                  <Power className="w-5 h-5 text-green-500" />
                ) : (
                  <PowerOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {rules.event_name || 'Regole Evento'}
                </CardTitle>
                <CardDescription>
                  {rules.is_active ? (
                    <span className="text-green-600 dark:text-green-400">
                      Limitazioni attive
                    </span>
                  ) : (
                    'Limitazioni disattive'
                  )}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={rules.is_active ? "default" : "secondary"}>
                {rules.is_active ? 'ATTIVO' : 'SPENTO'}
              </Badge>
              <Switch
                checked={rules.is_active}
                onCheckedChange={handleToggleActive}
                disabled={isSaving}
              />
            </div>
          </div>
        </CardHeader>

        {/* Stats rapide */}
        <CardContent className="pt-0">
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
        <TabsList className="grid w-full grid-cols-4">
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
            <Settings2 className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Chiusura
          </TabsTrigger>
        </TabsList>

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
  );
};

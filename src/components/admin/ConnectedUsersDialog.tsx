import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Smartphone,
  Tablet,
  Monitor,
  Trash2,
  RefreshCw,
  Mic2,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface PinSessionInfo {
  id: string;
  format: string;
  device_fingerprint: string | null;
  created_at: string;
  last_validated_at: string;
}

interface ConnectedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveSessionId: string;
  onSessionsChanged?: () => void;
}

/** Parse user-agent string into device type and short label */
function parseDevice(ua: string | null): { type: 'mobile' | 'tablet' | 'desktop'; label: string } {
  if (!ua) return { type: 'desktop', label: 'Sconosciuto' };

  const lower = ua.toLowerCase();

  // Detect tablet
  if (lower.includes('ipad') || (lower.includes('android') && !lower.includes('mobile'))) {
    const browser = getBrowserName(lower);
    return { type: 'tablet', label: `Tablet — ${browser}` };
  }

  // Detect mobile
  if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
    const browser = getBrowserName(lower);
    return { type: 'mobile', label: `Mobile — ${browser}` };
  }

  // Desktop
  const browser = getBrowserName(lower);
  return { type: 'desktop', label: `Desktop — ${browser}` };
}

function getBrowserName(ua: string): string {
  if (ua.includes('crios') || ua.includes('chrome')) return 'Chrome';
  if (ua.includes('fxios') || ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Browser';
}

const DeviceIcon: React.FC<{ type: 'mobile' | 'tablet' | 'desktop'; className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'mobile': return <Smartphone className={className} />;
    case 'tablet': return <Tablet className={className} />;
    default: return <Monitor className={className} />;
  }
};

const FormatBadge: React.FC<{ format: string }> = ({ format }) => {
  if (format === 'openmic') {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 border-primary/30 text-primary">
        <Mic2 className="w-2.5 h-2.5" /> Open Mic
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 border-secondary/30 text-secondary">
      <MessageSquare className="w-2.5 h-2.5" /> Dediche
    </Badge>
  );
};

export const ConnectedUsersDialog: React.FC<ConnectedUsersDialogProps> = ({
  open,
  onOpenChange,
  liveSessionId,
  onSessionsChanged,
}) => {
  const [sessions, setSessions] = useState<PinSessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kicking, setKicking] = useState<Set<string>>(new Set());

  const fetchSessions = useCallback(async () => {
    if (!liveSessionId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_active_pin_sessions', {
        p_live_session_id: liveSessionId,
      });
      if (error) {
        console.error('Error fetching sessions:', error);
        toast.error('Errore nel caricamento sessioni');
      } else {
        setSessions((data as PinSessionInfo[]) || []);
      }
    } finally {
      setLoading(false);
    }
  }, [liveSessionId]);

  useEffect(() => {
    if (open) {
      fetchSessions();
      setSelected(new Set());
    }
  }, [open, fetchSessions]);

  // Auto-refresh every 10s while open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [open, fetchSessions]);

  const kickSession = async (sessionId: string) => {
    setKicking(prev => new Set(prev).add(sessionId));
    try {
      const { data, error } = await supabase.rpc('invalidate_single_pin_session', {
        p_session_id: sessionId,
        p_reason: 'admin_kick',
      });
      if (error) {
        toast.error('Errore nella disconnessione');
        console.error(error);
      } else {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setSelected(prev => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
        toast.success('Utente disconnesso');
        onSessionsChanged?.();
      }
    } finally {
      setKicking(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const kickSelected = async () => {
    const ids = Array.from(selected);
    setKicking(new Set(ids));
    let count = 0;
    for (const id of ids) {
      const { error } = await supabase.rpc('invalidate_single_pin_session', {
        p_session_id: id,
        p_reason: 'admin_kick',
      });
      if (!error) count++;
    }
    setSessions(prev => prev.filter(s => !selected.has(s.id)));
    setSelected(new Set());
    setKicking(new Set());
    toast.success(`${count} utenti disconnessi`);
    onSessionsChanged?.();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map(s => s.id)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Utenti connessi ({sessions.length})
          </DialogTitle>
          <DialogDescription>
            Gestisci gli utenti connessi tramite PIN. Puoi disconnetterne uno o più.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <Checkbox
                  checked={sessions.length > 0 && selected.size === sessions.length}
                  onCheckedChange={toggleAll}
                  className="w-4 h-4"
                />
                Seleziona tutti
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1">
                    <Trash2 className="w-3 h-3" />
                    Disconnetti ({selected.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnettere {selected.size} utenti?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Gli utenti selezionati dovranno reinserire il PIN.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={kickSelected}>Conferma</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="ghost" onClick={fetchSessions} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Session List */}
        <ScrollArea className="max-h-[50vh]">
          {loading && sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Caricamento...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessun utente connesso</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const device = parseDevice(s.device_fingerprint);
                const isKicking = kicking.has(s.id);
                const isSelected = selected.has(s.id);

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      isSelected ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-transparent",
                      isKicking && "opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(s.id)}
                      className="w-4 h-4 flex-shrink-0"
                      disabled={isKicking}
                    />

                    <DeviceIcon type={device.type} className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{device.label}</span>
                        <FormatBadge format={s.format} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: it })}
                        </span>
                        <span>
                          Ultimo check: {formatDate(new Date(s.last_validated_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => kickSession(s.id)}
                      disabled={isKicking}
                    >
                      {isKicking ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

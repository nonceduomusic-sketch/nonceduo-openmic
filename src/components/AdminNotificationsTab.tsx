import React, { useState, useMemo } from 'react';
import {
  Users,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Info,
  AlertCircle,
  Lock,
  Bell,
  BellOff,
  CheckCheck,
  Filter,
  Mic2,
  Heart,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useFormatPreferences, FormatPreferences } from '@/hooks/useFormatPreferences';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { FormatToggleCard } from '@/components/admin/FormatToggleCard';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { UnifiedLiveSessionCard } from '@/components/admin/UnifiedLiveSessionCard';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AdminMainTab } from '@/components/admin/AdminSidebar';

interface AdminNotificationsTabProps {
  onNavigate?: (tab: AdminMainTab, subTab?: string) => void;
  access?: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
  };
  isOwner?: boolean;
}

type NotificationType = 'all' | 'openmic' | 'dediche' | 'community';

interface NotificationItem {
  id: string;
  type: 'join_request' | 'reservation' | 'message_dediche' | 'message_community';
  title: string;
  subtitle: string;
  timestamp: Date;
  isUnread: boolean;
  section: NotificationType;
  action?: () => void;
  data?: any;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({ 
  onNavigate,
  access = { openmic: true, dediche: true, community: true },
  isOwner = false
}) => {
  const { 
    preferences, 
    loading: prefsLoading, 
    toggleFormat, 
    hasActiveFormats 
  } = useFormatPreferences();

  const {
    permissions: centroPerms,
    loading: permsLoading,
  } = useCentroPermissions();
  
  const {
    joinRequests,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
  } = useAdminNotifications({ formatPreferences: preferences });

  // UI State
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Calculate total unread count
  const totalUnread = useMemo(() => {
    return counts.pendingJoinRequests + 
           counts.unreadDedicheMessages + 
           counts.unreadCommunityMessages + 
           counts.newReservations;
  }, [counts]);

  // Build unified notification list
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // Add join requests
    if (preferences.community && access.community) {
      joinRequests.forEach(req => {
        items.push({
          id: `join-${req.id}`,
          type: 'join_request',
          title: req.requester_name,
          subtitle: `Vuole entrare in: ${req.conversation?.name || 'Gruppo'}`,
          timestamp: new Date(req.created_at),
          isUnread: true,
          section: 'community',
          data: req,
        });
      });
    }

    // Add placeholder items for counts (these are summaries, not individual items)
    // In a real implementation, you'd fetch individual notifications
    if (preferences.openmic && access.openmic && counts.newReservations > 0) {
      items.push({
        id: 'reservations-summary',
        type: 'reservation',
        title: `${counts.newReservations} prenotazioni oggi`,
        subtitle: 'Nuove prenotazioni Open Mic',
        timestamp: new Date(),
        isUnread: true,
        section: 'openmic',
        action: () => onNavigate?.('openmic'),
      });
    }

    if (preferences.dediche && access.dediche && counts.unreadDedicheMessages > 0) {
      items.push({
        id: 'dediche-summary',
        type: 'message_dediche',
        title: `${counts.unreadDedicheMessages} messaggi non letti`,
        subtitle: 'Nuove dediche da leggere',
        timestamp: new Date(),
        isUnread: true,
        section: 'dediche',
        action: () => onNavigate?.('dediche'),
      });
    }

    if (preferences.community && access.community && counts.unreadCommunityMessages > 0) {
      items.push({
        id: 'community-summary',
        type: 'message_community',
        title: `${counts.unreadCommunityMessages} messaggi non letti`,
        subtitle: 'Nuovi messaggi Community',
        timestamp: new Date(),
        isUnread: true,
        section: 'community',
        action: () => onNavigate?.('community', 'groups'),
      });
    }

    // Sort by timestamp (newest first), unread first
    return items.sort((a, b) => {
      if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [joinRequests, counts, preferences, access, onNavigate]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    if (showOnlyUnread) {
      filtered = filtered.filter(n => n.isUnread);
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.section === filterType);
    }
    
    return filtered;
  }, [notifications, showOnlyUnread, filterType]);

  // Check permissions
  const canMonitor = isOwner || centroPerms.monitorFormats;
  const canManageActive = isOwner || centroPerms.activeFormats;
  const canManageSerata = isOwner || centroPerms.serataLive;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'join_request':
        return <Users className="w-5 h-5 text-primary" />;
      case 'reservation':
        return <Mic2 className="w-5 h-5 text-warning" />;
      case 'message_dediche':
        return <Heart className="w-5 h-5 text-secondary" />;
      case 'message_community':
        return <MessageCircle className="w-5 h-5 text-accent" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSectionBadge = (section: NotificationType) => {
    switch (section) {
      case 'openmic':
        return <Badge className="bg-warning/20 text-warning text-xs">Open Mic</Badge>;
      case 'dediche':
        return <Badge className="bg-secondary/20 text-secondary text-xs">Dediche</Badge>;
      case 'community':
        return <Badge className="bg-accent/20 text-accent text-xs">Community</Badge>;
      default:
        return null;
    }
  };

  if (loading || prefsLoading || permsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ========== STICKY HEADER - Numero notifiche in evidenza ========== */}
      <div className="sticky top-0 z-10 bg-card/98 backdrop-blur-xl border-b border-border/50 px-4 py-4 safe-area-top">
        {/* Main notification count - VERY PROMINENT */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Big notification badge */}
            <div className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-2xl",
              totalUnread > 0 
                ? "bg-destructive/20 border-2 border-destructive" 
                : "bg-muted border border-border"
            )}>
              {totalUnread > 0 ? (
                <>
                  <span className="text-2xl font-bold text-destructive">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                  {/* Pulsing dot for new notifications */}
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
                </>
              ) : (
                <BellOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            
            {/* Text description */}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {totalUnread > 0 
                  ? `Hai ${totalUnread} ${totalUnread === 1 ? 'nuova notifica' : 'nuove notifiche'}`
                  : 'Nessuna nuova notifica'
                }
              </h2>
              <p className="text-sm text-muted-foreground">
                {totalUnread > 0 
                  ? 'Scorri per vedere i dettagli'
                  : 'Sei aggiornato su tutto!'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Quick filter toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showOnlyUnread ? "default" : "outline"}
            size="sm"
            className="h-9 px-3 text-sm rounded-xl"
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          >
            {showOnlyUnread ? <Bell className="w-4 h-4 mr-1.5" /> : <CheckCheck className="w-4 h-4 mr-1.5" />}
            {showOnlyUnread ? 'Solo nuove' : 'Tutte'}
          </Button>
          
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            className="h-9 px-3 text-sm rounded-xl"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filtra
          </Button>

          <div className="flex-1" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-sm rounded-xl text-muted-foreground"
            onClick={() => setShowSettings(!showSettings)}
          >
            Impostazioni
            {showSettings ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>

        {/* Filter chips - only show when filters open */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {[
              { key: 'all' as const, label: 'Tutte', count: notifications.length },
              { key: 'openmic' as const, label: 'Open Mic', count: counts.newReservations, color: 'text-warning' },
              { key: 'dediche' as const, label: 'Dediche', count: counts.unreadDedicheMessages, color: 'text-secondary' },
              { key: 'community' as const, label: 'Community', count: counts.pendingJoinRequests + counts.unreadCommunityMessages, color: 'text-accent' },
            ].map(f => (
              <Button
                key={f.key}
                variant={filterType === f.key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 px-3 text-sm rounded-full",
                  filterType === f.key && f.color
                )}
                onClick={() => setFilterType(f.key)}
              >
                {f.label}
                {f.count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {f.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ========== NOTIFICATION LIST - Scrollable ========== */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {showOnlyUnread ? 'Nessuna nuova notifica' : 'Nessuna notifica'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {showOnlyUnread 
                ? 'Hai letto tutte le notifiche!' 
                : 'Le notifiche appariranno qui quando ci saranno novità'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border transition-all duration-200",
                  "touch-target min-h-[72px]", // Minimum touch target
                  notification.isUnread 
                    ? "bg-card border-border shadow-sm" 
                    : "bg-muted/30 border-transparent",
                  (notification.action || notification.type === 'join_request') && 
                    "cursor-pointer hover:bg-muted/50 active:scale-[0.98]"
                )}
                onClick={() => {
                  if (notification.action) {
                    notification.action();
                  }
                }}
              >
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
                  notification.isUnread ? "bg-primary/10" : "bg-muted"
                )}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "font-medium text-base truncate",
                          notification.isUnread ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </span>
                        {notification.isUnread && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-destructive" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.subtitle}
                      </p>
                    </div>
                    
                    {/* Timestamp & Section Badge */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(notification.timestamp, { 
                          addSuffix: false, 
                          locale: it 
                        })}
                      </span>
                      {getSectionBadge(notification.section)}
                    </div>
                  </div>

                  {/* Actions for join requests */}
                  {notification.type === 'join_request' && notification.data && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-10 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveJoinRequest(notification.data.id);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Approva
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-10 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectJoinRequest(notification.data.id);
                        }}
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Rifiuta
                      </Button>
                    </div>
                  )}

                  {/* Navigate arrow for summary items */}
                  {notification.action && notification.type !== 'join_request' && (
                    <div className="flex items-center gap-1 mt-2 text-primary text-sm">
                      <span>Vai alla sezione</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== SETTINGS SECTION - Collapsible at bottom ========== */}
      {showSettings && (
        <div className="border-t border-border bg-muted/30 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="px-4 py-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Impostazioni Centro Notifiche
            </h3>

            {/* Format Configuration */}
            {canMonitor && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-12 px-3 rounded-xl">
                    <span className="text-sm">Configurazione Monitoraggio</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <FormatToggleCard 
                    preferences={preferences} 
                    onToggle={toggleFormat}
                    access={access}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Active Formats */}
            {canManageActive && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-12 px-3 rounded-xl">
                    <span className="text-sm">Format Attivi (Pubblico)</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <ActiveFormatsCard />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Serata Live */}
            {canManageSerata && (access.openmic || access.dediche) && (preferences.openmic || preferences.dediche) && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-12 px-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Serata Live con PIN</span>
                      {isOwner && <Lock className="w-4 h-4 text-warning" />}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <UnifiedLiveSessionCard title="Serata Live" />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* No formats warning */}
            {canMonitor && !hasActiveFormats && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Attiva almeno un format per vedere le metriche
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Info Section */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-12 px-3 rounded-xl text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">Info: Amicizie e Moderazione</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-3">
                <div className="text-sm text-muted-foreground space-y-2 bg-muted/50 rounded-xl p-3">
                  <p>
                    <strong>Amicizie:</strong> Gli utenti gestiscono le amicizie direttamente. 
                    Non è necessario approvare le richieste.
                  </p>
                  <p>
                    <strong>Gruppi:</strong> I gruppi con "richiedi approvazione" 
                    mostrano le richieste qui sopra.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      )}
    </div>
  );
};

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
  Mic2,
  Heart,
  MessageCircle,
  Calendar,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useFormatPreferences, FormatPreferences } from '@/hooks/useFormatPreferences';
import { useCentroPermissions } from '@/hooks/useCentroPermissions';
import { FormatToggleCard } from '@/components/admin/FormatToggleCard';
import { ActiveFormatsCard } from '@/components/admin/ActiveFormatsCard';
import { LiveStatusCard } from '@/components/admin/LiveStatusCard';
import { PinProtectionCard } from '@/components/admin/PinProtectionCard';
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

// Category card configuration
interface CategoryCard {
  key: NotificationType;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  getCount: (counts: { newReservations: number; unreadDedicheMessages: number; unreadCommunityMessages: number; pendingJoinRequests: number }) => number;
  navigateTo?: { tab: AdminMainTab; subTab?: string };
  gatedBy?: 'openmic' | 'dediche' | 'community';
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    key: 'openmic',
    label: 'Open Mic',
    icon: <Mic2 className="w-6 h-6" />,
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    getCount: (c) => c.newReservations,
    navigateTo: { tab: 'openmic' },
    gatedBy: 'openmic',
  },
  {
    key: 'dediche',
    label: 'Dediche',
    icon: <Heart className="w-6 h-6" />,
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/40',
    textColor: 'text-pink-400',
    getCount: (c) => c.unreadDedicheMessages,
    navigateTo: { tab: 'dediche' },
    gatedBy: 'dediche',
  },
  {
    key: 'community',
    label: 'Community',
    icon: <MessageCircle className="w-6 h-6" />,
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-400',
    getCount: (c) => c.unreadCommunityMessages + c.pendingJoinRequests,
    navigateTo: { tab: 'community', subTab: 'groups' },
    gatedBy: 'community',
  },
];

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
    markSectionAsRead,
    markAllAsRead,
  } = useAdminNotifications({ formatPreferences: preferences });

  // UI State
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [showSettings, setShowSettings] = useState(false);
  
  // Category visibility state (persisted in localStorage)
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin-centro-category-visibility');
      return saved ? JSON.parse(saved) : { openmic: true, dediche: true, community: true };
    } catch {
      return { openmic: true, dediche: true, community: true };
    }
  });

  const toggleCategoryVisibility = (key: string) => {
    setCategoryVisibility(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('admin-centro-category-visibility', JSON.stringify(updated));
      return updated;
    });
  };

  // Calculate total unread count
  const totalUnread = useMemo(() => {
    return counts.pendingJoinRequests + 
           counts.unreadDedicheMessages + 
           counts.unreadCommunityMessages + 
           counts.newReservations;
  }, [counts]);

  // Build unified notification list - ONLY for visible categories
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // Add join requests - only if community is VISIBLE in centro
    if (preferences.community && access.community && categoryVisibility.community) {
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

    // Add placeholder items for counts (summaries) - only for VISIBLE categories
    if (preferences.openmic && access.openmic && categoryVisibility.openmic && counts.newReservations > 0) {
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

    if (preferences.dediche && access.dediche && categoryVisibility.dediche && counts.unreadDedicheMessages > 0) {
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

    if (preferences.community && access.community && categoryVisibility.community && counts.unreadCommunityMessages > 0) {
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
  }, [joinRequests, counts, preferences, access, categoryVisibility, onNavigate]);

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

  // Get visible category cards - COMPLETELY HIDDEN when visibility is off
  const visibleCards = useMemo(() => {
    return CATEGORY_CARDS.filter(card => {
      // Check access permission
      if (card.gatedBy && !access[card.gatedBy]) return false;
      // Check preferences (monitoring enabled)
      if (card.gatedBy && !preferences[card.gatedBy]) return false;
      // Check visibility toggle - when OFF, category is completely hidden from Centro
      if (!categoryVisibility[card.key]) return false;
      return true;
    });
  }, [access, preferences, categoryVisibility]);

  // Filter notifications based on visible categories (hidden categories = no notifications shown)
  const visibleCategoryKeys = useMemo(() => 
    new Set(visibleCards.map(c => c.key)), 
    [visibleCards]
  );

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'join_request':
        return <Users className="w-5 h-5 text-primary" />;
      case 'reservation':
        return <Mic2 className="w-5 h-5 text-amber-400" />;
      case 'message_dediche':
        return <Heart className="w-5 h-5 text-pink-400" />;
      case 'message_community':
        return <MessageCircle className="w-5 h-5 text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSectionBadge = (section: NotificationType) => {
    switch (section) {
      case 'openmic':
        return <Badge className="bg-amber-500/20 text-amber-400 text-xs">Open Mic</Badge>;
      case 'dediche':
        return <Badge className="bg-pink-500/20 text-pink-400 text-xs">Dediche</Badge>;
      case 'community':
        return <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">Community</Badge>;
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
    <div className="flex flex-col h-full overflow-hidden no-horizontal-scroll">
      {/* ========== STICKY HEADER - Compact mobile header ========== */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-2xl border-b border-border/30 px-3 py-3">
        {/* Main row: badge + actions */}
        <div className="flex items-center gap-3">
          {/* Notification count badge - compact but eye-catching */}
          <div className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-xl transition-all shrink-0",
            totalUnread > 0 
              ? "bg-gradient-to-br from-destructive/25 to-destructive/10 border border-destructive/50" 
              : "bg-muted/50 border border-border/50"
          )}>
            {totalUnread > 0 ? (
              <>
                <span className="text-xl font-bold text-destructive">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
              </>
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          
          {/* Text + quick actions */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-tight truncate">
              {totalUnread > 0 
                ? `${totalUnread} ${totalUnread === 1 ? 'notifica' : 'notifiche'}`
                : 'Tutto in ordine'
              }
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalUnread > 0 ? 'Da gestire' : 'Nessuna azione richiesta'}
            </p>
          </div>

          {/* Settings button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-muted-foreground shrink-0"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick actions bar - simpler */}
        <div className="flex items-center gap-2 mt-2.5">
          <Button
            variant={showOnlyUnread ? "default" : "outline"}
            size="sm"
            className="h-9 px-3 text-xs rounded-xl font-medium"
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          >
            {showOnlyUnread ? <Bell className="w-3.5 h-3.5 mr-1.5" /> : <CheckCheck className="w-3.5 h-3.5 mr-1.5" />}
            {showOnlyUnread ? 'Solo nuove' : 'Tutte'}
          </Button>

          {totalUnread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-xs rounded-xl text-muted-foreground"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Segna letto
            </Button>
          )}
        </div>
      </div>

      {/* ========== CATEGORY CARDS GRID - Compact mobile ========== */}
      {visibleCards.length > 0 && (
        <div className="px-3 py-3 border-b border-border/20 bg-gradient-to-b from-card/50 to-transparent">
          <div className="grid grid-cols-3 gap-2">
            {visibleCards.map((card) => {
              const count = card.getCount(counts);
              const isActive = filterType === card.key;
              
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    if (card.navigateTo) {
                      setFilterType(isActive ? 'all' : card.key);
                    }
                  }}
                  onDoubleClick={() => {
                    if (card.navigateTo) {
                      onNavigate?.(card.navigateTo.tab, card.navigateTo.subTab);
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150",
                    "min-h-[80px] w-full overflow-hidden",
                    "active:scale-[0.97]",
                    card.bgColor,
                    isActive 
                      ? cn(card.borderColor, "shadow-md") 
                      : "border-transparent",
                  )}
                >
                  {/* Unread badge */}
                  {count > 0 && (
                    <div className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {count > 99 ? '99+' : count}
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className={cn("mb-1.5", card.textColor)}>
                    {React.cloneElement(card.icon as React.ReactElement, { className: "w-6 h-6" })}
                  </div>
                  
                  {/* Label */}
                  <span className={cn("text-xs font-medium truncate max-w-full", card.textColor)}>
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== NOTIFICATION LIST - Scrollable ========== */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Active filter indicator */}
        {filterType !== 'all' && (
          <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">
              Filtro: <strong className="text-foreground">{CATEGORY_CARDS.find(c => c.key === filterType)?.label}</strong>
            </span>
            <div className="flex items-center gap-2">
              {/* Mark section as read - only for dediche and community */}
              {(filterType === 'dediche' || filterType === 'community') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-secondary/50 text-secondary hover:bg-secondary/10"
                  onClick={() => markSectionAsRead(filterType as 'dediche' | 'community')}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Segna letti
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setFilterType('all')}
              >
                <X className="w-3 h-3 mr-1" />
                Rimuovi
              </Button>
            </div>
          </div>
        )}

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
                : filterType !== 'all'
                  ? `Nessuna notifica per ${CATEGORY_CARDS.find(c => c.key === filterType)?.label}`
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
                  "touch-target min-h-[72px]",
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
                        className="flex-1 h-10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-xl"
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
                        className="flex-1 h-10 border-destructive/50 text-destructive hover:bg-destructive/20 rounded-xl"
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
          <div className="px-4 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Impostazioni Centro Notifiche
            </h3>

            {/* Category Visibility Toggles */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Visibilità Categorie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {CATEGORY_CARDS.map(card => {
                  const hasAccess = !card.gatedBy || access[card.gatedBy];
                  const isEnabled = preferences[card.gatedBy || 'openmic'];
                  
                  return (
                    <div 
                      key={card.key}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl",
                        card.bgColor
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={card.textColor}>
                          {card.icon}
                        </div>
                        <div>
                          <span className={cn("font-medium text-sm", card.textColor)}>
                            {card.label}
                          </span>
                          {(!hasAccess || !isEnabled) && (
                            <p className="text-xs text-muted-foreground">
                              {!hasAccess ? 'Accesso non autorizzato' : 'Monitoraggio disabilitato'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={categoryVisibility[card.key] && hasAccess && isEnabled}
                        onCheckedChange={() => toggleCategoryVisibility(card.key)}
                        disabled={!hasAccess || !isEnabled}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

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
                <CollapsibleContent className="pt-2 space-y-3">
                  <LiveStatusCard title="Stato Evento" />
                  <PinProtectionCard title="Protezione PIN" />
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

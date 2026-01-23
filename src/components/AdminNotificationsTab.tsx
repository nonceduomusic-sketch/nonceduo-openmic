import React, { useState } from 'react';
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
import { FormatToggleCard } from '@/components/admin/FormatToggleCard';
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
    joinRequests,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
  } = useAdminNotifications({ formatPreferences: preferences });

  // Sections state
  const [openSections, setOpenSections] = useState({
    joinRequests: true,
    info: false,
    config: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSectionBadge = (section?: string) => {
    if (!section) return null;
    return section === 'dediche' 
      ? <Badge className="bg-primary/20 text-primary">Dediche</Badge>
      : <Badge className="bg-secondary/20 text-secondary">Community</Badge>;
  };

  if (loading || prefsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 overflow-x-hidden pb-4">
      {/* Format Configuration Card */}
      <Collapsible open={openSections.config} onOpenChange={() => toggleSection('config')}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer group mb-2 py-1">
            <h3 className="text-base md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              {openSections.config ? (
                <ChevronDown className="w-5 h-5 md:w-4 md:h-4" />
              ) : (
                <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
              )}
              Configurazione Monitoraggio
            </h3>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <FormatToggleCard 
            preferences={preferences} 
            onToggle={toggleFormat}
            access={access}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Unified Live Session Card - Only for owner, when Open Mic or Dediche are enabled */}
      {isOwner && (access.openmic || access.dediche) && (preferences.openmic || preferences.dediche) && (
        <UnifiedLiveSessionCard title="Serata Live" />
      )}

      {/* No formats active message */}
      {!hasActiveFormats && (
        <Card className="glass-card border-warning/30 bg-warning/5">
          <CardContent className="p-6 md:p-6 text-center">
            <AlertCircle className="w-12 h-12 md:w-10 md:h-10 text-warning mx-auto mb-3" />
            <h3 className="font-semibold text-lg md:text-base text-foreground mb-1">
              Nessun format selezionato
            </h3>
            <p className="text-base md:text-sm text-muted-foreground">
              Attiva almeno un format per vedere le metriche in tempo reale
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Clickable Metrics - Mobile: 2 columns, Desktop: 4 columns */}
      {hasActiveFormats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {/* Pending Join Requests - navigates to Community > Invites */}
          {preferences.community && access.community && (
            <Card 
              className={cn(
                "glass-card border-primary/30 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2",
                onNavigate && "cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] group"
              )}
              onClick={() => onNavigate?.('community', 'invites')}
            >
              <CardContent className="p-4 md:p-4 text-center relative">
                <div className="text-4xl md:text-3xl font-bold text-primary transition-transform group-hover:scale-110">
                  {counts.pendingJoinRequests}
                </div>
                <div className="text-sm md:text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  Richieste Accesso
                  {onNavigate && (
                    <ArrowRight className="w-4 h-4 md:w-3 md:h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unread Dediche Messages - navigates to Dediche */}
          {preferences.dediche && access.dediche && (
            <Card 
              className={cn(
                "glass-card border-secondary/30 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2",
                onNavigate && "cursor-pointer hover:border-secondary hover:shadow-lg hover:shadow-secondary/10 hover:scale-[1.02] active:scale-[0.98] group"
              )}
              onClick={() => onNavigate?.('dediche')}
            >
              <CardContent className="p-4 md:p-4 text-center relative">
                <div className="text-4xl md:text-3xl font-bold text-secondary transition-transform group-hover:scale-110">
                  {counts.unreadDedicheMessages}
                </div>
                <div className="text-sm md:text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  Msg Dediche
                  {onNavigate && (
                    <ArrowRight className="w-4 h-4 md:w-3 md:h-3 opacity-0 group-hover:opacity-100 transition-opacity text-secondary" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unread Community Messages - navigates to Community > Groups */}
          {preferences.community && access.community && (
            <Card 
              className={cn(
                "glass-card border-accent/30 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2",
                onNavigate && "cursor-pointer hover:border-accent hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.02] active:scale-[0.98] group"
              )}
              onClick={() => onNavigate?.('community', 'groups')}
            >
              <CardContent className="p-4 md:p-4 text-center relative">
                <div className="text-4xl md:text-3xl font-bold text-accent transition-transform group-hover:scale-110">
                  {counts.unreadCommunityMessages}
                </div>
                <div className="text-sm md:text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  Msg Community
                  {onNavigate && (
                    <ArrowRight className="w-4 h-4 md:w-3 md:h-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Reservations - navigates to Open Mic */}
          {preferences.openmic && access.openmic && (
            <Card 
              className={cn(
                "glass-card border-warning/30 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2",
                onNavigate && "cursor-pointer hover:border-warning hover:shadow-lg hover:shadow-warning/10 hover:scale-[1.02] active:scale-[0.98] group"
              )}
              onClick={() => onNavigate?.('openmic')}
            >
              <CardContent className="p-4 md:p-4 text-center relative">
                <div className="text-4xl md:text-3xl font-bold text-warning transition-transform group-hover:scale-110">
                  {counts.newReservations}
                </div>
                <div className="text-sm md:text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  Prenotazioni Oggi
                  {onNavigate && (
                    <ArrowRight className="w-4 h-4 md:w-3 md:h-3 opacity-0 group-hover:opacity-100 transition-opacity text-warning" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Join Requests Section - only show if community is active */}
      {preferences.community && access.community && (
        <Collapsible open={openSections.joinRequests} onOpenChange={() => toggleSection('joinRequests')}>
          <Card className="glass-card animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4 md:py-3">
                <CardTitle className="flex items-center justify-between text-lg md:text-base">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-base md:text-lg">Richieste Accesso Gruppi</span>
                    {joinRequests.length > 0 && (
                      <Badge variant="destructive" className="text-sm md:text-xs">{joinRequests.length}</Badge>
                    )}
                  </div>
                  {openSections.joinRequests ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {joinRequests.length === 0 ? (
                  <p className="text-base md:text-sm text-muted-foreground text-center py-4">
                    Nessuna richiesta in attesa
                  </p>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-3">
                      {joinRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex flex-col gap-3 p-4 md:p-3 rounded-xl bg-muted/30 border border-border min-w-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="font-semibold text-base md:text-sm truncate">{request.requester_name}</span>
                              {getSectionBadge(request.conversation?.section)}
                            </div>
                            <p className="text-base md:text-sm text-muted-foreground break-words leading-snug mt-1">
                              Vuole entrare in: <strong>{request.conversation?.name || 'Gruppo'}</strong>
                            </p>
                            <p className="text-sm md:text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(request.created_at), { 
                                addSuffix: true, 
                                locale: it 
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button
                              size="lg"
                              variant="outline"
                              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground flex-1 h-12 md:h-9 text-base md:text-sm gap-2"
                              onClick={() => approveJoinRequest(request.id)}
                            >
                              <Check className="w-5 h-5 md:w-4 md:h-4" />
                              <span className="md:hidden">Approva</span>
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 h-12 md:h-9 text-base md:text-sm gap-2"
                              onClick={() => rejectJoinRequest(request.id)}
                            >
                              <X className="w-5 h-5 md:w-4 md:h-4" />
                              <span className="md:hidden">Rifiuta</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Info Section - Friendships are automatic */}
      <Collapsible open={openSections.info} onOpenChange={() => toggleSection('info')}>
        <Card className="glass-card border-muted">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4 md:py-3">
              <CardTitle className="flex items-center justify-between text-base font-normal">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="w-5 h-5 md:w-4 md:h-4" />
                  <span className="text-base md:text-sm">Info: Amicizie e Moderazione</span>
                </div>
                {openSections.info ? (
                  <ChevronDown className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="text-base md:text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Amicizie automatiche:</strong> Gli utenti possono inviare e accettare richieste di amicizia direttamente dalla Community.
                </p>
                <p>
                  <strong>Per moderare:</strong> Usa <em>Audit</em> per visualizzare i log di attività e <em>Permessi</em> per gestire blocchi/blacklist utenti.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Bell,
  Users,
  MessageCircle,
  Music,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Info,
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
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({ 
  onNavigate,
  access = { openmic: true, dediche: true, community: true }
}) => {
  const {
    joinRequests,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
  } = useAdminNotifications();

  // Sections state
  const [openSections, setOpenSections] = useState({
    joinRequests: true,
    info: false,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Summary Cards - Clickable Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Join Requests - navigates to Community > Invites */}
        <Card 
          className={cn(
            "glass-card border-primary/30 transition-all duration-200",
            access.community && onNavigate && "cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] group",
            !access.community && "opacity-60"
          )}
          onClick={() => access.community && onNavigate?.('community', 'invites')}
        >
          <CardContent className="p-4 text-center relative">
            <div className="text-3xl font-bold text-primary transition-transform group-hover:scale-110">
              {counts.pendingJoinRequests}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              Richieste Accesso
              {access.community && onNavigate && (
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unread Dediche Messages - navigates to Dediche */}
        <Card 
          className={cn(
            "glass-card border-secondary/30 transition-all duration-200",
            access.dediche && onNavigate && "cursor-pointer hover:border-secondary hover:shadow-lg hover:shadow-secondary/10 hover:scale-[1.02] group",
            !access.dediche && "opacity-60"
          )}
          onClick={() => access.dediche && onNavigate?.('dediche')}
        >
          <CardContent className="p-4 text-center relative">
            <div className="text-3xl font-bold text-secondary transition-transform group-hover:scale-110">
              {counts.unreadDedicheMessages}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              Msg Dediche
              {access.dediche && onNavigate && (
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-secondary" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unread Community Messages - navigates to Community > Groups */}
        <Card 
          className={cn(
            "glass-card border-accent/30 transition-all duration-200",
            access.community && onNavigate && "cursor-pointer hover:border-accent hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.02] group",
            !access.community && "opacity-60"
          )}
          onClick={() => access.community && onNavigate?.('community', 'groups')}
        >
          <CardContent className="p-4 text-center relative">
            <div className="text-3xl font-bold text-accent transition-transform group-hover:scale-110">
              {counts.unreadCommunityMessages}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              Msg Community
              {access.community && onNavigate && (
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Reservations - navigates to Open Mic */}
        <Card 
          className={cn(
            "glass-card border-warning/30 transition-all duration-200",
            access.openmic && onNavigate && "cursor-pointer hover:border-warning hover:shadow-lg hover:shadow-warning/10 hover:scale-[1.02] group",
            !access.openmic && "opacity-60"
          )}
          onClick={() => access.openmic && onNavigate?.('openmic')}
        >
          <CardContent className="p-4 text-center relative">
            <div className="text-3xl font-bold text-warning transition-transform group-hover:scale-110">
              {counts.newReservations}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              Prenotazioni Oggi
              {access.openmic && onNavigate && (
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-warning" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Join Requests Section */}
      <Collapsible open={openSections.joinRequests} onOpenChange={() => toggleSection('joinRequests')}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Richieste Accesso Gruppi
                  {joinRequests.length > 0 && (
                    <Badge variant="destructive">{joinRequests.length}</Badge>
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
            <CardContent>
              {joinRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nessuna richiesta in attesa
                </p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {joinRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border min-w-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{request.requester_name}</span>
                            {getSectionBadge(request.conversation?.section)}
                          </div>
                          <p className="text-sm text-muted-foreground break-words leading-snug">
                            Vuole entrare in: <strong>{request.conversation?.name || 'Gruppo'}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground flex-1 sm:flex-none"
                            onClick={() => approveJoinRequest(request.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 sm:flex-none"
                            onClick={() => rejectJoinRequest(request.id)}
                          >
                            <X className="w-4 h-4" />
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

      {/* Info Section - Friendships are automatic */}
      <Collapsible open={openSections.info} onOpenChange={() => toggleSection('info')}>
        <Card className="glass-card border-muted">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <CardTitle className="flex items-center justify-between text-base font-normal">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>Info: Amicizie e Moderazione</span>
                </div>
                {openSections.info ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground space-y-2">
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

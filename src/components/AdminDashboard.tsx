import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  Trash2,
  Music,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  X,
  Home,
  Undo2,
  Ban,
  Settings,
  ListMusic,
  Bell,
  ExternalLink,
  RotateCcw,
  MoreVertical,
  Mic,
  MessageSquare,
  Database,
  Crown,
  Newspaper,
  Book,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { Message } from '@/hooks/useMessages';
import { useConversations, ChatMessage, Conversation } from '@/hooks/useConversations';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { ReservationCard } from './ReservationCard';
import { NotificationPopup } from './NotificationPopup';
import { MessageNotificationPopup } from './MessageNotificationPopup';
import { ChatNotificationPopup } from './ChatNotificationPopup';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminSongManagementTab } from './AdminSongManagementTab';
import { AdminPermissionsTab } from './AdminPermissionsTab';
import { AdminNotificationsTab } from './AdminNotificationsTab';
import { AdminDedichePanel } from '@/components/admin/AdminDedichePanel';
import { AdminCommunityPanel } from '@/components/admin/AdminCommunityPanel';
import { AdminAuditTab } from '@/components/admin/AdminAuditTab';
import { AdminSidebar, type AdminMainTab } from '@/components/admin/AdminSidebar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { adminAuditLog } from '@/lib/adminAudit';
import { useAdminSectionAccess } from '@/hooks/useAdminSectionAccess';
import { AdminMobileTabBar } from '@/components/admin/AdminMobileTabBar';
import { AdminOpenMicMobileActions } from '@/components/admin/AdminOpenMicMobileActions';
import { useIsMobile } from '@/hooks/use-mobile';

// Type for tracking undo operations
interface UndoAction {
  type: 'complete' | 'reactivate' | 'delete' | 'deleteMultiple';
  reservations: Reservation[];
  description: string;
}

export const AdminDashboard: React.FC = () => {
  const { currentUser, logout, staffRole, session } = useAdmin();
  const { toast } = useToast();
  const { access, isLoading: isAccessLoading } = useAdminSectionAccess();
  const isMobile = useIsMobile();
  const {
    activeReservations,
    completedReservations,
    loading,
    completeReservation,
    reactivateReservation,
    resetActiveReservations,
    resetCompletedReservations,
    resetEverything,
    resetOpenMic,
    resetMessages,
    resetSongStatuses,
    deleteReservation,
    deleteMultipleReservations,
    restoreReservation,
  } = useReservations();
  
  // Note: conversations hook is only used for notifications, not badge count
  // The badge count comes from AdminMessagesTab via onUnreadCountChange callback
  const { conversations } = useConversations();

  const [reservationNotifications, setReservationNotifications] = useState<Reservation[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<Message[]>([]);
  const [chatNotifications, setChatNotifications] = useState<{ message: ChatMessage; conversation?: Conversation }[]>([]);
  const [mainTab, setMainTab] = useState<AdminMainTab>('notifications');
  const [communitySubTab, setCommunitySubTab] = useState<"groups" | "invites" | "users" | "feed" | "blocked">("groups");
  const [didInitTabFromAccess, setDidInitTabFromAccess] = useState(false);
  
  // Get notification counts for badges
  const { counts: notificationCounts } = useAdminNotifications();
  const totalNotifications = notificationCounts.pendingJoinRequests + notificationCounts.unreadDedicheMessages + notificationCounts.unreadCommunityMessages;
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetOption, setResetOption] = useState<'openmic' | 'messages' | 'songs' | 'all' | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  // unreadConvCount is calculated via useMemo from conversations
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const currentReservations =
    activeTab === 'active' ? activeReservations : completedReservations;

  // Listen for new reservation notifications
  useEffect(() => {
    const handleNewReservation = (event: CustomEvent<Reservation>) => {
      setReservationNotifications((prev) => [...prev, event.detail]);
    };

    window.addEventListener(
      'new-reservation',
      handleNewReservation as EventListener
    );

    return () => {
      window.removeEventListener(
        'new-reservation',
        handleNewReservation as EventListener
      );
    };
  }, []);

  // Listen for new message notifications
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent<Message>) => {
      setMessageNotifications((prev) => [...prev, event.detail]);
    };

    window.addEventListener(
      'new-message',
      handleNewMessage as EventListener
    );

    return () => {
      window.removeEventListener(
        'new-message',
        handleNewMessage as EventListener
      );
    };
  }, []);

  // Listen for new chat messages (groups and private chats)
  useEffect(() => {
    const handleNewChatMessage = (event: CustomEvent<ChatMessage>) => {
      const msg = event.detail;
      // Skip messages sent by admin
      if (msg.sender_type === 'admin') return;
      
      // Find the conversation for context
      const conv = conversations.find(c => c.id === msg.conversation_id);
      
      setChatNotifications(prev => [...prev, { message: msg, conversation: conv }]);

      // Also trigger push notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = conv?.is_group 
          ? `${conv.name || 'Gruppo'}: ${msg.sender_name}`
          : `Nuovo messaggio da ${msg.sender_name}`;
        const body = msg.message_text.slice(0, 100);
        new Notification(title, { body, icon: '/favicon.ico', tag: msg.id });
      }
    };

    window.addEventListener('new-chat-message', handleNewChatMessage as EventListener);

    return () => {
      window.removeEventListener('new-chat-message', handleNewChatMessage as EventListener);
    };
  }, [conversations]);

  const handleUnreadCountChange = useCallback((_count: number) => {
    // Kept for compatibility with AdminDedichePanel prop, but main badges are driven by AdminNotificationCounts.
  }, []);

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeTab, mainTab]);

  // Always start on "Centro" (notifications) tab - it's the dashboard overview
  const getNextAllowedTab = useCallback((): AdminMainTab => {
    return 'notifications';
  }, []);

  const isMainTabBlocked = useCallback(
    (tab: AdminMainTab) => {
      if (tab === 'openmic') return !access.openmic;
      if (tab === 'songs') return !access.openmic;
      if (tab === 'dediche') return !access.dediche;
      if (tab === 'community') return !access.community;
      return false;
    },
    [access.community, access.dediche, access.openmic],
  );

  // On first load, pick the first allowed tab so the user doesn't land on a blocked section.
  useEffect(() => {
    if (isAccessLoading) return;
    if (didInitTabFromAccess) return;

    const nextAllowed = getNextAllowedTab();
    setMainTab(nextAllowed);
    setDidInitTabFromAccess(true);
  }, [didInitTabFromAccess, getNextAllowedTab, isAccessLoading]);

  const handleBlockedSelect = useCallback(
    (tab: AdminMainTab) => {
      const label =
        tab === 'openmic'
          ? 'Open Mic'
          : tab === 'dediche'
            ? 'Dediche'
            : tab === 'community'
              ? 'Community'
              : 'Sezione';
      toast({
        title: 'Accesso non autorizzato',
        description: `Non hai i permessi per aprire: ${label}.`,
        variant: 'destructive',
      });
    },
    [toast],
  );

  const removeReservationNotification = (id: string) => {
    setReservationNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const removeMessageNotification = (id: string) => {
    setMessageNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const removeChatNotification = (id: string) => {
    setChatNotifications((prev) => prev.filter((n) => n.message.id !== id));
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifiche non supportate',
        description: 'Il tuo browser non supporta le notifiche push.',
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast({
        title: 'Notifiche attivate',
        description: 'Riceverai notifiche push per nuovi messaggi.',
      });
      // Test notification
      new Notification('Notifiche attivate! 🔔', {
        body: 'Riceverai avvisi per nuovi messaggi nelle chat.',
        icon: '/favicon.ico',
      });
    } else if (permission === 'denied') {
      toast({
        title: 'Notifiche bloccate',
        description: 'Puoi abilitarle dalle impostazioni del browser.',
        variant: 'destructive',
      });
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === currentReservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentReservations.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    // Store reservations for potential undo
    const reservationsToDelete = currentReservations.filter(r => selectedIds.has(r.id));
    
    const success = await deleteMultipleReservations(Array.from(selectedIds));
    if (success) {
      adminAuditLog({
        action: 'openmic.delete_multiple',
        section: 'openmic',
        entity: 'reservation',
        metadata: { ids: Array.from(selectedIds), count: selectedIds.size },
      });
      setLastAction({
        type: 'deleteMultiple',
        reservations: reservationsToDelete,
        description: `${reservationsToDelete.length} prenotazioni eliminate`,
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  const handleSingleDelete = async (id: string) => {
    // Store reservation for potential undo
    const reservationToDelete = [...activeReservations, ...completedReservations].find(r => r.id === id);
    
    const success = await deleteReservation(id);
    if (success && reservationToDelete) {
      adminAuditLog({ action: 'openmic.delete', section: 'openmic', entity: 'reservation', entity_id: id });
      setLastAction({
        type: 'delete',
        reservations: [reservationToDelete],
        description: `Prenotazione di "${reservationToDelete.customer_name}" eliminata`,
      });
    }
  };

  const handleResetCurrent = async () => {
    // Store reservations for potential undo
    const reservationsToReset = [...currentReservations];
    
    let success = false;
    if (activeTab === 'active') {
      success = await resetActiveReservations();
    } else {
      success = await resetCompletedReservations();
    }
    
    if (success && reservationsToReset.length > 0) {
      adminAuditLog({
        action: 'openmic.reset_list',
        section: 'openmic',
        metadata: { scope: activeTab, count: reservationsToReset.length },
      });
      setLastAction({
        type: 'deleteMultiple',
        reservations: reservationsToReset,
        description: `${reservationsToReset.length} prenotazioni ${activeTab === 'active' ? 'in corso' : 'completate'} eliminate`,
      });
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    
    let success = true;
    for (const reservation of lastAction.reservations) {
      const result = await restoreReservation(reservation);
      if (!result) {
        success = false;
        break;
      }
    }
    
    if (success) {
      toast({
        title: "Operazione annullata",
        description: `Ripristinata: ${lastAction.description}`,
      });
      setLastAction(null);
    }
  };

  const handleComplete = async (id: string) => {
    const reservation = activeReservations.find(r => r.id === id);
    const success = await completeReservation(id);
    if (success && reservation) {
      adminAuditLog({ action: 'openmic.complete', section: 'openmic', entity: 'reservation', entity_id: id });
      setLastAction({
        type: 'complete',
        reservations: [reservation],
        description: `Prenotazione di "${reservation.customer_name}" completata`,
      });
    }
  };

  const handleReactivate = async (id: string) => {
    const reservation = completedReservations.find(r => r.id === id);
    const success = await reactivateReservation(id);
    if (success && reservation) {
      adminAuditLog({ action: 'openmic.reactivate', section: 'openmic', entity: 'reservation', entity_id: id });
      setLastAction({
        type: 'reactivate',
        reservations: [reservation],
        description: `Prenotazione di "${reservation.customer_name}" riattivata`,
      });
    }
  };

  const handleUndoCompleteOrReactivate = async () => {
    if (!lastAction) return;
    
    const reservation = lastAction.reservations[0];
    let success = false;
    
    if (lastAction.type === 'complete') {
      success = await reactivateReservation(reservation.id);
    } else if (lastAction.type === 'reactivate') {
      success = await completeReservation(reservation.id);
    }
    
    if (success) {
      toast({
        title: "Operazione annullata",
        description: `Ripristinata: ${lastAction.description}`,
      });
      setLastAction(null);
    }
  };

  const handleUndoAction = async () => {
    if (!lastAction) return;
    
    if (lastAction.type === 'delete' || lastAction.type === 'deleteMultiple') {
      await handleUndo();
    } else {
      await handleUndoCompleteOrReactivate();
    }
  };


  const openMainSite = () => {
    window.open('/', '_blank');
  };

  const staffLabel =
    staffRole === 'owner'
      ? 'Owner'
      : staffRole === 'admin'
        ? 'Admin'
        : staffRole === 'moderator'
          ? 'Staff'
          : 'Staff';
  const staffEmail = session?.user?.email ?? currentUser?.email ?? '';

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Mobile uses the bottom tab bar; keep sidebar desktop-only to avoid a huge overlay sheet */}
          {!isMobile && (
            <AdminSidebar
              active={mainTab}
              onSelect={setMainTab}
              onBlockedSelect={handleBlockedSelect}
              access={access}
            />
          )}
        <SidebarInset>
      {/* Reservation Notifications */}
      {reservationNotifications.map((notification) => (
        <NotificationPopup
          key={notification.id}
          reservation={notification}
          onClose={() => removeReservationNotification(notification.id)}
        />
      ))}

      {/* Message Notifications */}
      {messageNotifications.map((notification) => (
        <MessageNotificationPopup
          key={notification.id}
          message={notification}
          onClose={() => removeMessageNotification(notification.id)}
        />
      ))}

      {/* Chat Notifications (groups and private chats) */}
      {chatNotifications.map((notification) => (
        <ChatNotificationPopup
          key={notification.message.id}
          message={notification.message}
          conversationName={notification.conversation?.is_group ? notification.conversation.name || undefined : undefined}
          isGroup={notification.conversation?.is_group}
          onClose={() => removeChatNotification(notification.message.id)}
        />
      ))}

      {/* Header - Apple-style minimal */}
      <header className="admin-header">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
                <h1 className="font-display text-lg md:text-xl font-bold truncate">
                  Admin Panel
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="capitalize text-[10px] h-5">{staffLabel}</Badge>
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  {currentUser?.username}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              {/* Mobile: Site link */}
              <Button
                variant="ghost"
                size="icon"
                onClick={openMainSite}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Home className="w-5 h-5" />
              </Button>

              {/* Mobile: More menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                    {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
                      <DropdownMenuItem onClick={requestNotificationPermission} className="rounded-lg">
                        <Bell className="w-4 h-4 mr-2" />
                        Attiva notifiche
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setMainTab('permissions')} className="rounded-lg">
                      <Shield className="w-4 h-4 mr-2" />
                      Permessi
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMainTab('settings')} className="rounded-lg">
                      <Settings className="w-4 h-4 mr-2" />
                      Impostazioni
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMainTab('audit')} className="rounded-lg">
                      <Database className="w-4 h-4 mr-2" />
                      Audit
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/admin/manual">
                        <Book className="w-4 h-4 mr-2" />
                        Manuale
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setResetOption('openmic'); setShowResetDialog(true); }}
                      className="rounded-lg"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Open Mic
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setResetOption('messages'); setShowResetDialog(true); }}
                      className="rounded-lg"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Dediche
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setResetOption('all'); setShowResetDialog(true); }}
                      className="text-destructive focus:text-destructive rounded-lg"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Reset Totale
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="rounded-lg">
                      <LogOut className="w-4 h-4 mr-2" />
                      Esci
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop actions - reset dropdown + logout */}
              <div className="hidden md:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Reset
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => { setResetOption('openmic'); setShowResetDialog(true); }}
                      className="rounded-lg"
                    >
                      <Music className="w-4 h-4 mr-2" />
                      Reset Open Mic
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setResetOption('messages'); setShowResetDialog(true); }}
                      className="rounded-lg"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Reset Dediche
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setResetOption('all'); setShowResetDialog(true); }}
                      className="text-destructive focus:text-destructive rounded-lg"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Reset Totale
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Esci
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabs for Open Mic */}
        {mainTab === 'openmic' && (
          <div className="max-w-5xl mx-auto px-4 py-2 border-t border-border/30">
            <div className="admin-segment-control">
              <button
                onClick={() => setActiveTab('active')}
                className={`admin-segment-button ${activeTab === 'active' ? 'admin-segment-button-active' : ''}`}
              >
                <Music className="w-4 h-4 inline-block mr-1.5" />
                In Corso ({activeReservations.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`admin-segment-button ${activeTab === 'completed' ? 'admin-segment-button-active' : ''}`}
              >
                <CheckCircle className="w-4 h-4 inline-block mr-1.5" />
                Completate ({completedReservations.length})
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="admin-card border-warning/50 mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              {resetOption === 'openmic' && 'Reset Open Mic'}
              {resetOption === 'messages' && 'Reset Messaggi'}
              {resetOption === 'songs' && 'Ripristina Canzoni'}
              {resetOption === 'all' && 'Reset Totale Serata'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm">
                {resetOption === 'openmic' && (
                  <p>Verranno cancellate tutte le prenotazioni Open Mic.</p>
                )}
                {resetOption === 'messages' && (
                  <p>Verranno cancellati tutti i messaggi e le chat.</p>
                )}
                {resetOption === 'songs' && (
                  <p>Tutte le canzoni torneranno prenotabili.</p>
                )}
                {resetOption === 'all' && (
                  <p>Verranno cancellati TUTTI i dati della serata.</p>
                )}
                <p className="mt-2 text-destructive font-medium">Azione irreversibile!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsResetting(true);
                let success = false;
                
                if (resetOption === 'openmic') {
                  success = await resetOpenMic();
                  if (success) adminAuditLog({ action: 'openmic.reset', section: 'openmic' });
                } else if (resetOption === 'messages') {
                  success = await resetMessages();
                  if (success) adminAuditLog({ action: 'messages.reset', section: 'dediche' });
                } else if (resetOption === 'songs') {
                  success = await resetSongStatuses();
                  if (success) adminAuditLog({ action: 'songs.reset_statuses', section: 'openmic' });
                } else if (resetOption === 'all') {
                  success = await resetEverything();
                  if (success) adminAuditLog({ action: 'night.reset_all', section: null });
                }
                
                setIsResetting(false);
                setShowResetDialog(false);
                setResetOption(null);
              }}
              disabled={isResetting}
              className={`rounded-xl ${resetOption === 'all' ? 'bg-destructive hover:bg-destructive/90' : 'bg-warning hover:bg-warning/90 text-warning-foreground'}`}
            >
              {isResetting ? 'Reset...' : 'Conferma'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-6">
        <div className="admin-container py-4">
        {isMainTabBlocked(mainTab) ? (
          <div className="max-w-xl mx-auto">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Sezione bloccata</h2>
                  <p className="text-sm text-muted-foreground">
                    Questa sezione è visibile ma non puoi aprirla perché non hai i permessi necessari.
                    Chiedi all’Owner/Admin di abilitarti la sezione da <strong>Permessi</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : mainTab === 'openmic' ? (
          activeTab === 'active' ? (
            <div className="space-y-4">
              {activeReservations.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Nessuna prenotazione in corso
                  </p>
                </div>
              ) : (
                activeReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onComplete={handleComplete}
                    onDelete={handleSingleDelete}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(reservation.id)}
                    onSelect={handleSelect}
                    compact={isMobile}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {completedReservations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Nessuna prenotazione completata
                  </p>
                </div>
              ) : (
                completedReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onReactivate={handleReactivate}
                    onDelete={handleSingleDelete}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(reservation.id)}
                    onSelect={handleSelect}
                    compact={isMobile}
                  />
                ))
              )}
            </div>
          )
        ) : mainTab === 'dediche' ? (
          <AdminDedichePanel onUnreadCountChange={handleUnreadCountChange} />
        ) : mainTab === 'community' ? (
          <AdminCommunityPanel subTab={communitySubTab} onSubTabChange={setCommunitySubTab} />
        ) : mainTab === 'permissions' ? (
          <AdminPermissionsTab />
        ) : mainTab === 'songs' ? (
          <AdminSongManagementTab />
        ) : mainTab === 'settings' ? (
          <AdminSettingsTab />
        ) : mainTab === 'audit' ? (
          <AdminAuditTab />
        ) : mainTab === 'notifications' ? (
          <AdminNotificationsTab 
            onNavigate={(tab, subTab) => {
              setMainTab(tab);
              if (tab === 'community' && subTab) {
                setCommunitySubTab(subTab as "groups" | "invites" | "users" | "feed" | "blocked");
              }
            }}
            access={access}
            isOwner={staffRole === 'owner'}
          />
        ) : null}
        </div>
      </main>

      <AdminOpenMicMobileActions
        visible={mainTab === 'openmic'}
        selectionMode={selectionMode}
        selectedCount={selectedIds.size}
        totalCount={currentReservations.length}
        canUndo={!!lastAction}
        onUndo={handleUndoAction}
        onEnterSelection={() => setSelectionMode(true)}
        onExitSelection={exitSelectionMode}
        onToggleSelectAll={handleSelectAll}
        onDeleteSelected={handleDeleteSelected}
      />

      <AdminMobileTabBar
        value={mainTab}
        onChange={setMainTab}
        onBlockedChange={handleBlockedSelect}
        access={access}
        badges={{
          totalNotifications,
          openmicActiveCount: activeReservations.length,
          dedicheUnread: notificationCounts.unreadDedicheMessages,
          communityUnread: notificationCounts.unreadCommunityMessages,
        }}
      />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

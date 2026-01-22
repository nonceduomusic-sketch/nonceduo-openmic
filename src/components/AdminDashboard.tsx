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
  const [mainTab, setMainTab] = useState<AdminMainTab>('openmic');
  const [communitySubTab, setCommunitySubTab] = useState<"groups" | "invites" | "users" | "feed" | "blocked">("groups");
  
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

  // If the current tab is not allowed (permissions changed), move to the first allowed one.
  useEffect(() => {
    if (isAccessLoading) return;
    const nextAllowed: AdminMainTab = access.openmic
      ? 'openmic'
      : access.dediche
        ? 'dediche'
        : access.community
          ? 'community'
          : 'notifications';

    const isCurrentBlocked =
      (mainTab === 'openmic' && !access.openmic) ||
      (mainTab === 'dediche' && !access.dediche) ||
      (mainTab === 'community' && !access.community);

    if (isCurrentBlocked) setMainTab(nextAllowed);
  }, [access.community, access.dediche, access.openmic, isAccessLoading, mainTab]);

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

  const openHomePage = () => {
    window.open('/openmic', '_blank');
  };

  const staffLabel =
    staffRole === 'owner'
      ? 'Owner'
      : staffRole === 'admin'
        ? 'Admin'
        : staffRole === 'moderator'
          ? 'Moderatore'
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
        {!isMobile && <AdminSidebar active={mainTab} onSelect={setMainTab} access={access} />}
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

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="px-3 md:container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {/* Desktop-only: on mobile the sidebar sheet covers too much and we already have bottom nav */}
                <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
                <h1 className="font-display text-xl md:text-2xl font-bold neon-text-cyan">Admin Panel</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Ciao, {currentUser?.username}
              </p>
              <div className="mt-2 inline-flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{staffLabel}</Badge>
                {staffEmail ? (
                  <span className="text-xs text-muted-foreground truncate max-w-[240px]">{staffEmail}</span>
                ) : null}
                <span className="text-xs text-muted-foreground">• Stai operando come Staff</span>
              </div>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Notification permission button */}
              {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  title="Attiva notifiche push"
                >
                  <Bell className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Notifiche</span>
                </Button>
              )}
              {typeof Notification !== 'undefined' && notificationPermission === 'granted' && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                  <Bell className="w-3 h-3" />
                  <span className="hidden md:inline">On</span>
                </div>
              )}

              {/* Manual link */}
              <Link to="/admin/manual">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  title="Manuale Admin"
                >
                  <Book className="w-4 h-4" />
                </Button>
              </Link>

              {/* Home button - always visible */}
              <Button
                variant="outline"
                size="sm"
                onClick={openHomePage}
                className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Home className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Open Mic</span>
                <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
              </Button>

              {/* Reset Serata button with options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                    title="Reset serata"
                  >
                    <RotateCcw className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Reset</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      setResetOption('openmic');
                      setShowResetDialog(true);
                    }}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Solo Open Mic
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setResetOption('messages');
                      setShowResetDialog(true);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Solo Messaggi
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setResetOption('songs');
                      setShowResetDialog(true);
                    }}
                  >
                    <ListMusic className="w-4 h-4 mr-2" />
                    Ripristina Canzoni
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setResetOption('all');
                      setShowResetDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Reset Totale
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reset confirmation dialog */}
              <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent className="glass-card border-warning">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="w-5 h-5" />
                      {resetOption === 'openmic' && 'Reset Open Mic'}
                      {resetOption === 'messages' && 'Reset Messaggi'}
                      {resetOption === 'songs' && 'Ripristina Canzoni'}
                      {resetOption === 'all' && 'Reset Totale Serata'}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        {resetOption === 'openmic' && (
                          <p>Verranno cancellate tutte le prenotazioni Open Mic (in corso e completate).</p>
                        )}
                        {resetOption === 'messages' && (
                          <p>Verranno cancellati tutti i messaggi, le chat e le conversazioni.</p>
                        )}
                        {resetOption === 'songs' && (
                          <p>Tutte le canzoni torneranno prenotabili (gli stati "prenotata/completata" verranno rimossi).</p>
                        )}
                        {resetOption === 'all' && (
                          <>
                            <p>Verranno cancellati <strong>TUTTI</strong> i dati:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Tutte le prenotazioni (Open Mic)</li>
                              <li>Tutti i messaggi e le chat</li>
                              <li>Tutti gli stati delle canzoni</li>
                            </ul>
                          </>
                        )}
                        <p className="mt-3 text-destructive font-medium">
                          Questa azione è irreversibile!
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowResetDialog(false)}>
                      Annulla
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setIsResetting(true);
                        let success = false;
                        
                        if (resetOption === 'openmic') {
                          success = await resetOpenMic();
                          if (success) adminAuditLog({ action: 'openmic.reset', section: 'openmic' });
                        } else if (resetOption === 'messages') {
                          success = await resetMessages();
                          if (success) adminAuditLog({ action: 'messages.reset', section: 'dediche', metadata: { scope: 'messages' } });
                        } else if (resetOption === 'songs') {
                          success = await resetSongStatuses();
                          if (success) adminAuditLog({ action: 'songs.reset_statuses', section: 'openmic' });
                        } else if (resetOption === 'all') {
                          success = await resetEverything();
                          if (success) adminAuditLog({ action: 'night.reset_all', section: null, metadata: { scope: 'all' } });
                        }
                        
                        setIsResetting(false);
                        setShowResetDialog(false);
                        setResetOption(null);
                      }}
                      disabled={isResetting}
                      className={resetOption === 'all' 
                        ? "bg-destructive hover:bg-destructive/90"
                        : "bg-warning hover:bg-warning/90 text-warning-foreground"
                      }
                    >
                      {isResetting ? 'Reset in corso...' : 'Conferma'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {/* Undo button - visible when there's an action to undo (only for Open Mic tab) */}
              {lastAction && mainTab === 'openmic' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoAction}
                  className="border-warning text-warning hover:bg-warning hover:text-warning-foreground animate-pulse"
                  title={`Annulla: ${lastAction.description}`}
                >
                  <Undo2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Annulla</span>
                </Button>
              )}

              {mainTab === 'openmic' && !selectionMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setSelectionMode(true)}
                      disabled={currentReservations.length === 0}
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Seleziona multipli
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (currentReservations.length === 0) return;
                        // Trigger reset dialog
                        handleResetCurrent();
                      }}
                      disabled={currentReservations.length === 0}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Reset {activeTab === 'active' ? 'In Corso' : 'Completate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {mainTab === 'openmic' && selectionMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  >
                    {selectedIds.size === currentReservations.length ? (
                      <Square className="w-4 h-4 md:mr-2" />
                    ) : (
                      <CheckSquare className="w-4 h-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">
                      {selectedIds.size === currentReservations.length
                        ? 'Nessuno'
                        : 'Tutti'}
                    </span>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        disabled={selectedIds.size === 0}
                      >
                        <Trash2 className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">
                          ({selectedIds.size})
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-destructive">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-5 h-5" />
                          Elimina Selezionate
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Sei sicuro di voler eliminare {selectedIds.size} prenotazioni
                          selezionate?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">
                          Annulla
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelected}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exitSelectionMode}
                    className="border-muted-foreground text-muted-foreground hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-muted-foreground text-muted-foreground hover:bg-muted"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Esci</span>
              </Button>
            </div>
          </div>

          {/* Mobile actions: compact menu */}
          <div className="md:hidden mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="capitalize shrink-0">{staffLabel}</Badge>
              <span className="text-xs text-muted-foreground truncate">{staffEmail || currentUser?.username}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
                  <DropdownMenuItem onClick={requestNotificationPermission}>
                    <Bell className="w-4 h-4 mr-2" />
                    Attiva notifiche
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setCommunitySubTab("users");
                    setMainTab('community');
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Utenti & Staff
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMainTab('permissions')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Permessi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMainTab('settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Impostazioni
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMainTab('audit')}>
                  <Database className="w-4 h-4 mr-2" />
                  Audit
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/manual">
                    <Book className="w-4 h-4 mr-2" />
                    Manuale Admin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openHomePage}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apri Open Mic
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setResetOption('openmic');
                    setShowResetDialog(true);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Open Mic
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setResetOption('messages');
                    setShowResetDialog(true);
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reset Messaggi
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setResetOption('songs');
                    setShowResetDialog(true);
                  }}
                >
                  <ListMusic className="w-4 h-4 mr-2" />
                  Ripristina Canzoni
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setResetOption('all');
                    setShowResetDialog(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Reset Totale
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* On mobile, navigation lives in the bottom bar (thumb-friendly). */}

          {/* Sub-tabs for Open Mic */}
          {mainTab === 'openmic' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'active'
                    ? 'bg-primary text-primary-foreground neon-glow-pink'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Music className="w-4 h-4 inline-block mr-2" />
                In Corso ({activeReservations.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'completed'
                    ? 'bg-secondary text-secondary-foreground neon-glow-cyan'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline-block mr-2" />
                Completate ({completedReservations.length})
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="px-3 md:container py-6 pb-24 md:pb-6 overflow-x-hidden">
        {mainTab === 'openmic' ? (
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
          <AdminNotificationsTab />
        ) : null}
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

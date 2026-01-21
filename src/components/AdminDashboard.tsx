import React, { useState, useEffect, useCallback } from 'react';
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
  MessageCircle,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { useMessages, Message } from '@/hooks/useMessages';
import { useConversations, ChatMessage, Conversation } from '@/hooks/useConversations';
import { ReservationCard } from './ReservationCard';
import { NotificationPopup } from './NotificationPopup';
import { MessageNotificationPopup } from './MessageNotificationPopup';
import { ChatNotificationPopup } from './ChatNotificationPopup';
import { AdminMessagesTab } from './AdminMessagesTab';
import { AdminBlockedUsersTab } from './AdminBlockedUsersTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminSongManagementTab } from './AdminSongManagementTab';
import { AdminPermissionsTab } from './AdminPermissionsTab';
import { AdminUsersTab } from './AdminUsersTab';
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

// Type for tracking undo operations
interface UndoAction {
  type: 'complete' | 'reactivate' | 'delete' | 'deleteMultiple';
  reservations: Reservation[];
  description: string;
}

export const AdminDashboard: React.FC = () => {
  const { currentUser, logout } = useAdmin();
  const { toast } = useToast();
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
  
  const { unreadMessages } = useMessages();
  // Note: conversations hook is only used for notifications, not badge count
  // The badge count comes from AdminMessagesTab via onUnreadCountChange callback
  const { conversations } = useConversations();

  const [reservationNotifications, setReservationNotifications] = useState<Reservation[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<Message[]>([]);
  const [chatNotifications, setChatNotifications] = useState<{ message: ChatMessage; conversation?: Conversation }[]>([]);
  const [unreadConvCount, setUnreadConvCount] = useState(0);
  const [mainTab, setMainTab] = useState<'openmic' | 'messages' | 'users' | 'blocked' | 'songs' | 'permissions' | 'settings'>('openmic');
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

  // Update unread count when conversations change (for initial load and realtime updates)
  React.useEffect(() => {
    const count = conversations.filter(conv => {
      if (!conv.messages || conv.messages.length === 0) return false;
      return conv.is_read === false;
    }).length;
    setUnreadConvCount(count);
  }, [conversations]);

  // Handler for unread count updates from AdminMessagesTab
  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadConvCount(count);
  }, []);

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeTab, mainTab]);

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
    <div className="min-h-screen bg-background">
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
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold neon-text-cyan">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">
                Ciao, {currentUser?.username}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                        } else if (resetOption === 'messages') {
                          success = await resetMessages();
                        } else if (resetOption === 'songs') {
                          success = await resetSongStatuses();
                        } else if (resetOption === 'all') {
                          success = await resetEverything();
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

          {/* Main Tabs */}
          <div className="flex gap-1 sm:gap-2 mt-4 overflow-x-auto">
            <button
              onClick={() => setMainTab('openmic')}
              className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                mainTab === 'openmic'
                  ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Music className="w-4 h-4 inline-block sm:mr-1" />
              <span className="hidden sm:inline">Open Mic</span>
              {activeReservations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-background/30">
                  {activeReservations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab('messages')}
              className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all relative ${
                mainTab === 'messages'
                  ? 'bg-gradient-to-r from-secondary to-primary text-secondary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline-block sm:mr-1" />
              <span className="hidden sm:inline">Messaggi</span>
              {unreadConvCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                  {unreadConvCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab('songs')}
              className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                mainTab === 'songs'
                  ? 'bg-gradient-to-r from-accent to-accent/70 text-accent-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <ListMusic className="w-4 h-4 inline-block sm:mr-1" />
              <span className="hidden sm:inline">Canzoni</span>
            </button>
            <button
              onClick={() => setMainTab('users')}
              className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                mainTab === 'users'
                  ? 'bg-gradient-to-r from-secondary to-accent text-secondary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Users className="w-4 h-4 inline-block sm:mr-1" />
              <span className="hidden sm:inline">Utenti</span>
            </button>
            <button
              onClick={() => setMainTab('blocked')}
              className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                mainTab === 'blocked'
                  ? 'bg-gradient-to-r from-destructive to-destructive/70 text-destructive-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Ban className="w-4 h-4 inline-block sm:mr-1" />
              <span className="hidden sm:inline">Bloccati</span>
            </button>
            <button
              onClick={() => setMainTab('permissions')}
              className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                mainTab === 'permissions'
                  ? 'bg-gradient-to-r from-accent to-primary text-accent-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Crown className="w-4 h-4 inline-block sm:mr-1" />
              <span className="hidden sm:inline">Permessi</span>
            </button>
            <button
              onClick={() => setMainTab('settings')}
              className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                mainTab === 'settings'
                  ? 'bg-muted-foreground text-background shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

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
      <main className="container py-6">
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
                  />
                ))
              )}
            </div>
          )
        ) : mainTab === 'messages' ? (
          <AdminMessagesTab onUnreadCountChange={handleUnreadCountChange} />
        ) : mainTab === 'users' ? (
          <AdminUsersTab />
        ) : mainTab === 'songs' ? (
          <AdminSongManagementTab />
        ) : mainTab === 'settings' ? (
          <AdminSettingsTab />
        ) : mainTab === 'permissions' ? (
          <AdminPermissionsTab />
        ) : (
          <AdminBlockedUsersTab />
        )}
      </main>
    </div>
  );
};

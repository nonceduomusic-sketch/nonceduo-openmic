import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  MessageCircle,
  Users,
  Trash2,
  Reply,
  AlertTriangle,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  Globe,
  Lock,
  MoreVertical,
  Ban,
  UserX,
  UserPlus,
  Plus,
  Mail,
  MailOpen,
  Link2,
  Copy,
  ExternalLink,
  Key,
} from 'lucide-react';
import { MessageStatusIndicator } from '@/components/MessageStatusIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { ChatScrollIndicator } from '@/components/ChatScrollIndicator';
import { GroupMembersDialog } from '@/components/GroupMembersDialog';
import { GroupPasswordDialog } from '@/components/GroupPasswordDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useConversations, Conversation, ChatMessage } from '@/hooks/useConversations';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AdminMessagesTabProps {
  onUnreadCountChange?: (count: number) => void;
}

export const AdminMessagesTab: React.FC<AdminMessagesTabProps> = ({ onUnreadCountChange }) => {
  const { toast } = useToast();
  const {
    conversations,
    loading,
    adminReply,
    adminEditMessage,
    adminDeleteMessage,
    adminRestoreMessage,
    adminBulkDeleteMessages,
    adminBulkRestoreMessages,
    adminDeleteConversation,
    adminRestoreConversation,
    adminCreateGroup,
    adminCreateEmptyGroup,
    adminAddToGroup,
    adminRemoveFromGroup,
    adminRenameGroup,
    adminSetGroupVisibility,
    adminBulkDeleteConversations,
    adminBlockUser,
    adminUnblockUser,
    adminMarkAsRead,
    adminMarkAsUnread,
    adminCreateInviteLink,
    adminSetGroupPassword,
    adminGetGroupMembers,
    adminStartPrivateChat,
    getUnreadConversations,
    getReadConversations,
  } = useConversations();

  const [activeSubTab, setActiveSubTab] = useState<'unread' | 'read' | 'groups'>('unread');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Selection mode (for group creation, adding to group, or delete)
  const [selectionMode, setSelectionMode] = useState<'none' | 'createGroup' | 'addToGroup' | 'delete'>('none');
  const [selectedForAction, setSelectedForAction] = useState<Set<string>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(false);
  
  // Empty group creation (no conversation selection needed)
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [emptyGroupName, setEmptyGroupName] = useState('');
  const [emptyGroupIsPublic, setEmptyGroupIsPublic] = useState(false);
  
  // Target group for adding participants
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false);
  
  // Rename dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameGroupName, setRenameGroupName] = useState('');
  
  // Visibility dialog
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [visibilityTarget, setVisibilityTarget] = useState<Conversation | null>(null);
  const [allowedParticipantsInput, setAllowedParticipantsInput] = useState<string[]>([]);
  const [visibilityMode, setVisibilityMode] = useState<'public' | 'private' | 'restricted'>('private');
  
  // Group members dialog
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  
  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Undo state for bulk delete
  const [lastDeletedIds, setLastDeletedIds] = useState<string[]>([]);
  
  // Delete confirmation dialog (for direct delete from list)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Message selection mode (WhatsApp-style)
  const [messageSelectionMode, setMessageSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Scroll tracking for WhatsApp-style scroll indicator
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const isAtBottomRef = useRef(true);

  // Typing indicator for admin
  const {
    typingNames,
    isAnyoneTyping,
    updateTypingIndicator,
    clearTypingIndicator,
  } = useTypingIndicator(
    selectedConversation?.id || null,
    'admin',
    'Staff'
  );

  const unreadConversations = getUnreadConversations();
  const readConversations = getReadConversations();
  const groupConversations = conversations.filter(c => c.is_group);
  
  const currentConversations = activeSubTab === 'unread' 
    ? unreadConversations 
    : activeSubTab === 'read' 
      ? readConversations 
      : groupConversations;

  // Report unread count
  React.useEffect(() => {
    onUnreadCountChange?.(unreadConversations.length);
  }, [unreadConversations.length, onUnreadCountChange]);

  // Track which messages admin has seen (local state for visual distinction)
  const [viewedMessageIds, setViewedMessageIds] = useState<Set<string>>(new Set());
  
  // Update selected conversation when data changes (real-time sync)
  React.useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) {
        // Deep compare to detect any message status changes
        const hasChanges = 
          JSON.stringify(updated.messages?.map(m => ({ id: m.id, status: m.status }))) !== 
          JSON.stringify(selectedConversation.messages?.map(m => ({ id: m.id, status: m.status })));
        
        if (hasChanges || updated.is_read !== selectedConversation.is_read) {
          setSelectedConversation(updated);
        }
      } else {
        setSelectedConversation(null);
      }
    }
  }, [conversations]);
  
  // When admin opens a conversation, mark which messages they've now seen
  React.useEffect(() => {
    if (selectedConversation?.messages) {
      const currentIds = new Set(selectedConversation.messages.map(m => m.id));
      setViewedMessageIds(prev => {
        const newSet = new Set(prev);
        currentIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [selectedConversation?.id]);

  // Check if admin is at bottom of scroll area
  const checkIfAtBottom = useCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        setShowScrollIndicator(false);
        setNewMessagesCount(0);
      }
    }
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollIndicator(false);
    setNewMessagesCount(0);
    isAtBottomRef.current = true;
  }, []);

  // Track new messages when not at bottom
  useEffect(() => {
    if (!selectedConversation?.messages) return;
    
    const messages = selectedConversation.messages;
    const lastMessage = messages[0]; // messages are sorted desc
    
    if (lastMessage && lastMessage.sender_type === 'user' && !isAtBottomRef.current) {
      // New user message arrived while not at bottom
      setNewMessagesCount(prev => prev + 1);
      setShowScrollIndicator(true);
    } else if (isAtBottomRef.current) {
      // Auto-scroll when admin is at bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages?.length]);

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedForAction(new Set());
    setSelectionMode('none');
  }, [activeSubTab]);

  const getParticipantNames = (conv: Conversation): string => {
    if (!conv.participants || conv.participants.length === 0) return 'Sconosciuto';
    return conv.participants.map(p => p.participant_name).join(', ');
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;

    setIsSubmittingReply(true);
    const success = await adminReply(selectedConversation.id, replyText.trim());
    
    if (success) {
      setReplyText('');
    }
    
    setIsSubmittingReply(false);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message_text);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    
    const success = await adminEditMessage(msgId, editText.trim());
    if (success) {
      setEditingMessageId(null);
      setEditText('');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedConversation) return;
    
    const deletedMsg = await adminDeleteMessage(msgId, selectedConversation.id);
    
    if (deletedMsg) {
      toast({
        title: 'Messaggio eliminato',
        description: `${deletedMsg.sender_name}: ${deletedMsg.message_text.substring(0, 30)}${deletedMsg.message_text.length > 30 ? '...' : ''}`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await adminRestoreMessage(deletedMsg);
            }}
          >
            Annulla
          </Button>
        ),
      });
    }
  };

  const handleBulkDeleteMessages = async () => {
    if (!selectedConversation || selectedMessages.size === 0) return;
    
    const msgIds = Array.from(selectedMessages);
    const deletedMsgs = await adminBulkDeleteMessages(msgIds, selectedConversation.id);
    
    if (deletedMsgs.length > 0) {
      setMessageSelectionMode(false);
      setSelectedMessages(new Set());
      
      toast({
        title: `${deletedMsgs.length} messaggi eliminati`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await adminBulkRestoreMessages(deletedMsgs);
            }}
          >
            Annulla
          </Button>
        ),
      });
    }
  };

  const handleToggleMessageSelect = (msgId: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      if (next.size === 0) {
        setMessageSelectionMode(false);
      }
      return next;
    });
  };

  const handleSelectAllMessages = () => {
    if (!selectedConversation?.messages) return;
    const allIds = new Set(selectedConversation.messages.map(m => m.id));
    setSelectedMessages(allIds);
  };

  const handleLongPressStart = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setMessageSelectionMode(true);
      setSelectedMessages(new Set([msgId]));
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const exitMessageSelectionMode = () => {
    setMessageSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const handleDeleteConversation = async (conv: Conversation) => {
    // Store if this was the selected conversation before deleting
    const wasSelected = selectedConversation?.id === conv.id;
    
    const deletedConv = await adminDeleteConversation(conv.id);
    
    if (deletedConv) {
      if (wasSelected) {
        setSelectedConversation(null);
      }
      
      // Show toast with undo option - restore WITHOUT selecting
      toast({
        title: conv.is_group ? 'Gruppo eliminato' : 'Conversazione eliminata',
        description: conv.is_group ? conv.name : getParticipantNames(conv),
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Just restore, don't select
              await adminRestoreConversation(deletedConv);
              // Don't set selectedConversation here!
            }}
          >
            Annulla
          </Button>
        ),
      });
    }
    
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  const handleToggleSelect = (convId: string) => {
    setSelectedForAction(prev => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (selectedForAction.size < 2) {
      toast({
        title: 'Errore',
        description: 'Seleziona almeno 2 conversazioni',
        variant: 'destructive',
      });
      return;
    }

    const success = await adminCreateGroup(
      Array.from(selectedForAction),
      newGroupName || 'Gruppo',
      newGroupIsPublic
    );

    if (success) {
      setSelectionMode('none');
      setSelectedForAction(new Set());
      setShowGroupDialog(false);
      setNewGroupName('');
      setNewGroupIsPublic(false);
    }
  };

  const handleCreateEmptyGroup = async () => {
    if (!emptyGroupName.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un nome per il gruppo',
        variant: 'destructive',
      });
      return;
    }

    const success = await adminCreateEmptyGroup(emptyGroupName, emptyGroupIsPublic);

    if (success) {
      setShowNewGroupDialog(false);
      setEmptyGroupName('');
      setEmptyGroupIsPublic(false);
    }
  };

  const handleAddToGroup = async () => {
    if (!targetGroupId || selectedForAction.size === 0) {
      toast({
        title: 'Errore',
        description: 'Seleziona almeno una conversazione da aggiungere',
        variant: 'destructive',
      });
      return;
    }

    const success = await adminAddToGroup(
      targetGroupId,
      Array.from(selectedForAction)
    );

    if (success) {
      setSelectionMode('none');
      setSelectedForAction(new Set());
      setShowAddToGroupDialog(false);
      setTargetGroupId(null);
    }
  };

  // Get list of groups for "add to group" functionality
  const existingGroups = conversations.filter(c => c.is_group);

  const handleBulkDelete = async () => {
    if (selectedForAction.size === 0) {
      toast({
        title: 'Errore',
        description: 'Seleziona almeno 1 conversazione da eliminare',
        variant: 'destructive',
      });
      return;
    }

    const idsToDelete = Array.from(selectedForAction);
    const success = await adminBulkDeleteConversations(idsToDelete);

    if (success) {
      setLastDeletedIds(idsToDelete);
      setSelectionMode('none');
      setSelectedForAction(new Set());
    }
  };
  
  const handleRenameGroup = async () => {
    if (!renameTarget || !renameGroupName.trim()) return;
    
    const success = await adminRenameGroup(renameTarget.id, renameGroupName.trim());
    if (success) {
      setShowRenameDialog(false);
      setRenameTarget(null);
      setRenameGroupName('');
    }
  };
  
  const handleSetVisibility = async () => {
    if (!visibilityTarget) return;
    
    const isPublic = visibilityMode === 'public';
    const allowedList = visibilityMode === 'restricted' ? allowedParticipantsInput : [];
    
    const success = await adminSetGroupVisibility(visibilityTarget.id, isPublic, allowedList);
    if (success) {
      setShowVisibilityDialog(false);
      setVisibilityTarget(null);
      setAllowedParticipantsInput([]);
      setVisibilityMode('private');
    }
  };

  // Initialize visibility dialog state when target changes
  const openVisibilityDialog = (conv: Conversation) => {
    setVisibilityTarget(conv);
    if (conv.is_public) {
      setVisibilityMode('public');
    } else if (conv.allowed_participants && conv.allowed_participants.length > 0) {
      setVisibilityMode('restricted');
      setAllowedParticipantsInput(conv.allowed_participants);
    } else {
      setVisibilityMode('private');
    }
    setShowVisibilityDialog(true);
  };

  // Get all known participants from all conversations for selection
  const allKnownParticipants = React.useMemo(() => {
    const participantsMap = new Map<string, { session_id: string; name: string }>();
    conversations.forEach(conv => {
      conv.participants?.forEach(p => {
        if (!participantsMap.has(p.session_id)) {
          participantsMap.set(p.session_id, { session_id: p.session_id, name: p.participant_name });
        }
      });
    });
    return Array.from(participantsMap.values());
  }, [conversations]);

  const exitSelectionMode = () => {
    setSelectionMode('none');
    setSelectedForAction(new Set());
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-pulse" />
        <p className="text-muted-foreground">Caricamento conversazioni...</p>
      </div>
    );
  }

  // Chat view when a conversation is selected
  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] relative">
        {/* Chat header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (messageSelectionMode) {
                  exitMessageSelectionMode();
                } else {
                  setSelectedConversation(null);
                }
              }}
            >
              <X className="w-5 h-5" />
            </Button>
            
            {messageSelectionMode ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {selectedMessages.size} selezionati
                </span>
              </div>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedConversation.is_group ? 'bg-secondary/20' : 'bg-primary/20'
                }`}>
                  {selectedConversation.is_group ? (
                    <Users className="w-5 h-5 text-secondary" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {selectedConversation.is_group 
                        ? selectedConversation.name 
                        : getParticipantNames(selectedConversation)}
                    </h3>
                    {selectedConversation.is_group && (
                      selectedConversation.is_public ? (
                        <Globe className="w-4 h-4 text-secondary" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )
                    )}
                  </div>
                  {selectedConversation.is_group && (
                    <p className="text-xs text-muted-foreground">
                      {getParticipantNames(selectedConversation)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {messageSelectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMessages}
                  className="text-xs"
                >
                  Tutti ({selectedConversation.messages?.length || 0})
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedMessages.size === 0}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Elimina ({selectedMessages.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-destructive">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Elimina Messaggi
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Eliminare {selectedMessages.size} messaggi selezionati?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDeleteMessages}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                {/* Group management dropdown */}
                {selectedConversation.is_group && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setRenameTarget(selectedConversation);
                        setRenameGroupName(selectedConversation.name || '');
                        setShowRenameDialog(true);
                      }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rinomina gruppo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openVisibilityDialog(selectedConversation)}>
                        {selectedConversation.is_public ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Rendi privato
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 mr-2" />
                            Cambia visibilità
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                        <Users className="w-4 h-4 mr-2" />
                        Gestisci membri
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
                        <Key className="w-4 h-4 mr-2" />
                        {selectedConversation.password_hash ? 'Modifica password' : 'Imposta password'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={async () => {
                        const result = await adminCreateInviteLink(selectedConversation.id);
                        if (result?.invite_code) {
                          const link = `${window.location.origin}/join/${result.invite_code}`;
                          await navigator.clipboard.writeText(link);
                          toast({
                            title: 'Link copiato!',
                            description: 'Il link di invito è stato copiato negli appunti',
                          });
                        }
                      }}>
                        <Link2 className="w-4 h-4 mr-2" />
                        Crea link invito
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-destructive">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Elimina Conversazione
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare questa conversazione e tutti i suoi messaggi?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteConversation(selectedConversation)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea 
          ref={scrollAreaRef} 
          className="flex-1 mb-4"
          onScrollCapture={checkIfAtBottom}
        >
          <div className="space-y-3 pr-4">
            {/* Hint for long-press selection */}
            {!messageSelectionMode && selectedConversation.messages && selectedConversation.messages.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mb-2">
                Tieni premuto un messaggio per selezionarlo
              </p>
            )}
            
            {selectedConversation.messages?.slice().reverse().map((msg) => {
              const isNewUserMessage = msg.sender_type === 'user' && !viewedMessageIds.has(msg.id);
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  onMouseDown={() => handleLongPressStart(msg.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(msg.id)}
                  onTouchEnd={handleLongPressEnd}
                >
                  <div className="flex flex-col">
                    {/* Show "new message" indicator for unread user messages */}
                    {isNewUserMessage && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] text-primary font-medium">Nuovo</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 cursor-pointer transition-all ${
                        selectedMessages.has(msg.id) 
                          ? 'ring-2 ring-primary bg-primary/10'
                          : msg.sender_type === 'admin'
                            ? 'bg-secondary/20 border border-secondary/30'
                            : isNewUserMessage
                              ? 'bg-primary/5 border-2 border-primary/30 shadow-sm shadow-primary/20'
                              : 'bg-muted border border-border'
                      }`}
                      onClick={() => {
                        if (messageSelectionMode) {
                          handleToggleMessageSelect(msg.id);
                        }
                      }}
                    >
                  {messageSelectionMode && (
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        checked={selectedMessages.has(msg.id)}
                        onCheckedChange={() => handleToggleMessageSelect(msg.id)}
                      />
                    </div>
                  )}
                  
                  <p className={`text-xs font-medium mb-1 ${
                    msg.sender_type === 'admin' ? 'text-secondary' : 'text-primary'
                  }`}>
                    {msg.sender_name}
                  </p>
                  
                  {editingMessageId === msg.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[60px] bg-background"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(msg.id)} className="h-8">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-foreground whitespace-pre-wrap break-words">
                        {msg.message_text}
                      </p>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('it-IT', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                            {msg.edited_at && ' (modificato)'}
                          </span>
                          {/* WhatsApp-style message status checkmarks for admin messages */}
                          {msg.sender_type === 'admin' && (
                            <MessageStatusIndicator status={msg.status || 'sent'} />
                          )}
                        </div>
                        {!messageSelectionMode && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(msg);
                              }}
                              className="h-6 px-2"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Elimina Messaggio</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Vuoi eliminare questo messaggio?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* WhatsApp-style scroll down indicator */}
        <ChatScrollIndicator
          unreadCount={newMessagesCount}
          onClick={scrollToBottom}
          visible={showScrollIndicator}
        />

        {/* Typing indicator */}
        {isAnyoneTyping && (
          <div className="px-4 py-2">
            <TypingIndicator names={typingNames} />
          </div>
        )}

        {/* Reply input */}
        <div className="glass-card p-4 border border-border">
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                if (e.target.value.trim()) {
                  updateTypingIndicator();
                } else {
                  clearTypingIndicator();
                }
              }}
              placeholder="Scrivi una risposta..."
              className="min-h-[44px] max-h-[120px] bg-muted border-border resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  clearTypingIndicator();
                  handleSendReply();
                }
              }}
            />
            <Button
              onClick={() => { clearTypingIndicator(); handleSendReply(); }}
              disabled={!replyText.trim() || isSubmittingReply}
              className="neon-button-pink h-auto"
            >
              <Reply className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list view
  return (
    <div>
      {/* Header with action controls */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        {selectionMode === 'none' ? (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewGroupDialog(true)}
              className="border-accent text-accent-foreground bg-accent/20 hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Gruppo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode('createGroup')}
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              disabled={conversations.length < 2}
            >
              <Users className="w-4 h-4 mr-2" />
              Unisci in Gruppo
            </Button>
            {existingGroups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddToGroupDialog(true);
                }}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Aggiungi a Gruppo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode('delete')}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              disabled={conversations.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {selectedForAction.size} selezionate
            </span>
            {/* Select All / Deselect All button */}
            {currentConversations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedForAction.size === currentConversations.length) {
                    setSelectedForAction(new Set());
                  } else {
                    setSelectedForAction(new Set(currentConversations.map(c => c.id)));
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {selectedForAction.size === currentConversations.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
            )}
            {selectionMode === 'createGroup' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupDialog(true)}
                disabled={selectedForAction.size < 2}
                className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Users className="w-4 h-4 mr-2" />
                Crea Gruppo ({selectedForAction.size})
              </Button>
            )}
            {selectionMode === 'addToGroup' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToGroup}
                disabled={selectedForAction.size === 0}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Aggiungi ({selectedForAction.size})
              </Button>
            )}
            {selectionMode === 'delete' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedForAction.size === 0}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Elimina ({selectedForAction.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-destructive">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Elimina Conversazioni
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Sei sicuro di voler eliminare {selectedForAction.size} conversazioni? 
                      Questa azione non può essere annullata.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Elimina Tutto
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectionMode}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSubTab('unread')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            activeSubTab === 'unread'
              ? 'bg-primary text-primary-foreground neon-glow-pink'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <MessageCircle className="w-4 h-4 inline-block mr-2" />
          Da leggere ({unreadConversations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('read')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            activeSubTab === 'read'
              ? 'bg-secondary text-secondary-foreground neon-glow-cyan'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Eye className="w-4 h-4 inline-block mr-2" />
          Letti ({readConversations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('groups')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            activeSubTab === 'groups'
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Gruppi ({groupConversations.length})
        </button>
      </div>

      {/* Conversations list */}
      <div className="space-y-4">
        {currentConversations.length === 0 ? (
          <div className="text-center py-12">
            {activeSubTab === 'groups' ? (
              <>
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessun gruppo creato. Clicca su "Nuovo Gruppo" per crearne uno.
                </p>
              </>
            ) : (
              <>
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {activeSubTab === 'unread' 
                    ? 'Nessuna conversazione da leggere' 
                    : 'Nessuna conversazione letta'}
                </p>
              </>
            )}
          </div>
        ) : (
          currentConversations.map((conv) => (
            <div
              key={conv.id}
              className={`glass-card p-4 neon-border-pink border cursor-pointer hover:border-primary transition-colors ${
                selectionMode !== 'none' && selectedForAction.has(conv.id) ? 'ring-2 ring-secondary' : ''
              }`}
              onClick={async () => {
                if (selectionMode !== 'none') {
                  handleToggleSelect(conv.id);
                } else {
                  // Auto-mark as read when opening
                  if (conv.is_read === false) {
                    await adminMarkAsRead(conv.id);
                  }
                  setSelectedConversation(conv);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {selectionMode !== 'none' && (
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedForAction.has(conv.id)}
                      onCheckedChange={() => handleToggleSelect(conv.id)}
                    />
                  </div>
                )}
                
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  conv.is_group ? 'bg-secondary/20' : 'bg-primary/20'
                }`}>
                  {conv.is_group ? (
                    <Users className="w-5 h-5 text-secondary" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-foreground">
                        {conv.is_group ? conv.name : getParticipantNames(conv)}
                      </span>
                      {conv.is_group && (
                        conv.is_public ? (
                          <Globe className="w-3 h-3 text-secondary" />
                        ) : (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )
                      )}
                    </div>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.last_message.created_at).toLocaleString('it-IT')}
                      </span>
                    )}
                  </div>
                  
                  {conv.is_group && (
                    <p className="text-xs text-muted-foreground">
                      {getParticipantNames(conv)}
                    </p>
                  )}
                  
                  {conv.last_message && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {conv.last_message.sender_type === 'admin' && 'Tu: '}
                      {conv.last_message.message_text}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {conv.messages?.length || 0} messaggi
                    </span>
                  </div>
                </div>

                {selectionMode === 'none' && (
                  <div className="flex items-center gap-1">
                    {/* Direct delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card border-destructive">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Elimina {conv.is_group ? 'Gruppo' : 'Conversazione'}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {conv.is_group 
                              ? `Eliminare il gruppo "${conv.name}"?`
                              : `Eliminare la conversazione con ${getParticipantNames(conv)}?`}
                            <br />
                            Potrai annullare l'operazione subito dopo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv);
                            }}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    {/* More options menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {conv.is_group && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setRenameTarget(conv);
                              setRenameGroupName(conv.name || '');
                              setShowRenameDialog(true);
                            }}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Rinomina
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openVisibilityDialog(conv);
                            }}>
                              {conv.is_public ? (
                                <>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Rendi privato
                                </>
                              ) : (
                                <>
                                  <Globe className="w-4 h-4 mr-2" />
                                  Cambia visibilità
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConversation(conv);
                              setShowMembersDialog(true);
                            }}>
                              <Users className="w-4 h-4 mr-2" />
                              Gestisci membri
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConversation(conv);
                              setShowPasswordDialog(true);
                            }}>
                              <Key className="w-4 h-4 mr-2" />
                              {conv.password_hash ? 'Modifica password' : 'Imposta password'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {/* Mark as read/unread */}
                        {activeSubTab === 'unread' ? (
                          <DropdownMenuItem onClick={async (e) => {
                            e.stopPropagation();
                            await adminMarkAsRead(conv.id);
                            toast({
                              title: 'Segnato come letto',
                              description: conv.is_group ? conv.name : getParticipantNames(conv),
                            });
                          }}>
                            <MailOpen className="w-4 h-4 mr-2" />
                            Segna come letto
                          </DropdownMenuItem>
                        ) : activeSubTab === 'read' ? (
                          <DropdownMenuItem onClick={async (e) => {
                            e.stopPropagation();
                            await adminMarkAsUnread(conv.id);
                            toast({
                              title: 'Segnato come da leggere',
                              description: conv.is_group ? conv.name : getParticipantNames(conv),
                            });
                          }}>
                            <Mail className="w-4 h-4 mr-2" />
                            Segna come da leggere
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          const inviteLink = await adminCreateInviteLink(conv.id);
                          if (inviteLink) {
                            const fullUrl = `${window.location.origin}/join/${inviteLink.invite_code}`;
                            await navigator.clipboard.writeText(fullUrl);
                            toast({
                              title: 'Link copiato!',
                              description: 'Condividi questo link per invitare persone',
                            });
                          }
                        }}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Crea link invito
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Empty Group dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Nuovo Gruppo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Nome del gruppo
              </Label>
              <Input
                value={emptyGroupName}
                onChange={(e) => setEmptyGroupName(e.target.value)}
                placeholder="Es: Cena 20 gennaio"
                className="bg-muted border-border"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Gruppo Pubblico</Label>
                <p className="text-xs text-muted-foreground">
                  {emptyGroupIsPublic 
                    ? 'Tutti potranno vedere e partecipare a questo gruppo'
                    : 'Solo tu potrai aggiungere persone al gruppo'}
                </p>
              </div>
              <Switch
                checked={emptyGroupIsPublic}
                onCheckedChange={setEmptyGroupIsPublic}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewGroupDialog(false);
              setEmptyGroupName('');
              setEmptyGroupIsPublic(false);
            }}>
              Annulla
            </Button>
            <Button 
              onClick={handleCreateEmptyGroup} 
              disabled={!emptyGroupName.trim()}
              className={emptyGroupIsPublic ? "neon-button-cyan" : "neon-button-pink"}
            >
              {emptyGroupIsPublic ? (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Crea Pubblico
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Crea Privato
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group from conversations dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Unisci in Gruppo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Nome del gruppo
              </Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Es: Amici del karaoke"
                className="bg-muted border-border"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Gruppo Pubblico</Label>
                <p className="text-xs text-muted-foreground">
                  {newGroupIsPublic 
                    ? 'Tutti potranno vedere e partecipare'
                    : 'Solo i partecipanti selezionati'}
                </p>
              </div>
              <Switch
                checked={newGroupIsPublic}
                onCheckedChange={setNewGroupIsPublic}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Verrà creato un nuovo gruppo con {selectedForAction.size} partecipanti.
              Le conversazioni private rimarranno separate.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGroupDialog(false);
              setNewGroupName('');
              setNewGroupIsPublic(false);
            }}>
              Annulla
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              className={newGroupIsPublic ? "neon-button-cyan" : "neon-button-pink"}
            >
              {newGroupIsPublic ? (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Crea Pubblico
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Crea Privato
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Group dialog */}
      <Dialog open={showAddToGroupDialog} onOpenChange={(open) => {
        setShowAddToGroupDialog(open);
        if (!open) {
          setTargetGroupId(null);
          setSelectionMode('none');
          setSelectedForAction(new Set());
        }
      }}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Aggiungi a Gruppo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Seleziona il gruppo
              </label>
              <Select value={targetGroupId || ''} onValueChange={(value) => {
                setTargetGroupId(value);
                setSelectionMode('addToGroup');
              }}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Scegli un gruppo..." />
                </SelectTrigger>
                <SelectContent>
                  {existingGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name || 'Gruppo senza nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {targetGroupId && (
              <p className="text-sm text-muted-foreground">
                Dopo aver selezionato il gruppo, seleziona le conversazioni da cui vuoi aggiungere i partecipanti.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddToGroupDialog(false);
              setTargetGroupId(null);
              setSelectionMode('none');
              setSelectedForAction(new Set());
            }}>
              Annulla
            </Button>
            {targetGroupId && (
              <Button onClick={() => setShowAddToGroupDialog(false)} className="neon-button-pink">
                <Check className="w-4 h-4 mr-2" />
                Seleziona Conversazioni
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Rinomina Gruppo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nuovo nome
              </label>
              <Input
                value={renameGroupName}
                onChange={(e) => setRenameGroupName(e.target.value)}
                placeholder="Nome del gruppo"
                className="bg-muted border-border"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRenameDialog(false);
              setRenameTarget(null);
              setRenameGroupName('');
            }}>
              Annulla
            </Button>
            <Button onClick={handleRenameGroup} className="neon-button-pink">
              <Check className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visibility dialog */}
      <Dialog open={showVisibilityDialog} onOpenChange={(open) => {
        if (!open) {
          setShowVisibilityDialog(false);
          setVisibilityTarget(null);
          setAllowedParticipantsInput([]);
          setVisibilityMode('private');
        }
      }}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-secondary" />
              Visibilità Gruppo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Gruppo: <strong>{visibilityTarget?.name}</strong>
            </p>
            
            {/* Visibility options */}
            <div className="space-y-3">
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  visibilityMode === 'public' 
                    ? 'border-secondary bg-secondary/10' 
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setVisibilityMode('public')}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-secondary" />
                  <span className="font-medium">Pubblico</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tutti gli utenti possono vedere e unirsi al gruppo
                </p>
              </div>
              
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  visibilityMode === 'private' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setVisibilityMode('private')}
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="font-medium">Privato</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo i partecipanti attuali possono vedere il gruppo
                </p>
              </div>
              
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  visibilityMode === 'restricted' 
                    ? 'border-accent bg-accent/10' 
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setVisibilityMode('restricted')}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-foreground" />
                  <span className="font-medium">Utenti Selezionati</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo gli utenti che selezioni potranno vedere e unirsi
                </p>
              </div>
            </div>
            
            {/* User selection for restricted mode */}
            {visibilityMode === 'restricted' && (
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-medium">Seleziona utenti abilitati:</Label>
                <ScrollArea className="h-40 border rounded-lg p-2">
                  {allKnownParticipants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessun utente disponibile
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allKnownParticipants.map((p) => (
                        <div key={p.session_id} className="flex items-center gap-2">
                          <Checkbox
                            id={`participant-${p.session_id}`}
                            checked={allowedParticipantsInput.includes(p.session_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAllowedParticipantsInput(prev => [...prev, p.session_id]);
                              } else {
                                setAllowedParticipantsInput(prev => prev.filter(id => id !== p.session_id));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`participant-${p.session_id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {p.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {allowedParticipantsInput.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {allowedParticipantsInput.length} utenti selezionati
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowVisibilityDialog(false);
              setVisibilityTarget(null);
              setAllowedParticipantsInput([]);
              setVisibilityMode('private');
            }}>
              Annulla
            </Button>
            <Button 
              onClick={handleSetVisibility}
              className="neon-button-cyan"
              disabled={visibilityMode === 'restricted' && allowedParticipantsInput.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Members Dialog */}
      {selectedConversation && (
        <GroupMembersDialog
          open={showMembersDialog}
          onOpenChange={setShowMembersDialog}
          conversation={selectedConversation}
          onGetMembers={adminGetGroupMembers}
          onBlockUser={adminBlockUser}
          onUnblockUser={adminUnblockUser}
          onRemoveFromGroup={adminRemoveFromGroup}
          onStartPrivateChat={adminStartPrivateChat}
        />
      )}

      {/* Group Password Dialog */}
      {selectedConversation && (
        <GroupPasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          conversation={selectedConversation}
          onSetPassword={adminSetGroupPassword}
        />
      )}
    </div>
  );
};
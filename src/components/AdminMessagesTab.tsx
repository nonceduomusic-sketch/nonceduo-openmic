import React, { useState } from 'react';
import {
  MessageCircle,
  Users,
  Trash2,
  Reply,
  AlertTriangle,
  Eye,
  Edit2,
  Check,
  X,
  Merge,
  Globe,
  Lock,
  MoreVertical,
  Undo2,
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

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
    adminDeleteConversation,
    adminMergeConversations,
    adminRenameGroup,
    adminSetGroupVisibility,
    adminBulkDeleteConversations,
    getUnreadConversations,
    getReadConversations,
  } = useConversations();

  const [activeSubTab, setActiveSubTab] = useState<'unread' | 'read'>('unread');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Selection mode (for merge or delete)
  const [selectionMode, setSelectionMode] = useState<'none' | 'merge' | 'delete'>('none');
  const [selectedForAction, setSelectedForAction] = useState<Set<string>>(new Set());
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeGroupName, setMergeGroupName] = useState('');
  
  // Rename dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Visibility dialog
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [visibilityTarget, setVisibilityTarget] = useState<Conversation | null>(null);
  
  // Undo state for bulk delete
  const [lastDeletedIds, setLastDeletedIds] = useState<string[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);

  const unreadConversations = getUnreadConversations();
  const readConversations = getReadConversations();
  
  const currentConversations = activeSubTab === 'unread' ? unreadConversations : readConversations;

  // Report unread count
  React.useEffect(() => {
    onUnreadCountChange?.(unreadConversations.length);
  }, [unreadConversations.length, onUnreadCountChange]);

  // Update selected conversation when data changes
  React.useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) {
        setSelectedConversation(updated);
      } else {
        setSelectedConversation(null);
      }
    }
  }, [conversations, selectedConversation?.id]);

  // Clear selection when changing tabs
  React.useEffect(() => {
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
    await adminDeleteMessage(msgId);
  };

  const handleDeleteConversation = async (convId: string) => {
    const success = await adminDeleteConversation(convId);
    if (success && selectedConversation?.id === convId) {
      setSelectedConversation(null);
    }
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

  const handleMerge = async () => {
    if (selectedForAction.size < 2) {
      toast({
        title: 'Errore',
        description: 'Seleziona almeno 2 conversazioni da unire',
        variant: 'destructive',
      });
      return;
    }

    const success = await adminMergeConversations(
      Array.from(selectedForAction),
      mergeGroupName || 'Gruppo'
    );

    if (success) {
      setSelectionMode('none');
      setSelectedForAction(new Set());
      setShowMergeDialog(false);
      setMergeGroupName('');
    }
  };

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
    if (!renameTarget || !newGroupName.trim()) return;
    
    const success = await adminRenameGroup(renameTarget.id, newGroupName.trim());
    if (success) {
      setShowRenameDialog(false);
      setRenameTarget(null);
      setNewGroupName('');
    }
  };
  
  const handleSetVisibility = async (isPublic: boolean) => {
    if (!visibilityTarget) return;
    
    const success = await adminSetGroupVisibility(visibilityTarget.id, isPublic);
    if (success) {
      setShowVisibilityDialog(false);
      setVisibilityTarget(null);
    }
  };

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
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Chat header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <X className="w-5 h-5" />
            </Button>
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
          </div>
          
          <div className="flex items-center gap-2">
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
                    setNewGroupName(selectedConversation.name || '');
                    setShowRenameDialog(true);
                  }}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rinomina gruppo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setVisibilityTarget(selectedConversation);
                    setShowVisibilityDialog(true);
                  }}>
                    {selectedConversation.is_public ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Rendi privato
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        Rendi pubblico
                      </>
                    )}
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
                    onClick={() => handleDeleteConversation(selectedConversation.id)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-3 pr-4">
            {selectedConversation.messages?.slice().reverse().map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender_type === 'admin'
                      ? 'bg-secondary/20 border border-secondary/30'
                      : 'bg-muted border border-border'
                  }`}
                >
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {msg.edited_at && ' (modificato)'}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(msg)}
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
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Reply input */}
        <div className="glass-card p-4 border border-border">
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Scrivi una risposta..."
              className="min-h-[44px] max-h-[120px] bg-muted border-border resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
            />
            <Button
              onClick={handleSendReply}
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode('merge')}
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              disabled={conversations.length < 2}
            >
              <Merge className="w-4 h-4 mr-2" />
              Unisci
            </Button>
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
            {selectionMode === 'merge' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMergeDialog(true)}
                disabled={selectedForAction.size < 2}
                className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Merge className="w-4 h-4 mr-2" />
                Crea Gruppo
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
          Risposto ({readConversations.length})
        </button>
      </div>

      {/* Conversations list */}
      <div className="space-y-4">
        {currentConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {activeSubTab === 'unread' 
                ? 'Nessuna conversazione da leggere' 
                : 'Nessuna conversazione con risposta'}
            </p>
          </div>
        ) : (
          currentConversations.map((conv) => (
            <div
              key={conv.id}
              className={`glass-card p-4 neon-border-pink border cursor-pointer hover:border-primary transition-colors ${
                selectionMode !== 'none' && selectedForAction.has(conv.id) ? 'ring-2 ring-secondary' : ''
              }`}
              onClick={() => {
                if (selectionMode !== 'none') {
                  handleToggleSelect(conv.id);
                } else {
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
                            setNewGroupName(conv.name || '');
                            setShowRenameDialog(true);
                          }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rinomina
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setVisibilityTarget(conv);
                            setShowVisibilityDialog(true);
                          }}>
                            {conv.is_public ? (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Rendi privato
                              </>
                            ) : (
                              <>
                                <Globe className="w-4 h-4 mr-2" />
                                Rendi pubblico
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border-destructive">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="w-5 h-5" />
                              Elimina Conversazione
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Questa azione eliminerà la conversazione e tutti i messaggi.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteConversation(conv.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Merge dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Crea Gruppo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome del gruppo
              </label>
              <Input
                value={mergeGroupName}
                onChange={(e) => setMergeGroupName(e.target.value)}
                placeholder="Es: Amici del karaoke"
                className="bg-muted border-border"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Verranno unite {selectedForAction.size} conversazioni in un unico gruppo.
              Tutti i messaggi verranno conservati.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleMerge} className="neon-button-cyan">
              <Merge className="w-4 h-4 mr-2" />
              Crea Gruppo
            </Button>
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
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nome del gruppo"
                className="bg-muted border-border"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRenameDialog(false);
              setRenameTarget(null);
              setNewGroupName('');
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
      <Dialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {visibilityTarget?.is_public ? (
                <>
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  Rendi Privato
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5 text-secondary" />
                  Rendi Pubblico
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {visibilityTarget?.is_public ? (
              <p className="text-sm text-muted-foreground">
                Rendendo il gruppo privato, solo i partecipanti attuali potranno vedere e partecipare.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Rendendo il gruppo pubblico, tutti gli utenti potranno vederlo e partecipare alla conversazione.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowVisibilityDialog(false);
              setVisibilityTarget(null);
            }}>
              Annulla
            </Button>
            <Button 
              onClick={() => handleSetVisibility(!visibilityTarget?.is_public)}
              className={visibilityTarget?.is_public ? "" : "neon-button-cyan"}
            >
              {visibilityTarget?.is_public ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Rendi Privato
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Rendi Pubblico
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
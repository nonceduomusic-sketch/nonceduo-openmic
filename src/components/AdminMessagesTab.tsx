import React, { useState } from 'react';
import {
  Mail,
  MailOpen,
  Trash2,
  Reply,
  AlertTriangle,
  Undo2,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMessages, Message } from '@/hooks/useMessages';
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
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface UndoMessageAction {
  type: 'delete' | 'deleteMultiple' | 'markRead' | 'markUnread';
  messages: Message[];
  description: string;
}

interface AdminMessagesTabProps {
  onUnreadCountChange?: (count: number) => void;
}

export const AdminMessagesTab: React.FC<AdminMessagesTabProps> = ({ onUnreadCountChange }) => {
  const { toast } = useToast();
  const {
    unreadMessages,
    readMessages,
    loading,
    markAsRead,
    markAsUnread,
    replyToMessage,
    deleteMessage,
    restoreMessage,
  } = useMessages();

  const [activeSubTab, setActiveSubTab] = useState<'unread' | 'read'>('unread');
  const [lastAction, setLastAction] = useState<UndoMessageAction | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Report unread count to parent
  React.useEffect(() => {
    onUnreadCountChange?.(unreadMessages.length);
  }, [unreadMessages.length, onUnreadCountChange]);

  // Clear selection when changing tabs
  React.useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeSubTab]);

  const currentMessages = activeSubTab === 'unread' ? unreadMessages : readMessages;

  const getDisplayName = (senderName: string) => {
    return senderName.split('||')[0];
  };

  const handleMarkAsRead = async (message: Message) => {
    const success = await markAsRead(message.id);
    if (success) {
      setLastAction({
        type: 'markRead',
        messages: [message],
        description: `Messaggio di "${getDisplayName(message.sender_name)}" segnato come letto`,
      });
    }
  };

  const handleMarkAsUnread = async (message: Message) => {
    const success = await markAsUnread(message.id);
    if (success) {
      setLastAction({
        type: 'markUnread',
        messages: [message],
        description: `Messaggio di "${getDisplayName(message.sender_name)}" segnato come non letto`,
      });
    }
  };

  const handleDelete = async (message: Message) => {
    const success = await deleteMessage(message.id);
    if (success) {
      setLastAction({
        type: 'delete',
        messages: [message],
        description: `Messaggio di "${getDisplayName(message.sender_name)}" eliminato`,
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const messagesToDelete = currentMessages.filter(m => selectedIds.has(m.id));
    let allSuccess = true;

    for (const message of messagesToDelete) {
      const success = await deleteMessage(message.id);
      if (!success) {
        allSuccess = false;
        break;
      }
    }

    if (allSuccess) {
      setLastAction({
        type: 'deleteMultiple',
        messages: messagesToDelete,
        description: `${messagesToDelete.length} messaggi eliminati`,
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;

    let success = true;

    if (lastAction.type === 'delete' || lastAction.type === 'deleteMultiple') {
      for (const message of lastAction.messages) {
        const result = await restoreMessage(message);
        if (!result) {
          success = false;
          break;
        }
      }
    } else if (lastAction.type === 'markRead') {
      success = await markAsUnread(lastAction.messages[0].id);
    } else if (lastAction.type === 'markUnread') {
      success = await markAsRead(lastAction.messages[0].id);
    }

    if (success) {
      toast({
        title: 'Operazione annullata',
        description: `Ripristinato: ${lastAction.description}`,
      });
      setLastAction(null);
    }
  };

  const handleOpenReply = (message: Message) => {
    setReplyingTo(message);
    setReplyText(message.admin_reply || '');
  };

  const handleSubmitReply = async () => {
    if (!replyingTo || !replyText.trim()) return;

    setIsSubmittingReply(true);
    const success = await replyToMessage(replyingTo.id, replyText.trim());
    
    if (success) {
      setReplyingTo(null);
      setReplyText('');
    }
    
    setIsSubmittingReply(false);
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
    if (selectedIds.size === currentMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentMessages.map((m) => m.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-pulse" />
        <p className="text-muted-foreground">Caricamento messaggi...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with selection controls */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectionMode(true)}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            disabled={currentMessages.length === 0}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Seleziona
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              {selectedIds.size === currentMessages.length ? (
                <Square className="w-4 h-4 mr-2" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              {selectedIds.size === currentMessages.length ? 'Deseleziona' : 'Seleziona tutto'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-card border-destructive">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Elimina Selezionati
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare {selectedIds.size} messaggi selezionati?
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
                    Conferma Eliminazione
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
          <Mail className="w-4 h-4 inline-block mr-2" />
          Da leggere ({unreadMessages.length})
        </button>
        <button
          onClick={() => setActiveSubTab('read')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            activeSubTab === 'read'
              ? 'bg-secondary text-secondary-foreground neon-glow-cyan'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <MailOpen className="w-4 h-4 inline-block mr-2" />
          Letti ({readMessages.length})
        </button>
      </div>

      {/* Undo button */}
      {lastAction && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white animate-pulse w-full"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Annulla: {lastAction.description}
          </Button>
        </div>
      )}

      {/* Messages list */}
      <div className="space-y-4">
        {currentMessages.length === 0 ? (
          <div className="text-center py-12">
            {activeSubTab === 'unread' ? (
              <>
                <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessun messaggio da leggere
                </p>
              </>
            ) : (
              <>
                <MailOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessun messaggio letto
                </p>
              </>
            )}
          </div>
        ) : (
          currentMessages.map((message) => (
            <div
              key={message.id}
              className={`glass-card p-4 neon-border-pink border ${
                selectionMode && selectedIds.has(message.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {selectionMode && (
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.has(message.id)}
                      onCheckedChange={(checked) => handleSelect(message.id, checked as boolean)}
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-display font-semibold text-foreground">
                      {getDisplayName(message.sender_name)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString('it-IT')}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap break-words">
                    {message.message_text}
                  </p>
                  
                  {message.admin_reply && (
                    <div className="mt-3 pl-3 border-l-2 border-secondary bg-secondary/10 p-2 rounded-r">
                      <p className="text-xs text-muted-foreground mb-1">
                        La tua risposta • {new Date(message.replied_at!).toLocaleString('it-IT')}
                      </p>
                      <p className="text-sm text-foreground">{message.admin_reply}</p>
                    </div>
                  )}
                </div>

                {!selectionMode && (
                  <div className="flex flex-col gap-2">
                    {activeSubTab === 'unread' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(message)}
                        className="text-secondary hover:text-secondary hover:bg-secondary/20"
                        title="Segna come letto"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsUnread(message)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Segna come non letto"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenReply(message)}
                      className="text-primary hover:text-primary hover:bg-primary/20"
                      title="Rispondi"
                    >
                      <Reply className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/20"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card border-destructive">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Elimina Messaggio
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare questo messaggio di "{getDisplayName(message.sender_name)}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">
                            Annulla
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(message)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5 text-primary" />
              Rispondi a {replyingTo && getDisplayName(replyingTo.sender_name)}
            </DialogTitle>
          </DialogHeader>
          
          {replyingTo && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Messaggio originale:</p>
                <p className="text-sm">{replyingTo.message_text}</p>
              </div>
              
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Scrivi la tua risposta..."
                className="min-h-[100px]"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyingTo(null)}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSubmitReply}
              disabled={!replyText.trim() || isSubmittingReply}
              className="neon-button-pink"
            >
              {isSubmittingReply ? 'Invio...' : 'Invia Risposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

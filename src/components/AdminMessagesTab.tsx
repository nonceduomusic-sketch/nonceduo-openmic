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

interface UndoMessageAction {
  type: 'delete' | 'markRead' | 'markUnread';
  message: Message;
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

  // Report unread count to parent
  React.useEffect(() => {
    onUnreadCountChange?.(unreadMessages.length);
  }, [unreadMessages.length, onUnreadCountChange]);

  const currentMessages = activeSubTab === 'unread' ? unreadMessages : readMessages;

  const getDisplayName = (senderName: string) => {
    return senderName.split('||')[0];
  };

  const handleMarkAsRead = async (message: Message) => {
    const success = await markAsRead(message.id);
    if (success) {
      setLastAction({
        type: 'markRead',
        message,
        description: `Messaggio di "${getDisplayName(message.sender_name)}" segnato come letto`,
      });
    }
  };

  const handleMarkAsUnread = async (message: Message) => {
    const success = await markAsUnread(message.id);
    if (success) {
      setLastAction({
        type: 'markUnread',
        message,
        description: `Messaggio di "${getDisplayName(message.sender_name)}" segnato come non letto`,
      });
    }
  };

  const handleDelete = async (message: Message) => {
    const success = await deleteMessage(message.id);
    if (success) {
      setLastAction({
        type: 'delete',
        message,
        description: `Messaggio di "${getDisplayName(message.sender_name)}" eliminato`,
      });
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;

    let success = false;

    if (lastAction.type === 'delete') {
      success = await restoreMessage(lastAction.message);
    } else if (lastAction.type === 'markRead') {
      success = await markAsUnread(lastAction.message.id);
    } else if (lastAction.type === 'markUnread') {
      success = await markAsRead(lastAction.message.id);
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
              className="glass-card p-4 neon-border-pink border"
            >
              <div className="flex items-start justify-between gap-4">
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

import React, { useState, useEffect } from 'react';
import { Users, Ban, MessageCircle, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { GroupMember, Conversation } from '@/hooks/useConversations';

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onGetMembers: (conversationId: string) => Promise<GroupMember[]>;
  onBlockUser: (sessionId: string, reason?: string) => Promise<boolean>;
  onUnblockUser: (sessionId: string) => Promise<boolean>;
  onRemoveFromGroup: (groupId: string, sessionId: string) => Promise<boolean>;
  onStartPrivateChat: (name: string, sessionId: string) => Promise<Conversation | null>;
}

export const GroupMembersDialog: React.FC<GroupMembersDialogProps> = ({
  open,
  onOpenChange,
  conversation,
  onGetMembers,
  onBlockUser,
  onUnblockUser,
  onRemoveFromGroup,
  onStartPrivateChat,
}) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open && conversation.id) {
      loadMembers();
    }
  }, [open, conversation.id]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await onGetMembers(conversation.id);
      setMembers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (member: GroupMember) => {
    setActionLoading(member.session_id);
    try {
      await onBlockUser(member.session_id, 'Bloccato dal pannello admin');
      await loadMembers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (member: GroupMember) => {
    setActionLoading(member.session_id);
    try {
      await onUnblockUser(member.session_id);
      await loadMembers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (member: GroupMember) => {
    setActionLoading(member.session_id);
    try {
      await onRemoveFromGroup(conversation.id, member.session_id);
      await loadMembers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartChat = async (member: GroupMember) => {
    setActionLoading(member.session_id);
    try {
      await onStartPrivateChat(member.participant_name, member.session_id);
      onOpenChange(false);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-secondary" />
            Membri di "{conversation.name || 'Gruppo'}"
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nessun membro nel gruppo</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    member.is_blocked 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.is_blocked ? 'bg-destructive/20' : 'bg-primary/20'
                    }`}>
                      <span className="font-bold text-foreground">
                        {member.participant_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {member.participant_name}
                        </p>
                        {member.is_blocked && (
                          <Badge variant="destructive" className="text-xs">
                            Bloccato
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Entrato il {new Date(member.joined_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Private chat button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartChat(member)}
                      disabled={actionLoading === member.session_id}
                      title="Messaggio privato"
                    >
                      {actionLoading === member.session_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Block/Unblock button */}
                    {member.is_blocked ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-500 hover:text-green-600"
                        onClick={() => handleUnblock(member)}
                        disabled={actionLoading === member.session_id}
                        title="Sblocca utente"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleBlock(member)}
                        disabled={actionLoading === member.session_id}
                        title="Blocca utente"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Remove from group */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={actionLoading === member.session_id}
                          title="Rimuovi dal gruppo"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rimuovi dal gruppo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vuoi rimuovere {member.participant_name} dal gruppo "{conversation.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(member)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Rimuovi
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {members.length} {members.length === 1 ? 'membro' : 'membri'} nel gruppo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

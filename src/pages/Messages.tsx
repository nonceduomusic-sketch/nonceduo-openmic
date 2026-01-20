import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, Edit2, Check, X, Users, Globe, Ban, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConversations, Conversation, ChatMessage } from '@/hooks/useConversations';
import { z } from 'zod';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

const messageSchema = z.object({
  sender_name: z.string().trim()
    .min(1, 'Inserisci il tuo nome')
    .max(50, 'Nome troppo lungo (massimo 50 caratteri)'),
  message_text: z.string().trim()
    .min(1, 'Inserisci un messaggio')
    .max(500, 'Messaggio troppo lungo (massimo 500 caratteri)'),
});

interface OnlineUser {
  session_id: string;
  name: string;
  conversation_id: string;
}

const Messages: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSessionId, setUserSessionId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeTab, setActiveTab] = useState<'private' | 'public'>('private');
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<any>(null);

  const { 
    conversations, 
    publicGroups,
    startConversation, 
    sendMessage: sendChatMessage, 
    editMessage,
    joinPublicGroup,
    isBlocked,
    loading 
  } = useConversations(userSessionId);

  // Generate unique session ID
  useEffect(() => {
    let sessionId = localStorage.getItem('user_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('user_session_id', sessionId);
    }
    setUserSessionId(sessionId);
    
    const savedName = localStorage.getItem('user_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  // Presence tracking for online users
  useEffect(() => {
    if (!selectedConversation || !userSessionId || !name.trim()) return;

    const channelName = `presence:${selectedConversation.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.session_id !== userSessionId) {
              users.push({
                session_id: presence.session_id,
                name: presence.name,
                conversation_id: selectedConversation.id,
              });
            }
          });
        });
        
        setOnlineUsers(prev => {
          const next = new Map(prev);
          next.set(selectedConversation.id, users);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            session_id: userSessionId,
            name: name,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, userSessionId, name]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Update selected conversation when conversations change
  useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) {
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation?.id]);

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast.error('Il tuo account è stato sospeso. Contatta lo staff per maggiori informazioni.');
      return;
    }
    
    const validation = messageSchema.safeParse({ 
      sender_name: name, 
      message_text: message 
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem('user_name', validation.data.sender_name);
    
    const conversationId = await startConversation(
      validation.data.sender_name,
      validation.data.message_text,
      userSessionId
    );
    
    if (conversationId) {
      setMessage('');
      // The conversation list is now refreshed in startConversation
      // Find and select it immediately from the updated list
      const newConv = conversations.find(c => c.id === conversationId);
      if (newConv) {
        setSelectedConversation(newConv);
      }
    }
    
    setIsSubmitting(false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !message.trim()) return;

    if (isBlocked) {
      toast.error('Il tuo account è stato sospeso. Contatta lo staff per maggiori informazioni.');
      return;
    }

    const validation = messageSchema.safeParse({ 
      sender_name: name, 
      message_text: message 
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    setIsSubmitting(true);
    
    const success = await sendChatMessage(
      selectedConversation.id,
      validation.data.sender_name,
      validation.data.message_text,
      userSessionId
    );
    
    if (success) {
      setMessage('');
    }
    
    setIsSubmitting(false);
  };

  const handleJoinGroup = async (conv: Conversation) => {
    if (isBlocked) {
      toast.error('Il tuo account è stato sospeso. Contatta lo staff per maggiori informazioni.');
      return;
    }

    if (!name.trim()) {
      toast.error('Inserisci il tuo nome prima di unirti al gruppo');
      return;
    }

    localStorage.setItem('user_name', name);
    const success = await joinPublicGroup(conv.id, name, userSessionId);
    if (success) {
      // After joining, set the conversation directly and switch to private tab
      // The conversation should now be in the conversations list after fetch
      setSelectedConversation({
        ...conv,
        participants: [
          ...(conv.participants || []),
          {
            id: crypto.randomUUID(),
            conversation_id: conv.id,
            participant_name: name,
            session_id: userSessionId,
            joined_at: new Date().toISOString(),
          }
        ]
      });
      setActiveTab('private');
    }
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
    
    const success = await editMessage(msgId, editText.trim(), userSessionId);
    if (success) {
      setEditingMessageId(null);
      setEditText('');
    }
  };

  const userConversations = conversations;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MessageCircle className="w-12 h-12 text-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            {selectedConversation ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Link to="/openmic">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <div className="flex-1">
              <h1 className="font-display text-xl md:text-2xl font-bold neon-text-cyan">
                {selectedConversation 
                  ? (selectedConversation.is_group 
                      ? selectedConversation.name 
                      : 'Chat con lo Staff')
                  : 'Chat'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedConversation 
                  ? (selectedConversation.is_group && selectedConversation.participants
                      ? `${selectedConversation.participants.length} partecipanti`
                      : 'Conversazione attiva')
                  : 'Messaggi privati e gruppi pubblici'}
              </p>
            </div>
            
            {/* Online users indicator */}
            {selectedConversation && (
              <div className="flex items-center gap-1">
                {(() => {
                  const online = onlineUsers.get(selectedConversation.id) || [];
                  if (online.length === 0) return null;
                  return (
                    <div className="flex items-center gap-1 bg-secondary/20 px-2 py-1 rounded-full">
                      <Circle className="w-2 h-2 fill-secondary text-secondary" />
                      <span className="text-xs text-secondary">
                        {online.length} online
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Blocked user banner */}
      {isBlocked && (
        <div className="bg-destructive/20 border-b border-destructive/50 py-3 px-4">
          <div className="container flex items-center gap-2 text-destructive">
            <Ban className="w-5 h-5" />
            <span className="text-sm font-medium">
              Il tuo account è stato sospeso. Non puoi inviare messaggi.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 container py-6 max-w-lg mx-auto flex flex-col">
        {!selectedConversation ? (
          // Conversation list view
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('private')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'private'
                    ? 'bg-primary text-primary-foreground neon-glow-pink'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Privato
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'public'
                    ? 'bg-secondary text-secondary-foreground neon-glow-cyan'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Globe className="w-4 h-4" />
                Pubblico ({publicGroups.length})
              </button>
            </div>

            {activeTab === 'private' ? (
              <>
                {/* New message form */}
                <div className="glass-card p-6 neon-border-cyan border">
                  <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-secondary" />
                    Scrivi allo Staff
                  </h2>
                  
                  <form onSubmit={handleSubmitNew} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Il tuo nome o nickname
                      </label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Come ti chiami?"
                        className="bg-muted border-border focus:border-secondary focus:ring-secondary"
                        disabled={isBlocked}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium mb-2">
                        Il tuo messaggio
                      </label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Scrivi qui il tuo messaggio..."
                        className="bg-muted border-border focus:border-secondary focus:ring-secondary min-h-[120px]"
                        disabled={isBlocked}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.length}/500 caratteri
                      </p>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={!name.trim() || !message.trim() || isSubmitting || isBlocked}
                      className="w-full neon-button-cyan h-12 font-display font-semibold"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Invio...' : 'Invia Messaggio'}
                    </Button>
                  </form>
                </div>

                {/* Public groups banner */}
                {publicGroups.length > 0 && (
                  <button
                    onClick={() => setActiveTab('public')}
                    className="w-full glass-card p-4 neon-border-cyan border text-left hover:border-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {publicGroups.length} gruppo{publicGroups.length > 1 ? 'i' : ''} pubblico{publicGroups.length > 1 ? 'i' : ''} disponibile{publicGroups.length > 1 ? 'i' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Clicca per vedere e partecipare
                        </p>
                      </div>
                      <div className="text-secondary font-medium">
                        Vai →
                      </div>
                    </div>
                  </button>
                )}

                {/* Existing conversations */}
                {userConversations.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      Le tue conversazioni
                    </h2>
                    
                    {userConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className="w-full glass-card p-4 text-left hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                                <span className="font-semibold text-foreground">
                                  {conv.is_group ? conv.name : 'Chat con Staff'}
                                </span>
                                {conv.is_group && conv.is_public && (
                                  <Globe className="w-3 h-3 text-secondary" />
                                )}
                              </div>
                              {conv.last_message && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(conv.last_message.created_at).toLocaleDateString('it-IT')}
                                </span>
                              )}
                            </div>
                            {conv.last_message && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message.sender_type === 'admin' ? 'Staff: ' : ''}
                                {conv.last_message.message_text}
                              </p>
                            )}
                          </div>
                          {conv.last_message?.sender_type === 'admin' && (
                            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Public groups tab
              <div className="space-y-4">
                {/* Name input for joining */}
                <div className="glass-card p-4 neon-border-cyan border">
                  <label htmlFor="name-public" className="block text-sm font-medium mb-2">
                    Il tuo nome (per partecipare)
                  </label>
                  <Input
                    id="name-public"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      localStorage.setItem('user_name', e.target.value);
                    }}
                    placeholder="Come ti chiami?"
                    className="bg-muted border-border focus:border-secondary focus:ring-secondary"
                    disabled={isBlocked}
                  />
                </div>

                {/* User's joined public groups */}
                {userConversations.filter(c => c.is_group && c.is_public).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-display text-sm font-semibold text-secondary flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      I tuoi gruppi
                    </h3>
                    {userConversations.filter(c => c.is_group && c.is_public).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className="w-full glass-card p-4 text-left hover:border-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{conv.name}</span>
                              <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded">Iscritto</span>
                            </div>
                            {conv.last_message && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message.sender_name}: {conv.last_message.message_text}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Available public groups to join */}
                <div className="space-y-3">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Gruppi disponibili
                  </h3>
                  {publicGroups.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Nessun nuovo gruppo disponibile
                      </p>
                    </div>
                  ) : (
                    publicGroups.map((conv) => (
                      <div
                        key={conv.id}
                        className="glass-card p-4 neon-border-cyan border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/20">
                            <Globe className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {conv.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {conv.participants?.length || 0} partecipanti • {conv.messages?.length || 0} messaggi
                            </p>
                            {conv.last_message && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {conv.last_message.sender_name}: {conv.last_message.message_text}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleJoinGroup(conv)}
                            disabled={!name.trim() || isBlocked}
                            className="neon-button-cyan"
                          >
                            Entra
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Chat view
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-4 pr-4">
                {selectedConversation.messages?.slice().reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'user' && msg.sender_session_id === userSessionId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_type === 'admin'
                          ? 'bg-secondary/20 border border-secondary/30'
                          : msg.sender_session_id === userSessionId
                            ? 'bg-primary/20 border border-primary/30'
                            : 'bg-muted border border-border'
                      }`}
                    >
                      {/* Sender name for groups or admin */}
                      {(selectedConversation.is_group || msg.sender_type === 'admin') && (
                        <p className={`text-xs font-medium mb-1 ${
                          msg.sender_type === 'admin' ? 'text-secondary' : 'text-primary'
                        }`}>
                          {msg.sender_type === 'admin' ? 'Staff' : msg.sender_name}
                        </p>
                      )}
                      
                      {editingMessageId === msg.id ? (
                        // Edit mode
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[60px] bg-background"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(msg.id)}
                              className="h-8"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="h-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
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
                            {/* Edit button for user's own messages */}
                            {msg.sender_type === 'user' && msg.sender_session_id === userSessionId && !isBlocked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(msg)}
                                className="h-6 px-2 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply input */}
            <form onSubmit={handleSendReply} className="glass-card p-4 border border-border">
              {isBlocked ? (
                <div className="flex items-center justify-center gap-2 text-destructive py-2">
                  <Ban className="w-4 h-4" />
                  <span className="text-sm">Non puoi inviare messaggi</span>
                </div>
              ) : !name.trim() ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Inserisci il tuo nome per scrivere:</p>
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        localStorage.setItem('user_name', e.target.value);
                      }}
                      placeholder="Il tuo nome..."
                      className="bg-muted border-border"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Scrivi un messaggio..."
                    className="min-h-[44px] max-h-[120px] bg-muted border-border resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || isSubmitting}
                    className="neon-button-cyan h-auto"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;

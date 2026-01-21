import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, Edit2, Check, X, Users, Globe, Ban, Circle, Plus, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConversations, Conversation, ChatMessage } from '@/hooks/useConversations';
import { z } from 'zod';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageStatusIndicator } from '@/components/MessageStatusIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { ChatScrollIndicator } from '@/components/ChatScrollIndicator';

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
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser[]>>(new Map());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<any>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const isAtBottomRef = useRef(true);

  // Typing indicator hook
  const {
    typingNames,
    isAnyoneTyping,
    updateTypingIndicator,
    clearTypingIndicator,
  } = useTypingIndicator(
    selectedConversation?.id || null,
    userSessionId,
    name
  );

  const { 
    conversations, 
    publicGroups,
    startConversation, 
    sendMessage: sendChatMessage, 
    editMessage,
    joinPublicGroup,
    markMessagesAsRead,
    isBlocked,
    loading 
  } = useConversations(userSessionId);

  // Generate unique session ID (safe for older mobile browsers)
  useEffect(() => {
    const safeGet = (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };

    const safeSet = (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore (private mode / storage disabled)
      }
    };

    const generateId = () => {
      try {
        const randomUUID = (crypto as any)?.randomUUID as undefined | (() => string);
        if (typeof randomUUID === 'function') return randomUUID();
      } catch {
        // ignore
      }

      try {
        if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
      } catch {
        // ignore
      }

      return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    };

    let sessionId = safeGet('user_session_id');
    if (!sessionId) {
      sessionId = generateId();
      safeSet('user_session_id', sessionId);
    }

    setUserSessionId(sessionId);

    const savedName = safeGet('user_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  // Check notification support and permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsSupported(true);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Listen for new messages and send notifications
  useEffect(() => {
    if (!notificationsEnabled || !userSessionId) return;

    const handleNewMessage = (payload: any) => {
      const newMsg = payload.new;
      // Only notify if message is from someone else
      if (newMsg.sender_session_id !== userSessionId && newMsg.sender_type === 'admin') {
        // Check if page is not focused
        if (document.hidden) {
          const notification = new Notification('Nuovo messaggio dallo Staff', {
            body: newMsg.message_text.substring(0, 100),
            icon: '/favicon.ico',
            tag: 'chat-message',
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
    };

    const channel = supabase
      .channel('user-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        handleNewMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notificationsEnabled, userSessionId]);

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

  // Check if user is at bottom of scroll area
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
    
    if (lastMessage && lastMessage.sender_type === 'admin' && !isAtBottomRef.current) {
      // New admin message arrived while not at bottom
      setNewMessagesCount(prev => prev + 1);
      setShowScrollIndicator(true);
    } else if (isAtBottomRef.current) {
      // Auto-scroll when user is at bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages?.length]);

  // Update selected conversation when conversations change (real-time sync for status updates)
  useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) {
        // Deep compare to detect any message status changes
        const hasChanges = 
          JSON.stringify(updated.messages?.map(m => ({ id: m.id, status: m.status }))) !== 
          JSON.stringify(selectedConversation.messages?.map(m => ({ id: m.id, status: m.status })));
        
        if (hasChanges || updated.messages?.length !== selectedConversation.messages?.length) {
          setSelectedConversation(updated);
        }
      }
    }
  }, [conversations]);

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (selectedConversation && userSessionId) {
      markMessagesAsRead(selectedConversation.id, userSessionId);
    }
  }, [selectedConversation?.id, userSessionId, markMessagesAsRead]);

  // If no conversations exist, show the new message form automatically
  useEffect(() => {
    if (!loading && conversations.length === 0 && publicGroups.length === 0) {
      setShowNewMessageForm(true);
    }
  }, [loading, conversations.length, publicGroups.length]);

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
    
    const newConversation = await startConversation(
      validation.data.sender_name,
      validation.data.message_text,
      userSessionId
    );
    
    if (newConversation) {
      setMessage('');
      setShowNewMessageForm(false);
      setSelectedConversation(newConversation);
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
      const safeTempId = (() => {
        try {
          const randomUUID = (crypto as any)?.randomUUID as undefined | (() => string);
          if (typeof randomUUID === 'function') return randomUUID();
        } catch {
          // ignore
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      })();

      setSelectedConversation({
        ...conv,
        participants: [
          ...(conv.participants || []),
          {
            id: safeTempId,
            conversation_id: conv.id,
            participant_name: name,
            session_id: userSessionId,
            joined_at: new Date().toISOString(),
          }
        ]
      });
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
  const allConversations = [...userConversations];
  const hasConversations = allConversations.length > 0 || publicGroups.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MessageCircle className="w-12 h-12 text-secondary animate-pulse" />
      </div>
    );
  }

  // Determine what to show based on current state
  const renderMainContent = () => {
    // Chat view (selected conversation)
    if (selectedConversation) {
      const messages = [...(selectedConversation.messages || [])].reverse();
      const online = onlineUsers.get(selectedConversation.id) || [];

      return (
        <div className="flex flex-col h-full relative">
          {/* Messages area */}
          <ScrollArea 
            ref={scrollAreaRef} 
            className="flex-1 px-4"
            onScrollCapture={checkIfAtBottom}
          >
            <div className="space-y-4 py-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Nessun messaggio</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.sender_session_id === userSessionId;
                  const isAdmin = msg.sender_type === 'admin';
                  const isEditing = editingMessageId === msg.id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage || isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isAdmin
                            ? 'bg-secondary text-secondary-foreground rounded-br-none'
                            : isOwnMessage
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted text-foreground rounded-bl-none'
                        }`}
                      >
                        {/* Sender name for group chats or admin */}
                        {(selectedConversation.is_group || isAdmin) && !isOwnMessage && (
                          <p className={`text-xs font-semibold mb-1 ${isAdmin ? 'text-secondary-foreground/70' : 'text-muted-foreground'}`}>
                            {isAdmin ? '👤 Staff' : msg.sender_name}
                          </p>
                        )}
                        {isAdmin && isOwnMessage && (
                          <p className="text-xs font-semibold mb-1 text-secondary-foreground/70">
                            👤 Staff
                          </p>
                        )}
                        
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="bg-background/50 text-foreground"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(msg.id)}
                                className="h-7"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-7"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="break-words">{msg.message_text}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <span className={`text-[10px] ${
                                isAdmin ? 'text-secondary-foreground/50' : 
                                isOwnMessage ? 'text-primary-foreground/50' : 'text-muted-foreground'
                              }`}>
                                {new Date(msg.created_at).toLocaleTimeString('it-IT', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                                {msg.edited_at && ' (modificato)'}
                              </span>
                              {/* WhatsApp-style message status checkmarks */}
                              {isOwnMessage && !isAdmin && (
                                <MessageStatusIndicator 
                                  status={msg.status || 'sent'} 
                                  className={isOwnMessage ? 'text-primary-foreground/60' : ''}
                                />
                              )}
                              {isOwnMessage && !isAdmin && (
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="opacity-50 hover:opacity-100 transition-opacity ml-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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

          {/* Reply form */}
          <div className="p-4 border-t border-border bg-card/50">
            <form onSubmit={(e) => { clearTypingIndicator(); handleSendReply(e); }} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (e.target.value.trim()) {
                    updateTypingIndicator();
                  } else {
                    clearTypingIndicator();
                  }
                }}
                placeholder="Scrivi un messaggio..."
                className="flex-1 bg-muted border-border"
                disabled={isBlocked || isSubmitting}
              />
              <Button
                type="submit"
                disabled={!message.trim() || isSubmitting || isBlocked}
                className="neon-button-cyan"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      );
    }

    // New message form view
    if (showNewMessageForm) {
      return (
        <div className="space-y-6">
          <div className="glass-card p-6 neon-border-cyan border">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-secondary" />
              Nuovo Messaggio
            </h2>
            
            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Il tuo nome
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
              
              <div className="flex gap-2">
                {hasConversations && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewMessageForm(false)}
                    className="flex-1"
                  >
                    Annulla
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!name.trim() || !message.trim() || isSubmitting || isBlocked}
                  className={`neon-button-cyan h-12 font-display font-semibold ${hasConversations ? 'flex-1' : 'w-full'}`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Invio...' : 'Invia'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // Conversations list view (default)
    return (
      <div className="space-y-4">
        {/* New message CTA */}
        <Button
          onClick={() => setShowNewMessageForm(true)}
          className="w-full neon-button-cyan h-12 font-display font-semibold"
          disabled={isBlocked}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuovo Messaggio
        </Button>

        {/* Public groups available */}
        {publicGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Gruppi pubblici
            </p>
            {publicGroups.map((group) => {
              const isJoined = group.participants?.some(p => p.session_id === userSessionId);
              return (
                <button
                  key={group.id}
                  onClick={() => isJoined ? setSelectedConversation(group) : handleJoinGroup(group)}
                  className="w-full glass-card p-4 text-left hover:border-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{group.name}</span>
                        {!isJoined && (
                          <span className="text-xs text-secondary font-medium">Unisciti →</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {group.participants?.length || 0} partecipanti
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Existing conversations */}
        {userConversations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Le tue conversazioni
            </p>
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

        {/* Empty state */}
        {!hasConversations && !showNewMessageForm && (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Nessuna conversazione ancora
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Clicca "Nuovo Messaggio" per iniziare
            </p>
          </div>
        )}
      </div>
    );
  };

  // Determine back navigation
  const handleBack = () => {
    if (selectedConversation) {
      setSelectedConversation(null);
    } else if (showNewMessageForm && hasConversations) {
      setShowNewMessageForm(false);
    }
  };

  const showBackToList = selectedConversation || (showNewMessageForm && hasConversations);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            {showBackToList ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground"
                onClick={handleBack}
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
                      : 'Chat con Staff')
                  : showNewMessageForm
                    ? 'Nuovo Messaggio'
                    : 'Messaggi'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedConversation 
                  ? (selectedConversation.is_group && selectedConversation.participants
                      ? `${selectedConversation.participants.length} partecipanti`
                      : 'Conversazione attiva')
                  : showNewMessageForm
                    ? 'Scrivi allo staff'
                    : `${userConversations.length} conversazion${userConversations.length === 1 ? 'e' : 'i'}`}
              </p>
            </div>
            
            {/* Notification button and Online users indicator */}
            <div className="flex items-center gap-2">
              {/* Online users indicator */}
              {selectedConversation && (
                <>
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
                </>
              )}
              
              {/* Notification toggle button */}
              {notificationsSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (notificationsEnabled) {
                      // Can't programmatically revoke, just inform user
                      toast.info('Per disattivare le notifiche, usa le impostazioni del browser');
                    } else {
                      const permission = await Notification.requestPermission();
                      if (permission === 'granted') {
                        setNotificationsEnabled(true);
                        toast.success('Notifiche attivate! Riceverai avvisi per nuovi messaggi');
                      } else if (permission === 'denied') {
                        toast.error('Permesso negato. Abilita le notifiche dalle impostazioni del browser');
                      }
                    }
                  }}
                  className={`relative ${notificationsEnabled ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
                  title={notificationsEnabled ? 'Notifiche attive' : 'Attiva notifiche'}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                  {notificationsEnabled && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-secondary rounded-full" />
                  )}
                </Button>
              )}
            </div>
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
        {renderMainContent()}
      </main>
    </div>
  );
};

export default Messages;

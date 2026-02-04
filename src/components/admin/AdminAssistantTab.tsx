import React, { useState } from 'react';
import { Bot, MessageCircle, Settings, Users, CheckCircle, Clock, Archive, Trash2, Edit2, Check, X, MoreVertical, ArrowLeft, ArrowRight, ChevronLeft, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAssistantSettings } from '@/hooks/useAssistantSettings';
import { useAssistantConversations, type AssistantConversation } from '@/hooks/useAssistantConversations';
import { useAssistantChat, type AssistantMessage } from '@/hooks/useAssistantChat';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
// Telegram icon component
const TelegramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.634-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// Message status indicator component
const MessageStatus: React.FC<{ status: string; isRead: boolean }> = ({ status, isRead }) => {
  if (isRead || status === 'read') {
    return (
      <span className="text-primary text-[10px] ml-1" title="Letto">
        ✓✓
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="text-muted-foreground text-[10px] ml-1" title="Consegnato">
        ✓✓
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-[10px] ml-1" title="Inviato">
      ✓
    </span>
  );
};

// Conversation list item with actions
const ConversationItem: React.FC<{
  conversation: AssistantConversation;
  isActive: boolean;
  onClick: () => void;
  onUpdateStatus: (status: 'active' | 'resolved' | 'archived') => void;
  onDelete: () => void;
}> = ({ conversation, isActive, onClick, onUpdateStatus, onDelete }) => {
  const statusIcon = {
    active: <Clock className="w-3 h-3 text-warning" />,
    resolved: <CheckCircle className="w-3 h-3 text-success" />,
    archived: <Archive className="w-3 h-3 text-muted-foreground" />,
  };

  const leadTypeLabel = {
    locale: '🏪 Locale',
    matrimonio: '💍 Matrimonio',
    privato: '🎉 Privato',
    pubblico: '🏘️ Pubblico',
    curioso: '👀 Curioso',
  };

  return (
    <div
      className={cn(
        "w-full p-3 text-left rounded-xl transition-colors relative group",
        "hover:bg-accent/50",
        isActive && "bg-primary/10 border border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2" onClick={onClick}>
        <div className="min-w-0 flex-1 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {conversation.user_name || 'Visitatore'}
            </span>
            {conversation.unread_count ? (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {conversation.unread_count}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {conversation.last_message?.message_text || 'Nessun messaggio'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {statusIcon[conversation.status]}
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(conversation.updated_at), 'HH:mm', { locale: it })}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5">
            {conversation.source_section}
          </Badge>
          {conversation.lead_type && (
            <span className="text-[10px]">
              {leadTypeLabel[conversation.lead_type as keyof typeof leadTypeLabel] || conversation.lead_type}
            </span>
          )}
        </div>
        
        {/* Quick actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.status !== 'active' && (
              <DropdownMenuItem onClick={() => onUpdateStatus('active')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sposta in Attive
              </DropdownMenuItem>
            )}
            {conversation.status !== 'resolved' && (
              <DropdownMenuItem onClick={() => onUpdateStatus('resolved')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Segna come Risolta
              </DropdownMenuItem>
            )}
            {conversation.status !== 'archived' && (
              <DropdownMenuItem onClick={() => onUpdateStatus('archived')}>
                <Archive className="w-4 h-4 mr-2" />
                Archivia
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare questa conversazione?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione è irreversibile. Tutti i messaggi verranno eliminati.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Chat view with edit/delete for admin messages
const ChatView: React.FC<{
  conversationId: string | null;
  conversation: AssistantConversation | null;
  onUpdateStatus: (status: 'active' | 'resolved' | 'archived') => void;
  onDeleteConversation: () => void;
  isMobile?: boolean;
  onBack?: () => void;
}> = ({ conversationId, conversation, onUpdateStatus, onDeleteConversation, isMobile, onBack }) => {
  const { messages, loading, sendMessage, editMessage, deleteMessage } = useAssistantChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await sendMessage(newMessage.trim(), 'admin');
    setNewMessage('');
    setSending(false);
  };

  const handleEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    const success = await editMessage(msgId, editText.trim());
    if (success) {
      toast.success('Messaggio modificato');
      setEditingId(null);
      setEditText('');
    } else {
      toast.error('Errore nella modifica');
    }
  };

  const handleDelete = async (msgId: string) => {
    const success = await deleteMessage(msgId);
    if (success) {
      toast.success('Messaggio eliminato');
    } else {
      toast.error('Errore nell\'eliminazione');
    }
  };

  if (!conversationId || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-base">Seleziona una conversazione</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className={cn(
        "border-b flex items-center justify-between gap-2",
        isMobile ? "p-3" : "p-4"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h3 className={cn("font-semibold truncate", isMobile ? "text-base" : "text-lg")}>
              {conversation.user_name || 'Visitatore'}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.user_email || conversation.source_section}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={isMobile ? "icon" : "sm"} variant="outline" className={isMobile ? "h-9 w-9" : ""}>
                {isMobile ? <MoreVertical className="w-4 h-4" /> : <>Azioni <MoreVertical className="w-4 h-4 ml-1" /></>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {conversation.status !== 'active' && (
                <DropdownMenuItem onClick={() => onUpdateStatus('active')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Sposta in Attive
                </DropdownMenuItem>
              )}
              {conversation.status === 'active' && (
                <DropdownMenuItem onClick={() => onUpdateStatus('resolved')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Segna come Risolta
                </DropdownMenuItem>
              )}
              {conversation.status === 'resolved' && (
                <DropdownMenuItem onClick={() => onUpdateStatus('archived')}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archivia
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Elimina Conversazione
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare questa conversazione?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione è irreversibile. Tutti i messaggi verranno eliminati.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteConversation} className="bg-destructive text-destructive-foreground">
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className={cn("flex-1", isMobile ? "p-3" : "p-4")}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "group relative",
                isMobile ? "max-w-[90%]" : "max-w-[80%]",
                msg.sender_type === 'admin' ? "ml-auto" : ""
              )}
            >
              {editingId === msg.id ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 text-base"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(msg.id)} className={isMobile ? "h-10 w-10" : ""}>
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className={isMobile ? "h-10 w-10" : ""}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-2xl",
                    isMobile ? "p-3" : "p-3",
                    msg.sender_type === 'admin'
                      ? "bg-primary text-primary-foreground"
                      : msg.sender_type === 'bot'
                        ? "bg-secondary/50"
                        : "bg-accent"
                  )}
                >
                  <p className={cn("whitespace-pre-line", isMobile ? "text-base" : "text-sm")}>{msg.message_text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={cn("opacity-70", isMobile ? "text-xs" : "text-[10px]")}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                      {msg.edited_at && ' (modificato)'}
                    </span>
                    {msg.sender_type === 'admin' && (
                      <MessageStatus 
                        status={msg.delivery_status || 'sent'} 
                        isRead={msg.is_read} 
                      />
                    )}
                  </div>
                  
                  {/* Edit/Delete buttons for admin messages */}
                  {msg.sender_type === 'admin' && (
                    <div className={cn(
                      "absolute -top-2 -right-2 flex gap-1 transition-opacity",
                      isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button
                        size="icon"
                        variant="secondary"
                        className={cn(isMobile ? "h-8 w-8" : "h-6 w-6")}
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditText(msg.message_text);
                        }}
                      >
                        <Edit2 className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="destructive" className={cn(isMobile ? "h-8 w-8" : "h-6 w-6")}>
                            <Trash2 className={cn(isMobile ? "w-4 h-4" : "w-3 h-3")} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare questo messaggio?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Questa azione è irreversibile.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(msg.id)} 
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
              )}
            </div>
          ))}
          {/* Scroll anchor */}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={cn("border-t", isMobile ? "p-3" : "p-4")}>
        <div className="flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            className={cn(
              "flex-1 resize-none",
              isMobile ? "min-h-[48px] max-h-[120px] text-base" : "min-h-[40px] max-h-[100px]"
            )}
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sending}
            size={isMobile ? "icon" : "default"}
            className={cn(isMobile ? "h-12 w-12 shrink-0" : "")}
          >
            {isMobile ? <Send className="w-5 h-5" /> : "Invia"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Settings panel
const SettingsPanel: React.FC = () => {
  const { settings, loading, updateSettings } = useAssistantSettings();
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [delay, setDelay] = useState(5);

  React.useEffect(() => {
    if (settings) {
      setWelcomeMsg(settings.welcome_message);
      setDelay(settings.proactive_delay_seconds);
    }
  }, [settings]);

  if (loading || !settings) {
    return <div className="p-4 text-center text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Assistente Virtuale</CardTitle>
                <CardDescription>Attiva/disattiva globalmente</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Section toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Sezioni Abilitate
          </CardTitle>
          <CardDescription>Scegli dove mostrare l'assistente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'enabled_on_site', label: 'Sito Generale', desc: 'Homepage e pagine informative' },
            { key: 'enabled_on_openmic', label: 'Open Mic', desc: 'Sezione prenotazione canzoni' },
            { key: 'enabled_on_dediche', label: 'Dediche', desc: 'Sezione messaggi e dediche' },
            { key: 'enabled_on_community', label: 'Community', desc: 'Gruppi e bacheca sociale' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <Label className="font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={settings[item.key as keyof typeof settings] as boolean}
                onCheckedChange={(checked) => updateSettings({ [item.key]: checked })}
                disabled={!settings.is_enabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Welcome message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Messaggio di Benvenuto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={welcomeMsg}
            onChange={(e) => setWelcomeMsg(e.target.value)}
            placeholder="Ciao! Come posso aiutarti?"
            rows={3}
          />
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm">Ritardo apertura (secondi)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => updateSettings({
                welcome_message: welcomeMsg,
                proactive_delay_seconds: delay,
              })}
              className="mt-6"
            >
              Salva
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Notifications */}
      <Card className="border-[#0088cc]/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 flex items-center justify-center">
                <TelegramIcon className="w-5 h-5 text-[#0088cc]" />
              </div>
              <div>
                <CardTitle className="text-base">Notifiche Telegram</CardTitle>
                <CardDescription>Ricevi avvisi per nuovi messaggi</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.telegram_enabled}
              onCheckedChange={(checked) => updateSettings({ telegram_enabled: checked })}
            />
          </div>
        </CardHeader>
        {settings.telegram_enabled && (
          <CardContent className="space-y-4 pt-0">
            <div>
              <Label className="text-sm">Chat ID Telegram</Label>
              <Input
                value={settings.telegram_chat_id || ''}
                onChange={(e) => updateSettings({ telegram_chat_id: e.target.value })}
                placeholder="-1001234567890"
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ID del gruppo/chat dove ricevere le notifiche
              </p>
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Notifica per sezione</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'notify_site', label: '🌐 Sito', desc: 'Pagine generali' },
                  { key: 'notify_openmic', label: '🎤 Open Mic', desc: 'Prenotazioni' },
                  { key: 'notify_dediche', label: '💌 Dediche', desc: 'Messaggi dedica' },
                  { key: 'notify_community', label: '👥 Community', desc: 'Gruppi social' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <span className="text-sm font-medium">{item.label}</span>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onCheckedChange={(checked) => updateSettings({ [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

// Main component
export const AdminAssistantTab: React.FC = () => {
  const isMobile = useIsMobile();
  const { conversations, loading, unreadTotal, markAsRead, updateStatus, deleteConversation } = useAssistantConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('active');
  const [showChat, setShowChat] = useState(false);

  const selectedConversation = conversations.find(c => c.id === selectedId) || null;

  const filteredConversations = conversations.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  const handleSelect = (conv: AssistantConversation) => {
    setSelectedId(conv.id);
    if (conv.unread_count && conv.unread_count > 0) {
      markAsRead(conv.id);
    }
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBack = () => {
    setShowChat(false);
  };

  const handleUpdateStatus = async (convId: string, status: 'active' | 'resolved' | 'archived') => {
    await updateStatus(convId, status);
    toast.success(`Conversazione spostata in ${status === 'active' ? 'Attive' : status === 'resolved' ? 'Risolte' : 'Archivio'}`);
  };

  const handleDelete = async (convId: string) => {
    const success = await deleteConversation(convId);
    if (success) {
      toast.success('Conversazione eliminata');
      if (selectedId === convId) {
        setSelectedId(null);
        setShowChat(false);
      }
    } else {
      toast.error('Errore nell\'eliminazione');
    }
  };

  // Mobile: Conversations List View
  const ConversationsListMobile = () => (
    <div className="flex flex-col h-full">
      {/* Filter buttons */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex gap-1">
          {(['active', 'resolved', 'archived'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'default' : 'ghost'}
              onClick={() => setStatusFilter(status)}
              className="flex-1 text-sm"
            >
              {status === 'active' ? 'Attive' : status === 'resolved' ? 'Risolte' : 'Archivio'}
            </Button>
          ))}
        </div>
      </div>
      {/* Conversations list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <p className="text-center text-muted-foreground p-6">Caricamento...</p>
          ) : filteredConversations.length === 0 ? (
            <p className="text-center text-muted-foreground p-6">
              Nessuna conversazione
            </p>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={selectedId === conv.id}
                onClick={() => handleSelect(conv)}
                onUpdateStatus={(status) => handleUpdateStatus(conv.id, status)}
                onDelete={() => handleDelete(conv.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className={cn(
          "grid w-full grid-cols-2",
          isMobile ? "mb-3" : "mb-6"
        )}>
          <TabsTrigger value="conversations" className="gap-2">
            <Users className="w-4 h-4" />
            <span className={isMobile ? "text-sm" : ""}>Conversazioni</span>
            {unreadTotal > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {unreadTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className={isMobile ? "text-sm" : ""}>Impostazioni</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          <Card className="overflow-hidden">
            {isMobile ? (
              // Mobile layout: show list or chat, not both
              <div className="h-[calc(100vh-220px)] min-h-[400px]">
                {showChat && selectedConversation ? (
                  <ChatView
                    conversationId={selectedId}
                    conversation={selectedConversation}
                    onUpdateStatus={(status) => selectedId && handleUpdateStatus(selectedId, status)}
                    onDeleteConversation={() => selectedId && handleDelete(selectedId)}
                    isMobile={true}
                    onBack={handleBack}
                  />
                ) : (
                  <ConversationsListMobile />
                )}
              </div>
            ) : (
              // Desktop layout: side-by-side
              <div className="flex h-[600px]">
                {/* Sidebar */}
                <div className="w-80 border-r flex flex-col">
                  <div className="p-3 border-b">
                    <div className="flex gap-1">
                      {(['active', 'resolved', 'archived'] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={statusFilter === status ? 'default' : 'ghost'}
                          onClick={() => setStatusFilter(status)}
                          className="flex-1 text-xs capitalize"
                        >
                          {status === 'active' ? 'Attive' : status === 'resolved' ? 'Risolte' : 'Archivio'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {loading ? (
                        <p className="text-center text-muted-foreground p-4">Caricamento...</p>
                      ) : filteredConversations.length === 0 ? (
                        <p className="text-center text-muted-foreground p-4">
                          Nessuna conversazione
                        </p>
                      ) : (
                        filteredConversations.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isActive={selectedId === conv.id}
                            onClick={() => handleSelect(conv)}
                            onUpdateStatus={(status) => handleUpdateStatus(conv.id, status)}
                            onDelete={() => handleDelete(conv.id)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat */}
                <ChatView
                  conversationId={selectedId}
                  conversation={selectedConversation}
                  onUpdateStatus={(status) => selectedId && handleUpdateStatus(selectedId, status)}
                  onDeleteConversation={() => selectedId && handleDelete(selectedId)}
                  isMobile={false}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
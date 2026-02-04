import React, { useState } from 'react';
import { Bot, MessageCircle, Settings, Users, CheckCircle, Clock, Archive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAssistantSettings } from '@/hooks/useAssistantSettings';
import { useAssistantConversations, type AssistantConversation } from '@/hooks/useAssistantConversations';
import { useAssistantChat } from '@/hooks/useAssistantChat';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Conversation list item
const ConversationItem: React.FC<{
  conversation: AssistantConversation;
  isActive: boolean;
  onClick: () => void;
}> = ({ conversation, isActive, onClick }) => {
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
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 text-left rounded-xl transition-colors",
        "hover:bg-accent/50",
        isActive && "bg-primary/10 border border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-[10px] h-5">
          {conversation.source_section}
        </Badge>
        {conversation.lead_type && (
          <span className="text-[10px]">
            {leadTypeLabel[conversation.lead_type as keyof typeof leadTypeLabel] || conversation.lead_type}
          </span>
        )}
      </div>
    </button>
  );
};

// Chat view
const ChatView: React.FC<{
  conversationId: string | null;
  conversation: AssistantConversation | null;
  onUpdateStatus: (status: 'active' | 'resolved' | 'archived') => void;
}> = ({ conversationId, conversation, onUpdateStatus }) => {
  const { messages, loading, sendMessage } = useAssistantChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await sendMessage(newMessage.trim(), 'admin');
    setNewMessage('');
    setSending(false);
  };

  if (!conversationId || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Seleziona una conversazione</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{conversation.user_name || 'Visitatore'}</h3>
          <p className="text-xs text-muted-foreground">
            {conversation.user_email || conversation.source_section}
          </p>
        </div>
        <div className="flex gap-2">
          {conversation.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus('resolved')}
              className="gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Risolvi
            </Button>
          )}
          {conversation.status === 'resolved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus('archived')}
              className="gap-1.5"
            >
              <Archive className="w-4 h-4" />
              Archivia
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[80%] p-3 rounded-2xl",
                msg.sender_type === 'admin'
                  ? "ml-auto bg-primary text-primary-foreground"
                  : msg.sender_type === 'bot'
                    ? "bg-secondary/50"
                    : "bg-accent"
              )}
            >
              <p className="text-sm">{msg.message_text}</p>
              <span className="text-[10px] opacity-70 mt-1 block">
                {format(new Date(msg.created_at), 'HH:mm')}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending}>
            Invia
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
    </div>
  );
};

// Main component
export const AdminAssistantTab: React.FC = () => {
  const { conversations, loading, unreadTotal, markAsRead, updateStatus } = useAssistantConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('active');

  const selectedConversation = conversations.find(c => c.id === selectedId) || null;

  const filteredConversations = conversations.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  const handleSelect = (conv: AssistantConversation) => {
    setSelectedId(conv.id);
    if (conv.unread_count && conv.unread_count > 0) {
      markAsRead(conv.id);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="conversations" className="gap-2">
            <Users className="w-4 h-4" />
            Conversazioni
            {unreadTotal > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {unreadTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Impostazioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          <Card className="overflow-hidden">
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
                onUpdateStatus={(status) => {
                  if (selectedId) updateStatus(selectedId, status);
                }}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

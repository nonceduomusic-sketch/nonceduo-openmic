import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, Mail, Send, MessageSquare, Music, RefreshCw, 
  CheckCircle2, XCircle, Clock, TestTube2, Settings2, Save
} from 'lucide-react';
import { useNotificationSettings, NotificationLog } from '@/hooks/useNotificationSettings';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Telegram icon as inline SVG
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const NotificationLogItem: React.FC<{ log: NotificationLog }> = ({ log }) => {
  const isSuccess = log.status === 'sent';
  const isTelegram = log.channel === 'telegram';
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      isSuccess ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
    )}>
      <div className={cn(
        "p-2 rounded-full",
        isTelegram ? "bg-blue-500/10 text-blue-500" : "bg-orange-500/10 text-orange-500"
      )}>
        {isTelegram ? <TelegramIcon className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={log.notification_type === 'openmic' ? 'default' : 'secondary'} className="text-xs">
            {log.notification_type === 'openmic' ? '🎤 Open Mic' : '💌 Dedica'}
          </Badge>
          <Badge variant={isSuccess ? 'outline' : 'destructive'} className="text-xs">
            {isSuccess ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
            {isSuccess ? 'Inviato' : 'Fallito'}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground truncate">
          → {log.recipient}
        </p>
        
        {log.error_message && (
          <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(new Date(log.created_at), 'HH:mm:ss - d MMM', { locale: it })}
        </p>
      </div>
    </div>
  );
};

export const AdminNotificheLiveTab: React.FC = () => {
  const { 
    settings, 
    logs, 
    loading, 
    logsLoading,
    updateSettings, 
    sendTestNotification,
    fetchLogs 
  } = useNotificationSettings();
  
  const [testingOpenMic, setTestingOpenMic] = useState(false);
  const [testingDediche, setTestingDediche] = useState(false);
  const [openMicChatId, setOpenMicChatId] = useState('');
  const [dedicheChatId, setDedicheChatId] = useState('');
  const [savingChatIds, setSavingChatIds] = useState(false);

  useEffect(() => {
    fetchLogs(30);
  }, [fetchLogs]);

  useEffect(() => {
    if (settings) {
      setOpenMicChatId(settings.telegram_openmic_chat_id || '');
      setDedicheChatId(settings.telegram_dediche_chat_id || '');
    }
  }, [settings]);

  const handleTestOpenMic = async () => {
    setTestingOpenMic(true);
    await sendTestNotification('openmic');
    setTestingOpenMic(false);
  };

  const handleTestDediche = async () => {
    setTestingDediche(true);
    await sendTestNotification('dediche');
    setTestingDediche(false);
  };

  const handleSaveChatIds = async () => {
    setSavingChatIds(true);
    await updateSettings({
      telegram_openmic_chat_id: openMicChatId,
      telegram_dediche_chat_id: dedicheChatId,
    });
    setSavingChatIds(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Impossibile caricare le impostazioni
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Notifiche Live
        </h2>
        <p className="text-muted-foreground">
          Gestisci le notifiche istantanee via Email e Telegram
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Canali Globali</CardTitle>
            <CardDescription>
              Abilita o disabilita tutti i canali di notifica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <TelegramIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Telegram</p>
                  <p className="text-xs text-muted-foreground">Notifiche ai gruppi Telegram</p>
                </div>
              </div>
              <Switch
                checked={settings.telegram_enabled}
                onCheckedChange={(checked) => updateSettings({ telegram_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Mail className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">{settings.email_recipient}</p>
                </div>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) => updateSettings({ email_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TestTube2 className="w-5 h-5" />
              Test Notifiche
            </CardTitle>
            <CardDescription>
              Invia messaggi di prova per verificare la configurazione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleTestOpenMic}
              disabled={testingOpenMic}
            >
              {testingOpenMic ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Music className="w-4 h-4 text-primary" />
              )}
              Test Open Mic
              <Send className="w-4 h-4 ml-auto" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleTestDediche}
              disabled={testingDediche}
            >
              {testingDediche ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 text-pink-500" />
              )}
              Test Dediche
              <Send className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Per-Type Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Mic Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Open Mic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <TelegramIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Telegram</span>
              </div>
              <Switch
                checked={settings.openmic_telegram_enabled}
                onCheckedChange={(checked) => updateSettings({ openmic_telegram_enabled: checked })}
                disabled={!settings.telegram_enabled}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Email</span>
              </div>
              <Switch
                checked={settings.openmic_email_enabled}
                onCheckedChange={(checked) => updateSettings({ openmic_email_enabled: checked })}
                disabled={!settings.email_enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dediche Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-500" />
              Dediche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <TelegramIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Telegram</span>
              </div>
              <Switch
                checked={settings.dediche_telegram_enabled}
                onCheckedChange={(checked) => updateSettings({ dediche_telegram_enabled: checked })}
                disabled={!settings.telegram_enabled}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Email</span>
              </div>
              <Switch
                checked={settings.dediche_email_enabled}
                onCheckedChange={(checked) => updateSettings({ dediche_email_enabled: checked })}
                disabled={!settings.email_enabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telegram Chat IDs Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configurazione Chat ID Telegram
          </CardTitle>
          <CardDescription>
            Modifica i Chat ID per i gruppi Telegram dove ricevere le notifiche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="openmic-chat-id" className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                Chat ID Open Mic
              </Label>
              <Input
                id="openmic-chat-id"
                value={openMicChatId}
                onChange={(e) => setOpenMicChatId(e.target.value)}
                placeholder="-100xxxxxxxxxx"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dediche-chat-id" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pink-500" />
                Chat ID Dediche
              </Label>
              <Input
                id="dediche-chat-id"
                value={dedicheChatId}
                onChange={(e) => setDedicheChatId(e.target.value)}
                placeholder="-100xxxxxxxxxx"
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveChatIds} 
              disabled={savingChatIds}
              size="sm"
            >
              {savingChatIds ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salva Chat ID
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Per i supergruppi Telegram, usa il prefisso <code className="bg-muted px-1 rounded">-100</code> seguito dall'ID del gruppo.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Notification Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Log Notifiche</CardTitle>
            <CardDescription>Storico degli invii recenti</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(30)}
            disabled={logsLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", logsLoading && "animate-spin")} />
            Aggiorna
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna notifica inviata</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {logs.map((log) => (
                  <NotificationLogItem key={log.id} log={log} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

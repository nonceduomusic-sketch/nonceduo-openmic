import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettings {
  id: string;
  telegram_enabled: boolean;
  email_enabled: boolean;
  openmic_telegram_enabled: boolean;
  openmic_email_enabled: boolean;
  dediche_telegram_enabled: boolean;
  dediche_email_enabled: boolean;
  email_recipient: string;
  telegram_openmic_chat_id: string;
  telegram_dediche_chat_id: string;
  updated_at: string | null;
}

export interface NotificationLog {
  id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  message_body: string;
  status: string;
  error_message: string | null;
  reservation_id: string | null;
  created_at: string;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le impostazioni notifiche',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(async (limit = 50) => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    if (!settings?.id) return false;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: 'Salvato',
        description: 'Impostazioni notifiche aggiornate',
      });
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare le impostazioni',
        variant: 'destructive',
      });
      return false;
    }
  }, [settings?.id, toast]);

  const sendTestNotification = useCallback(async (type: 'openmic' | 'dediche') => {
    try {
      const testData = type === 'openmic' 
        ? {
            type: 'openmic',
            customerName: 'Test Utente',
            songTitle: 'Canzone di Prova',
            songArtist: 'Artista Test',
            dedicationMessage: 'Questa è una dedica di test!',
            isTest: true,
          }
        : {
            type: 'dediche',
            customerName: 'Test Utente',
            dedicationMessage: 'Questo è un messaggio di dedica di prova per verificare il funzionamento delle notifiche!',
            isTest: true,
          };

      const { data, error } = await supabase.functions.invoke('send-live-notification', {
        body: testData,
      });

      if (error) throw error;

      if (data?.success) {
        const telegramStatus = data.results?.telegram?.sent ? '✓' : '✗';
        const emailStatus = data.results?.email?.sent ? '✓' : '✗';
        
        toast({
          title: 'Test completato',
          description: `Telegram: ${telegramStatus} | Email: ${emailStatus}`,
        });
      } else {
        throw new Error(data?.error || 'Test fallito');
      }

      // Refresh logs after test
      await fetchLogs();
      
      return data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Errore test',
        description: error instanceof Error ? error.message : 'Errore invio test',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchLogs]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    logs,
    loading,
    logsLoading,
    updateSettings,
    sendTestNotification,
    fetchLogs,
    refetch: fetchSettings,
  };
}

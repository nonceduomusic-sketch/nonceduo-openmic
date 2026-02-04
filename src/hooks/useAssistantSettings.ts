import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssistantSettings {
  id: string;
  is_enabled: boolean;
  enabled_on_site: boolean;
  enabled_on_openmic: boolean;
  enabled_on_dediche: boolean;
  enabled_on_community: boolean;
  proactive_delay_seconds: number;
  welcome_message: string;
  updated_at: string;
}

export function useAssistantSettings() {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('assistant_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching assistant settings:', error);
        return;
      }

      setSettings(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AssistantSettings>) => {
    if (!settings?.id) return false;

    try {
      const { error } = await supabase
        .from('assistant_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) {
        toast({
          title: 'Errore',
          description: 'Impossibile salvare le impostazioni',
          variant: 'destructive',
        });
        return false;
      }

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: 'Salvato',
        description: 'Impostazioni aggiornate',
      });
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GlobalFormatKey = 'openmic' | 'dediche' | 'community';

export interface GlobalFormatSetting {
  format_key: GlobalFormatKey;
  is_active: boolean;
  updated_at: string;
}

export const useGlobalFormatSettings = () => {
  const [settings, setSettings] = useState<Record<GlobalFormatKey, boolean>>({
    openmic: true,
    dediche: true,
    community: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('global_format_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const newSettings: Record<GlobalFormatKey, boolean> = {
          openmic: true,
          dediche: true,
          community: true,
        };
        data.forEach((item) => {
          const key = item.format_key as GlobalFormatKey;
          if (key in newSettings) {
            newSettings[key] = item.is_active;
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching global format settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('global-format-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_format_settings',
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const toggleFormat = async (format: GlobalFormatKey): Promise<boolean> => {
    const newValue = !settings[format];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('global_format_settings')
        .update({ 
          is_active: newValue, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq('format_key', format);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [format]: newValue }));
      toast.success(`${format === 'openmic' ? 'Open Mic' : format === 'dediche' ? 'Dediche' : 'Community'} ${newValue ? 'attivato' : 'disattivato'}`);
      return true;
    } catch (error) {
      console.error('Error toggling format:', error);
      toast.error('Errore nell\'aggiornamento');
      return false;
    }
  };

  const isFormatActive = (format: GlobalFormatKey): boolean => {
    return settings[format] ?? true;
  };

  return {
    settings,
    loading,
    toggleFormat,
    isFormatActive,
    refetch: fetchSettings,
  };
};

// Hook for public pages to check if a format is active
export const useFormatActiveCheck = (format: GlobalFormatKey) => {
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFormat = async () => {
      try {
        const { data, error } = await supabase
          .from('global_format_settings')
          .select('is_active')
          .eq('format_key', format)
          .maybeSingle();

        if (error) throw error;
        setIsActive(data?.is_active ?? true);
      } catch (error) {
        console.error('Error checking format:', error);
        setIsActive(true);
      } finally {
        setLoading(false);
      }
    };

    checkFormat();

    // Subscribe to changes
    const channel = supabase
      .channel(`format-active-${format}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_format_settings',
          filter: `format_key=eq.${format}`,
        },
        (payload) => {
          if (payload.new && 'is_active' in payload.new) {
            setIsActive((payload.new as GlobalFormatSetting).is_active);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [format]);

  return { isActive, loading };
};

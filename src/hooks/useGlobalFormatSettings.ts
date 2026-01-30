import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GlobalFormatKey = 'openmic' | 'dediche' | 'community' | 'voting' | 'show_booker_name' | 'show_live_queue';

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
    voting: true,
    show_booker_name: true,
    show_live_queue: true,
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
          voting: true,
          show_booker_name: true,
          show_live_queue: true,
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
      const formatNames: Record<GlobalFormatKey, string> = {
        openmic: 'Open Mic',
        dediche: 'Dediche',
        community: 'Community',
        voting: 'Votazioni',
        show_booker_name: 'Nome prenotante',
        show_live_queue: 'Scaletta Live',
      };
      toast.success(`${formatNames[format]} ${newValue ? 'attivato' : 'disattivato'}`);
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

// Hook for public pages to check if a format is active (with real-time updates)
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

    // Subscribe to ALL changes on global_format_settings table (filter by format in callback)
    // This is more reliable than using filter param which may not work with all configurations
    const channelName = `format-active-check-${format}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_format_settings',
        },
        (payload) => {
          // Filter in the callback to only process our format
          // NOTE: on DELETE, payload.new can be null; in that case we still refetch.
          const newData = payload.new as (GlobalFormatSetting | undefined | null);
          const oldData = payload.old as (Partial<GlobalFormatSetting> | undefined | null);

          const affectedKey = newData?.format_key ?? oldData?.format_key;
          if (affectedKey !== format) return;

          // Most reliable approach: refetch the canonical value from DB.
          // (Some realtime payloads can be partial depending on publication columns.)
          void checkFormat();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for ${format}:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [format]);

  return { isActive, loading };
};

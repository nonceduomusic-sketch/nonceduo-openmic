import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GlobalFormatKey = 'openmic' | 'dediche' | 'community' | 'voting' | 'show_booker_name' | 'show_live_queue' | 'lyrics_zoom' | 'lyrics_highlight_arrows' | 'lyrics_auto_scroll';

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
    lyrics_zoom: true,
    lyrics_highlight_arrows: true,
    lyrics_auto_scroll: true,
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
          lyrics_zoom: true,
          lyrics_highlight_arrows: true,
          lyrics_auto_scroll: true,
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
        lyrics_zoom: 'Zoom Testi',
        lyrics_highlight_arrows: 'Evidenziatore Testi',
        lyrics_auto_scroll: 'Auto-scroll Testi',
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
  const [isActive, setIsActive] = useState<boolean | null>(null); // null = loading
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Stable fetch function
  const fetchFormatStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('global_format_settings')
        .select('is_active')
        .eq('format_key', format)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        console.error(`[useFormatActiveCheck] Error fetching ${format}:`, error);
        setIsActive(true); // Default to true on error
      } else {
        const newValue = data?.is_active ?? true;
        console.log(`[useFormatActiveCheck] ${format} = ${newValue}`);
        setIsActive(newValue);
      }
    } catch (error) {
      console.error(`[useFormatActiveCheck] Exception for ${format}:`, error);
      if (mountedRef.current) {
        setIsActive(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [format]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchFormatStatus();

    // Subscribe to ALL changes on global_format_settings table
    const channelName = `format-check-${format}-${Date.now()}`;
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
          // Check if this update is for our format
          const newData = payload.new as (GlobalFormatSetting | undefined | null);
          const oldData = payload.old as (Partial<GlobalFormatSetting> | undefined | null);
          const affectedKey = newData?.format_key ?? oldData?.format_key;
          
          console.log(`[Realtime] Received update for ${affectedKey}, we're watching ${format}`);
          
          if (affectedKey !== format) return;

          // Refetch to get the canonical value
          console.log(`[Realtime] Refetching ${format} due to realtime update`);
          fetchFormatStatus();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for ${format}:`, status);
      });

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [format, fetchFormatStatus]);

  // Return true as default while loading to avoid flash
  return { isActive: isActive ?? true, loading };
};

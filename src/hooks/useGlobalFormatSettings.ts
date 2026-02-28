import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GlobalFormatKey = 'openmic' | 'dediche' | 'community' | 'community_registration' | 'giochi' | 'furore' | 'voting' | 'show_booker_name' | 'show_live_queue' | 'lyrics_zoom' | 'lyrics_highlight_arrows' | 'lyrics_auto_scroll' | 'catalog_preview' | 'show_upcoming_events' | 'show_trasmetti_banner';

export interface GlobalFormatSetting {
  format_key: GlobalFormatKey;
  is_active: boolean;
  visible_on_app: boolean;
  visible_on_menu: boolean;
  updated_at: string;
}

export const useGlobalFormatSettings = () => {
  const defaultSettings: Record<GlobalFormatKey, boolean> = {
    openmic: true, dediche: true, community: true, community_registration: true, giochi: false, furore: true,
    voting: true, show_booker_name: true, show_live_queue: true,
    lyrics_zoom: true, lyrics_highlight_arrows: true, lyrics_auto_scroll: true,
    catalog_preview: false, show_upcoming_events: false, show_trasmetti_banner: false,
  };
  const [settings, setSettings] = useState<Record<GlobalFormatKey, boolean>>({ ...defaultSettings });
  const [appSettings, setAppSettings] = useState<Record<GlobalFormatKey, boolean>>({ ...defaultSettings });
  const [menuSettings, setMenuSettings] = useState<Record<GlobalFormatKey, boolean>>({ ...defaultSettings });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('global_format_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const newSettings: Record<GlobalFormatKey, boolean> = { ...defaultSettings };
        const newAppSettings: Record<GlobalFormatKey, boolean> = { ...newSettings };
        const newMenuSettings: Record<GlobalFormatKey, boolean> = { ...newSettings };
        data.forEach((item) => {
          const key = item.format_key as GlobalFormatKey;
          if (key in newSettings) {
            newSettings[key] = item.is_active;
            newAppSettings[key] = item.visible_on_app ?? true;
            newMenuSettings[key] = (item as any).visible_on_menu ?? true;
          }
        });
        setSettings(newSettings);
        setAppSettings(newAppSettings);
        setMenuSettings(newMenuSettings);
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

  const toggleFormat = async (format: GlobalFormatKey, target: 'site' | 'app' | 'menu' = 'site'): Promise<boolean> => {
    const currentValue = target === 'app' ? appSettings[format] : target === 'menu' ? menuSettings[format] : settings[format];
    const newValue = !currentValue;
    const column = target === 'app' ? 'visible_on_app' : target === 'menu' ? 'visible_on_menu' : 'is_active';
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('global_format_settings')
        .update({ 
          [column]: newValue, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq('format_key', format);

      if (error) throw error;

      if (target === 'app') {
        setAppSettings(prev => ({ ...prev, [format]: newValue }));
      } else if (target === 'menu') {
        setMenuSettings(prev => ({ ...prev, [format]: newValue }));
      } else {
        setSettings(prev => ({ ...prev, [format]: newValue }));
      }
      const formatNames: Record<GlobalFormatKey, string> = {
        openmic: 'Open Mic', dediche: 'Dediche', community: 'Community',
        community_registration: 'Registrazioni Community',
        giochi: 'Giochi', furore: 'Non C\'è Furore', voting: 'Votazioni', show_booker_name: 'Nome prenotante',
        show_live_queue: 'Scaletta Live', lyrics_zoom: 'Zoom Testi',
        lyrics_highlight_arrows: 'Evidenziatore Testi', lyrics_auto_scroll: 'Auto-scroll Testi',
        catalog_preview: 'Anteprima Catalogo', show_upcoming_events: 'Mostra Eventi in Programma',
        show_trasmetti_banner: 'Banner Trasmetti',
      };
      const targetLabel = target === 'app' ? ' (App)' : target === 'menu' ? ' (Menu)' : ' (Sito)';
      toast.success(`${formatNames[format]}${targetLabel} ${newValue ? 'attivato' : 'disattivato'}`);
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
    appSettings,
    menuSettings,
    loading,
    toggleFormat,
    isFormatActive,
    refetch: fetchSettings,
  };
};

// Hook for public pages to check if a format is active (with real-time updates)
// target: 'site' checks is_active, 'app' checks visible_on_app, 'menu' checks visible_on_menu
export const useFormatActiveCheck = (format: GlobalFormatKey, target: 'site' | 'app' | 'menu' = 'site') => {
  const [isActive, setIsActive] = useState<boolean | null>(null); // null = loading
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const column = target === 'app' ? 'visible_on_app' : target === 'menu' ? 'visible_on_menu' : 'is_active';

  // Stable fetch function
  const fetchFormatStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('global_format_settings')
        .select(`${column}`)
        .eq('format_key', format)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        console.error(`[useFormatActiveCheck] Error fetching ${format}:`, error);
        setIsActive(true);
      } else {
        const newValue = (data as any)?.[column] ?? true;
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
  }, [format, column]);

  useEffect(() => {
    mountedRef.current = true;
    fetchFormatStatus();

    const channelName = `format-check-${format}-${target}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_format_settings' },
        (payload) => {
          const newData = payload.new as (GlobalFormatSetting | undefined | null);
          const oldData = payload.old as (Partial<GlobalFormatSetting> | undefined | null);
          const affectedKey = newData?.format_key ?? oldData?.format_key;
          if (affectedKey !== format) return;
          fetchFormatStatus();
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [format, target, fetchFormatStatus]);

  return { isActive: isActive ?? true, loading };
};

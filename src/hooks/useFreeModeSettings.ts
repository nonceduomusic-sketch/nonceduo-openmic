import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FreeModeSettings {
  id: string;
  openmic_enabled: boolean;
  dediche_enabled: boolean;
  voting_enabled: boolean;
  openmic_max_songs: number | null;
  dediche_max_total: number | null;
  duration_minutes: number | null;
  started_at: string | null;
  expires_at: string | null;
  openmic_current_count: number;
  dediche_current_count: number;
  pin_enabled: boolean;
  pin_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<FreeModeSettings, 'id' | 'created_at' | 'updated_at'> = {
  openmic_enabled: true,
  dediche_enabled: true,
  voting_enabled: true,
  openmic_max_songs: null,
  dediche_max_total: null,
  duration_minutes: null,
  started_at: null,
  expires_at: null,
  openmic_current_count: 0,
  dediche_current_count: 0,
  pin_enabled: false,
  pin_code: null,
  is_active: false,
};

export const useFreeModeSettings = () => {
  const [settings, setSettings] = useState<FreeModeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('free_mode_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings(data as FreeModeSettings);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel(`free-mode-settings-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'free_mode_settings',
        },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<FreeModeSettings>): Promise<boolean> => {
    if (!settings?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('free_mode_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore aggiornamento');
      return false;
    }
  };

  // Attiva Free Mode
  const activateFreeMode = async (config?: {
    openmic?: boolean;
    dediche?: boolean;
    voting?: boolean;
    durationMinutes?: number;
    maxSongs?: number;
    maxDediche?: number;
    pinCode?: string;
  }): Promise<boolean> => {
    const updates: Partial<FreeModeSettings> = {
      is_active: true,
      started_at: new Date().toISOString(),
      openmic_current_count: 0,
      dediche_current_count: 0,
    };

    if (config?.openmic !== undefined) updates.openmic_enabled = config.openmic;
    if (config?.dediche !== undefined) updates.dediche_enabled = config.dediche;
    if (config?.voting !== undefined) updates.voting_enabled = config.voting;
    if (config?.maxSongs !== undefined) updates.openmic_max_songs = config.maxSongs || null;
    if (config?.maxDediche !== undefined) updates.dediche_max_total = config.maxDediche || null;
    
    if (config?.durationMinutes) {
      updates.duration_minutes = config.durationMinutes;
      updates.expires_at = new Date(Date.now() + config.durationMinutes * 60 * 1000).toISOString();
    } else {
      updates.duration_minutes = null;
      updates.expires_at = null;
    }

    if (config?.pinCode) {
      updates.pin_enabled = true;
      updates.pin_code = config.pinCode;
    } else {
      updates.pin_enabled = false;
      updates.pin_code = null;
    }

    const success = await updateSettings(updates);
    if (success) {
      toast.success('Evento Libero attivato!');
    }
    return success;
  };

  // Disattiva Free Mode
  const deactivateFreeMode = async (): Promise<boolean> => {
    const success = await updateSettings({
      is_active: false,
      started_at: null,
      expires_at: null,
    });
    if (success) {
      toast.success('Evento Libero disattivato');
    }
    return success;
  };

  // Modifica impostazioni durante l'evento
  const updateLiveSettings = async (updates: {
    openmic?: boolean;
    dediche?: boolean;
    voting?: boolean;
    maxSongs?: number | null;
    maxDediche?: number | null;
    pinCode?: string | null;
  }): Promise<boolean> => {
    const dbUpdates: Partial<FreeModeSettings> = {};
    
    if (updates.openmic !== undefined) dbUpdates.openmic_enabled = updates.openmic;
    if (updates.dediche !== undefined) dbUpdates.dediche_enabled = updates.dediche;
    if (updates.voting !== undefined) dbUpdates.voting_enabled = updates.voting;
    if (updates.maxSongs !== undefined) dbUpdates.openmic_max_songs = updates.maxSongs;
    if (updates.maxDediche !== undefined) dbUpdates.dediche_max_total = updates.maxDediche;
    
    if (updates.pinCode !== undefined) {
      if (updates.pinCode) {
        dbUpdates.pin_enabled = true;
        dbUpdates.pin_code = updates.pinCode;
      } else {
        dbUpdates.pin_enabled = false;
        dbUpdates.pin_code = null;
      }
    }

    const success = await updateSettings(dbUpdates);
    if (success) {
      toast.success('Impostazioni aggiornate');
    }
    return success;
  };

  // Incrementa contatori
  const incrementOpenMicCount = async (): Promise<boolean> => {
    if (!settings?.id) return false;
    return updateSettings({ openmic_current_count: (settings.openmic_current_count || 0) + 1 });
  };

  const incrementDedicheCount = async (): Promise<boolean> => {
    if (!settings?.id) return false;
    return updateSettings({ dediche_current_count: (settings.dediche_current_count || 0) + 1 });
  };

  // Reset contatori
  const resetCounters = async (): Promise<boolean> => {
    return updateSettings({
      openmic_current_count: 0,
      dediche_current_count: 0,
    });
  };

  // Genera PIN
  const generatePin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Check limiti
  const canBookOpenMic = (): boolean => {
    if (!settings?.is_active || !settings?.openmic_enabled) return false;
    if (settings.openmic_max_songs && settings.openmic_current_count >= settings.openmic_max_songs) return false;
    if (settings.expires_at && new Date(settings.expires_at) < new Date()) return false;
    return true;
  };

  const canBookDediche = (): boolean => {
    if (!settings?.is_active || !settings?.dediche_enabled) return false;
    if (settings.dediche_max_total && settings.dediche_current_count >= settings.dediche_max_total) return false;
    if (settings.expires_at && new Date(settings.expires_at) < new Date()) return false;
    return true;
  };

  // Time remaining
  const getTimeRemaining = (): number | null => {
    if (!settings?.expires_at) return null;
    const remaining = new Date(settings.expires_at).getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    activateFreeMode,
    deactivateFreeMode,
    updateLiveSettings,
    incrementOpenMicCount,
    incrementDedicheCount,
    resetCounters,
    generatePin,
    canBookOpenMic,
    canBookDediche,
    getTimeRemaining,
    refetch: fetchSettings,
  };
};

// Hook pubblico per controllare lo stato Free Mode
export const useFreeModeActive = () => {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<FreeModeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('free_mode_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsActive(false);
        } else {
          setIsActive(true);
          setSettings(data as FreeModeSettings);
        }
      } else {
        setIsActive(false);
      }
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel(`free-mode-active-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'free_mode_settings',
        },
        () => fetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isActive, settings, loading };
};

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FormatPreferences {
  openmic: boolean;
  dediche: boolean;
  community: boolean;
  giochi: boolean;
}

const STORAGE_KEY = 'admin_format_preferences';

const DEFAULT_PREFERENCES: FormatPreferences = {
  openmic: true,
  dediche: true,
  community: true,
  giochi: true,
};

export const useFormatPreferences = () => {
  const [preferences, setPreferences] = useState<FormatPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load preferences from localStorage (per-user key if logged in)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id || 'anonymous';
        setUserId(uid);

        const storageKey = `${STORAGE_KEY}_${uid}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsed = JSON.parse(stored) as FormatPreferences;
          setPreferences({
            openmic: parsed.openmic ?? true,
            dediche: parsed.dediche ?? true,
            community: parsed.community ?? true,
            giochi: parsed.giochi ?? true,
          });
        }
      } catch (error) {
        console.error('Error loading format preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences when they change
  const savePreferences = useCallback((newPrefs: FormatPreferences) => {
    if (!userId) return;
    
    const storageKey = `${STORAGE_KEY}_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(newPrefs));
    setPreferences(newPrefs);
  }, [userId]);

  // Toggle a single format
  const toggleFormat = useCallback((format: keyof FormatPreferences) => {
    const newPrefs = {
      ...preferences,
      [format]: !preferences[format],
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Set all formats at once
  const setAllFormats = useCallback((enabled: boolean) => {
    const newPrefs: FormatPreferences = {
      openmic: enabled,
      dediche: enabled,
      community: enabled,
      giochi: enabled,
    };
    savePreferences(newPrefs);
  }, [savePreferences]);

  // Check if at least one format is active
  const hasActiveFormats = preferences.openmic || preferences.dediche || preferences.community || preferences.giochi;

  // Count active formats
  const activeCount = [preferences.openmic, preferences.dediche, preferences.community, preferences.giochi].filter(Boolean).length;

  return {
    preferences,
    loading,
    toggleFormat,
    setAllFormats,
    hasActiveFormats,
    activeCount,
  };
};

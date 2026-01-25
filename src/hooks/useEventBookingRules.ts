import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventBookingRules {
  id: string;
  event_name: string | null;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  close_minutes_before_end: number | null;
  openmic_enabled: boolean;
  openmic_max_songs: number | null;
  openmic_final_limit_enabled: boolean;
  openmic_final_limit_songs: number | null;
  openmic_final_limit_minutes: number | null;
  dediche_enabled: boolean;
  dediche_max_total: number | null;
  openmic_current_count: number;
  dediche_current_count: number;
  reopen_active: boolean;
  reopen_until: string | null;
  reopen_mode: string | null;
  reopen_extra_songs: number | null;
  reopen_extra_dediche: number | null;
  reopen_songs_used: number;
  reopen_dediche_used: number;
  reopen_message: string | null;
  closure_mode: string;
  closure_title: string | null;
  closure_message: string | null;
  closure_redirect_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useEventBookingRules = () => {
  const [rules, setRules] = useState<EventBookingRules | null>(null);
  const [allRules, setAllRules] = useState<EventBookingRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      // Fetch all rules for admin (active rule is the one we'll primarily use)
      const { data, error: fetchError } = await supabase
        .from('event_booking_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typedData = data as EventBookingRules[];
      setAllRules(typedData);
      
      // Set the active rule (or the first one if none active)
      const activeRule = typedData.find(r => r.is_active) || typedData[0] || null;
      setRules(activeRule);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento regole');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('event-booking-rules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_booking_rules',
        },
        () => {
          fetchRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRules]);

  // Update rules
  const updateRules = async (updates: Partial<EventBookingRules>): Promise<boolean> => {
    if (!rules?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update(updates)
        .eq('id', rules.id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
      return false;
    }
  };

  // Toggle active state
  const toggleActive = async (active: boolean): Promise<boolean> => {
    return updateRules({ is_active: active });
  };

  // Create new event rules
  const createRules = async (newRules: Partial<EventBookingRules>): Promise<string | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('event_booking_rules')
        .insert(newRules)
        .select('id')
        .single();

      if (insertError) throw insertError;
      await fetchRules();
      return data?.id || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione');
      return null;
    }
  };

  // Increment booking counters atomically
  const incrementOpenMicCount = async (): Promise<boolean> => {
    if (!rules?.id) return false;
    
    try {
      // Use direct update with current count + 1
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update({ openmic_current_count: (rules.openmic_current_count || 0) + 1 })
        .eq('id', rules.id);
      
      if (updateError) throw updateError;
      return true;
    } catch {
      return false;
    }
  };

  const incrementDedicheCount = async (): Promise<boolean> => {
    if (!rules?.id) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update({ dediche_current_count: (rules.dediche_current_count || 0) + 1 })
        .eq('id', rules.id);
      
      if (updateError) throw updateError;
      return true;
    } catch {
      return false;
    }
  };

  // Reset counters
  const resetCounters = async (): Promise<boolean> => {
    return updateRules({
      openmic_current_count: 0,
      dediche_current_count: 0,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    });
  };

  // Start extraordinary reopening
  const startReopen = async (mode: 'time' | 'songs' | 'dediche', value: number, message?: string): Promise<boolean> => {
    const updates: Partial<EventBookingRules> = {
      reopen_active: true,
      reopen_mode: mode,
      reopen_message: message || null,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    };

    if (mode === 'time') {
      updates.reopen_until = new Date(Date.now() + value * 60 * 1000).toISOString();
    } else if (mode === 'songs') {
      updates.reopen_extra_songs = value;
    } else if (mode === 'dediche') {
      updates.reopen_extra_dediche = value;
    }

    return updateRules(updates);
  };

  // Stop reopening
  const stopReopen = async (): Promise<boolean> => {
    return updateRules({
      reopen_active: false,
      reopen_until: null,
      reopen_mode: null,
      reopen_extra_songs: null,
      reopen_extra_dediche: null,
      reopen_message: null,
    });
  };

  return {
    rules,
    allRules,
    loading,
    error,
    updateRules,
    toggleActive,
    createRules,
    incrementOpenMicCount,
    incrementDedicheCount,
    resetCounters,
    startReopen,
    stopReopen,
    refetch: fetchRules,
  };
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SectionKey = "openmic" | "dediche" | "community";

interface SectionStatus {
  sectionKey: SectionKey;
  displayName: string;
  isEnabled: boolean;
  updatedAt?: string;
}

/**
 * Public (no-auth) read of section enablement.
 * Reads from `global_format_settings` which is the source of truth for format activation.
 */
export function useSectionStatus(sectionKey: SectionKey) {
  const [status, setStatus] = useState<SectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        // Read from global_format_settings - the source of truth for format activation
        const { data, error } = await supabase
          .from("global_format_settings")
          .select("format_key, is_active, updated_at")
          .eq("format_key", sectionKey)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setStatus({
          sectionKey,
          displayName: sectionKey === 'openmic' ? 'Open Mic' : sectionKey === 'dediche' ? 'Dediche' : 'Community',
          isEnabled: data?.is_active ?? true,
          updatedAt: data?.updated_at,
        });
      } catch (e) {
        // Fail open: if we can't load flags, don't brick the app.
        console.error("Failed to load section status:", e);
        if (!cancelled) {
          setStatus({ sectionKey, displayName: sectionKey, isEnabled: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    // Subscribe to realtime updates for immediate toggle effect
    const channel = supabase
      .channel(`section-status-${sectionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_format_settings',
          filter: `format_key=eq.${sectionKey}`,
        },
        (payload) => {
          if (payload.new && 'is_active' in payload.new) {
            setStatus(prev => prev ? {
              ...prev,
              isEnabled: (payload.new as { is_active: boolean }).is_active,
              updatedAt: (payload.new as { updated_at?: string }).updated_at,
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sectionKey]);

  return { status, loading };
}

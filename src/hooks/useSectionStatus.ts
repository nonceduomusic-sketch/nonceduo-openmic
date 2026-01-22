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
 * Reads from `section_public_settings` (public mirror) to avoid exposing internal settings.
 */
export function useSectionStatus(sectionKey: SectionKey) {
  const [status, setStatus] = useState<SectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("section_public_settings")
          .select("section_key, display_name, is_enabled, updated_at")
          .eq("section_key", sectionKey)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setStatus({
          sectionKey,
          displayName: data?.display_name ?? sectionKey,
          isEnabled: data?.is_enabled ?? true,
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
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  return { status, loading };
}

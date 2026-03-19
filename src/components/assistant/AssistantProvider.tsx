import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AssistantWidget } from './AssistantWidget';

// All pages that can potentially show the assistant
// Each maps a path prefix to a section for the widget
const PAGE_SECTION_MAP: Record<string, 'site' | 'app' | 'openmic' | 'dediche' | 'community' | 'giochi' | 'furore'> = {
  '/app/furore': 'furore',
  '/app/giochi': 'giochi',
  '/app/openmic': 'openmic',
  '/app/dediche': 'dediche',
  '/app': 'app',
  '/openmic/live': 'openmic',
  '/openmic': 'openmic',
  '/messaggi/live': 'dediche',
  '/messaggi': 'dediche',
  '/furore': 'furore',
  '/giochi': 'giochi',
  '/social': 'community',
  '/collabora': 'site',
  '/partyband': 'site',
  '/evento-live': 'site',
  '/join': 'community',
  '/promo': 'site',
  '/privacy': 'site',
  '/installa': 'site',
  '/admin': 'site',
  '/trasmetti': 'site',
  '/tv': 'site',
  '/lyrics': 'site',
  '/telecomando': 'site',
  '/furore-remote': 'site',
  '/songbook-live': 'site',
  '/partiture': 'site',
  '/': 'site',
};

function getSectionFromPath(pathname: string): 'site' | 'app' | 'openmic' | 'dediche' | 'community' | 'giochi' | 'furore' {
  // Match longest prefix first
  const sortedKeys = Object.keys(PAGE_SECTION_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of sortedKeys) {
    if (prefix === '/' ? pathname === '/' : pathname.startsWith(prefix)) {
      return PAGE_SECTION_MAP[prefix];
    }
  }
  return 'site';
}

/**
 * Normalize a pathname to its canonical page key used in enabled_pages JSON.
 * E.g. "/app/giochi/quiz" → "/app/giochi", "/telecomando/abc123" → "/telecomando"
 */
function getPageKey(pathname: string): string {
  const KNOWN_PREFIXES = [
    '/app/furore', '/app/giochi', '/app/openmic', '/app/dediche', '/app',
    '/openmic/live', '/openmic', '/messaggi/live', '/messaggi',
    '/furore', '/giochi', '/social/dashboard', '/social/auth', '/social',
    '/collabora', '/partyband', '/evento-live', '/join',
    '/promo/locali', '/promo/eventi', '/promo/matrimoni', '/promo/feste-piazza', '/promo',
    '/privacy', '/installa', '/admin',
    '/trasmetti', '/tv', '/lyrics', '/telecomando', '/furore-remote',
    '/songbook-live', '/partiture',
  ];
  // Sort longest first
  const sorted = [...KNOWN_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (prefix === '/' ? pathname === '/' : pathname.startsWith(prefix)) {
      return prefix;
    }
  }
  return '/';
}

export const AssistantProvider: React.FC = () => {
  const location = useLocation();
  const [enabledPages, setEnabledPages] = useState<Record<string, boolean> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchEnabledPages = async () => {
      try {
        const { data, error } = await supabase
          .from('assistant_settings')
          .select('enabled_pages, is_enabled')
          .limit(1)
          .single();

        if (error || !data) {
          setEnabledPages({});
        } else if (!data.is_enabled) {
          // Global kill switch
          setEnabledPages({});
        } else {
          setEnabledPages((data.enabled_pages as Record<string, boolean>) || {});
        }
      } catch {
        setEnabledPages({});
      } finally {
        setLoaded(true);
      }
    };

    fetchEnabledPages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('assistant-settings-pages')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'assistant_settings',
      }, (payload) => {
        const newData = payload.new as { enabled_pages?: Record<string, boolean>; is_enabled?: boolean };
        if (newData.is_enabled === false) {
          setEnabledPages({});
        } else {
          setEnabledPages((newData.enabled_pages as Record<string, boolean>) || {});
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!loaded || !enabledPages) return null;

  const pageKey = getPageKey(location.pathname);
  const isEnabled = enabledPages[pageKey] === true;

  if (!isEnabled) return null;

  const section = getSectionFromPath(location.pathname);
  return <AssistantWidget section={section} />;
};

export default AssistantProvider;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FormatKey = 'openmic' | 'dediche';

interface FormatGatingState {
  // Is the format globally active (enabled by admin in "Format attivi")?
  isGloballyActive: boolean;
  // Is the format currently in a live session (section_settings.is_enabled)?
  isLiveSessionActive: boolean;
  // Does the format require PIN for this live session?
  requiresPin: boolean;
  // Combined state
  loading: boolean;
}

/**
 * Hook per determinare lo stato di gating di un format.
 * 
 * LOGICA FERREA:
 * 1. Se format NON ATTIVO (isGloballyActive=false o isLiveSessionActive=false) → mostra TEASER
 * 2. Se format ATTIVO:
 *    - Se NON ha PIN (requiresPin=false) → accesso diretto al LIVE
 *    - Se ha PIN (requiresPin=true) → mostra schermata PIN
 */
export function useFormatGating(format: FormatKey): FormatGatingState & {
  getGatingDecision: () => 'teaser' | 'live' | 'pin-required';
} {
  const [isGloballyActive, setIsGloballyActive] = useState(true);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkGating = useCallback(async () => {
    try {
      // 1. Check global format settings (Format attivi in Centro)
      const { data: globalSettings } = await supabase
        .from('global_format_settings')
        .select('is_active')
        .eq('format_key', format)
        .maybeSingle();

      // Default to FALSE if not found - safer to show teaser than fake "live" state
      const globalActive = globalSettings?.is_active ?? false;
      setIsGloballyActive(globalActive);

      // 2. Check live_sessions table - this is the source of truth for "Serata in corso"
      // A format is "live" if there's an active live_session that includes it in protected_formats
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('id, protected_formats, expires_at')
        .eq('is_active', true)
        .maybeSingle();

      let sessionActive = false;
      let needsPin = false;

      if (liveSession) {
        // Check expiration
        const isExpired = liveSession.expires_at && new Date(liveSession.expires_at) < new Date();
        if (!isExpired) {
          const protectedFormats = (liveSession.protected_formats as string[]) || [];
          // Format is "live" if it's in the protected_formats array
          sessionActive = protectedFormats.includes(format);
          // PIN is required if the format is protected
          needsPin = sessionActive;
        }
      }

      setIsLiveSessionActive(sessionActive);
      setRequiresPin(needsPin);

    } catch (error) {
      console.error('Error checking format gating:', error);
      // Fail safe: show teaser on error
      setIsGloballyActive(true);
      setIsLiveSessionActive(false);
      setRequiresPin(false);
    } finally {
      setLoading(false);
    }
  }, [format]);

  useEffect(() => {
    checkGating();

    // Subscribe to realtime changes
    const channels = [
      supabase.channel(`gating-global-${format}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'global_format_settings' }, checkGating)
        .subscribe(),
      supabase.channel(`gating-live-${format}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, checkGating)
        .subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [format, checkGating]);

  /**
   * Determina quale schermata mostrare:
   * - 'teaser': pagina promozionale (format chiuso/non disponibile)
   * - 'live': accesso diretto al contenuto live
   * - 'pin-required': mostra form inserimento PIN
   */
  const getGatingDecision = useCallback((): 'teaser' | 'live' | 'pin-required' => {
    // Se format non globalmente attivo → teaser
    if (!isGloballyActive) return 'teaser';
    
    // Se format non in sessione live → teaser
    if (!isLiveSessionActive) return 'teaser';
    
    // Format è attivo! Ora controlla PIN
    if (requiresPin) return 'pin-required';
    
    // Format attivo senza PIN → accesso diretto
    return 'live';
  }, [isGloballyActive, isLiveSessionActive, requiresPin]);

  return {
    isGloballyActive,
    isLiveSessionActive,
    requiresPin,
    loading,
    getGatingDecision,
  };
}

/**
 * Hook per validare il PIN inserito dall'utente
 */
export function useFormatPinValidator(format: FormatKey) {
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validatePin = async (pin: string): Promise<boolean> => {
    setValidating(true);
    setIsValid(null);

    try {
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('id, pin_code, protected_formats, expires_at')
        .eq('is_active', true)
        .maybeSingle();

      if (!liveSession) {
        setIsValid(true);
        return true;
      }

      // Check expiration
      if (liveSession.expires_at && new Date(liveSession.expires_at) < new Date()) {
        setIsValid(true);
        return true;
      }

      // Check if format is protected
      const protectedFormats = (liveSession.protected_formats as string[]) || [];
      if (!protectedFormats.includes(format)) {
        setIsValid(true);
        return true;
      }

      // Validate PIN
      const valid = liveSession.pin_code === pin.toUpperCase().trim();
      setIsValid(valid);

      // Log failed attempt (don't await to not block)
      if (!valid) {
        supabase.from('admin_audit_logs').insert({
          action: 'live_session_pin_failed',
          section: format,
          entity: 'live_sessions',
          entity_id: liveSession.id,
          metadata: { attempted_pin: pin.substring(0, 2) + '***', format }
        }).then(() => {});
      }

      return valid;
    } catch (error) {
      console.error('Error validating PIN:', error);
      setIsValid(false);
      return false;
    } finally {
      setValidating(false);
    }
  };

  const reset = () => {
    setIsValid(null);
    setValidating(false);
  };

  return { validatePin, validating, isValid, reset };
}

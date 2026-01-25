import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adminAuditLog } from '@/lib/adminAudit';

export type FormatType = 'openmic' | 'dediche';

export interface UnifiedLiveSession {
  id: string;
  section: string;
  pin_code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
  protected_formats: FormatType[];
  custom_pin: string | null;
  event_link_code: string | null;
}

// Generate a random alphanumeric PIN (6 characters)
const generatePinCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

// Default branded event link code - fixed but can be regenerated
const DEFAULT_LINK_CODE = 'nonceduo';

// Generate a unique event link code (only when regenerating)
const generateLinkCode = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = 'ev-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useUnifiedLiveSession = () => {
  const [session, setSession] = useState<UnifiedLiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is owner
  useEffect(() => {
    const checkOwner = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .maybeSingle();
        setIsOwner(!!data);
      }
    };
    checkOwner();
  }, []);

  // Fetch active session (any active session with protected formats)
  const fetchSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Check if session is expired
      if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
        setSession(null);
      } else if (data) {
        setSession({
          ...data,
          protected_formats: (data.protected_formats as FormatType[]) || ['openmic', 'dediche'],
        } as UnifiedLiveSession);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Error fetching live session:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('unified-live-session')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
        },
        () => {
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSession]);

  // Start a new unified live session
  // Note: protectedFormats can be empty array for "LIVE without PIN" mode
  const startSession = async (
    protectedFormats: FormatType[],
    expiresInHours?: number,
    customPin?: string
  ): Promise<boolean> => {
    if (!isOwner) {
      toast.error('Solo l\'owner può attivare la Serata Live');
      return false;
    }

    // Allow empty protected_formats for "LIVE without PIN" mode

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // First, deactivate any existing active session
      await supabase
        .from('live_sessions')
        .update({ 
          is_active: false, 
          deactivated_at: new Date().toISOString(),
          deactivated_by: user.id
        })
        .eq('is_active', true);

      // Generate PIN and use fixed link code by default
      const pinCode = customPin?.toUpperCase().trim() || generatePinCode();
      const linkCode = DEFAULT_LINK_CODE;
      const expiresAt = expiresInHours 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      // Create new session
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          section: 'global',
          pin_code: pinCode,
          is_active: true,
          expires_at: expiresAt,
          created_by: user.id,
          protected_formats: protectedFormats,
          custom_pin: customPin ? pinCode : null,
          event_link_code: linkCode,
        })
        .select()
        .single();

      if (error) throw error;

      setSession({
        ...data,
        protected_formats: protectedFormats,
      } as UnifiedLiveSession);
      
      // Audit log
      await adminAuditLog({
        action: 'live_session_start',
        section: 'global',
        entity: 'live_sessions',
        entity_id: data.id,
        metadata: { 
          pin_code: pinCode, 
          expires_at: expiresAt,
          protected_formats: protectedFormats,
          event_link_code: linkCode
        }
      });

      const message = protectedFormats.length > 0 
        ? `Evento LIVE attivato! PIN: ${pinCode}` 
        : 'Evento LIVE attivato (accesso libero)';
      toast.success(message);
      return true;
    } catch (error) {
      console.error('Error starting live session:', error);
      toast.error('Errore nell\'attivazione della Serata Live');
      return false;
    }
  };

  // Stop the live session
  const stopSession = async (): Promise<boolean> => {
    if (!isOwner) {
      toast.error('Solo l\'owner può disattivare la Serata Live');
      return false;
    }

    if (!session) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('live_sessions')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user?.id
        })
        .eq('id', session.id);

      if (error) throw error;

      // Audit log
      await adminAuditLog({
        action: 'live_session_stop',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { 
          pin_code: session.pin_code,
          protected_formats: session.protected_formats
        }
      });

      setSession(null);
      toast.success('Serata Live disattivata');
      return true;
    } catch (error) {
      console.error('Error stopping live session:', error);
      toast.error('Errore nella disattivazione');
      return false;
    }
  };

  // Update protected formats
  const updateFormats = async (formats: FormatType[]): Promise<boolean> => {
    if (!isOwner || !session) return false;

    if (formats.length === 0) {
      toast.error('Seleziona almeno un format da proteggere');
      return false;
    }

    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ protected_formats: formats })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, protected_formats: formats });

      // Audit log
      await adminAuditLog({
        action: 'live_session_update_formats',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { 
          old_formats: session.protected_formats,
          new_formats: formats 
        }
      });

      toast.success('Format aggiornati');
      return true;
    } catch (error) {
      console.error('Error updating formats:', error);
      toast.error('Errore nell\'aggiornamento');
      return false;
    }
  };

  // Update PIN (manual edit)
  const updatePin = async (newPin: string): Promise<boolean> => {
    if (!isOwner || !session) return false;

    const cleanPin = newPin.toUpperCase().trim();
    if (cleanPin.length < 4 || cleanPin.length > 8) {
      toast.error('Il PIN deve essere tra 4 e 8 caratteri');
      return false;
    }

    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ pin_code: cleanPin, custom_pin: cleanPin })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, pin_code: cleanPin, custom_pin: cleanPin });

      // IMPORTANT: changing the PIN must invalidate all existing sessions
      // so everyone is forced to re-enter the new PIN.
      const { error: invalidateError } = await supabase.rpc('invalidate_pin_sessions', {
        p_live_session_id: session.id,
        p_reason: 'pin_changed',
      });

      if (invalidateError) {
        console.error('Error invalidating pin sessions after pin change:', invalidateError);
        toast.warning('PIN aggiornato, ma non sono riuscito a resettare le sessioni. Usa “Invalida tutti”.');
      }

      // Audit log
      await adminAuditLog({
        action: 'live_session_update_pin',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { old_pin: session.pin_code, new_pin: cleanPin }
      });

      toast.success(`PIN aggiornato: ${cleanPin}`);
      return true;
    } catch (error) {
      console.error('Error updating PIN:', error);
      toast.error('Errore nell\'aggiornamento del PIN');
      return false;
    }
  };

  // Regenerate PIN
  const regeneratePin = async (): Promise<string | null> => {
    if (!isOwner || !session) return null;

    try {
      const newPin = generatePinCode();

      const { error } = await supabase
        .from('live_sessions')
        .update({ pin_code: newPin, custom_pin: null })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, pin_code: newPin, custom_pin: null });

      // IMPORTANT: new PIN -> invalidate all sessions
      const { error: invalidateError } = await supabase.rpc('invalidate_pin_sessions', {
        p_live_session_id: session.id,
        p_reason: 'pin_regenerated',
      });

      if (invalidateError) {
        console.error('Error invalidating pin sessions after pin regeneration:', invalidateError);
        toast.warning('Nuovo PIN generato, ma non sono riuscito a resettare le sessioni. Usa “Invalida tutti”.');
      }

      // Audit log
      await adminAuditLog({
        action: 'live_session_regenerate_pin',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { old_pin: session.pin_code, new_pin: newPin }
      });

      toast.success(`Nuovo PIN generato: ${newPin}`);
      return newPin;
    } catch (error) {
      console.error('Error regenerating PIN:', error);
      toast.error('Errore nella generazione del nuovo PIN');
      return null;
    }
  };

  // Check if a specific format is protected
  const isFormatProtected = (format: FormatType): boolean => {
    if (!session) return false;
    return session.protected_formats.includes(format);
  };

  // Get event URL - always use nonceduo.com for production
  const getEventUrl = (): string | null => {
    if (!session?.event_link_code) return null;
    // Use current origin so the link always works in Preview + Published.
    // (No hardcoded domains.)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/evento-live/${session.event_link_code}`;
  };

  // Regenerate the event link code (manual action)
  const regenerateLinkCode = async (): Promise<string | null> => {
    if (!isOwner || !session) return null;

    try {
      const newCode = generateLinkCode();

      const { error } = await supabase
        .from('live_sessions')
        .update({ event_link_code: newCode })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, event_link_code: newCode });

      // Audit log
      await adminAuditLog({
        action: 'live_session_regenerate_link',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { old_code: session.event_link_code, new_code: newCode }
      });

      toast.success(`Nuovo link generato`);
      return newCode;
    } catch (error) {
      console.error('Error regenerating link code:', error);
      toast.error('Errore nella generazione del nuovo link');
      return null;
    }
  };

  // Remove PIN protection (set protected_formats to empty = no PIN required)
  const removePin = async (): Promise<boolean> => {
    if (!isOwner || !session) return false;

    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ protected_formats: [] })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, protected_formats: [] });

      // Audit log
      await adminAuditLog({
        action: 'live_session_remove_pin',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { old_formats: session.protected_formats }
      });

      toast.success('Protezione PIN rimossa – accesso diretto attivo');
      return true;
    } catch (error) {
      console.error('Error removing PIN protection:', error);
      toast.error('Errore nella rimozione del PIN');
      return false;
    }
  };

  // Restore PIN protection (add formats back)
  const restorePin = async (formats: FormatType[]): Promise<boolean> => {
    if (!isOwner || !session) return false;

    if (formats.length === 0) {
      toast.error('Seleziona almeno un format da proteggere');
      return false;
    }

    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ protected_formats: formats })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, protected_formats: formats });

      // Audit log
      await adminAuditLog({
        action: 'live_session_restore_pin',
        section: 'global',
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { new_formats: formats }
      });

      toast.success('Protezione PIN riattivata');
      return true;
    } catch (error) {
      console.error('Error restoring PIN protection:', error);
      toast.error('Errore nel ripristino del PIN');
      return false;
    }
  };

  // Check if PIN is currently active (protected_formats not empty)
  const isPinActive = !!session && session.protected_formats.length > 0;

  return {
    session,
    loading,
    isOwner,
    isActive: !!session,
    isPinActive,
    startSession,
    stopSession,
    updateFormats,
    updatePin,
    regeneratePin,
    removePin,
    restorePin,
    isFormatProtected,
    getEventUrl,
    regenerateLinkCode,
    refetch: fetchSession,
  };
};

// Hook for public use - check if a format requires PIN
export const useFormatPinValidation = (format: FormatType) => {
  const [isProtected, setIsProtected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProtection = async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('id, protected_formats, expires_at')
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsProtected(false);
        } else if (data && Array.isArray(data.protected_formats)) {
          setIsProtected(data.protected_formats.includes(format));
        } else {
          setIsProtected(false);
        }
      } catch (error) {
        console.error('Error checking format protection:', error);
        setIsProtected(false);
      } finally {
        setLoading(false);
      }
    };

    checkProtection();

    // Subscribe to changes
    const channel = supabase
      .channel(`format-protection-${format}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
        },
        () => {
          checkProtection();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [format]);

  const validatePin = async (pin: string): Promise<boolean> => {
    if (!isProtected) return true;

    try {
      // Use secure RPC function instead of reading pin_code directly
      // This prevents client-side exposure of PIN codes
      const { data: isValid, error } = await supabase.rpc('validate_live_session_pin', {
        p_section: format,
        p_pin: pin.toUpperCase().trim()
      });

      if (error) {
        // Check if it's a rate limit error
        if (error.message?.includes('Troppi tentativi')) {
          console.warn('Rate limit exceeded for PIN validation');
          return false;
        }
        throw error;
      }

      return isValid === true;
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };

  return {
    isProtected,
    loading,
    validatePin,
  };
};

// Hook to check if a format is available (not protected OR user hasn't entered correct PIN)
export const useFormatAvailability = () => {
  const [sessionData, setSessionData] = useState<{
    isActive: boolean;
    protectedFormats: FormatType[];
    expiresAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('is_active, protected_formats, expires_at')
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
          setSessionData(null);
        } else if (data) {
          setSessionData({
            isActive: true,
            protectedFormats: (data.protected_formats as FormatType[]) || [],
            expiresAt: data.expires_at,
          });
        } else {
          setSessionData(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const channel = supabase
      .channel('format-availability')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        () => checkSession()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isFormatProtected = (format: FormatType): boolean => {
    if (!sessionData?.isActive) return false;
    return sessionData.protectedFormats.includes(format);
  };

  const isOtherFormatOnly = (format: FormatType): boolean => {
    if (!sessionData?.isActive) return false;
    // Check if there's an active session but this format is NOT protected
    // AND at least one other format IS protected
    const isThisProtected = sessionData.protectedFormats.includes(format);
    const hasOtherProtected = sessionData.protectedFormats.length > 0;
    return !isThisProtected && hasOtherProtected;
  };

  return {
    isActive: sessionData?.isActive || false,
    protectedFormats: sessionData?.protectedFormats || [],
    loading,
    isFormatProtected,
    isOtherFormatOnly,
  };
};

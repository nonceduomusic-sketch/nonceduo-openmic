import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adminAuditLog } from '@/lib/adminAudit';

export interface LiveSession {
  id: string;
  section: 'openmic' | 'dediche';
  pin_code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
}

// Generate a random alphanumeric PIN (6 characters)
const generatePinCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars like O/0, I/1
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

export const useLiveSession = (section: 'openmic' | 'dediche') => {
  const [session, setSession] = useState<LiveSession | null>(null);
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

  // Fetch active session
  const fetchSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('section', section)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      // Check if session is expired
      if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
        setSession(null);
      } else {
        setSession(data as LiveSession | null);
      }
    } catch (error) {
      console.error('Error fetching live session:', error);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    fetchSession();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`live-session-${section}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
          filter: `section=eq.${section}`
        },
        () => {
          console.log(`[LiveSession] ${section} session changed`);
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [section, fetchSession]);

  // Start a new live session
  const startSession = async (expiresInHours?: number): Promise<boolean> => {
    if (!isOwner) {
      toast.error('Solo l\'owner può attivare la Serata Live');
      return false;
    }

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
        .eq('section', section)
        .eq('is_active', true);

      // Generate new PIN
      const pinCode = generatePinCode();
      const expiresAt = expiresInHours 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      // Create new session
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          section,
          pin_code: pinCode,
          is_active: true,
          expires_at: expiresAt,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSession(data as LiveSession);
      
      // Audit log
      await adminAuditLog({
        action: 'live_session_start',
        section,
        entity: 'live_sessions',
        entity_id: data.id,
        metadata: { pin_code: pinCode, expires_at: expiresAt }
      });

      toast.success(`Serata Live attivata! PIN: ${pinCode}`);
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
        section,
        entity: 'live_sessions',
        entity_id: session.id,
        metadata: { pin_code: session.pin_code }
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

  // Regenerate PIN for current session
  const regeneratePin = async (): Promise<string | null> => {
    if (!isOwner || !session) return null;

    try {
      const newPin = generatePinCode();

      const { error } = await supabase
        .from('live_sessions')
        .update({ pin_code: newPin })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, pin_code: newPin });

      // Audit log
      await adminAuditLog({
        action: 'live_session_regenerate_pin',
        section,
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

  return {
    session,
    loading,
    isOwner,
    isActive: !!session,
    startSession,
    stopSession,
    regeneratePin,
    refetch: fetchSession,
  };
};

// Hook for validating PIN in reservation forms (public use)
export const usePinValidation = (section: 'openmic' | 'dediche') => {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLiveMode = async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('id, expires_at')
          .eq('section', section)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        // Check expiration
        if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsLiveMode(false);
        } else {
          setIsLiveMode(!!data);
        }
      } catch (error) {
        console.error('Error checking live mode:', error);
        setIsLiveMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkLiveMode();

    // Subscribe to changes
    const channel = supabase
      .channel(`pin-validation-${section}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
          filter: `section=eq.${section}`
        },
        () => {
          checkLiveMode();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [section]);

  const validatePin = async (pin: string): Promise<boolean> => {
    if (!isLiveMode) return true; // No live session = no PIN required

    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('id, pin_code, expires_at')
        .eq('section', section)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return true; // No active session

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return true; // Expired = no PIN required
      }

      const isValid = data.pin_code === pin.toUpperCase().trim();
      
      // Log failed attempt
      if (!isValid) {
        await adminAuditLog({
          action: 'live_session_pin_failed',
          section,
          entity: 'live_sessions',
          entity_id: data.id,
          metadata: { attempted_pin: pin.substring(0, 2) + '***' }
        });
      }

      return isValid;
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };

  return {
    isLiveMode,
    loading,
    validatePin,
  };
};

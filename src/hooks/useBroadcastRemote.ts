 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface BroadcastRemoteAccess {
   id: string;
   access_token: string;
   pin_code: string;
   sala_code: string;
   name: string;
   is_active: boolean;
   created_at: string;
   updated_at: string;
   expires_at: string | null;
   last_used_at: string | null;
 }
 
 export interface BroadcastRemoteSession {
   id: string;
   access_id: string;
   device_fingerprint: string | null;
   device_name: string;
   connected_at: string;
   last_activity_at: string;
   is_active: boolean;
 }
 
 // Hook per admin - gestione accessi
 export function useBroadcastRemoteAdmin() {
   const [accesses, setAccesses] = useState<BroadcastRemoteAccess[]>([]);
   const [sessions, setSessions] = useState<BroadcastRemoteSession[]>([]);
   const [loading, setLoading] = useState(true);
 
   const fetchAccesses = useCallback(async () => {
     const { data, error } = await supabase
       .from('broadcast_remote_access')
       .select('*')
       .order('created_at', { ascending: false });
 
     if (error) {
       console.error('Error fetching remote accesses:', error);
       return;
     }
     setAccesses((data || []) as BroadcastRemoteAccess[]);
   }, []);
 
   const fetchSessions = useCallback(async () => {
     const { data, error } = await supabase
       .from('broadcast_remote_sessions')
       .select('*')
       .eq('is_active', true)
       .order('connected_at', { ascending: false });
 
     if (error) {
       console.error('Error fetching remote sessions:', error);
       return;
     }
     setSessions((data || []) as BroadcastRemoteSession[]);
   }, []);
 
   useEffect(() => {
     const loadData = async () => {
       setLoading(true);
       await Promise.all([fetchAccesses(), fetchSessions()]);
       setLoading(false);
     };
     loadData();
 
     // Subscribe to realtime updates
     const accessChannel = supabase
       .channel('broadcast-remote-access-admin')
       .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'broadcast_remote_access' },
         () => fetchAccesses()
       )
       .subscribe();
 
     const sessionChannel = supabase
       .channel('broadcast-remote-sessions-admin')
       .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'broadcast_remote_sessions' },
         () => fetchSessions()
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(accessChannel);
       supabase.removeChannel(sessionChannel);
     };
   }, [fetchAccesses, fetchSessions]);
 
   // Crea nuovo accesso telecomando
   const createAccess = useCallback(async (name: string, salaCode: string = 'main') => {
     const { data: { user } } = await supabase.auth.getUser();
     
     const { data, error } = await supabase
       .from('broadcast_remote_access')
       .insert({ 
         name, 
         sala_code: salaCode,
         created_by: user?.id 
       })
       .select()
       .single();
 
     if (error) {
       console.error('Error creating remote access:', error);
       toast.error('Errore creazione telecomando');
       return null;
     }
 
     toast.success('Telecomando creato!');
     await fetchAccesses();
     return data as BroadcastRemoteAccess;
   }, [fetchAccesses]);
 
   // Rigenera token (invalida link precedente)
   const regenerateToken = useCallback(async (accessId: string) => {
     const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
       .map(b => b.toString(16).padStart(2, '0'))
       .join('');
 
     const { error } = await supabase
       .from('broadcast_remote_access')
       .update({ access_token: newToken })
       .eq('id', accessId);
 
     if (error) {
       console.error('Error regenerating token:', error);
       toast.error('Errore rigenerazione link');
       return false;
     }
 
     // Espelli tutte le sessioni attive
     await supabase.rpc('kick_all_remote_sessions', { p_access_id: accessId });
     
     toast.success('Link rigenerato, utenti espulsi');
     await fetchAccesses();
     return true;
   }, [fetchAccesses]);
 
   // Rigenera PIN
  const regeneratePIN = useCallback(async (accessId: string, customPin?: string) => {
    const newPin = customPin || Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .slice(0, 6);
 
     const { error } = await supabase
       .from('broadcast_remote_access')
       .update({ pin_code: newPin })
       .eq('id', accessId);
 
     if (error) {
       console.error('Error regenerating PIN:', error);
       toast.error('Errore rigenerazione PIN');
       return false;
     }
 
     // Espelli tutte le sessioni attive
     await supabase.rpc('kick_all_remote_sessions', { p_access_id: accessId });
     
    toast.success(customPin ? 'PIN personalizzato impostato' : 'PIN rigenerato, utenti espulsi');
     await fetchAccesses();
     return true;
   }, [fetchAccesses]);
 
   // Attiva/disattiva accesso
   const toggleAccess = useCallback(async (accessId: string, isActive: boolean) => {
     const { error } = await supabase
       .from('broadcast_remote_access')
       .update({ is_active: isActive })
       .eq('id', accessId);
 
     if (error) {
       console.error('Error toggling access:', error);
       toast.error('Errore aggiornamento stato');
       return false;
     }
 
     if (!isActive) {
       await supabase.rpc('kick_all_remote_sessions', { p_access_id: accessId });
     }
     
     toast.success(isActive ? 'Telecomando attivato' : 'Telecomando disattivato');
     await fetchAccesses();
     return true;
   }, [fetchAccesses]);
 
   // Espelli tutte le sessioni
   const kickAllSessions = useCallback(async (accessId: string) => {
     const { data, error } = await supabase.rpc('kick_all_remote_sessions', { 
       p_access_id: accessId 
     });
 
     if (error) {
       console.error('Error kicking sessions:', error);
       toast.error('Errore espulsione utenti');
       return 0;
     }
 
     toast.success(`${data} utenti espulsi`);
     await fetchSessions();
     return data as number;
   }, [fetchSessions]);
 
   // Elimina accesso
   const deleteAccess = useCallback(async (accessId: string) => {
     const { error } = await supabase
       .from('broadcast_remote_access')
       .delete()
       .eq('id', accessId);
 
     if (error) {
       console.error('Error deleting access:', error);
       toast.error('Errore eliminazione telecomando');
       return false;
     }
 
     toast.success('Telecomando eliminato');
     await fetchAccesses();
     return true;
   }, [fetchAccesses]);
 
   // Conta sessioni attive per un accesso
   const getActiveSessionCount = useCallback((accessId: string) => {
     return sessions.filter(s => s.access_id === accessId && s.is_active).length;
   }, [sessions]);
 
   return {
     accesses,
     sessions,
     loading,
     createAccess,
     regenerateToken,
     regeneratePIN,
     toggleAccess,
     kickAllSessions,
     deleteAccess,
     getActiveSessionCount,
     refetch: () => Promise.all([fetchAccesses(), fetchSessions()]),
   };
 }
 
 // Hook per utente telecomando - validazione e controllo
 export function useBroadcastRemoteUser(token: string | undefined) {
   const [isValidated, setIsValidated] = useState(false);
   const [accessInfo, setAccessInfo] = useState<{
     accessId: string;
     salaCode: string;
     name: string;
   } | null>(null);
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [isKicked, setIsKicked] = useState(false);
   const [loading, setLoading] = useState(true);
 
   // Verifica se token esiste (prima del PIN)
   useEffect(() => {
     const checkToken = async () => {
       if (!token) {
         setLoading(false);
         return;
       }
 
       const { data, error } = await supabase
         .from('broadcast_remote_access')
         .select('id, sala_code, name, is_active, expires_at')
         .eq('access_token', token)
         .eq('is_active', true)
         .single();
 
       if (error || !data) {
         setLoading(false);
         return;
       }
 
       // Check expiry
       if (data.expires_at && new Date(data.expires_at) < new Date()) {
         setLoading(false);
         return;
       }
 
       setAccessInfo({
         accessId: data.id,
         salaCode: data.sala_code,
         name: data.name,
       });
       setLoading(false);
     };
 
     checkToken();
   }, [token]);
 
   // Valida PIN e crea sessione
    const validatePIN = useCallback(async (pin: string): Promise<boolean> => {
      if (!token || !accessInfo) {
        console.warn('[RemoteUser] validatePIN called but token/accessInfo missing', { token: !!token, accessInfo: !!accessInfo });
        return false;
      }

      // Timeout wrapper to prevent hanging forever on slow/broken connections
      const withTimeout = <T>(promise: PromiseLike<T>, ms: number): Promise<T> =>
        Promise.race([
          Promise.resolve(promise),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout: il server non ha risposto in tempo')), ms)),
        ]);

      // Step 1: Validate PIN via RPC
      const rpcResult = await withTimeout(
        supabase.rpc('validate_remote_access', { p_token: token, p_pin: pin }),
        10000
      );

      if (rpcResult.error) {
        console.error('[RemoteUser] validate_remote_access error:', rpcResult.error);
        toast.error('Errore connessione: verifica PIN non riuscita');
        throw rpcResult.error;
      }

      const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : (rpcResult.data as any);
      if (!row?.is_valid) {
        toast.error('PIN non valido');
        return false;
      }

      // Step 2: Create session
      const deviceName = getDeviceName();
      const fingerprint = await getDeviceFingerprint().catch(() => 'unknown');

      const insertResult = await withTimeout(
        supabase
          .from('broadcast_remote_sessions')
          .insert({
            access_id: row.access_id,
            device_fingerprint: fingerprint,
            device_name: deviceName,
          })
          .select('id')
          .single(),
        10000
      );

      if (insertResult.error) {
        console.error('[RemoteUser] Error creating session:', insertResult.error);
        toast.error('Errore creazione sessione');
        throw insertResult.error;
      }

      setSessionId(insertResult.data.id);
      setIsValidated(true);
      toast.success('Accesso consentito!');
      return true;
    }, [token, accessInfo]);
 
   // Ascolta espulsioni
   useEffect(() => {
     if (!sessionId) return;
 
     const channel = supabase
       .channel(`remote-session-${sessionId}`)
       .on(
         'postgres_changes',
         {
           event: 'UPDATE',
           schema: 'public',
           table: 'broadcast_remote_sessions',
           filter: `id=eq.${sessionId}`,
         },
         (payload) => {
           if (payload.new && !(payload.new as any).is_active) {
             setIsKicked(true);
             setIsValidated(false);
             toast.error('Sei stato disconnesso dal telecomando');
           }
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [sessionId]);
 
   // Aggiorna last_activity periodicamente
   useEffect(() => {
     if (!sessionId || !isValidated) return;
 
     const interval = setInterval(async () => {
       await supabase
         .from('broadcast_remote_sessions')
         .update({ last_activity_at: new Date().toISOString() })
         .eq('id', sessionId);
     }, 30000); // ogni 30 secondi
 
     return () => clearInterval(interval);
   }, [sessionId, isValidated]);
 
   return {
     isValidated,
     accessInfo,
     sessionId,
     isKicked,
     loading,
     tokenExists: !!accessInfo,
     validatePIN,
   };
 }

// Hook per controllo remoto - aggiorna highlight_line / scroll_position via RPC sicure
export function useRemoteControl(sessionId: string | null, salaCode: string) {
  const updateHighlightLine = useCallback(async (highlightLine: number): Promise<boolean> => {
    if (!sessionId) return false;

    const { data, error } = await supabase.rpc('remote_update_highlight_line', {
      p_session_id: sessionId,
      p_sala_code: salaCode,
      p_highlight_line: highlightLine,
    });

    if (error) {
      console.error('Error updating highlight line:', error);
      return false;
    }

    return data === true;
  }, [sessionId, salaCode]);

  const updateScrollPosition = useCallback(async (scrollPosition: number): Promise<boolean> => {
    if (!sessionId) return false;

    const { data, error } = await supabase.rpc('remote_update_scroll_position', {
      p_session_id: sessionId,
      p_sala_code: salaCode,
      p_scroll_position: scrollPosition,
    });

    if (error) {
      console.error('Error updating scroll position:', error);
      return false;
    }

    return data === true;
  }, [sessionId, salaCode]);

  return { updateHighlightLine, updateScrollPosition };
}
 
 // Helpers
 function getDeviceName(): string {
   const ua = navigator.userAgent;
   if (/iPhone/.test(ua)) return 'iPhone';
   if (/iPad/.test(ua)) return 'iPad';
   if (/Android/.test(ua)) return 'Android';
   if (/Mac/.test(ua)) return 'Mac';
   if (/Windows/.test(ua)) return 'Windows';
   return 'Browser';
 }
 
async function getDeviceFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
      }
      const canvasData = canvas.toDataURL();
      const data = `${navigator.userAgent}|${screen.width}x${screen.height}|${canvasData}`;

      // crypto.subtle is only available in secure contexts (HTTPS / localhost)
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
      }

      // Fallback: simple hash for HTTP (non-secure) contexts
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 32);
    } catch {
      return 'unknown';
    }
  }
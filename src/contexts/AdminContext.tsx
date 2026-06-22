import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheCredentialsAfterLogin,
  tryOfflineLogin,
  readLocalStaffSession,
  clearLocalStaffSession,
  flushPendingSync,
  pingLocalServer,
  type LocalStaffSession,
} from '@/lib/localStaffAuth';


interface AdminUser {
  username: string;
  email: string;
}

type StaffRole = 'owner' | 'admin' | 'moderator' | 'operator';

interface AdminContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  currentUser: AdminUser | null;
  session: Session | null;
  staffRole: StaffRole | null;
  /** True when the session is a local-only staff session (no cloud auth). */
  isLocalSession: boolean;
  /** Local staff token if isLocalSession (already prefixed with local-staff:). */
  localStaffToken: string | null;
  login: (email: string, password: string) => Promise<{ error: Error | null; offline?: boolean }>;
  /** Set an active local-staff session (used by emergency Master PIN dialog). */
  setLocalStaffSession: (s: LocalStaffSession) => void;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string })?.message || err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('typeerror') ||
    msg.includes('timeout') ||
    msg.includes('abort')
  );
}

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [localStaff, setLocalStaff] = useState<LocalStaffSession | null>(() => readLocalStaffSession());
  const lastLoginCredsRef = useRef<{ email: string; password: string } | null>(null);

  // ── Supabase auth lifecycle ──
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Any real cloud login takes precedence over local-staff session
      if (s?.user) {
        clearLocalStaffSession();
        setLocalStaff(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Resolve cloud staff role ──
  useEffect(() => {
    let cancelled = false;

    const fetchRoleOnce = async (userId: string) => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin', 'moderator', 'operator'])
        .maybeSingle();
      if (error) {
        console.error('Admin role check failed:', error);
        return null;
      }
      return (data?.role as StaffRole | undefined) ?? null;
    };

    const user = session?.user ?? null;
    if (!user) {
      // No cloud session: rely on local-staff session if present
      setStaffRole(localStaff?.role ?? null);
      setCurrentUser(
        localStaff ? { username: localStaff.username, email: localStaff.email } : null,
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    (async () => {
      let role = await fetchRoleOnce(user.id);
      if (!role) {
        await new Promise((r) => setTimeout(r, 800));
        role = await fetchRoleOnce(user.id);
      }
      if (cancelled) return;
      setStaffRole(role);
      if (role) {
        const username =
          (user.user_metadata as { username?: string } | undefined)?.username ||
          user.email?.split('@')[0] ||
          'Admin';
        setCurrentUser({ username, email: user.email || '' });

        // ── Fase 1: cache credentials on local-server (best effort) ──
        const creds = lastLoginCredsRef.current;
        if (creds && creds.email.toLowerCase() === (user.email || '').toLowerCase()) {
          cacheCredentialsAfterLogin({
            email: creds.email,
            password: creds.password,
            role,
            username,
          }).catch(() => { /* silent */ });
          lastLoginCredsRef.current = null;
        }

        // Flush pending sync queue when back online
        flushPendingSync().catch(() => { /* silent */ });
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id, localStaff?.token]);

  // ── Try to flush pending sync on mount if local-server reachable ──
  useEffect(() => {
    pingLocalServer().then((ok) => {
      if (ok) flushPendingSync().catch(() => { /* silent */ });
    });
  }, []);

  const isLoggedIn = useMemo(
    () => (!!session?.user && !!staffRole) || !!localStaff,
    [session?.user, staffRole, localStaff],
  );

  const login = async (email: string, password: string) => {
    lastLoginCredsRef.current = { email, password };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return { error: null };
      // Cloud auth returned an error response (e.g. bad credentials). Don't try offline.
      // But if the error is clearly a network one, fall through to offline below.
      if (!isNetworkError(error)) {
        lastLoginCredsRef.current = null;
        return { error: error as unknown as Error };
      }
    } catch (e) {
      if (!isNetworkError(e)) {
        lastLoginCredsRef.current = null;
        return { error: e as Error };
      }
    }

    // ── Fallback offline (Fase 1) ──
    const result = await tryOfflineLogin(email, password);
    lastLoginCredsRef.current = null;
    if (!result.ok || !result.session) {
      const errMsg =
        result.error === 'no_cache'
          ? 'Internet non disponibile e nessuna cache locale per questo utente. Connettiti almeno una volta da questo PC con Internet.'
          : result.error === 'expired'
            ? 'Cache locale scaduta. Riconnetti con Internet per rinnovarla.'
            : result.error === 'rate_limited'
              ? 'Troppi tentativi. Riprova tra qualche minuto.'
              : 'Internet non disponibile e credenziali offline non valide.';
      return { error: new Error(errMsg), offline: true };
    }
    setLocalStaff(result.session);
    return { error: null, offline: true };
  };

  const setLocalStaffSession = (s: LocalStaffSession) => {
    setLocalStaff(s);
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    clearLocalStaffSession();
    setLocalStaff(null);
    setCurrentUser(null);
    setSession(null);
    setStaffRole(null);
  };

  return (
    <AdminContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        currentUser,
        session,
        staffRole,
        isLocalSession: !!localStaff && !session?.user,
        localStaffToken: localStaff?.token ?? null,
        login,
        setLocalStaffSession,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

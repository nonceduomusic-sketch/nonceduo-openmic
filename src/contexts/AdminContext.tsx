import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  username: string;
  email: string;
}

interface AdminContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  currentUser: AdminUser | null;
  session: Session | null;
  staffRole: 'owner' | 'admin' | 'moderator' | 'operator' | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staffRole, setStaffRole] = useState<'owner' | 'admin' | 'moderator' | 'operator' | null>(null);

  useEffect(() => {
    // IMPORTANT: do NOT do async Supabase calls inside onAuthStateChange callback.
    // We only update the session here; role checks happen in a separate effect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resolve staff/admin access based on DB roles.
  // This prevents normal community users from accessing /admin.
  useEffect(() => {
    let cancelled = false;

    const resolveRole = async (user: User) => {
      const tryFetchRole = async () => {
        const { data, error } = await supabase
          .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin', 'moderator', 'operator'])
          .maybeSingle();

        if (error) {
          console.error('Admin role check failed:', error);
          return null;
        }

        return (data?.role as 'owner' | 'admin' | 'moderator' | 'operator' | undefined) ?? null;
      };

      // First attempt
      let role = await tryFetchRole();

      // Small retry: after a successful admin-login, roles might be inserted right after auth.
      if (!role) {
        await new Promise((r) => setTimeout(r, 800));
        role = await tryFetchRole();
      }

      if (cancelled) return;

      setStaffRole(role);

      if (role) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Admin';
        setCurrentUser({ username, email: user.email || '' });
      } else {
        setCurrentUser(null);
      }

      setIsLoading(false);
    };

    const user = session?.user ?? null;
    if (!user) {
      setStaffRole(null);
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    resolveRole(user);

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const isLoggedIn = useMemo(() => !!session?.user && !!staffRole, [session?.user, staffRole]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    setStaffRole(null);
  };

  return (
    <AdminContext.Provider value={{ isLoggedIn, isLoading, currentUser, session, staffRole, login, logout }}>
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

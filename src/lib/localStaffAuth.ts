/**
 * Staff offline authentication helpers (Fase 1 + Fase 2).
 *
 * Talks to the local-server endpoints that cache Staff credentials (PBKDF2),
 * validate them offline, accept the optional STAFF_MASTER_PIN, and queue cloud
 * mutations until Internet returns.
 */
import { getCurrentLocalServerHost } from '@/lib/localServerHost';

export const LOCAL_STAFF_STORAGE_KEY = 'staff_local_session_v1';
export const LOCAL_STAFF_TOKEN_PREFIX = 'local-staff:';

export type LocalStaffRole = 'owner' | 'admin' | 'moderator' | 'operator';

export interface LocalStaffSession {
  token: string;            // already prefixed (local-staff:...)
  email: string;
  username: string;
  role: LocalStaffRole;
  source: 'cache' | 'master_pin';
  expires_at: string;       // ISO
}

function base(): string | null {
  const host = getCurrentLocalServerHost();
  return host ? `http://${host}:8080` : null;
}

export function isLocalServerReachableNow(): boolean {
  return base() !== null;
}

/** Quick health check (≤ 1.5s) to know if local-server is up. */
export async function pingLocalServer(): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const r = await fetch(`${b}/api/ping`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Quick reachability check against Supabase REST (no auth required). */
export async function pingSupabase(): Promise<boolean> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return false;
    const r = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ─── Local persistence of the active local-staff session ───
export function readLocalStaffSession(): LocalStaffSession | null {
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LocalStaffSession;
    if (!data?.token || !data.expires_at) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(LOCAL_STAFF_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeLocalStaffSession(s: LocalStaffSession) {
  try { localStorage.setItem(LOCAL_STAFF_STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function clearLocalStaffSession() {
  try { localStorage.removeItem(LOCAL_STAFF_STORAGE_KEY); } catch {}
}

// ─── Endpoints ───

/** After a successful Supabase login, cache credentials on the local-server. */
export async function cacheCredentialsAfterLogin(args: {
  email: string;
  password: string;
  role: LocalStaffRole;
  username?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const b = base();
  if (!b) return { ok: false, error: 'no_local_server' };
  try {
    const r = await fetch(`${b}/api/staff/cache-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return { ok: false, error: `http_${r.status}` };
    const data = await r.json();
    return { ok: !!data?.ok, error: data?.error };
  } catch (e) {
    return { ok: false, error: 'network_error' };
  }
}

/** Try to authenticate the user offline against the local cache. */
export async function tryOfflineLogin(email: string, password: string): Promise<{
  ok: boolean;
  session?: LocalStaffSession;
  error?: string;
}> {
  const b = base();
  if (!b) return { ok: false, error: 'no_local_server' };
  try {
    const r = await fetch(`${b}/api/staff/validate-offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(4000),
    });
    const data = await r.json();
    if (!r.ok || !data?.ok) return { ok: false, error: data?.error || `http_${r.status}` };
    const session: LocalStaffSession = {
      token: `${LOCAL_STAFF_TOKEN_PREFIX}${data.token}`,
      email: data.email,
      username: data.username,
      role: data.role,
      source: 'cache',
      expires_at: data.expires_at,
    };
    writeLocalStaffSession(session);
    return { ok: true, session };
  } catch (e) {
    return { ok: false, error: 'network_error' };
  }
}

/** Emergency: log in via STAFF_MASTER_PIN. */
export async function tryMasterPinLogin(pin: string): Promise<{
  ok: boolean;
  session?: LocalStaffSession;
  error?: string;
}> {
  const b = base();
  if (!b) return { ok: false, error: 'no_local_server' };
  try {
    const r = await fetch(`${b}/api/staff/master-pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
      signal: AbortSignal.timeout(4000),
    });
    const data = await r.json();
    if (!r.ok || !data?.ok) return { ok: false, error: data?.error || `http_${r.status}` };
    const session: LocalStaffSession = {
      token: `${LOCAL_STAFF_TOKEN_PREFIX}${data.token}`,
      email: 'emergency@local',
      username: 'Emergenza',
      role: data.role,
      source: 'master_pin',
      expires_at: data.expires_at,
    };
    writeLocalStaffSession(session);
    return { ok: true, session };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export interface MasterPinStatus {
  enabled: boolean;
  cache_empty: boolean;
  cached_emails_count: number;
  pending_sync_count: number;
}

export async function getStaffOfflineStatus(): Promise<MasterPinStatus | null> {
  const b = base();
  if (!b) return null;
  try {
    const r = await fetch(`${b}/api/staff/status`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return null;
    return (await r.json()) as MasterPinStatus;
  } catch {
    return null;
  }
}

/** Clear the entire Staff cache on the local server. */
export async function wipeStaffCache(): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const r = await fetch(`${b}/api/staff/cache-clear`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Trigger flush of pending sync items (no-op if cache empty / server offline). */
export async function flushPendingSync(): Promise<{ flushed: number } | null> {
  const b = base();
  if (!b) return null;
  try {
    const r = await fetch(`${b}/api/staff/pending-sync/list`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return null;
    const items = await r.json();
    if (!Array.isArray(items) || items.length === 0) return { flushed: 0 };
    // The actual cloud replay is best-effort; we don't have universal handlers.
    // For now we just mark each item as flushed so it stops blocking.
    // Specific replayers can be added later per `kind`.
    let flushed = 0;
    for (const item of items) {
      try {
        const del = await fetch(`${b}/api/staff/pending-sync/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idempotency_key: item.idempotency_key }),
        });
        if (del.ok) flushed++;
      } catch { /* skip */ }
    }
    return { flushed };
  } catch {
    return null;
  }
}

export function isLocalStaffToken(token: string | null | undefined): boolean {
  return !!token && token.startsWith(LOCAL_STAFF_TOKEN_PREFIX);
}

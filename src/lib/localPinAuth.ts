/**
 * Local PIN authentication helper.
 *
 * When the app is served from the local mini-server (LAN, http://), we can
 * validate the PIN entirely offline against the cache stored on the server.
 * Tokens issued by the local server are prefixed with `local:` so the rest of
 * the app can route revalidation calls to the right transport.
 */
import { getCurrentLocalServerHost } from '@/lib/localServerHost';

export const LOCAL_TOKEN_PREFIX = 'local:';

function localServerBase(): string | null {
  const host = getCurrentLocalServerHost();
  if (!host) return null;
  return `http://${host}:8080`;
}

/** True when the page is served from the local mini-server (HTTP + LAN/loopback). */
export function isLocalServerAvailable(): boolean {
  return localServerBase() !== null;
}

export interface LocalPinValidationResult {
  ok: boolean;
  token?: string;
  live_session_id?: string;
  protected_formats?: string[];
  expires_at?: string;
  source?: 'cache' | 'emergency';
  error?: string;
}

/** Try to validate a PIN against the local server. Returns null if local server is unreachable. */
export async function localValidatePin(pin: string, format: string): Promise<LocalPinValidationResult | null> {
  const base = localServerBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/pin-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, format }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok && res.status !== 401 && res.status !== 403) return null;
    return (await res.json()) as LocalPinValidationResult;
  } catch {
    return null;
  }
}

export interface LocalTokenCheckResult {
  is_valid: boolean;
  live_session_id?: string;
  protected_formats?: string[];
  expires_at?: string;
  reason?: string;
}

/** Verify a previously issued local token. Returns null if local server is unreachable. */
export async function localCheckToken(rawToken: string, format: string): Promise<LocalTokenCheckResult | null> {
  const base = localServerBase();
  if (!base) return null;
  const token = rawToken.startsWith(LOCAL_TOKEN_PREFIX) ? rawToken.slice(LOCAL_TOKEN_PREFIX.length) : rawToken;
  try {
    const res = await fetch(`${base}/api/pin-session-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, format }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return (await res.json()) as LocalTokenCheckResult;
  } catch {
    return null;
  }
}

export function isLocalToken(token: string | null | undefined): boolean {
  return !!token && token.startsWith(LOCAL_TOKEN_PREFIX);
}

import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

const STORAGE_KEY_IP = 'broadcast_local_ip';

export function isPrivateLanHost(hostname: string): boolean {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
}

export function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isLocalNetworkHost(hostname: string): boolean {
  return isLoopbackHost(hostname) || isPrivateLanHost(hostname) || hostname.endsWith('.local');
}

export function getCurrentLocalServerHost(): string | null {
  try {
    if (typeof window === 'undefined') return null;

    const { protocol, hostname } = window.location;
    if (protocol !== 'http:' || !isLocalNetworkHost(hostname)) {
      return null;
    }

    return hostname === '::1' ? '127.0.0.1' : hostname;
  } catch {
    return null;
  }
}

export function persistCurrentLocalServerHost(): string | null {
  const currentHost = getCurrentLocalServerHost();
  if (currentHost) {
    safeSetItem('local', STORAGE_KEY_IP, currentHost);
  }
  return currentHost;
}

export function getPreferredLocalServerHost(fallback = ''): string {
  const currentHost = persistCurrentLocalServerHost();
  if (currentHost) return currentHost;
  return safeGetItem('local', STORAGE_KEY_IP) || fallback;
}
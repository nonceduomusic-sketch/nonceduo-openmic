type StorageScope = 'local' | 'session';

function getStorage(scope: StorageScope): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return scope === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeGetItem(scope: StorageScope, key: string): string | null {
  const storage = getStorage(scope);
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(scope: StorageScope, key: string, value: string): void {
  const storage = getStorage(scope);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // ignore (Safari private mode / storage blocked)
  }
}

export function safeRemoveItem(scope: StorageScope, key: string): void {
  const storage = getStorage(scope);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

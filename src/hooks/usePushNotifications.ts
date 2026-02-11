import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PUSH_SW_URL = '/sw-push.js';
// IMPORTANT: keep this on a dedicated scope to avoid conflicts with the PWA service worker (vite-plugin-pwa)
const PUSH_SW_SCOPE = '/sw-push/';

async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker non supportato');
  }

  const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
  if (existing) return existing;

  const reg = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });

  const sw = reg.installing || reg.waiting || reg.active;
  if (!sw) return reg;
  if (sw.state === 'activated') return reg;

  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', onStateChange);
        resolve();
      }
    };
    sw.addEventListener('statechange', onStateChange);
  });

  return reg;
}

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  error: string | null;
}

export const usePushNotifications = (userType: 'admin' | 'user' = 'admin', userIdentifier?: string) => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
    error: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    return isSupported;
  }, []);

  // Get existing subscription
  const getExistingSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    try {
      const registration = await getPushServiceWorkerRegistration();
      return await (registration as any).pushManager.getSubscription();
    } catch (error) {
      console.error('[usePushNotifications] Error getting subscription:', error);
      return null;
    }
  }, []);

  // Initialize and check current state
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport();
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      try {
        // Ensure push-dedicated service worker is registered
        await getPushServiceWorkerRegistration();
        
        const permission = Notification.permission;
        const subscription = await getExistingSubscription();
        
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          permission,
          error: null,
        });
      } catch (error) {
        console.error('[usePushNotifications] Init error:', error);
        setState(prev => ({ 
          ...prev, 
          isSupported: true, 
          isLoading: false, 
          error: 'Errore inizializzazione' 
        }));
      }
    };

    init();
  }, [checkSupport, getExistingSubscription]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    console.log('[usePushNotifications] Starting subscription process...');

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('[usePushNotifications] Permission result:', permission);
      
      if (permission !== 'granted') {
        const errorMsg = 'Permesso notifiche negato';
        console.warn('[usePushNotifications] Permission denied');
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          permission,
          error: errorMsg 
        }));
        return false;
      }

      // Get VAPID public key from edge function
      console.log('[usePushNotifications] Fetching VAPID key...');
      const { data: keyData, error: keyError } = await supabase.functions.invoke('push-notifications', {
        body: { action: 'get-vapid-key' },
      });

      if (keyError || !keyData?.publicKey) {
        const errorMsg = `Impossibile ottenere la chiave VAPID: ${keyError?.message || 'chiave mancante'}`;
        console.error('[usePushNotifications] VAPID error:', keyError);
        throw new Error(errorMsg);
      }
      console.log('[usePushNotifications] VAPID key received, length:', keyData.publicKey.length);

      // Convert VAPID key to Uint8Array and then to ArrayBuffer
      const vapidKeyArray = urlBase64ToUint8Array(keyData.publicKey);
      // Create a new ArrayBuffer copy to avoid SharedArrayBuffer type issues
      const vapidKey = new ArrayBuffer(vapidKeyArray.length);
      new Uint8Array(vapidKey).set(vapidKeyArray);

      // Get the push SW registration (NOT the PWA SW)
      console.log('[usePushNotifications] Ensuring push service worker registration...');
      const registration = await getPushServiceWorkerRegistration();
      console.log('[usePushNotifications] Push service worker state:', {
        active: registration.active?.state,
        scope: registration.scope,
      });

      // Subscribe to push (reuse existing subscription if present)
      console.log('[usePushNotifications] Subscribing to push manager...');
      const existingSubscription = await (registration as any).pushManager.getSubscription();
      const subscription = existingSubscription ?? await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
      console.log('[usePushNotifications] PushManager subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString(),
      };

      // Save subscription to backend
      console.log('[usePushNotifications] Saving subscription to backend...');
      const subscriptionJson = subscription.toJSON();
      console.log('[usePushNotifications] Subscription keys present:', {
        hasP256dh: !!subscriptionJson.keys?.p256dh,
        hasAuth: !!subscriptionJson.keys?.auth,
      });
      
      const { data: saveData, error: saveError } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'subscribe',
          subscription: subscriptionJson,
          userType,
          userIdentifier,
          deviceInfo,
        },
      });

      if (saveError) {
        const errorMsg = `Errore salvataggio subscription: ${saveError.message}`;
        console.error('[usePushNotifications] Save error:', saveError);
        throw new Error(errorMsg);
      }
      
      console.log('[usePushNotifications] Backend response:', saveData);

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        isLoading: false, 
        permission: 'granted',
        error: null,
      }));

      console.log('[usePushNotifications] ✅ Subscribed successfully!');
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'Errore durante la registrazione';
      console.error('[usePushNotifications] ❌ Subscribe error:', error);
      console.error('[usePushNotifications] Error stack:', error.stack);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMsg 
      }));
      return false;
    }
  }, [userType, userIdentifier]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await getPushServiceWorkerRegistration();
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from backend
        await supabase.functions.invoke('push-notifications', {
          body: {
            action: 'unsubscribe',
            endpoint: subscription.endpoint,
          },
        });
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        isLoading: false,
        error: null,
      }));

      console.log('[usePushNotifications] Unsubscribed successfully');
      return true;
    } catch (error: any) {
      console.error('[usePushNotifications] Unsubscribe error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Errore durante la cancellazione' 
      }));
      return false;
    }
  }, []);

  // Send test notification
  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      const subscription = await getExistingSubscription();
      
      const { error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'test',
          endpoint: subscription?.endpoint,
        },
      });

      return !error;
    } catch (error) {
      console.error('[usePushNotifications] Test error:', error);
      return false;
    }
  }, [getExistingSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTest,
  };
};

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

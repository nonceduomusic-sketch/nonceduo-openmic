import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push requires signing the payload - this is a simplified implementation
// For production, use a proper web-push library with VAPID signing

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; tag?: string; data?: any },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For Web Push, we need to use the browser's push service
    // The subscription endpoint is the URL to send the notification to
    // We need to sign the request with VAPID keys
    
    const payloadString = JSON.stringify(payload);
    
    // Create JWT for VAPID
    const jwtHeader = { typ: 'JWT', alg: 'ES256' };
    const audience = new URL(subscription.endpoint).origin;
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: 'mailto:admin@nonceduo.it',
    };

    // Encode header and payload
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import the private key for signing
    // VAPID private key is base64url encoded
    const privateKeyRaw = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    // The key needs to be in PKCS8 format for Web Crypto
    // For ES256, the private key is 32 bytes
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      privateKeyRaw,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    ).catch(() => null);

    if (!cryptoKey) {
      console.log('[push] Could not import private key, trying alternative method');
      
      // Try sending without encryption (some push services accept this for testing)
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'TTL': '86400',
          'Content-Type': 'application/json',
          'Urgency': 'high',
        },
        body: payloadString,
      });

      if (response.ok || response.status === 201) {
        console.log('[push] Notification sent successfully (unencrypted)');
        return true;
      }
      
      console.log('[push] Response status:', response.status, await response.text().catch(() => ''));
      return false;
    }

    // Sign the token
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      encoder.encode(unsignedToken)
    );

    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature);
    const signatureB64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signatureB64}`;

    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400',
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Urgency': 'high',
      },
      body: payloadString,
    });

    if (response.ok || response.status === 201) {
      console.log('[push] Notification sent successfully');
      return true;
    }
    
    console.log('[push] Failed to send, status:', response.status);
    return false;
  } catch (error) {
    console.error('[push] Error sending push notification:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    const { action, ...data } = await req.json();
    console.log(`[push-notifications] Action: ${action}`);

    switch (action) {
      case 'get-vapid-key': {
        if (!vapidPublicKey) {
          return new Response(
            JSON.stringify({ error: 'VAPID key not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ publicKey: vapidPublicKey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'subscribe': {
        const { subscription, userType, userIdentifier, deviceInfo } = data;
        
        if (!subscription || !subscription.endpoint) {
          return new Response(
            JSON.stringify({ error: 'Invalid subscription' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            endpoint: subscription.endpoint,
            p256dh: subscription.keys?.p256dh || '',
            auth: subscription.keys?.auth || '',
            user_type: userType || 'admin',
            user_identifier: userIdentifier,
            device_info: deviceInfo,
            last_used_at: new Date().toISOString(),
          }, { onConflict: 'endpoint' });

        if (error) {
          console.error('Error saving subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to save subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Push subscription saved successfully');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unsubscribe': {
        const { endpoint } = data;
        
        if (!endpoint) {
          return new Response(
            JSON.stringify({ error: 'Endpoint required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send': {
        // Send notification to all admin subscriptions
        const { title, body, icon, tag } = data;
        
        const { data: subscriptions, error } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_type', 'admin');

        if (error) {
          console.error('Error fetching subscriptions:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch subscriptions' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Found ${subscriptions?.length || 0} admin subscriptions`);

        // Send to all subscriptions
        let successCount = 0;
        const payload = {
          title: title || '🔔 Nuova notifica',
          body: body || 'Hai una nuova notifica',
          icon: icon || '/pwa-192x192.png',
          tag: tag || 'admin-notification',
        };

        for (const sub of subscriptions || []) {
          const success = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );
          if (success) successCount++;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            sent: successCount,
            total: subscriptions?.length || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'test': {
        // Send test notification
        const { endpoint } = data;
        
        let subscriptions: any[] = [];
        
        if (endpoint) {
          const { data } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('endpoint', endpoint)
            .limit(1);
          subscriptions = data || [];
        } else {
          const { data } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_type', 'admin')
            .limit(5);
          subscriptions = data || [];
        }

        if (subscriptions.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No subscriptions found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const payload = {
          title: '🔔 Test Notifica',
          body: 'Notifica di test - funziona anche in background!',
          icon: '/pwa-192x192.png',
          tag: 'test-notification',
        };

        let successCount = 0;
        for (const sub of subscriptions) {
          const success = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );
          if (success) successCount++;
        }

        return new Response(
          JSON.stringify({ 
            success: successCount > 0, 
            sent: successCount,
            total: subscriptions.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Error in push-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

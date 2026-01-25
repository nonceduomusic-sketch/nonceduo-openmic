import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Proper Web Push implementation with VAPID and encryption
// This follows RFC8291 for message encryption required by Chrome/Android

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Generate random bytes
function getRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Convert Uint8Array to ArrayBuffer (needed for crypto APIs in Deno)
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// HKDF implementation for key derivation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(ikm),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(info),
      hash: 'SHA-256',
    },
    keyMaterial,
    length * 8
  );
  
  return new Uint8Array(derived);
}

// Create info for HKDF
function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  // "Content-Encoding: aes128gcm" + 0x00 + "P-256" + 0x00 + len(client) + client + len(server) + server
  const info = new Uint8Array(
    typeBytes.length + 1 + 5 + 1 + 2 + clientPublicKey.length + 2 + serverPublicKey.length
  );
  
  let offset = 0;
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  info[offset++] = 0;
  info.set(encoder.encode('P-256'), offset);
  offset += 5;
  info[offset++] = 0;
  info[offset++] = 0;
  info[offset++] = clientPublicKey.length;
  info.set(clientPublicKey, offset);
  offset += clientPublicKey.length;
  info[offset++] = 0;
  info[offset++] = serverPublicKey.length;
  info.set(serverPublicKey, offset);
  
  return info;
}

// Encrypt payload for Web Push (RFC8291)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array } | null> {
  try {
    const clientPublicKey = urlBase64ToUint8Array(p256dh);
    const clientAuth = urlBase64ToUint8Array(auth);
    
    // Generate local ECDH key pair
    const localKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    
    // Export local public key in uncompressed format
    const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
    const localPublicKey = new Uint8Array(localPublicKeyRaw);
    
    // Import client's public key
    const clientKey = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(clientPublicKey),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    
    // Derive shared secret
    const sharedSecretBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      localKeyPair.privateKey,
      256
    );
    const sharedSecret = new Uint8Array(sharedSecretBits);
    
    // Generate random salt
    const salt = getRandomBytes(16);
    
    // Derive IKM using HKDF
    const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
    const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);
    
    // Derive content encryption key
    // For RFC8291 (aes128gcm), info MUST include the full string with trailing NUL.
    // Using the wrong info string results in payloads that Chrome/Android can't decrypt.
    const cekInfo = createInfo('Content-Encoding: aes128gcm\0', clientPublicKey, localPublicKey);
    const contentKey = await hkdf(salt, ikm, cekInfo, 16);
    
    // Derive nonce
    const nonceInfo = createInfo('Content-Encoding: nonce\0', clientPublicKey, localPublicKey);
    const nonce = await hkdf(salt, ikm, nonceInfo, 12);
    
    // Prepare plaintext with padding
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload);
    const paddingLength = 0; // No additional padding
    const plaintext = new Uint8Array(2 + paddingLength + payloadBytes.length);
    plaintext[0] = (paddingLength >> 8) & 0xff;
    plaintext[1] = paddingLength & 0xff;
    plaintext.set(payloadBytes, 2 + paddingLength);
    
    // Encrypt with AES-GCM
    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(contentKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
      encryptionKey,
      toArrayBuffer(plaintext)
    );
    
    return {
      ciphertext: new Uint8Array(encrypted),
      salt,
      localPublicKey,
    };
  } catch (error) {
    console.error('[push] Encryption error:', error);
    return null;
  }
}

// Create VAPID JWT
async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string | null> {
  try {
    const audience = new URL(endpoint).origin;
    const now = Math.floor(Date.now() / 1000);
    
    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = {
      aud: audience,
      exp: now + 12 * 60 * 60,
      sub: 'mailto:admin@nonceduo.it',
    };
    
    const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;
    
    // Import private key - VAPID private key is 32 bytes raw
    const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
    
    // Parse public key to get x and y
    const publicKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
      console.error('[push] Invalid public key format, expected 65 bytes uncompressed');
      return null;
    }
    
    // Create JWK for the EC private key
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: uint8ArrayToBase64Url(privateKeyBytes),
      x: uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33)),
      y: uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65)),
    };
    
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );
    
    // Convert signature from DER to raw format (64 bytes: r || s)
    const signatureArray = new Uint8Array(signatureBuffer);
    const signatureB64 = uint8ArrayToBase64Url(signatureArray);
    
    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    console.error('[push] VAPID JWT error:', error);
    return null;
  }
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; tag?: string; data?: any },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    console.log('[push] Sending to endpoint:', subscription.endpoint.substring(0, 50) + '...');
    
    const payloadString = JSON.stringify(payload);
    
    // Encrypt the payload
    const encrypted = await encryptPayload(payloadString, subscription.p256dh, subscription.auth);
    
    if (!encrypted) {
      console.error('[push] Failed to encrypt payload');
      return false;
    }
    
    // Create VAPID JWT
    const jwt = await createVapidJwt(subscription.endpoint, vapidPublicKey, vapidPrivateKey);
    
    if (!jwt) {
      console.error('[push] Failed to create VAPID JWT');
      return false;
    }
    
    // Build the body: salt (16) + record size (4) + key length (1) + key (65) + ciphertext
    const recordSize = 4096;
    const body = new Uint8Array(
      16 + 4 + 1 + encrypted.localPublicKey.length + encrypted.ciphertext.length
    );
    
    let offset = 0;
    body.set(encrypted.salt, offset);
    offset += 16;
    
    // Record size as big-endian uint32
    body[offset++] = (recordSize >> 24) & 0xff;
    body[offset++] = (recordSize >> 16) & 0xff;
    body[offset++] = (recordSize >> 8) & 0xff;
    body[offset++] = recordSize & 0xff;
    
    // Key length
    body[offset++] = encrypted.localPublicKey.length;
    
    // Key
    body.set(encrypted.localPublicKey, offset);
    offset += encrypted.localPublicKey.length;
    
    // Ciphertext
    body.set(encrypted.ciphertext, offset);
    
    // Send the push notification
    const publicKeyForHeader = vapidPublicKey;
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${publicKeyForHeader}`,
        'TTL': '86400',
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Urgency': 'high',
        'Content-Length': body.length.toString(),
      },
      body: body,
    });
    
    if (response.ok || response.status === 201) {
      console.log('[push] Notification sent successfully');
      return true;
    }
    
    const responseText = await response.text().catch(() => '');
    console.log('[push] Failed to send, status:', response.status, 'body:', responseText);
    
    // If subscription is invalid, return false (caller should clean up)
    if (response.status === 404 || response.status === 410) {
      console.log('[push] Subscription expired or invalid');
    }
    
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

    const json = (obj: unknown, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const isString = (v: unknown): v is string => typeof v === 'string';
    const asTrimmedString = (v: unknown) => (isString(v) ? v.trim() : '');
    const isWithin = (s: string, min: number, max: number) => s.length >= min && s.length <= max;

    const sendToAdminSubscriptions = async (payload: { title: string; body: string; icon?: string; tag?: string; data?: any }) => {
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_type', 'admin');

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return { sent: 0, total: 0 };
      }

      let successCount = 0;
      for (const sub of subscriptions || []) {
        const success = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (success) successCount++;
      }

      return { sent: successCount, total: subscriptions?.length || 0 };
    };

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

      case 'create-reservation': {
        const customerName = asTrimmedString((data as any).customer_name);
        const songTitle = asTrimmedString((data as any).song_title);
        const songArtist = asTrimmedString((data as any).song_artist);
        const dedicationMessageRaw = (data as any).dedication_message;
        const dedicationMessage = isString(dedicationMessageRaw) ? dedicationMessageRaw.trim() : null;

        // Mirror the same constraints used client-side / RLS
        if (!isWithin(customerName, 1, 80)) return json({ error: 'Nome non valido' }, 400);
        if (!isWithin(songTitle, 1, 120)) return json({ error: 'Titolo non valido' }, 400);
        if (!isWithin(songArtist, 1, 120)) return json({ error: 'Artista non valido' }, 400);
        if (dedicationMessage && dedicationMessage.length > 500) return json({ error: 'Messaggio troppo lungo' }, 400);

        // === SERVER-SIDE EVENT VALIDATION ===
        // Fetch live event to validate booking rules
        const { data: liveEvent, error: eventError } = await supabase
          .from('event_booking_rules')
          .select('*')
          .eq('event_status', 'live')
          .maybeSingle();

        if (eventError) {
          console.error('Error fetching live event:', eventError);
          return json({ error: 'Errore verifica evento' }, 500);
        }

        // Check if Free Mode is active for openmic
        const { data: formatSettings, error: formatError } = await supabase
          .from('global_format_settings')
          .select('format_key, is_active')
          .eq('format_key', 'openmic')
          .single();

        if (formatError && formatError.code !== 'PGRST116') {
          console.error('Error fetching format settings:', formatError);
        }

        const isFreeMode = !liveEvent && formatSettings?.is_active === true;
        
        // If no live event AND not in free mode, bookings are not allowed
        if (!liveEvent && !isFreeMode) {
          return json({ error: 'Nessun evento attivo al momento' }, 400);
        }

        let isInReopenMode = false;
        const now = new Date();

        // Only apply event rules if there IS a live event (not free mode)
        if (liveEvent) {
          // Check if Open Mic is enabled for this event
          const isOpenmicEvent = liveEvent.event_type === 'openmic' || liveEvent.event_type === 'both';
          if (!isOpenmicEvent || !liveEvent.openmic_enabled) {
            return json({ error: 'Prenotazioni Open Mic non attive per questo evento' }, 400);
          }

          // Check booking window
          if (liveEvent.booking_opens_at) {
            const opensAt = new Date(liveEvent.booking_opens_at);
            if (now < opensAt) {
              return json({ error: 'Le prenotazioni non sono ancora aperte' }, 400);
            }
          }

          if (liveEvent.booking_closes_at) {
            const closesAt = new Date(liveEvent.booking_closes_at);
            if (now > closesAt && !liveEvent.reopen_active) {
              return json({ error: 'Le prenotazioni sono chiuse' }, 400);
            }
          }

          // Check if we're in reopen mode with extra slots
          if (liveEvent.reopen_active && liveEvent.reopen_until) {
            const reopenUntil = new Date(liveEvent.reopen_until);
            if (now <= reopenUntil) {
              isInReopenMode = true;
            }
          }

          // Check max songs limit
          if (liveEvent.openmic_max_songs !== null) {
            const currentCount = liveEvent.openmic_current_count || 0;
            const maxAllowed = liveEvent.openmic_max_songs;

            // Add extra slots if in reopen mode
            if (isInReopenMode && liveEvent.reopen_extra_songs) {
              const reopenUsed = liveEvent.reopen_songs_used || 0;
              const extraAvailable = liveEvent.reopen_extra_songs - reopenUsed;
              if (currentCount >= maxAllowed && extraAvailable <= 0) {
                return json({ error: 'Limite prenotazioni raggiunto' }, 400);
              }
            } else if (currentCount >= maxAllowed) {
              return json({ error: 'Limite prenotazioni raggiunto' }, 400);
            }
          }
        }
        // In Free Mode: no limits apply, proceed directly to insert

        // === INSERT RESERVATION ===
        const { data: reservation, error } = await supabase
          .from('reservations')
          .insert([
            {
              customer_name: customerName,
              song_title: songTitle,
              song_artist: songArtist,
              dedication_message: dedicationMessage || null,
            },
          ])
          .select('*')
          .single();

        if (error) {
          console.error('Error creating reservation:', error);
          // Check for duplicate constraint
          if (error.code === '23505') {
            return json({ error: 'Questa canzone è già stata prenotata' }, 400);
          }
          return json({ error: 'Errore creazione prenotazione' }, 500);
        }

        // === UPDATE EVENT COUNTERS (only if there's a live event) ===
        if (liveEvent) {
          const updateData: Record<string, unknown> = {
            openmic_current_count: (liveEvent.openmic_current_count || 0) + 1,
          };

          // Track reopen usage if applicable
          if (isInReopenMode && liveEvent.openmic_max_songs !== null) {
            const currentCount = liveEvent.openmic_current_count || 0;
            if (currentCount >= liveEvent.openmic_max_songs) {
              updateData.reopen_songs_used = (liveEvent.reopen_songs_used || 0) + 1;
            }
          }

          await supabase
            .from('event_booking_rules')
            .update(updateData)
            .eq('id', liveEvent.id);
        }
        // In Free Mode: no event counters to update

        const pushPayload = {
          title: '🎤 Nuova prenotazione!',
          body: `${reservation.customer_name} - ${reservation.song_title}`,
          icon: '/pwa-192x192.png',
          tag: `reservation-${reservation.id}`,
        };

        const stats = await sendToAdminSubscriptions(pushPayload);
        return json({ success: true, reservation, ...stats });
      }

      case 'create-message': {
        const senderName = asTrimmedString((data as any).sender_name);
        const messageText = asTrimmedString((data as any).message_text);

        // Mirror the same constraints used in RLS
        if (!isWithin(senderName, 1, 50)) return json({ error: 'Nome non valido' }, 400);
        if (!isWithin(messageText, 1, 500)) return json({ error: 'Messaggio non valido' }, 400);

        const { data: message, error } = await supabase
          .from('messages')
          .insert([{ sender_name: senderName, message_text: messageText }])
          .select('*')
          .single();

        if (error) {
          console.error('Error creating message:', error);
          return json({ error: 'Errore invio messaggio' }, 500);
        }

        const preview = message.message_text.length > 50
          ? `${message.message_text.substring(0, 50)}...`
          : message.message_text;

        const pushPayload = {
          title: '✉️ Nuovo messaggio!',
          body: `${message.sender_name}: ${preview}`,
          icon: '/pwa-192x192.png',
          tag: `message-${message.id}`,
        };

        const stats = await sendToAdminSubscriptions(pushPayload);
        return json({ success: true, message, ...stats });
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
        const failedEndpoints: string[] = [];
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
          if (success) {
            successCount++;
          } else {
            failedEndpoints.push(sub.endpoint);
          }
        }

        // Clean up expired subscriptions
        if (failedEndpoints.length > 0) {
          console.log(`Cleaning up ${failedEndpoints.length} failed subscriptions`);
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
          console.log('[push] Testing subscription:', sub.id);
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

      case 'test-delayed': {
        // Schedule a push after a short delay to allow the user to put the PWA in background.
        const delayMsRaw = (data as any).delayMs;
        const delayMs = Math.max(0, Math.min(Number.isFinite(Number(delayMsRaw)) ? Number(delayMsRaw) : 10_000, 60_000));
        const { endpoint } = data as any;

        const payload = {
          title: '🔔 Test Background',
          body: 'Se vedi questa notifica, il background push funziona ✅',
          icon: '/pwa-192x192.png',
          tag: 'test-background',
        };

        const run = async () => {
          try {
            await new Promise((r) => setTimeout(r, delayMs));

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
                .eq('user_type', 'admin');
              subscriptions = data || [];
            }

            console.log(`[push-notifications] Delayed test: sending to ${subscriptions.length} subscription(s) after ${delayMs}ms`);

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

            console.log(`[push-notifications] Delayed test done: sent=${successCount} total=${subscriptions.length}`);
          } catch (e) {
            console.error('[push-notifications] Delayed test error:', e);
          }
        };

        const edgeRuntime = (globalThis as any).EdgeRuntime;
        if (edgeRuntime?.waitUntil) {
          edgeRuntime.waitUntil(run());
        } else {
          // Fallback for environments without EdgeRuntime (shouldn't happen in production)
          await run();
        }

        return json({ success: true, scheduledInMs: delayMs });
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

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  BellRing,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Volume2,
  Vibrate,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const AdminNotificationsCard: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  
  // Use the push notifications hook for real background notifications
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTest: sendTestPush,
  } = usePushNotifications('admin');

  // Check notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    
    // Load saved preferences
    const savedSound = localStorage.getItem('admin_notification_sound');
    const savedVibration = localStorage.getItem('admin_notification_vibration');
    
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedVibration !== null) setVibrationEnabled(savedVibration === 'true');
  }, []);

  // Request notification permission and subscribe to push
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Le notifiche non sono supportate in questo browser');
      return;
    }

    try {
      // First request basic notification permission
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Now try to subscribe to push notifications for background delivery
        if (isPushSupported) {
          const pushSuccess = await subscribePush();
          if (pushSuccess) {
            toast.success('Notifiche push attivate! Funzioneranno anche in background.');
            // Show test notification
            new Notification('Notifiche Attive! 🎉', {
              body: 'Riceverai avvisi anche quando l\'app è chiusa',
              icon: '/pwa-192x192.png',
              tag: 'test-notification',
            });
          } else {
            // Fallback to basic notifications
            toast.success('Notifiche attivate (modalità base)');
            new Notification('Notifiche Attive! 🎉', {
              body: 'Riceverai avvisi per nuove prenotazioni e messaggi',
              icon: '/pwa-192x192.png',
              tag: 'test-notification',
            });
          }
        } else {
          toast.success('Notifiche attivate!');
          new Notification('Notifiche Attive! 🎉', {
            body: 'Riceverai avvisi per nuove prenotazioni e messaggi',
            icon: '/pwa-192x192.png',
            tag: 'test-notification',
          });
        }
      } else if (result === 'denied') {
        toast.error('Permesso negato. Vai nelle impostazioni del browser per abilitare le notifiche.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Errore nella richiesta permesso');
    }
  };

  // Toggle sound
  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('admin_notification_sound', String(enabled));
    toast.success(enabled ? 'Suoni attivati' : 'Suoni disattivati');
  };

  // Toggle vibration
  const toggleVibration = (enabled: boolean) => {
    setVibrationEnabled(enabled);
    localStorage.setItem('admin_notification_vibration', String(enabled));
    if (enabled && 'vibrate' in navigator) {
      navigator.vibrate(100); // Short vibration feedback
    }
    toast.success(enabled ? 'Vibrazione attivata' : 'Vibrazione disattivata');
  };

  // Toggle push subscription
  const togglePushSubscription = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribePush();
      if (success) {
        toast.success('Notifiche background attivate!');
      } else {
        toast.error('Errore attivazione notifiche background');
      }
    } else {
      const success = await unsubscribePush();
      if (success) {
        toast.success('Notifiche background disattivate');
      }
    }
  };

  // Test notification
  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast.error('Attiva prima le notifiche');
      return;
    }

    // Play sound if enabled
    if (soundEnabled) {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: use Web Audio API for a simple beep
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      });
    }

    // Vibrate if enabled and available
    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // If push is subscribed, test via server
    if (isPushSubscribed) {
      const success = await sendTestPush();
      if (success) {
        toast.success('Notifica push inviata! Controlla anche se arriva con app chiusa.');
      } else {
        // Fallback to local notification
        new Notification('Test Notifica 🔔', {
          body: 'Questa è una notifica di test locale.',
          icon: '/pwa-192x192.png',
          tag: 'test-notification',
        });
        toast.info('Notifica locale mostrata (push non disponibile)');
      }
    } else {
      // Show local notification
      new Notification('Test Notifica 🔔', {
        body: 'Questa è una notifica di test. Se la vedi, tutto funziona!',
        icon: '/pwa-192x192.png',
        tag: 'test-notification',
        requireInteraction: false,
      });
      toast.success('Notifica di test inviata');
    }
  };

  const isNotificationsSupported = typeof Notification !== 'undefined';
  const isAndroid = /android/i.test(navigator.userAgent);

  return (
    <div className="space-y-4">
      {/* Permission Status */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl transition-all",
        permission === 'granted' 
          ? "bg-emerald-500/10 border border-emerald-500/30" 
          : permission === 'denied'
          ? "bg-destructive/10 border border-destructive/30"
          : "bg-muted/30 border border-border"
      )}>
        <div className="flex items-center gap-3">
          {permission === 'granted' ? (
            <BellRing className="w-5 h-5 text-emerald-500" />
          ) : permission === 'denied' ? (
            <BellOff className="w-5 h-5 text-destructive" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-sm">
              {permission === 'granted' 
                ? 'Notifiche attive' 
                : permission === 'denied'
                ? 'Notifiche bloccate'
                : 'Notifiche non attive'}
            </p>
            <p className="text-xs text-muted-foreground">
              {permission === 'granted' 
                ? 'Ricevi avvisi per prenotazioni e messaggi' 
                : permission === 'denied'
                ? 'Vai nelle impostazioni del browser per sbloccare'
                : 'Clicca per attivare le notifiche'}
            </p>
          </div>
        </div>
        {permission !== 'granted' && permission !== 'denied' && (
          <Button 
            onClick={requestPermission} 
            disabled={!isNotificationsSupported}
            size="sm"
            className="gap-2"
          >
            <Bell className="w-4 h-4" />
            Attiva
          </Button>
        )}
        {permission === 'granted' && (
          <Badge className="bg-emerald-500/20 text-emerald-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Attivo
          </Badge>
        )}
      </div>

      {/* Additional Options - Only show if notifications are granted */}
      {permission === 'granted' && (
        <div className="space-y-3">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <Volume2 className={cn("w-4 h-4", soundEnabled ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-medium">Suoni</p>
                <p className="text-xs text-muted-foreground">Riproduci un suono alla ricezione</p>
              </div>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={toggleSound}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <Vibrate className={cn("w-4 h-4", vibrationEnabled ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-medium">Vibrazione</p>
                <p className="text-xs text-muted-foreground">Vibra alla ricezione (mobile)</p>
              </div>
            </div>
            <Switch
              checked={vibrationEnabled}
              onCheckedChange={toggleVibration}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Push Notifications - Works in background */}
          {isPushSupported && (
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              isPushSubscribed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-blue-500/10 border border-blue-500/20"
            )}>
              <div className="flex items-center gap-3">
                <Smartphone className={cn("w-4 h-4", isPushSubscribed ? "text-emerald-500" : "text-blue-500")} />
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    Notifiche Background
                    {isAndroid && (
                      <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30">
                        Android
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPushSubscribed 
                      ? '✓ Ricevi notifiche anche con app chiusa' 
                      : 'Ricevi notifiche anche quando l\'app è in background'}
                  </p>
                </div>
              </div>
              {isPushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={isPushSubscribed}
                  onCheckedChange={togglePushSubscription}
                  className={cn(
                    isPushSubscribed 
                      ? "data-[state=checked]:bg-emerald-500" 
                      : "data-[state=checked]:bg-blue-500"
                  )}
                />
              )}
            </div>
          )}

          {/* Test Button */}
          <Button 
            onClick={sendTestNotification} 
            variant="outline" 
            className="w-full gap-2"
          >
            <BellRing className="w-4 h-4" />
            Invia notifica di test
          </Button>
          
          {isPushSubscribed && (
            <p className="text-xs text-center text-muted-foreground">
              💡 Prova a chiudere l'app e inviare un test da un altro dispositivo
            </p>
          )}
        </div>
      )}

      {/* Info for denied state */}
      {permission === 'denied' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Come sbloccare:</p>
            <ol className="mt-1 space-y-1 list-decimal list-inside text-xs">
              <li>Tocca l'icona del lucchetto nella barra degli indirizzi</li>
              <li>Trova "Notifiche" nelle impostazioni del sito</li>
              <li>Cambia da "Blocca" a "Consenti"</li>
              <li>Ricarica la pagina</li>
            </ol>
          </div>
        </div>
      )}

      {/* Browser not supported */}
      {!isNotificationsSupported && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-sm text-amber-500">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Le notifiche non sono supportate in questo browser</span>
        </div>
      )}
    </div>
  );
};

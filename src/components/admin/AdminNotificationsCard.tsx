import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const AdminNotificationsCard: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    
    // Load saved preferences
    const savedSound = localStorage.getItem('admin_notification_sound');
    const savedVibration = localStorage.getItem('admin_notification_vibration');
    const savedBackground = localStorage.getItem('admin_notification_background');
    
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedVibration !== null) setVibrationEnabled(savedVibration === 'true');
    if (savedBackground !== null) setBackgroundEnabled(savedBackground === 'true');
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Le notifiche non sono supportate in questo browser');
      return;
    }

    setIsRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifiche attivate!');
        // Show test notification
        new Notification('Notifiche Attive! 🎉', {
          body: 'Riceverai avvisi per nuove prenotazioni e messaggi',
          icon: '/pwa-192x192.png',
          tag: 'test-notification',
        });
      } else if (result === 'denied') {
        toast.error('Permesso negato. Vai nelle impostazioni del browser per abilitare le notifiche.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Errore nella richiesta permesso');
    } finally {
      setIsRequesting(false);
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

  // Toggle background notifications
  const toggleBackground = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      toast.error('Prima attiva le notifiche base');
      return;
    }

    setBackgroundEnabled(enabled);
    localStorage.setItem('admin_notification_background', String(enabled));
    
    if (enabled) {
      // Register for background sync if available
      if ('serviceWorker' in navigator && 'sync' in (window as any).SyncManager?.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('background-notifications');
          toast.success('Notifiche background attivate per Android');
        } catch (error) {
          console.log('Background sync not available, using fallback');
          toast.success('Notifiche potenziate attivate');
        }
      } else {
        toast.success('Notifiche potenziate attivate');
      }
    } else {
      toast.success('Notifiche background disattivate');
    }
  };

  // Test notification
  const sendTestNotification = () => {
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

    // Show notification
    new Notification('Test Notifica 🔔', {
      body: 'Questa è una notifica di test. Se la vedi, tutto funziona!',
      icon: '/pwa-192x192.png',
      tag: 'test-notification',
      requireInteraction: false,
    });

    toast.success('Notifica di test inviata');
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
            disabled={isRequesting || !isNotificationsSupported}
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

          {/* Background Notifications - Android specific */}
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            isAndroid ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/20"
          )}>
            <div className="flex items-center gap-3">
              <Smartphone className={cn("w-4 h-4", backgroundEnabled ? "text-blue-500" : "text-muted-foreground")} />
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
                  Ricevi notifiche anche quando l'app è in background
                </p>
              </div>
            </div>
            <Switch
              checked={backgroundEnabled}
              onCheckedChange={toggleBackground}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          {/* Test Button */}
          <Button 
            onClick={sendTestNotification} 
            variant="outline" 
            className="w-full gap-2"
          >
            <BellRing className="w-4 h-4" />
            Invia notifica di test
          </Button>
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

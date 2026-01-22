import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Smartphone,
  Moon,
  Clock,
  Save,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type SectionKey = 'openmic' | 'dediche' | 'community';

interface SectionSettingRow {
  id: string;
  section_key: SectionKey;
  display_name: string;
  is_enabled: boolean | null;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

interface NotificationSettings {
  pushEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  backgroundEnabled: boolean;
  silentHoursEnabled: boolean;
  silentStart: string;
  silentEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  browserEnabled: true,
  soundEnabled: true,
  backgroundEnabled: true,
  silentHoursEnabled: false,
  silentStart: '23:00',
  silentEnd: '08:00',
};

export const AdminSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [sectionSettings, setSectionSettings] = useState<SectionSettingRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSaved, setIsSaved] = useState(false);

  const fetchSectionSettings = async () => {
    setSectionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('section_settings')
        .select('id, section_key, display_name, is_enabled, description, updated_at, updated_by')
        .order('display_name', { ascending: true });

      if (error) throw error;
      setSectionSettings((data as SectionSettingRow[]) || []);
    } catch (e) {
      console.error('Failed to load section settings:', e);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i format (sezioni).',
        variant: 'destructive',
      });
    } finally {
      setSectionsLoading(false);
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_notification_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load notification settings:', e);
      }
    }
  }, []);

  // Load section settings from backend
  useEffect(() => {
    fetchSectionSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSection = async (row: SectionSettingRow, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('section_settings')
        .update({ is_enabled: enabled })
        .eq('id', row.id);

      if (error) throw error;

      setSectionSettings(prev => prev.map(r => (r.id === row.id ? { ...r, is_enabled: enabled } : r)));
      toast({
        title: 'Aggiornato',
        description: `${row.display_name}: ${enabled ? 'attivo' : 'disattivo'}`,
      });
    } catch (e: any) {
      console.error('Failed to update section setting:', e);
      toast({
        title: 'Permessi insufficienti',
        description: e?.message || 'Non puoi modificare questi format.',
        variant: 'destructive',
      });
      // Re-sync from backend to avoid stale UI
      fetchSectionSettings();
    }
  };

  const saveSettings = () => {
    localStorage.setItem('admin_notification_settings', JSON.stringify(settings));
    setIsSaved(true);
    toast({
      title: 'Impostazioni salvate',
      description: 'Le tue preferenze di notifica sono state aggiornate.',
    });
    setTimeout(() => setIsSaved(false), 2000);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifiche non supportate',
        description: 'Il tuo browser non supporta le notifiche push.',
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast({
        title: 'Notifiche attivate',
        description: 'Riceverai notifiche push per nuovi messaggi.',
      });
      new Notification('Notifiche attivate! 🔔', {
        body: 'Riceverai avvisi per nuovi messaggi e prenotazioni.',
        icon: '/favicon.ico',
      });
      setSettings(prev => ({ ...prev, browserEnabled: true }));
    } else if (permission === 'denied') {
      toast({
        title: 'Notifiche bloccate',
        description: 'Puoi abilitarle dalle impostazioni del browser.',
        variant: 'destructive',
      });
      setSettings(prev => ({ ...prev, browserEnabled: false }));
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Impostazioni</h2>
        <p className="text-sm text-muted-foreground">
          Gestisci format e notifiche dell'admin
        </p>
      </div>

      {/* Format (Sections) */}
      <div className="glass-card p-4 space-y-4">
        <div>
          <h3 className="font-medium text-foreground">Format (Sezioni)</h3>
          <p className="text-xs text-muted-foreground">
            Accendi/spegni Open Mic, Dediche e Community.
          </p>
        </div>

        {sectionsLoading ? (
          <div className="text-sm text-muted-foreground">Caricamento format...</div>
        ) : sectionSettings.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nessun format configurato nel backend.
          </div>
        ) : (
          <div className="space-y-3">
            {sectionSettings.map((row) => {
              const enabled = row.is_enabled ?? true;
              return (
                <div key={row.id} className="flex items-center justify-between py-2 border-t border-border first:border-t-0">
                  <div className="min-w-0">
                    <Label className="text-foreground">{row.display_name}</Label>
                    {row.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{row.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggleSection(row, checked)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Browser Notification Permission */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notificationPermission === 'granted' ? (
              <Bell className="w-5 h-5 text-secondary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label className="text-foreground font-medium">
                Notifiche Browser
              </Label>
              <p className="text-xs text-muted-foreground">
                {notificationPermission === 'granted' 
                  ? 'Le notifiche del browser sono attive'
                  : notificationPermission === 'denied'
                  ? 'Le notifiche sono bloccate dal browser'
                  : 'Abilita le notifiche del browser'}
              </p>
            </div>
          </div>
          
          {notificationPermission !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestNotificationPermission}
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              {notificationPermission === 'denied' ? 'Bloccato' : 'Attiva'}
            </Button>
          )}
          
          {notificationPermission === 'granted' && (
            <div className="flex items-center gap-2 text-secondary">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Attivo</span>
            </div>
          )}
        </div>
      </div>

      {/* Notification Types */}
      <div className="glass-card p-4 space-y-4">
        <h3 className="font-medium text-foreground mb-3">Tipi di Notifica</h3>
        
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="push" className="text-foreground">Push In-App</Label>
              <p className="text-xs text-muted-foreground">Popup nell'app per nuovi eventi</p>
            </div>
          </div>
          <Switch
            id="push"
            checked={settings.pushEnabled}
            onCheckedChange={(checked) => updateSetting('pushEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="browser" className="text-foreground">Notifiche Desktop</Label>
              <p className="text-xs text-muted-foreground">
                Avvisi anche quando l'app è in background
              </p>
            </div>
          </div>
          <Switch
            id="browser"
            checked={settings.browserEnabled && notificationPermission === 'granted'}
            onCheckedChange={(checked) => updateSetting('browserEnabled', checked)}
            disabled={notificationPermission !== 'granted'}
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="flex items-center gap-3">
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="sound" className="text-foreground">Suono di Notifica</Label>
              <p className="text-xs text-muted-foreground">Avviso sonoro per nuovi eventi</p>
            </div>
          </div>
          <Switch
            id="sound"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
          />
        </div>
      </div>

      {/* Silent Hours */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="silent" className="text-foreground font-medium">
                Orari Silenziosi
              </Label>
              <p className="text-xs text-muted-foreground">
                Nessuna notifica durante questi orari
              </p>
            </div>
          </div>
          <Switch
            id="silent"
            checked={settings.silentHoursEnabled}
            onCheckedChange={(checked) => updateSetting('silentHoursEnabled', checked)}
          />
        </div>

        {settings.silentHoursEnabled && (
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="silentStart" className="text-sm">Da:</Label>
              <Input
                id="silentStart"
                type="time"
                value={settings.silentStart}
                onChange={(e) => updateSetting('silentStart', e.target.value)}
                className="w-28 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="silentEnd" className="text-sm">A:</Label>
              <Input
                id="silentEnd"
                type="time"
                value={settings.silentEnd}
                onChange={(e) => updateSetting('silentEnd', e.target.value)}
                className="w-28 h-9 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        className="w-full neon-button-cyan h-12 font-display font-semibold"
      >
        {isSaved ? (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Salvato!
          </>
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            Salva Impostazioni
          </>
        )}
      </Button>
    </div>
  );
};

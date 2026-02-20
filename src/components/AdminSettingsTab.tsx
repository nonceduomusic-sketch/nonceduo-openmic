import React, { useState, useEffect } from 'react';
import { 
  Moon,
  Sun,
  Monitor,
  Palette,
  Wifi,
  Server,
  Check,
  AlertCircle,
  Footprints,
  ArrowRightLeft,
  Download,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { CatalogSongbookCompare } from '@/components/admin/CatalogSongbookCompare';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { adminAuditLog } from '@/lib/adminAudit';
import { useTheme } from 'next-themes';
import { useConnectionMode, useLocalBroadcast } from '@/hooks/useLocalBroadcast';
import { usePedalSettings, PedalPage, PedalMode } from '@/hooks/usePedalControl';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

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

export const AdminSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sectionSettings, setSectionSettings] = useState<SectionSettingRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

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

      adminAuditLog({
        action: 'settings.section_toggle',
        section: row.section_key,
        entity: 'section_settings',
        entity_id: row.id,
        metadata: { enabled },
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast({
      title: 'Tema aggiornato',
      description: newTheme === 'dark' ? 'Tema scuro attivato' : newTheme === 'light' ? 'Tema chiaro attivato' : 'Tema automatico attivato',
    });
    adminAuditLog({
      action: 'settings.theme_change',
      section: 'settings',
      entity: 'theme',
      entity_id: null,
      metadata: { theme: newTheme },
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Impostazioni</h2>
        <p className="text-sm text-muted-foreground">
          Gestisci aspetto, format e notifiche
        </p>
      </div>

      {/* Theme Settings */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-medium text-foreground">Aspetto del Sito</h3>
            <p className="text-xs text-muted-foreground">
              Scegli il tema visivo per tutto il sito
            </p>
          </div>
        </div>

        {mounted && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              className={theme === 'dark' ? 'neon-button-pink' : ''}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon className="w-4 h-4 mr-2" />
              Scuro
            </Button>
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              className={theme === 'light' ? 'neon-button-cyan' : ''}
              onClick={() => handleThemeChange('light')}
            >
              <Sun className="w-4 h-4 mr-2" />
              Chiaro
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              className={theme === 'system' ? 'bg-accent text-accent-foreground' : ''}
              onClick={() => handleThemeChange('system')}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Auto
            </Button>
          </div>
        )}

        {mounted && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Attualmente: <span className="font-medium text-foreground">{resolvedTheme === 'dark' ? 'Tema scuro' : 'Tema chiaro'}</span>
            {theme === 'system' && ' (automatico)'}
          </p>
        )}
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

      {/* Demo Community Seed */}
      <div className="glass-card p-4 space-y-3">
        <div>
          <h3 className="font-medium text-foreground">Community: contenuti demo</h3>
          <p className="text-xs text-muted-foreground">
            Crea ~30 profili demo (trasparenti), post distribuiti su più giorni e alcuni gruppi pubblici con messaggi.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={seeding}
          onClick={async () => {
            const ok = window.confirm(
              'Vuoi popolare la Community con contenuti DEMO?\n\n' +
                'Se sono già presenti, non verrà fatto nulla.'
            );
            if (!ok) return;

            setSeeding(true);
            try {
              const { data, error } = await supabase.functions.invoke('seed-community-demo');
              if (error || !data?.ok) {
                throw new Error((data as any)?.error || error?.message || 'Errore durante il seed');
              }

              toast({
                title: data.skipped ? 'Già presente' : 'Fatto!',
                description: data.skipped
                  ? 'I contenuti demo erano già presenti.'
                  : `Creati: ${data.counts?.profiles ?? 0} profili, ${data.counts?.posts ?? 0} post, ${data.counts?.groups ?? 0} gruppi.`,
              });

              adminAuditLog({
                action: 'community.seed_demo',
                section: 'community',
                entity: 'seed',
                entity_id: null,
                metadata: { skipped: data.skipped, counts: data.counts },
              });
            } catch (e: any) {
              toast({
                title: 'Errore',
                description: e?.message || 'Impossibile creare i contenuti demo.',
                variant: 'destructive',
              });
            } finally {
              setSeeding(false);
            }
          }}
          className="w-full"
        >
          {seeding ? 'Creazione in corso…' : 'Popola Community (demo)'}
        </Button>
      </div>

      {/* Pedal Control */}
      <PedalControlSection />

      {/* Connection Mode (Cloud/Local) */}
      <ConnectionModeSection />

    </div>
  );
};

const PEDAL_PAGE_OPTIONS: { value: PedalPage; label: string }[] = [
  { value: 'songbook', label: 'SongBook Live' },
  { value: 'trasmetti', label: 'Trasmetti (TV)' },
  { value: 'partiture', label: 'Partiture' },
  { value: 'telecomando', label: 'Telecomando' },
];

function PedalControlSection() {
  const { settings, updateSettings } = usePedalSettings();

  const togglePage = (page: PedalPage, checked: boolean) => {
    const pages = checked
      ? [...settings.enabledPages, page]
      : settings.enabledPages.filter(p => p !== page);
    updateSettings({ enabledPages: pages });
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Footprints className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h3 className="font-medium text-foreground">Pedale Bluetooth</h3>
          <p className="text-xs text-muted-foreground">
            Controlla lo scorrimento del testo con un pedale (es. IK Multimedia BlueTurn)
          </p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(checked) => updateSettings({ enabled: checked })}
        />
      </div>

      {settings.enabled && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Mode selection */}
          <div>
            <Label className="text-sm mb-2 block">Modalità pedale:</Label>
            <div className="grid grid-cols-2 gap-2">
              <Card
                className={`cursor-pointer transition-all ${settings.mode === 'highlight' ? 'ring-2 ring-primary' : 'opacity-70'}`}
                onClick={() => updateSettings({ mode: 'highlight' })}
              >
                <CardContent className="p-3 text-center">
                  <p className="font-medium text-sm">🎯 Evidenziazione</p>
                  <p className="text-xs text-muted-foreground mt-1">Muove la riga evidenziata in TV (come telecomando)</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${settings.mode === 'scroll' ? 'ring-2 ring-primary' : 'opacity-70'}`}
                onClick={() => updateSettings({ mode: 'scroll' })}
              >
                <CardContent className="p-3 text-center">
                  <p className="font-medium text-sm">📜 Scroll locale</p>
                  <p className="text-xs text-muted-foreground mt-1">Scrolla solo sul tuo dispositivo</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lines per press */}
          <div>
            <Label className="text-sm">Righe per pressione: <span className="font-bold text-primary">{settings.linesPerPress}</span></Label>
            <Slider
              value={[settings.linesPerPress]}
              onValueChange={([v]) => updateSettings({ linesPerPress: v })}
              min={1}
              max={15}
              step={1}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Quante righe avanza/retrocede ad ogni pressione del pedale
            </p>
          </div>

          {/* Page selection */}
          <div>
            <Label className="text-sm mb-2 block">Attivo su:</Label>
            <div className="space-y-2">
              {PEDAL_PAGE_OPTIONS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`pedal-${value}`}
                    checked={settings.enabledPages.includes(value)}
                    onCheckedChange={(checked) => togglePage(value, !!checked)}
                  />
                  <Label htmlFor={`pedal-${value}`} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 {settings.mode === 'highlight' 
              ? 'Il pedale controllerà la riga evidenziata in TV. Se anche il telecomando è attivo, l\'ultimo comando vince.'
              : 'Il pedale scorre il testo solo sul tuo dispositivo senza influenzare la TV.'}
          </p>
        </div>
      )}
    </div>
  );
}

function ConnectionModeSection() {
  const { mode, setMode, localIP, setLocalIP, serverUrl } = useConnectionMode();
  const { connected, latency } = useLocalBroadcast({
    enabled: mode === 'local',
    serverUrl,
    onStateUpdate: () => {},
  });
  const [ipInput, setIpInput] = useState(localIP);

  const handleSaveIP = () => {
    const cleaned = ipInput.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    setLocalIP(cleaned);
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Server className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-medium text-foreground">Connessione Trasmissione</h3>
          <p className="text-xs text-muted-foreground">
            Scegli come sincronizzare TV, partiture e telecomando
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Card
          className={`cursor-pointer transition-all ${mode === 'cloud' ? 'ring-2 ring-primary' : 'opacity-70'}`}
          onClick={() => setMode('cloud')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Cloud</p>
                <p className="text-xs text-muted-foreground">Sincronizzazione via internet (default)</p>
              </div>
              {mode === 'cloud' && <Check className="w-5 h-5 text-primary shrink-0" />}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${mode === 'local' ? 'ring-2 ring-primary' : 'opacity-70'}`}
          onClick={() => setMode('local')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Locale (WiFi)</p>
                <p className="text-xs text-muted-foreground">Funziona senza internet — serve il server locale</p>
              </div>
              {mode === 'local' && <Check className="w-5 h-5 text-primary shrink-0" />}
            </div>
          </CardContent>
        </Card>

        {mode === 'local' && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <Label className="text-sm">Indirizzo IP del server</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="192.168.1.100"
                  className="font-mono text-sm"
                />
                <Button size="sm" onClick={handleSaveIP} className="shrink-0">
                  Salva
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                L'IP viene mostrato all'avvio del server locale
              </p>
            </div>

            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                    <Check className="w-3 h-3 mr-1" />
                    Connesso
                  </Badge>
                  {latency !== null && (
                    <span className="text-xs text-muted-foreground">{latency}ms</span>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="text-red-500 border-red-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Non connesso
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offline SongBook Download */}
      <OfflineSongbookSection />

      {/* Confronto Catalogo ↔ SongBook */}
      <div className="pt-6 border-t border-border">
        <CatalogSongbookCompare />
      </div>
    </div>
  );
}

function OfflineSongbookSection() {
  const [downloading, setDownloading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; lastSync: number | null }>({ count: 0, lastSync: null });

  useEffect(() => {
    import('@/lib/songbookCache').then(({ getCacheStats }) => {
      getCacheStats().then(setCacheStats);
    });
  }, []);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { downloadAllSongbookFilesForOffline } = await import('@/lib/songbookCache');
      const result = await downloadAllSongbookFilesForOffline(supabase);
      if (result.success) {
        const { toast } = await import('sonner');
        toast.success(`${result.count} brani SongBook scaricati per offline!`);
        const { getCacheStats } = await import('@/lib/songbookCache');
        setCacheStats(await getCacheStats());
      }
    } catch (e) {
      const { toast } = await import('sonner');
      toast.error('Errore durante il download');
    }
    setDownloading(false);
  };

  return (
    <div className="pt-4 border-t border-border space-y-3">
      <div className="flex items-center gap-3">
        <HardDrive className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-medium text-foreground">SongBook Offline</h3>
          <p className="text-xs text-muted-foreground">Scarica i brani per usarli senza internet</p>
        </div>
      </div>

      {cacheStats.count > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <HardDrive className="w-3 h-3 mr-1" />
            {cacheStats.count} brani in cache
          </Badge>
          {cacheStats.lastSync && (
            <span className="text-xs text-muted-foreground">
              Ultimo: {new Date(cacheStats.lastSync).toLocaleDateString('it-IT')}
            </span>
          )}
        </div>
      )}

      <Button
        onClick={handleDownloadAll}
        disabled={downloading}
        className="w-full"
        variant={cacheStats.count > 0 ? "outline" : "default"}
      >
        {downloading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scaricando...</>
        ) : (
          <><Download className="w-4 h-4 mr-2" />{cacheStats.count > 0 ? 'Aggiorna cache offline' : 'Scarica tutto per offline'}</>
        )}
      </Button>
    </div>
  );
}

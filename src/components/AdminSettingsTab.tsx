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
  Upload,
  Music,
  BookOpen,
  Terminal,
  Copy,
} from 'lucide-react';
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

export const AdminSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);


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

      {/* Format (Sezioni) — gestiti in tab Formati */}

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

      {/* Offline & Sync Section */}
      <OfflineDataSection localIP={localIP} />

      {/* Confronto Catalogo ↔ SongBook — disponibile in Catalogo SB */}
    </div>
  );
}

function OfflineDataSection({ localIP: configIP }: { localIP: string }) {
  // If served from local server, use current hostname as IP (auto-detect)
  const localIP = (() => {
    const h = window.location.hostname;
    const isLocal = h.match(/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|localhost|127\.)/);
    return isLocal ? h : configIP;
  })();
  const [songbookStats, setSongbookStats] = useState<{ count: number; lastSync: number | null }>({ count: 0, lastSync: null });
  const [catalogStats, setCatalogStats] = useState<{ count: number; lastSync: number | null }>({ count: 0, lastSync: null });
  const [downloadingSongbook, setDownloadingSongbook] = useState(false);
  const [downloadingCatalog, setDownloadingCatalog] = useState(false);
  const [syncingSongbook, setSyncingSongbook] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);

  // Load stats + auto-sync in background on mount
  useEffect(() => {
    import('@/lib/songbookCache').then(({ getCacheStats }) => getCacheStats().then(setSongbookStats));
    import('@/lib/songsCatalogCache').then(({ getSongsCatalogCacheStats }) => getSongsCatalogCacheStats().then(setCatalogStats));

    // Auto-sync to LAN server if reachable
    if (localIP && !autoSynced) {
      const doAutoSync = async () => {
        try {
          // Quick check: is the server reachable?
          const ping = await fetch(`http://${localIP}:8080/api/catalog/list`, { signal: AbortSignal.timeout(2000) });
          if (!ping.ok) return;

          // Server is up — sync both in parallel
          const { supabase } = await import('@/integrations/supabase/client');
          const [catalogMod, songbookMod] = await Promise.all([
            import('@/lib/songsCatalogCache'),
            import('@/lib/songbookCache'),
          ]);

          const [catResult, sbResult] = await Promise.all([
            catalogMod.syncCatalogToLocalServer(localIP, supabase),
            songbookMod.syncSongbookToLocalServer(localIP, supabase),
          ]);

          if (catResult.success || sbResult.success) {
            console.log(`[AutoSync] Catalogo: ${catResult.count}, SongBook: ${sbResult.count}`);
            setAutoSynced(true);
          }
        } catch {
          // Server not reachable or no internet — skip silently
        }
      };
      doAutoSync();
    }
  }, [localIP, autoSynced]);

  const handleDownloadSongbook = async () => {
    setDownloadingSongbook(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { downloadAllSongbookFilesForOffline, getCacheStats } = await import('@/lib/songbookCache');
      const result = await downloadAllSongbookFilesForOffline(supabase);
      if (result.success && result.count > 0) {
        (await import('sonner')).toast.success(`${result.count} brani SongBook scaricati!`);
        setSongbookStats(await getCacheStats());
      } else if (result.success && result.count === 0) {
        (await import('sonner')).toast.warning('Nessun brano SongBook trovato nel database Cloud');
      } else {
        (await import('sonner')).toast.error('Download SongBook fallito — serve connessione internet al Cloud');
      }
    } catch (e) {
      console.error('[OfflineData] Download songbook error:', e);
      (await import('sonner')).toast.error('Errore download SongBook — controlla la connessione internet');
    }
    setDownloadingSongbook(false);
  };

  const handleDownloadCatalog = async () => {
    setDownloadingCatalog(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { downloadAllCatalogForOffline, getSongsCatalogCacheStats } = await import('@/lib/songsCatalogCache');
      const result = await downloadAllCatalogForOffline(supabase);
      if (result.success && result.count > 0) {
        (await import('sonner')).toast.success(`${result.count} canzoni catalogo scaricate!`);
        setCatalogStats(await getSongsCatalogCacheStats());
      } else if (result.success && result.count === 0) {
        (await import('sonner')).toast.warning('Nessuna canzone trovata nel catalogo Cloud');
      } else {
        (await import('sonner')).toast.error('Download catalogo fallito — serve connessione internet al Cloud');
      }
    } catch (e) {
      console.error('[OfflineData] Download catalog error:', e);
      (await import('sonner')).toast.error('Errore download catalogo — controlla la connessione internet');
    }
    setDownloadingCatalog(false);
  };

  const mixedContentWarning = () => {
    if (window.location.protocol === 'https:') {
      (import('sonner')).then(s => s.toast.error(
        'Impossibile raggiungere il server locale da HTTPS. Apri l\'app da http://' + localIP + ':8080/admin',
        { duration: 8000 }
      ));
      return true;
    }
    return false;
  };

  const handleSyncSongbook = async () => {
    if (mixedContentWarning()) return;
    setSyncingSongbook(true);
    const { toast } = await import('sonner');
    try {
      // 1) Ping server
      try {
        const ping = await fetch(`http://${localIP}:8080/api/songbook/list`, { signal: AbortSignal.timeout(3000) });
        if (!ping.ok) throw new Error('not ok');
      } catch {
        toast.error(`Server locale non raggiungibile su ${localIP}:8080 — verifica IP e che il server sia acceso`);
        setSyncingSongbook(false);
        return;
      }

      // 2) Try fetching from Cloud directly and sending to server
      const { supabase } = await import('@/integrations/supabase/client');
      let allFiles: any[] = [];
      let cloudError: string | null = null;

      try {
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('songbook_files')
            .select('filename, content')
            .range(from, from + pageSize - 1);
          if (error) { cloudError = error.message; break; }
          if (data && data.length > 0) {
            allFiles.push(...data);
            from += pageSize;
            hasMore = data.length === pageSize;
          } else { hasMore = false; }
        }
      } catch (e: any) {
        cloudError = e?.message || 'Errore di rete';
      }

      // 3) Fallback to IndexedDB cache
      if (allFiles.length === 0 && cloudError) {
        console.warn('[Sync] Cloud failed:', cloudError, '— trying IndexedDB...');
        try {
          const { getAllCachedFiles } = await import('@/lib/songbookCache');
          const cached = await getAllCachedFiles();
          allFiles = cached.map(f => ({ filename: f.filename, content: f.content }));
        } catch { /* ignore */ }
      }

      if (allFiles.length === 0) {
        toast.error(cloudError
          ? `Cloud non raggiungibile (${cloudError}) e nessun dato in cache locale. Scarica prima i brani per offline.`
          : 'Nessun brano SongBook trovato né nel Cloud né in cache. Verifica che ci siano brani nel database.');
        setSyncingSongbook(false);
        return;
      }

      // 4) Send to server
      const resp = await fetch(`http://${localIP}:8080/api/songbook/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allFiles),
        signal: AbortSignal.timeout(15000),
      });
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        toast.error(`Il server LAN (${localIP}:8080) ha risposto con HTML anziché JSON. Verifica che il mini-server Node.js sia in esecuzione e che l'IP sia corretto.`);
        setSyncingSongbook(false);
        return;
      }
      const result = await resp.json();
      if (result.ok) {
        toast.success(`${result.count || allFiles.length} file .cho sincronizzati col server!`);
      } else {
        toast.error('Il server ha rifiutato i dati — controlla i log del server');
      }
    } catch (e: any) {
      console.error('[Sync SongBook]', e);
      toast.error('Errore sync SongBook → server: ' + (e?.message || ''));
    }
    setSyncingSongbook(false);
  };

  const handleSyncCatalog = async () => {
    if (mixedContentWarning()) return;
    setSyncingCatalog(true);
    const { toast } = await import('sonner');
    try {
      // 1) Ping server
      try {
        const ping = await fetch(`http://${localIP}:8080/api/catalog/list`, { signal: AbortSignal.timeout(3000) });
        if (!ping.ok) throw new Error('not ok');
      } catch {
        toast.error(`Server locale non raggiungibile su ${localIP}:8080 — verifica IP e che il server sia acceso`);
        setSyncingCatalog(false);
        return;
      }

      // 2) Try Cloud directly
      const { supabase } = await import('@/integrations/supabase/client');
      let allSongs: any[] = [];
      let cloudError: string | null = null;

      try {
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('songs')
            .select('id, titolo, artista, testo, slug')
            .range(from, from + pageSize - 1);
          if (error) { cloudError = error.message; break; }
          if (data && data.length > 0) {
            allSongs.push(...data);
            from += pageSize;
            hasMore = data.length === pageSize;
          } else { hasMore = false; }
        }
      } catch (e: any) {
        cloudError = e?.message || 'Errore di rete';
      }

      // 3) Fallback to IndexedDB
      if (allSongs.length === 0 && cloudError) {
        console.warn('[Sync] Cloud failed:', cloudError, '— trying IndexedDB...');
        try {
          const { getAllCachedSongs } = await import('@/lib/songsCatalogCache');
          const cached = await getAllCachedSongs();
          allSongs = cached.map(s => ({ id: s.id, titolo: s.titolo, artista: s.artista, testo: s.testo, slug: s.slug }));
        } catch { /* ignore */ }
      }

      if (allSongs.length === 0) {
        toast.error(cloudError
          ? `Cloud non raggiungibile (${cloudError}) e nessun dato in cache locale. Scarica prima il catalogo per offline.`
          : 'Nessuna canzone trovata né nel Cloud né in cache. Verifica che ci siano canzoni nel database.');
        setSyncingCatalog(false);
        return;
      }

      // 4) Send to server
      const resp = await fetch(`http://${localIP}:8080/api/catalog/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allSongs),
        signal: AbortSignal.timeout(15000),
      });
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        toast.error(`Il server LAN (${localIP}:8080) ha risposto con HTML anziché JSON. Verifica che il mini-server Node.js sia in esecuzione e che l'IP sia corretto.`);
        setSyncingCatalog(false);
        return;
      }
      const result = await resp.json();
      if (result.ok) {
        toast.success(`${result.count || allSongs.length} brani catalogo sincronizzati col server!`);
      } else {
        toast.error('Il server ha rifiutato i dati — controlla i log del server');
      }
    } catch (e: any) {
      console.error('[Sync Catalog]', e);
      toast.error('Errore sync catalogo → server: ' + (e?.message || ''));
    }
    setSyncingCatalog(false);
  };

  return (
    <>
    <div className="pt-4 border-t border-border space-y-5">
      <div className="flex items-center gap-3">
        <HardDrive className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-medium text-foreground">Dati Offline</h3>
          <p className="text-xs text-muted-foreground">Scarica dati nel browser o sincronizza col server locale</p>
        </div>
      </div>

      {/* SongBook Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">SongBook (.cho)</span>
          {songbookStats.count > 0 && (
            <Badge variant="outline" className="text-xs ml-auto">
              {songbookStats.count} in cache
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleDownloadSongbook} disabled={downloadingSongbook} variant="outline" size="sm" className="w-full">
            {downloadingSongbook 
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scaricando...</>
              : <><Download className="w-3 h-3 mr-1" />Browser</>
            }
          </Button>
          <Button onClick={handleSyncSongbook} disabled={syncingSongbook} variant="outline" size="sm" className="w-full">
            {syncingSongbook 
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sync...</>
              : <><Upload className="w-3 h-3 mr-1" />Server LAN</>
            }
          </Button>
        </div>
      </div>

      {/* Catalog Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Catalogo Canzoni</span>
          {catalogStats.count > 0 && (
            <Badge variant="outline" className="text-xs ml-auto">
              {catalogStats.count} in cache
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleDownloadCatalog} disabled={downloadingCatalog} variant="outline" size="sm" className="w-full">
            {downloadingCatalog 
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scaricando...</>
              : <><Download className="w-3 h-3 mr-1" />Browser</>
            }
          </Button>
          <Button onClick={handleSyncCatalog} disabled={syncingCatalog} variant="outline" size="sm" className="w-full">
            {syncingCatalog 
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sync...</>
              : <><Upload className="w-3 h-3 mr-1" />Server LAN</>
            }
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 <strong>Browser</strong>: salva in questo dispositivo (IndexedDB). <strong>Server LAN</strong>: invia al mini-server locale (disponibile per tutti i dispositivi in rete).
      </p>
    </div>

    <LocalServerGuide />
    </>
  );
}

const LocalServerGuide: React.FC = () => {
  const { toast } = useToast();

  const updateCommands = [
    { cmd: 'taskkill /F /IM node.exe 2>$null', label: 'Ferma server vecchio' },
    { cmd: 'cd C:\\Users\\iaco_\\nonceduo-openmic-nuovo', label: 'Vai nella cartella codice' },
    { cmd: 'git pull', label: 'Scarica aggiornamenti' },
    { cmd: 'npm install', label: 'Installa dipendenze' },
    { cmd: 'npm run build', label: 'Compila l\'app' },
    { cmd: 'xcopy dist\\* ..\\nonceduo\\local-server\\public\\ /E /Y', label: 'Copia file compilati' },
    { cmd: 'Copy-Item ".\\local-server\\server.js" -Destination "..\\nonceduo\\local-server\\server.js" -Force', label: 'Copia server.js' },
    { cmd: 'cd ..\\nonceduo\\local-server', label: 'Vai nella cartella server' },
    { cmd: 'node server.js', label: 'Avvia il server' },
  ];

  const startCommands = [
    { cmd: 'taskkill /F /IM node.exe 2>$null', label: 'Ferma server vecchio' },
    { cmd: 'cd C:\\Users\\iaco_\\nonceduo\\local-server', label: 'Vai nella cartella server' },
    { cmd: 'node server.js', label: 'Avvia il server' },
  ];

  const copySingle = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      toast({ title: 'Copiato!', description: cmd.length > 40 ? cmd.slice(0, 40) + '…' : cmd });
    });
  };

  const copyAll = (commands: { cmd: string }[]) => {
    navigator.clipboard.writeText(commands.map(c => c.cmd).join('\n')).then(() => {
      toast({ title: 'Copiato!', description: 'Tutti i comandi copiati negli appunti' });
    });
  };

  const CommandLine: React.FC<{ cmd: string; label?: string; index?: number }> = ({ cmd, label, index }) => (
    <div className="group">
      {label && index !== undefined && (
        <div className="text-muted-foreground text-[10px] mt-1 first:mt-0">
          Passo {index + 1}: {label}
        </div>
      )}
      <div className="flex items-center gap-1">
        <div className="flex-1 text-foreground/80 truncate">{cmd}</div>
        <button
          onClick={() => copySingle(cmd)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
          title="Copia questo comando"
        >
          <Copy className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <div className="flex items-center gap-2">
        <Terminal className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm">Server Locale (PowerShell)</h3>
      </div>

      {/* Solo avvio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">🚀 Solo Avvio</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => copyAll(startCommands)}
          >
            <Copy className="w-3 h-3 mr-1" />
            Copia tutto
          </Button>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-0.5 border border-border">
          {startCommands.map((item, i) => (
            <CommandLine key={i} cmd={item.cmd} label={item.label} index={i} />
          ))}
        </div>
      </div>

      {/* Aggiornamento completo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">🔄 Aggiornamento + Avvio</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => copyAll(updateCommands)}
          >
            <Copy className="w-3 h-3 mr-1" />
            Copia tutto
          </Button>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-0.5 border border-border">
          {updateCommands.map((item, i) => (
            <CommandLine key={i} cmd={item.cmd} label={item.label} index={i} />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ⚠️ Dopo l'aggiornamento, fai <strong>Ctrl+Shift+R</strong> su ogni dispositivo (TV, tablet, telefono) per caricare la versione nuova.
      </p>
    </div>
  );
};

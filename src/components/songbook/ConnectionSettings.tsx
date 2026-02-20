/**
 * Connection mode settings panel.
 * Toggle between Cloud and Local mode for broadcast sync.
 * Includes offline download for SongBook files.
 */
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Server, Check, AlertCircle, Download, HardDrive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type ConnectionMode } from '@/hooks/useLocalBroadcast';

interface ConnectionSettingsProps {
  mode: ConnectionMode;
  setMode: (m: ConnectionMode) => void;
  localIP: string;
  setLocalIP: (ip: string) => void;
  isLocalConnected: boolean;
  localLatency: number | null;
}

export function ConnectionSettings({
  mode,
  setMode,
  localIP,
  setLocalIP,
  isLocalConnected,
  localLatency,
}: ConnectionSettingsProps) {
  const [open, setOpen] = useState(false);
  const [ipInput, setIpInput] = useState(localIP);
  const [downloading, setDownloading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; lastSync: number | null }>({ count: 0, lastSync: null });

  // Load cache stats on open
  useEffect(() => {
    if (open) {
      import('@/lib/songbookCache').then(({ getCacheStats }) => {
        getCacheStats().then(setCacheStats);
      });
    }
  }, [open]);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const { downloadAllSongbookFilesForOffline } = await import('@/lib/songbookCache');
      const result = await downloadAllSongbookFilesForOffline(supabase);
      if (result.success) {
        toast.success(`${result.count} brani SongBook scaricati per offline!`);
        const { getCacheStats } = await import('@/lib/songbookCache');
        setCacheStats(await getCacheStats());
      } else {
        toast.error('Errore download - controlla la connessione');
      }
    } catch (e) {
      toast.error('Errore durante il download');
    }
    setDownloading(false);
  };

  const handleSaveIP = () => {
    const cleaned = ipInput.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    setLocalIP(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 relative">
          <Settings className="w-5 h-5" />
          {mode === 'local' && (
            <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${isLocalConnected ? 'bg-green-500' : 'bg-red-500'} ring-2 ring-background`} />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connessione Trasmissione</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cloud mode */}
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

          {/* Local mode */}
          <Card 
            className={`cursor-pointer transition-all ${mode === 'local' ? 'ring-2 ring-primary' : 'opacity-70'}`}
            onClick={() => setMode('local')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Locale (WiFi)</p>
                  <p className="text-xs text-muted-foreground">Funziona senza internet</p>
                </div>
                {mode === 'local' && <Check className="w-5 h-5 text-primary shrink-0" />}
              </div>
            </CardContent>
          </Card>

          {/* Local settings */}
          {mode === 'local' && (
            <div className="space-y-3 pt-2 border-t">
              {window.location.protocol === 'https:' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium">⚠️ Modalità locale non disponibile da questo indirizzo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stai navigando su HTTPS, che blocca le connessioni al server locale. Per usare la modalità LAN, apri <strong>questo stesso sito</strong> dal PC dove gira il server, usando l'indirizzo locale: <code className="bg-muted px-1 rounded">http://192.168.1.x:5173</code>
                  </p>
                </div>
              )}
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
                  L'IP viene mostrato all'avvio del server
                </p>
              </div>

              {/* Connection status */}
              <div className="flex items-center gap-2">
                {isLocalConnected ? (
                  <>
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      <Check className="w-3 h-3 mr-1" />
                      Connesso
                    </Badge>
                    {localLatency !== null && (
                      <span className="text-xs text-muted-foreground">{localLatency}ms</span>
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

          {/* Offline SongBook Download */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">SongBook Offline</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

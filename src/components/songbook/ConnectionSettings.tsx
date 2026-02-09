/**
 * Connection mode settings panel.
 * Toggle between Cloud and Local mode for broadcast sync.
 */
import React, { useState } from 'react';
import { Wifi, WifiOff, Server, Check, AlertCircle } from 'lucide-react';
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

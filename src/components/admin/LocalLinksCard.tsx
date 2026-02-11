/**
 * Card that displays local server URLs for all broadcast pages.
 * Reads the local IP from localStorage and generates HTTP links.
 */
import React from 'react';
import { Server, ExternalLink, Tv, Guitar, Music, Smartphone, Copy, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { safeGetItem } from '@/lib/safeStorage';
import { toast } from 'sonner';

interface LocalLink {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface LocalLinksCardProps {
  /** Which links to show. Defaults to all. */
  filter?: ('tv' | 'partiture' | 'songbook' | 'telecomando')[];
  /** Remote token for telecomando link */
  telecomandoToken?: string;
  /** Compact inline variant (no card wrapper) */
  inline?: boolean;
}

const PORT = 8080;

function getLocalIP(): string {
  return safeGetItem('local', 'broadcast_local_ip') || '192.168.1.100';
}

function getLocalBaseUrl(): string {
  return `http://${getLocalIP()}:${PORT}`;
}

export function LocalLinksCard({ filter, telecomandoToken, inline }: LocalLinksCardProps) {
  const localIP = getLocalIP();
  const baseUrl = getLocalBaseUrl();

  const allLinks: (LocalLink & { key: string })[] = [
    { key: 'tv', label: 'TV Locale', path: '/trasmetti', icon: <Tv className="w-4 h-4" /> },
    { key: 'partiture', label: 'Partiture Locale', path: '/partiture', icon: <Guitar className="w-4 h-4" /> },
    { key: 'songbook', label: 'SongBook Locale', path: '/songbook-live', icon: <Music className="w-4 h-4" /> },
    ...(telecomandoToken
      ? [{ key: 'telecomando', label: 'Telecomando Locale', path: `/telecomando/${telecomandoToken}`, icon: <Smartphone className="w-4 h-4" /> }]
      : []),
  ];

  const links = filter ? allLinks.filter(l => filter.includes(l.key as any)) : allLinks;

  const openLocal = (path: string) => {
    window.open(`${baseUrl}${path}`, '_blank');
  };

  const copyUrl = async (path: string) => {
    await navigator.clipboard.writeText(`${baseUrl}${path}`);
    toast.success('URL locale copiato!');
  };

  const content = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Server className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Link Locali</span>
        <Badge variant="outline" className="text-xs font-mono">
          {localIP}:{PORT}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map(link => (
          <div key={link.key} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs sm:text-sm"
              onClick={() => openLocal(link.path)}
            >
              {link.icon}
              {link.label}
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-50" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => copyUrl(link.path)}
              title="Copia URL"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        Apri questi link sui dispositivi connessi alla stessa rete WiFi del mini-server.
      </p>
    </div>
  );

  if (inline) return content;

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}

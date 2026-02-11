/**
 * Cards that display local and online URLs for all broadcast pages.
 * Two variants: LocalLinksCard and OnlineLinksCard, plus a combined BroadcastLinksCards.
 */
import React from 'react';
import { Server, ExternalLink, Tv, Guitar, Music, Smartphone, Copy, Wifi, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { safeGetItem } from '@/lib/safeStorage';
import { getProductionBaseUrl } from '@/lib/productionUrl';
import { toast } from 'sonner';

interface LinkItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  key: string;
}

interface BroadcastLinksCardsProps {
  /** Remote token for telecomando link */
  telecomandoToken?: string;
  /** Which links to show. Defaults to all. */
  filter?: ('tv' | 'partiture' | 'songbook' | 'telecomando')[];
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

function buildLinks(telecomandoToken?: string): LinkItem[] {
  return [
    { key: 'tv', label: 'TV', path: '/trasmetti', icon: <Tv className="w-4 h-4" /> },
    { key: 'partiture', label: 'Partiture', path: '/partiture', icon: <Guitar className="w-4 h-4" /> },
    { key: 'songbook', label: 'SongBook', path: '/songbook-live', icon: <Music className="w-4 h-4" /> },
    ...(telecomandoToken
      ? [{ key: 'telecomando', label: 'Telecomando', path: `/telecomando/${telecomandoToken}`, icon: <Smartphone className="w-4 h-4" /> }]
      : []),
  ];
}

function filterLinks(links: LinkItem[], filter?: string[]) {
  return filter ? links.filter(l => filter.includes(l.key)) : links;
}

const copyUrl = async (url: string) => {
  await navigator.clipboard.writeText(url);
  toast.success('URL copiato!');
};

/* ─── Link Buttons Row ─── */
function LinkButtons({ links, baseUrl, variant }: { links: LinkItem[]; baseUrl: string; variant: 'local' | 'online' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(link => {
        const fullUrl = `${baseUrl}${link.path}`;
        return (
          <div key={link.key} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs sm:text-sm"
              onClick={() => window.open(fullUrl, '_blank')}
            >
              {link.icon}
              {link.label}
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-50" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => copyUrl(fullUrl)}
              title="Copia URL"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── LOCAL LINKS CARD ─── */
export function LocalLinksCard({ filter, telecomandoToken, inline }: LocalLinksCardProps) {
  const localIP = getLocalIP();
  const baseUrl = `http://${localIP}:${PORT}`;
  const links = filterLinks(buildLinks(telecomandoToken), filter);

  const content = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Wifi className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold">Link Locali (LAN)</span>
        <Badge variant="outline" className="text-xs font-mono">
          {localIP}:{PORT}
        </Badge>
      </div>
      <LinkButtons links={links} baseUrl={baseUrl} variant="local" />
      <p className="text-[11px] text-muted-foreground mt-1">
        Apri questi link sui dispositivi connessi alla stessa rete WiFi del mini-server.
      </p>
    </div>
  );

  if (inline) return content;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}

/* ─── ONLINE LINKS CARD ─── */
export function OnlineLinksCard({ filter, telecomandoToken }: { filter?: string[]; telecomandoToken?: string }) {
  const baseUrl = getProductionBaseUrl();
  const links = filterLinks(buildLinks(telecomandoToken), filter);

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold">Link Online (Cloud)</span>
          </div>
          <LinkButtons links={links} baseUrl={baseUrl} variant="online" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Link pubblici accessibili da qualsiasi dispositivo con internet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── COMBINED: Both cards together ─── */
export function BroadcastLinksCards({ telecomandoToken, filter }: BroadcastLinksCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <OnlineLinksCard filter={filter} telecomandoToken={telecomandoToken} />
      <LocalLinksCard filter={filter} telecomandoToken={telecomandoToken} />
    </div>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Radio, 
  Copy, 
  RefreshCw, 
  QrCode, 
  Clock, 
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLiveSession } from '@/hooks/useLiveSession';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface LiveSessionCardProps {
  section: 'openmic' | 'dediche';
  title?: string;
}

export const LiveSessionCard: React.FC<LiveSessionCardProps> = ({ 
  section,
  title 
}) => {
  const { 
    session, 
    loading, 
    isOwner,
    isActive,
    startSession, 
    stopSession, 
    regeneratePin 
  } = useLiveSession(section);

  const [showQR, setShowQR] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(4);
  const [copied, setCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const sectionLabel = section === 'openmic' ? 'Open Mic' : 'Dediche';

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        await startSession(expiresInHours > 0 ? expiresInHours : undefined);
      } else {
        await stopSession();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const copyPin = () => {
    if (session?.pin_code) {
      navigator.clipboard.writeText(session.pin_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegeneratePin = async () => {
    await regeneratePin();
  };

  // Generate QR code URL (using a free QR API)
  const qrCodeUrl = session?.pin_code 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(session.pin_code)}`
    : null;

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  return (
    <Card className={cn(
      "glass-card transition-all duration-300",
      isActive ? "border-primary/50 bg-primary/5" : "border-border/50"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Radio className={cn(
              "w-4 h-4 transition-colors",
              isActive ? "text-primary animate-pulse" : "text-muted-foreground"
            )} />
            <span className="font-medium">
              {title || `Serata Live ${sectionLabel}`}
            </span>
            {isActive && (
              <Badge className="bg-primary/20 text-primary text-xs animate-in fade-in-0">
                LIVE
              </Badge>
            )}
          </div>
          
          {isOwner && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={handleToggle}
                      disabled={isToggling}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isActive ? 'Disattiva Serata Live' : 'Attiva Serata Live'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-2">
        {!isOwner && !isActive && (
          <p className="text-sm text-muted-foreground">
            Solo l'owner può attivare la modalità Serata Live
          </p>
        )}

        {!isActive && isOwner && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Attiva per richiedere un PIN per le prenotazioni durante la serata.
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="expires" className="text-xs text-muted-foreground whitespace-nowrap">
                Scadenza (ore):
              </Label>
              <Input
                id="expires"
                type="number"
                min={0}
                max={12}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-sm"
                placeholder="0 = mai"
              />
              <span className="text-xs text-muted-foreground">
                (0 = nessuna scadenza)
              </span>
            </div>
          </div>
        )}

        {isActive && session && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            {/* PIN Display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">PIN Serata</p>
                  <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                    {session.pin_code}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyPin}
                        className="h-8 w-8"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-secondary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{copied ? 'Copiato!' : 'Copia PIN'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {isOwner && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleRegeneratePin}
                          className="h-8 w-8"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Genera nuovo PIN</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <Dialog open={showQR} onOpenChange={setShowQR}>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        QR Code Serata Live
                      </DialogTitle>
                      <DialogDescription>
                        Mostra questo QR code ai partecipanti per permettere le prenotazioni
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      {qrCodeUrl && (
                        <div className="p-4 bg-white rounded-xl">
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code PIN"
                            className="w-48 h-48"
                          />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Oppure inserisci il codice:
                        </p>
                        <p className="text-3xl font-mono font-bold tracking-wider text-primary">
                          {session.pin_code}
                        </p>
                      </div>
                      <Button onClick={copyPin} variant="outline" className="gap-2">
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-secondary" />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copia PIN
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Session Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  Attiva da {formatDistanceToNow(new Date(session.created_at), { locale: it })}
                </span>
              </div>
              {session.expires_at && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>
                    Scade {formatDistanceToNow(new Date(session.expires_at), { 
                      addSuffix: true, 
                      locale: it 
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

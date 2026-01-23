import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertCircle,
  Mic2,
  MessageSquare,
  Download,
  Image,
  Link as LinkIcon,
  Edit2,
  Save,
} from 'lucide-react';
import { useUnifiedLiveSession, FormatType } from '@/hooks/useUnifiedLiveSession';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface UnifiedLiveSessionCardProps {
  title?: string;
}

export const UnifiedLiveSessionCard: React.FC<UnifiedLiveSessionCardProps> = ({ 
  title 
}) => {
  const { 
    session, 
    loading, 
    isOwner,
    isActive,
    startSession, 
    stopSession, 
    updateFormats,
    updatePin,
    regeneratePin,
    getEventUrl,
  } = useUnifiedLiveSession();

  const [showQR, setShowQR] = useState(false);
  const [showStoryGenerator, setShowStoryGenerator] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(4);
  const [copied, setCopied] = useState<'pin' | 'link' | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<FormatType[]>(['openmic', 'dediche']);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [editPinValue, setEditPinValue] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        await startSession(selectedFormats, expiresInHours > 0 ? expiresInHours : undefined);
      } else {
        await stopSession();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleFormatToggle = async (format: FormatType, checked: boolean) => {
    if (!isActive) {
      // Just update local state before starting session
      if (checked) {
        setSelectedFormats(prev => [...prev, format]);
      } else {
        setSelectedFormats(prev => prev.filter(f => f !== format));
      }
    } else {
      // Update active session
      const newFormats = checked 
        ? [...(session?.protected_formats || []), format]
        : (session?.protected_formats || []).filter(f => f !== format);
      
      if (newFormats.length === 0) {
        toast.error('Seleziona almeno un format');
        return;
      }
      
      await updateFormats(newFormats as FormatType[]);
    }
  };

  const copyToClipboard = (text: string, type: 'pin' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success(type === 'pin' ? 'PIN copiato!' : 'Link copiato!');
  };

  const handleEditPin = () => {
    if (session) {
      setEditPinValue(session.pin_code);
      setIsEditingPin(true);
    }
  };

  const handleSavePin = async () => {
    const success = await updatePin(editPinValue);
    if (success) {
      setIsEditingPin(false);
    }
  };

  const handleRegeneratePin = async () => {
    await regeneratePin();
  };

  // Generate Instagram Story image
  const generateStoryImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !session) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size for IG Stories (1080x1920)
    canvas.width = 1080;
    canvas.height = 1920;

    // Background gradient (dark blue to black)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a3a');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle neon glow effect
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 100;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Top text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Evento Live', canvas.width / 2, 200);
    
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#f472b6'; // Pink accent
    ctx.fillText("Non C'è Duo", canvas.width / 2, 290);

    ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a5b4fc'; // Light purple
    ctx.fillText('🎤 In corso ora!', canvas.width / 2, 380);

    // QR Code area (white rounded rectangle)
    const qrSize = 400;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = 500;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 20);
    ctx.fill();

    // QR Code placeholder text (actual QR would need a library)
    ctx.fillStyle = '#1a1a3a';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('QR CODE', canvas.width / 2, qrY + qrSize / 2);
    ctx.font = '24px monospace';
    ctx.fillText('Scansiona qui', canvas.width / 2, qrY + qrSize / 2 + 40);

    // PIN display
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('oppure inserisci il PIN:', canvas.width / 2, qrY + qrSize + 120);

    // PIN box
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 200, qrY + qrSize + 150, 400, 100, 15);
    ctx.fill();
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(session.pin_code, canvas.width / 2, qrY + qrSize + 220);

    // Protected formats
    const formats = session.protected_formats;
    const formatText = formats.map(f => f === 'openmic' ? '🎤 Open Mic' : '💌 Dediche').join('  •  ');
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(`Attivo per: ${formatText}`, canvas.width / 2, qrY + qrSize + 320);

    // Instructions
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Scansiona o vai su:', canvas.width / 2, 1500);
    
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.fillText('nonceduo.com', canvas.width / 2, 1560);

    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('per prenotare canzoni o dediche!', canvas.width / 2, 1620);

    // Footer
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('nonceduo.com', canvas.width / 2, 1850);

    // Download the image
    const link = document.createElement('a');
    link.download = `serata-live-${session.pin_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast.success('Immagine Stories scaricata!');
    setShowStoryGenerator(false);
  };

  // Generate QR code URL
  const eventUrl = getEventUrl();
  const qrCodeUrl = eventUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(eventUrl)}&bgcolor=ffffff&color=1a1a3a`
    : null;

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }

  const currentFormats = isActive ? (session?.protected_formats || []) : selectedFormats;

  return (
    <>
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
                {title || 'Serata Live'}
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

          {/* Format Selection (always visible when owner) */}
          {isOwner && (
            <div className="space-y-3 mb-4">
              <Label className="text-xs text-muted-foreground">
                Format protetti da PIN:
              </Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={currentFormats.includes('openmic')}
                    onCheckedChange={(checked) => handleFormatToggle('openmic', !!checked)}
                    disabled={isToggling}
                  />
                  <Mic2 className="w-4 h-4 text-primary" />
                  <span className="text-sm">Open Mic</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={currentFormats.includes('dediche')}
                    onCheckedChange={(checked) => handleFormatToggle('dediche', !!checked)}
                    disabled={isToggling}
                  />
                  <MessageSquare className="w-4 h-4 text-secondary" />
                  <span className="text-sm">Dediche</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Community resta sempre accessibile senza PIN
              </p>
            </div>
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
                    {isEditingPin ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editPinValue}
                          onChange={(e) => setEditPinValue(e.target.value.toUpperCase())}
                          className="w-32 h-8 text-lg font-mono font-bold tracking-wider"
                          maxLength={8}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSavePin}>
                          <Save className="w-4 h-4 text-green-500" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                        {session.pin_code}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {isOwner && !isEditingPin && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={handleEditPin} className="h-8 w-8">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Modifica PIN</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(session.pin_code, 'pin')}
                          className="h-8 w-8"
                        >
                          {copied === 'pin' ? (
                            <CheckCircle2 className="w-4 h-4 text-secondary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied === 'pin' ? 'Copiato!' : 'Copia PIN'}</p>
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
                </div>
              </div>

              {/* Event Link */}
              {eventUrl && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {eventUrl}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(eventUrl, 'link')}
                    className="h-7 w-7"
                  >
                    {copied === 'link' ? (
                      <CheckCircle2 className="w-3 h-3 text-secondary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Dialog open={showQR} onOpenChange={setShowQR}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <QrCode className="w-4 h-4" />
                      QR Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        QR Code Serata Live
                      </DialogTitle>
                      <DialogDescription>
                        Mostra questo QR code ai partecipanti per accedere all'evento
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      {qrCodeUrl && (
                        <div className="p-4 bg-white rounded-xl">
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code Evento"
                            className="w-48 h-48"
                          />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          PIN da inserire:
                        </p>
                        <p className="text-3xl font-mono font-bold tracking-wider text-primary">
                          {session.pin_code}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => copyToClipboard(session.pin_code, 'pin')} variant="outline" className="gap-2">
                          <Copy className="w-4 h-4" />
                          Copia PIN
                        </Button>
                        {eventUrl && (
                          <Button onClick={() => copyToClipboard(eventUrl, 'link')} variant="outline" className="gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Copia Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showStoryGenerator} onOpenChange={setShowStoryGenerator}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Image className="w-4 h-4" />
                      Stories
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Image className="w-5 h-5 text-primary" />
                        Genera Immagine Stories
                      </DialogTitle>
                      <DialogDescription>
                        Crea un'immagine verticale (1080×1920) ottimizzata per Instagram Stories
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      {/* Preview */}
                      <div className="w-48 h-80 rounded-2xl bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a] border border-primary/30 p-3 flex flex-col items-center justify-between text-white text-center overflow-hidden">
                        <div>
                          <p className="text-[8px] opacity-80">Evento Live</p>
                          <p className="text-[10px] font-bold text-pink-400">Non C'è Duo</p>
                          <p className="text-[6px] opacity-60">🎤 In corso ora!</p>
                        </div>
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                          <QrCode className="w-10 h-10 text-gray-800" />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold tracking-wider text-primary">
                            {session.pin_code}
                          </p>
                          <p className="text-[6px] opacity-60 mt-1">nonceduo.com</p>
                        </div>
                      </div>

                      <Button onClick={generateStoryImage} className="gap-2 w-full">
                        <Download className="w-4 h-4" />
                        Scarica Immagine PNG
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
};

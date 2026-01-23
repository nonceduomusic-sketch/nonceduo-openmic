import React, { useState, useRef, useEffect } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  Users,
  Trash2,
} from 'lucide-react';
import { useUnifiedLiveSession, FormatType } from '@/hooks/useUnifiedLiveSession';
import { useAdminPinSessionReset } from '@/hooks/usePinSession';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { adminAuditLog } from '@/lib/adminAudit';

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
    isPinActive,
    startSession, 
    stopSession, 
    updateFormats,
    updatePin,
    regeneratePin,
    removePin,
    restorePin,
    getEventUrl,
  } = useUnifiedLiveSession();

  const { resetAllSessions, countActiveSessions, resetting } = useAdminPinSessionReset();

  const [showQR, setShowQR] = useState(false);
  const [showStoryGenerator, setShowStoryGenerator] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(4);
  const [copied, setCopied] = useState<'pin' | 'link' | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<FormatType[]>(['openmic', 'dediche']);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [editPinValue, setEditPinValue] = useState('');
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(0);
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch active sessions count
  useEffect(() => {
    if (session?.id && isActive) {
      countActiveSessions(session.id).then(setActiveSessionsCount);
    }
  }, [session?.id, isActive, countActiveSessions]);

  // Handle reset all sessions
  const handleResetSessions = async () => {
    if (!session) return;
    
    const count = await resetAllSessions(session.id, 'admin_reset');
    
    await adminAuditLog({
      action: 'live_session_reset_all',
      section: 'global',
      entity: 'pin_sessions',
      entity_id: session.id,
      metadata: { invalidated_count: count }
    });
    
    toast.success(`${count} sessioni invalidate. Tutti gli utenti devono reinserire il PIN.`);
    setActiveSessionsCount(0);
  };

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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-2">
              <Radio className={cn(
                "w-5 h-5 md:w-4 md:h-4 transition-colors",
                isActive ? "text-primary animate-pulse" : "text-muted-foreground"
              )} />
              <span className="font-semibold text-base md:text-sm">
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
                        className={cn(
                          "scale-125 md:scale-100",
                          "data-[state=checked]:bg-primary"
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block">
                    <p>{isActive ? 'Disattiva Serata Live' : 'Attiva Serata Live'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="px-4 pb-4 pt-2">
          {!isOwner && !isActive && (
            <p className="text-base md:text-sm text-muted-foreground">
              Solo l'owner può attivare la modalità Serata Live
            </p>
          )}

          {/* PIN Toggle - Only shown when session is active */}
          {isActive && isOwner && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 border border-border/50 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className={cn(
                    "w-5 h-5",
                    isPinActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="font-medium text-sm">Protezione PIN</p>
                    <p className="text-xs text-muted-foreground">
                      {isPinActive 
                        ? 'Attiva – gli utenti devono inserire il PIN' 
                        : 'Disattivata – accesso diretto senza PIN'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPinActive}
                  onCheckedChange={async (checked) => {
                    setIsTogglingPin(true);
                    try {
                      if (checked) {
                        // Restore PIN with default formats
                        await restorePin(['openmic', 'dediche']);
                      } else {
                        // Remove PIN protection
                        await removePin();
                      }
                    } finally {
                      setIsTogglingPin(false);
                    }
                  }}
                  disabled={isTogglingPin}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              {!isPinActive && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Chiunque può accedere ai format senza inserire codici
                </p>
              )}
            </div>
          )}

          {/* Format Selection (only when PIN is active) */}
          {isOwner && isPinActive && (
            <div className="space-y-4 mb-4 md:space-y-3">
              <Label className="text-sm md:text-xs text-muted-foreground">
                Format protetti da PIN:
              </Label>
              {/* Mobile: vertical stack, Desktop: horizontal */}
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
                <label className={cn(
                  "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all",
                  "min-h-[52px] touch-target",
                  "md:p-2 md:min-h-0",
                  "bg-muted/30 hover:bg-muted/50 active:scale-[0.98]",
                  currentFormats.includes('openmic') && "bg-primary/10 border border-primary/30"
                )}>
                  <Checkbox
                    checked={currentFormats.includes('openmic')}
                    onCheckedChange={(checked) => handleFormatToggle('openmic', !!checked)}
                    disabled={isToggling}
                    className="w-6 h-6 md:w-4 md:h-4"
                  />
                  <Mic2 className="w-5 h-5 md:w-4 md:h-4 text-primary" />
                  <span className="text-base md:text-sm font-medium">Open Mic</span>
                </label>
                <label className={cn(
                  "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all",
                  "min-h-[52px] touch-target",
                  "md:p-2 md:min-h-0",
                  "bg-muted/30 hover:bg-muted/50 active:scale-[0.98]",
                  currentFormats.includes('dediche') && "bg-secondary/10 border border-secondary/30"
                )}>
                  <Checkbox
                    checked={currentFormats.includes('dediche')}
                    onCheckedChange={(checked) => handleFormatToggle('dediche', !!checked)}
                    disabled={isToggling}
                    className="w-6 h-6 md:w-4 md:h-4"
                  />
                  <MessageSquare className="w-5 h-5 md:w-4 md:h-4 text-secondary" />
                  <span className="text-base md:text-sm font-medium">Dediche</span>
                </label>
              </div>
              <p className="text-sm md:text-xs text-muted-foreground italic">
                Community resta sempre accessibile senza PIN
              </p>
            </div>
          )}

          {/* Format Selection when session NOT active (for starting) */}
          {isOwner && !isActive && (
            <div className="space-y-4 mb-4 md:space-y-3">
              <Label className="text-sm md:text-xs text-muted-foreground">
                Format protetti da PIN:
              </Label>
              {/* Mobile: vertical stack, Desktop: horizontal */}
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
                <label className={cn(
                  "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all",
                  "min-h-[52px] touch-target",
                  "md:p-2 md:min-h-0",
                  "bg-muted/30 hover:bg-muted/50 active:scale-[0.98]",
                  selectedFormats.includes('openmic') && "bg-primary/10 border border-primary/30"
                )}>
                  <Checkbox
                    checked={selectedFormats.includes('openmic')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFormats(prev => [...prev, 'openmic']);
                      } else {
                        setSelectedFormats(prev => prev.filter(f => f !== 'openmic'));
                      }
                    }}
                    disabled={isToggling}
                    className="w-6 h-6 md:w-4 md:h-4"
                  />
                  <Mic2 className="w-5 h-5 md:w-4 md:h-4 text-primary" />
                  <span className="text-base md:text-sm font-medium">Open Mic</span>
                </label>
                <label className={cn(
                  "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all",
                  "min-h-[52px] touch-target",
                  "md:p-2 md:min-h-0",
                  "bg-muted/30 hover:bg-muted/50 active:scale-[0.98]",
                  selectedFormats.includes('dediche') && "bg-secondary/10 border border-secondary/30"
                )}>
                  <Checkbox
                    checked={selectedFormats.includes('dediche')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFormats(prev => [...prev, 'dediche']);
                      } else {
                        setSelectedFormats(prev => prev.filter(f => f !== 'dediche'));
                      }
                    }}
                    disabled={isToggling}
                    className="w-6 h-6 md:w-4 md:h-4"
                  />
                  <MessageSquare className="w-5 h-5 md:w-4 md:h-4 text-secondary" />
                  <span className="text-base md:text-sm font-medium">Dediche</span>
                </label>
              </div>
              <p className="text-sm md:text-xs text-muted-foreground italic">
                Community resta sempre accessibile senza PIN
              </p>
            </div>
          )}

          {!isActive && isOwner && (
            <div className="space-y-4 md:space-y-3">
              <p className="text-base md:text-sm text-muted-foreground">
                Attiva per richiedere un PIN per le prenotazioni durante la serata.
              </p>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Label htmlFor="expires" className="text-sm md:text-xs text-muted-foreground whitespace-nowrap">
                  Scadenza (ore):
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="expires"
                    type="number"
                    min={0}
                    max={12}
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 0)}
                    className="w-24 h-12 md:w-20 md:h-8 text-lg md:text-sm text-center"
                    placeholder="0 = mai"
                  />
                  <span className="text-sm md:text-xs text-muted-foreground">
                    (0 = nessuna scadenza)
                  </span>
                </div>
              </div>
            </div>
          )}

          {isActive && session && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              {/* PIN Display - Mobile optimized */}
              <div className="flex flex-col gap-4 p-4 md:p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 md:w-5 md:h-5 text-primary" />
                    <div>
                      <p className="text-sm md:text-xs text-muted-foreground">PIN Serata</p>
                      {isEditingPin ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={editPinValue}
                            onChange={(e) => setEditPinValue(e.target.value.toUpperCase())}
                            className="w-36 h-12 md:w-32 md:h-8 text-xl md:text-lg font-mono font-bold tracking-wider"
                            maxLength={8}
                            autoFocus
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-12 w-12 md:h-8 md:w-8 touch-target" 
                            onClick={handleSavePin}
                          >
                            <Save className="w-5 h-5 md:w-4 md:h-4 text-secondary" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-3xl md:text-2xl font-mono font-bold tracking-wider text-primary">
                          {session.pin_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action buttons - Mobile: full width row */}
                <div className="flex gap-2 flex-wrap">
                  {isOwner && !isEditingPin && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleEditPin} 
                      className="h-11 md:h-8 px-4 md:px-3 flex-1 md:flex-none gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="md:hidden">Modifica</span>
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(session.pin_code, 'pin')}
                    className="h-11 md:h-8 px-4 md:px-3 flex-1 md:flex-none gap-2"
                  >
                    {copied === 'pin' ? (
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="md:hidden">{copied === 'pin' ? 'Copiato!' : 'Copia'}</span>
                  </Button>

                  {isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegeneratePin}
                      className="h-11 md:h-8 px-4 md:px-3 flex-1 md:flex-none gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="md:hidden">Rigenera</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Event Link - Mobile optimized */}
              {eventUrl && (
                <div className="flex items-center gap-2 p-3 md:p-2 rounded-lg bg-muted/30">
                  <LinkIcon className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm md:text-xs text-muted-foreground truncate flex-1">
                    {eventUrl}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(eventUrl, 'link')}
                    className="h-10 w-10 md:h-7 md:w-7 flex-shrink-0"
                  >
                    {copied === 'link' ? (
                      <CheckCircle2 className="w-4 h-4 md:w-3 md:h-3 text-secondary" />
                    ) : (
                      <Copy className="w-4 h-4 md:w-3 md:h-3" />
                    )}
                  </Button>
                </div>
              )}

              {/* Action Buttons - Mobile: stacked, Desktop: horizontal */}
              <div className="grid grid-cols-2 gap-3 md:flex md:gap-2">
                <Dialog open={showQR} onOpenChange={setShowQR}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-12 md:h-9 md:flex-1 gap-2 text-base md:text-sm">
                      <QrCode className="w-5 h-5 md:w-4 md:h-4" />
                      QR Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg md:text-base">
                        <QrCode className="w-5 h-5 text-primary" />
                        QR Code Serata Live
                      </DialogTitle>
                      <DialogDescription className="text-base md:text-sm">
                        Mostra questo QR code ai partecipanti per accedere all'evento
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      {qrCodeUrl && (
                        <div className="p-4 bg-white rounded-xl">
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code Evento"
                            className="w-56 h-56 md:w-48 md:h-48"
                          />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-base md:text-sm text-muted-foreground mb-1">
                          PIN da inserire:
                        </p>
                        <p className="text-4xl md:text-3xl font-mono font-bold tracking-wider text-primary">
                          {session.pin_code}
                        </p>
                      </div>
                      <div className="flex flex-col w-full gap-2 md:flex-row md:w-auto">
                        <Button 
                          onClick={() => copyToClipboard(session.pin_code, 'pin')} 
                          variant="outline" 
                          className="h-12 md:h-10 gap-2 text-base md:text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copia PIN
                        </Button>
                        {eventUrl && (
                          <Button 
                            onClick={() => copyToClipboard(eventUrl, 'link')} 
                            variant="outline" 
                            className="h-12 md:h-10 gap-2 text-base md:text-sm"
                          >
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
                    <Button variant="outline" className="h-12 md:h-9 md:flex-1 gap-2 text-base md:text-sm">
                      <Image className="w-5 h-5 md:w-4 md:h-4" />
                      Stories
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg md:text-base">
                        <Image className="w-5 h-5 text-primary" />
                        Genera Immagine Stories
                      </DialogTitle>
                      <DialogDescription className="text-base md:text-sm">
                        Crea un'immagine verticale (1080×1920) ottimizzata per Instagram Stories
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      {/* Preview - larger on mobile */}
                      <div className="w-52 h-[340px] md:w-48 md:h-80 rounded-2xl bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a] border border-primary/30 p-3 flex flex-col items-center justify-between text-white text-center overflow-hidden">
                        <div>
                          <p className="text-[9px] md:text-[8px] opacity-80">Evento Live</p>
                          <p className="text-[11px] md:text-[10px] font-bold text-pink-400">Non C'è Duo</p>
                          <p className="text-[7px] md:text-[6px] opacity-60">🎤 In corso ora!</p>
                        </div>
                        <div className="w-20 h-20 md:w-16 md:h-16 bg-white rounded-lg flex items-center justify-center">
                          <QrCode className="w-12 h-12 md:w-10 md:h-10 text-gray-800" />
                        </div>
                        <div>
                          <p className="text-[9px] md:text-[8px] font-bold tracking-wider text-primary">
                            {session.pin_code}
                          </p>
                          <p className="text-[7px] md:text-[6px] opacity-60 mt-1">nonceduo.com</p>
                        </div>
                      </div>

                      <Button 
                        onClick={generateStoryImage} 
                        className="gap-2 w-full h-12 md:h-10 text-base md:text-sm"
                      >
                        <Download className="w-5 h-5 md:w-4 md:h-4" />
                        Scarica Immagine PNG
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Active Sessions & Reset */}
              {isOwner && (
                <div className="flex flex-col gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Sessioni attive: <span className="font-bold text-foreground">{activeSessionsCount}</span>
                      </span>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-9 md:h-8 gap-2"
                          disabled={activeSessionsCount === 0 || resetting}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden md:inline">Reset Sessioni</span>
                          <span className="md:hidden">Reset</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-destructive" />
                            Reset Sessioni PIN
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-base md:text-sm">
                            Questa azione invaliderà <span className="font-bold">{activeSessionsCount}</span> sessioni attive.
                            Tutti gli utenti dovranno reinserire il PIN per accedere.
                            <br /><br />
                            <span className="text-muted-foreground">
                              Utile se vuoi forzare tutti a reinserire il codice (es. cambio location, pausa serata).
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                          <AlertDialogCancel className="h-11 md:h-10">Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleResetSessions}
                            className="h-11 md:h-10 bg-destructive hover:bg-destructive/90"
                          >
                            {resetting ? 'Reset in corso...' : 'Conferma Reset'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Gli utenti con sessione valida possono rientrare senza PIN. Cambiando PIN, tutte le sessioni vengono invalidate automaticamente.
                  </p>
                </div>
              )}

              {/* Session Info */}
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm md:text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 md:w-3 md:h-3" />
                  <span>
                    Attiva da {formatDistanceToNow(new Date(session.created_at), { locale: it })}
                  </span>
                </div>
                {session.expires_at && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 md:w-3 md:h-3" />
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

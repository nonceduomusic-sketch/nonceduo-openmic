import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Copy, 
  RefreshCw, 
  QrCode, 
  Shield,
  CheckCircle2,
  Mic2,
  MessageSquare,
  Link as LinkIcon,
  Edit2,
  Save,
  Users,
  Trash2,
  Lock,
  Unlock,
  Download,
} from 'lucide-react';
import { useUnifiedLiveSession, FormatType } from '@/hooks/useUnifiedLiveSession';
import { useAdminPinSessionReset } from '@/hooks/usePinSession';
import { useAdmin } from '@/contexts/AdminContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { adminAuditLog } from '@/lib/adminAudit';
import QRCode from 'qrcode';

interface PinProtectionCardProps {
  title?: string;
}

export const PinProtectionCard: React.FC<PinProtectionCardProps> = ({ 
  title = 'Protezione PIN'
}) => {
  const { staffRole } = useAdmin();

  const { 
    session, 
    loading, 
    isOwner,
    isActive,
    isPinActive,
    updateFormats,
    updatePin,
    regeneratePin,
    removePin,
    restorePin,
    getEventUrl,
    regenerateLinkCode,
  } = useUnifiedLiveSession();

  // Reset PIN sessions is allowed for Owner + Admin (matches backend policies)
  const canDisconnectAll = isOwner || staffRole === 'owner' || staffRole === 'admin';

  const { resetAllSessions, countActiveSessions, resetting } = useAdminPinSessionReset();

  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<'pin' | 'link' | null>(null);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [editPinValue, setEditPinValue] = useState('');
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(0);
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const [loadingSessionCount, setLoadingSessionCount] = useState(false);

  // Generate QR code when dialog opens
  const eventUrl = getEventUrl();
  
  useEffect(() => {
    if (showQR && eventUrl) {
      QRCode.toDataURL(eventUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a3a',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [showQR, eventUrl]);

  // Fetch active sessions count - refetch periodically and after actions
  const refreshSessionCount = useCallback(async () => {
    if (!session?.id || !isActive) {
      setActiveSessionsCount(0);
      return;
    }
    setLoadingSessionCount(true);
    try {
      const count = await countActiveSessions(session.id);
      setActiveSessionsCount(count);
    } finally {
      setLoadingSessionCount(false);
    }
  }, [session?.id, isActive, countActiveSessions]);

  useEffect(() => {
    refreshSessionCount();
    // Also refresh every 30 seconds while component is mounted
    const interval = setInterval(refreshSessionCount, 30000);
    return () => clearInterval(interval);
  }, [refreshSessionCount]);

  // Handle reset all sessions
  const handleResetSessions = async () => {
    if (!session) return;
    
    // Re-check count before invalidating to give accurate feedback
    const currentCount = await countActiveSessions(session.id);
    
    if (currentCount === 0) {
      toast.info('Nessuna sessione attiva da invalidare.');
      setActiveSessionsCount(0);
      return;
    }
    
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
    
    // Refresh count after a short delay to confirm
    setTimeout(refreshSessionCount, 1000);
  };

  const handleFormatToggle = async (format: FormatType, checked: boolean) => {
    if (!isPinActive) return;
    
    const newFormats = checked 
      ? [...(session?.protected_formats || []), format]
      : (session?.protected_formats || []).filter(f => f !== format);
    
    if (newFormats.length === 0) {
      toast.error('Seleziona almeno un format');
      return;
    }
    
    await updateFormats(newFormats as FormatType[]);
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

  const handleTogglePin = async (enabled: boolean) => {
    setIsTogglingPin(true);
    try {
      if (enabled) {
        await restorePin(['openmic', 'dediche']);
      } else {
        await removePin();
      }
    } finally {
      setIsTogglingPin(false);
    }
  };

  // eventUrl is already defined at the top of the component

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  // Don't show if no active session
  if (!isActive) {
    return (
      <Card className="glass-card border-border/50 opacity-60">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-5 h-5 md:w-4 md:h-4" />
            <span className="font-semibold text-base md:text-sm">{title}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Attiva prima "Stato Evento" per gestire la protezione PIN
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentFormats = session?.protected_formats || [];

  return (
    <Card className={cn(
      "glass-card transition-all duration-300",
      isPinActive ? "border-secondary/50 bg-secondary/5" : "border-border/50"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPinActive ? (
              <Lock className="w-5 h-5 md:w-4 md:h-4 text-secondary" />
            ) : (
              <Unlock className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-base md:text-sm">{title}</span>
            {isPinActive && (
              <Badge className="bg-secondary/20 text-secondary text-xs">
                ATTIVO
              </Badge>
            )}
          </div>
          
          {isOwner && (
            <Switch
              checked={isPinActive}
              onCheckedChange={handleTogglePin}
              disabled={isTogglingPin}
              className={cn(
                "scale-125 md:scale-100",
                "data-[state=checked]:bg-secondary"
              )}
            />
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {isPinActive 
            ? 'Gli utenti devono inserire il PIN per accedere' 
            : 'Accesso libero senza codice'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-2 space-y-4">
        {/* PIN Display - only when active */}
        {isPinActive && session && (
          <>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/10 border border-secondary/20">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-secondary" />
                <div>
                  <p className="text-xs text-muted-foreground">PIN Serata</p>
                  {isEditingPin ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editPinValue}
                        onChange={(e) => setEditPinValue(e.target.value.toUpperCase())}
                        className="w-28 h-8 text-lg font-mono font-bold tracking-wider uppercase"
                        maxLength={8}
                      />
                      <Button size="icon" variant="ghost" onClick={handleSavePin} className="h-8 w-8">
                        <Save className="w-4 h-4 text-secondary" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-2xl font-mono font-bold tracking-wider text-secondary">
                      {session.pin_code}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
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

                {isOwner && !isEditingPin && (
                  <>
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

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={handleRegeneratePin} className="h-8 w-8">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Genera nuovo PIN</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}

                <Dialog open={showQR} onOpenChange={setShowQR}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-secondary" />
                        QR Code Evento
                      </DialogTitle>
                      <DialogDescription>
                        Scansionando il QR code, i partecipanti arrivano alla pagina dell'evento.
                        <br />
                        <span className="text-xs text-secondary">Il PIN lo comunichi tu a voce quando vuoi!</span>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      {qrCodeDataUrl ? (
                        <div className="p-4 bg-white rounded-xl shadow-lg">
                          <img 
                            src={qrCodeDataUrl} 
                            alt="QR Code Evento"
                            className="w-48 h-48"
                          />
                        </div>
                      ) : (
                        <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
                          <div className="animate-spin w-8 h-8 border-2 border-secondary border-t-transparent rounded-full" />
                        </div>
                      )}
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Link evento (senza PIN)
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs break-all">
                          {eventUrl}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            if (eventUrl) {
                              navigator.clipboard.writeText(eventUrl).then(() => {
                                setCopied('link');
                                setTimeout(() => setCopied(null), 2000);
                                toast.success('Link copiato!');
                              }).catch(() => {
                                toast.error('Errore nel copiare il link');
                              });
                            }
                          }} 
                          variant="outline" 
                          className="gap-2"
                        >
                          {copied === 'link' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-secondary" />
                              Copiato!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copia Link
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => {
                            if (qrCodeDataUrl) {
                              // Check if on iOS/Safari
                              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                              
                              if (isIOS) {
                                // iOS: Open in new tab for manual save
                                const newTab = window.open();
                                if (newTab) {
                                  newTab.document.write(`
                                    <html>
                                      <head><title>QR Code Evento</title></head>
                                      <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;">
                                        <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width:90%;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />
                                        <p style="margin-top:16px;font-family:system-ui;color:#666;">Tieni premuto sull'immagine per salvare</p>
                                      </body>
                                    </html>
                                  `);
                                  newTab.document.close();
                                }
                                toast.success('Tieni premuto per salvare l\'immagine');
                              } else {
                                // Android/Desktop: Direct download
                                const link = document.createElement('a');
                                link.href = qrCodeDataUrl;
                                link.download = 'qr-code-evento.png';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast.success('QR Code scaricato!');
                              }
                            }
                          }}
                          variant="outline"
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Scarica
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Event Link */}
            {eventUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-muted-foreground flex-1">{eventUrl}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(eventUrl, 'link')}
                    className="h-6 w-6 flex-shrink-0"
                  >
                    {copied === 'link' ? (
                      <CheckCircle2 className="w-3 h-3 text-secondary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await regenerateLinkCode();
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Rigenera link (cambierà URL)
                  </Button>
                )}
              </div>
            )}

            {/* Format Selection */}
            {isOwner && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Format protetti da PIN:
                </Label>
                <div className="flex flex-col gap-2 md:flex-row md:gap-4">
                  <label className={cn(
                    "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all",
                    "min-h-[48px]",
                    "bg-muted/30 hover:bg-muted/50",
                    currentFormats.includes('openmic') && "bg-primary/10 border border-primary/30"
                  )}>
                    <Checkbox
                      checked={currentFormats.includes('openmic')}
                      onCheckedChange={(checked) => handleFormatToggle('openmic', !!checked)}
                      className="w-5 h-5"
                    />
                    <Mic2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Open Mic</span>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all",
                    "min-h-[48px]",
                    "bg-muted/30 hover:bg-muted/50",
                    currentFormats.includes('dediche') && "bg-secondary/10 border border-secondary/30"
                  )}>
                    <Checkbox
                      checked={currentFormats.includes('dediche')}
                      onCheckedChange={(checked) => handleFormatToggle('dediche', !!checked)}
                      className="w-5 h-5"
                    />
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium">Dediche</span>
                  </label>
                </div>
              </div>
            )}

          </>
        )}

        {/* Active Sessions Count + Reset (show whenever there is an active session) */}
        {canDisconnectAll && session && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                {loadingSessionCount
                  ? 'Caricamento...'
                  : activeSessionsCount > 0
                    ? `${activeSessionsCount} utenti connessi`
                    : 'Nessun utente connesso'}
              </span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Sconnetti tutti
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Invalidare tutte le sessioni?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tutti gli utenti dovranno reinserire il PIN per accedere.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetSessions} disabled={resetting}>
                    {resetting ? 'Invalidando...' : 'Conferma'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

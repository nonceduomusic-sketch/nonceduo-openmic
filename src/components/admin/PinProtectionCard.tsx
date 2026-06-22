import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedLiveSession, FormatType } from '@/hooks/useUnifiedLiveSession';
import { useAdminPinSessionReset } from '@/hooks/usePinSession';
import { useConnectedUsersCount } from '@/hooks/useConnectedUsersCount';
import { useAdmin } from '@/contexts/AdminContext';
import { ConnectedUsersDialog } from './ConnectedUsersDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { adminAuditLog } from '@/lib/adminAudit';
import { syncPinDisplayToLAN } from '@/lib/autoSyncLAN';
import QRCode from 'qrcode';

interface PinProtectionCardProps {
  title?: string;
  pinRequired?: boolean;
  pinCode?: string | null;
  onPinConfigChange?: (updates: { pinRequired?: boolean; pinCode?: string | null }) => Promise<boolean>;
  generatePin?: () => string;
}

export const PinProtectionCard: React.FC<PinProtectionCardProps> = ({ 
  title = 'Protezione PIN',
  pinRequired = false,
  pinCode = null,
  onPinConfigChange,
  generatePin,
}) => {
  const { staffRole } = useAdmin();

  const { 
    session, 
    loading, 
    isOwner,
    isActive,
    isPinActive,
    updateFormats,
    updatePin: updateLivePin,
    regeneratePin: regenerateLivePin,
    removePin,
    restorePin,
    getEventUrl,
    regenerateLinkCode,
  } = useUnifiedLiveSession();

  // Reset PIN sessions is allowed for Owner + Admin (matches backend policies)
  const canDisconnectAll = isOwner || staffRole === 'owner' || staffRole === 'admin';

  const { resetAllSessions, resetting } = useAdminPinSessionReset();
  const { count: activeSessionsCount, loading: loadingSessionCount, refresh: refreshSessionCount } = useConnectedUsersCount(session?.id || null);

  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<'pin' | 'link' | null>(null);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [editPinValue, setEditPinValue] = useState('');
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const [showPinOnGate, setShowPinOnGate] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [localPinRequired, setLocalPinRequired] = useState(pinRequired);
  const [localPinCode, setLocalPinCode] = useState(pinCode || '');

  const canManageWithoutSession = Boolean(onPinConfigChange);
  const canEditPin = isOwner || staffRole === 'owner';
  const resolvedPinActive = session ? isPinActive : localPinRequired;
  const resolvedPinCode = session?.pin_code ?? localPinCode;

  useEffect(() => {
    setLocalPinRequired(pinRequired);
    setLocalPinCode(pinCode || '');
  }, [pinRequired, pinCode]);

  const defaultGeneratePin = useCallback(() => {
    return (generatePin?.() || Math.floor(1000 + Math.random() * 9000).toString())
      .toUpperCase()
      .trim();
  }, [generatePin]);

  // Load showPinOnGate from event_booking_rules or free_mode_settings
  useEffect(() => {
    const loadShowPinSetting = async () => {
      // Try live event first
      const { data: liveData } = await supabase
        .from('event_booking_rules')
        .select('show_pin_on_gate')
        .eq('event_status', 'live')
        .maybeSingle();
      
      if (liveData) {
        setShowPinOnGate((liveData as any).show_pin_on_gate ?? false);
        return;
      }

      // Try free mode
      const { data: freeData } = await supabase
        .from('free_mode_settings')
        .select('show_pin_on_gate')
        .eq('is_active', true)
        .maybeSingle();
      
      if (freeData) {
        setShowPinOnGate((freeData as any).show_pin_on_gate ?? false);
      }
    };
    
    if (isPinActive) {
      loadShowPinSetting();
      return;
    }

    setShowPinOnGate(false);
  }, [isPinActive]);

  useEffect(() => {
    void syncPinDisplayToLAN({
      pinCode: isPinActive ? session?.pin_code ?? null : null,
      showPinOnGate: isPinActive && showPinOnGate,
      pinRequired: isPinActive,
      liveSessionId: session?.id ?? null,
      protectedFormats: (session?.protected_formats as string[] | undefined) ?? [],
      expiresAt: (session as { expires_at?: string | null } | null)?.expires_at ?? null,
    });
  }, [session?.id, session?.pin_code, (session as { expires_at?: string | null } | null)?.expires_at, session?.protected_formats, isPinActive, showPinOnGate]);

  const handleToggleShowPin = async (checked: boolean) => {
    setShowPinOnGate(checked);
    
    // Update in event_booking_rules (live event)
    const { data: liveData } = await supabase
      .from('event_booking_rules')
      .select('id')
      .eq('event_status', 'live')
      .maybeSingle();
    
    if (liveData) {
      await supabase
        .from('event_booking_rules')
        .update({ show_pin_on_gate: checked } as any)
        .eq('id', liveData.id);
    }

    // Update in free_mode_settings
    const { data: freeData } = await supabase
      .from('free_mode_settings')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();
    
    if (freeData) {
      await supabase
        .from('free_mode_settings')
        .update({ show_pin_on_gate: checked } as any)
        .eq('id', freeData.id);
    }

    toast.success(checked ? 'PIN visibile nella pagina di accesso' : 'PIN nascosto dalla pagina di accesso');
  };

  const syncPublicPinState = useCallback(async (enabled: boolean, pinCode: string | null) => {
    try {
      const [liveResult, freeResult] = await Promise.all([
        supabase
          .from('event_booking_rules')
          .select('id')
          .eq('event_status', 'live')
          .maybeSingle(),
        supabase
          .from('free_mode_settings')
          .select('id')
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (liveResult.error) {
        console.error('[PinProtectionCard] Error reading live event for PIN sync:', liveResult.error);
      }

      if (freeResult.error) {
        console.error('[PinProtectionCard] Error reading free mode for PIN sync:', freeResult.error);
      }

      const updateQueries = [];

      if (liveResult.data?.id) {
        updateQueries.push(
          supabase
            .from('event_booking_rules')
            .update({
              pin_required: enabled,
              pin_code: pinCode,
            } as any)
            .eq('id', liveResult.data.id)
        );
      }

      if (freeResult.data?.id) {
        updateQueries.push(
          supabase
            .from('free_mode_settings')
            .update({
              pin_enabled: enabled,
              pin_code: pinCode,
            } as any)
            .eq('id', freeResult.data.id)
        );
      }

      if (updateQueries.length > 0) {
        await Promise.all(updateQueries);
      }
    } catch (error) {
      console.error('[PinProtectionCard] Error syncing public PIN state:', error);
    }
  }, []);

  const persistPinConfig = useCallback(async (updates: { pinRequired?: boolean; pinCode?: string | null }) => {
    if (!onPinConfigChange) {
      return false;
    }

    const success = await onPinConfigChange(updates);

    if (success) {
      if (updates.pinRequired !== undefined) {
        setLocalPinRequired(updates.pinRequired);
      }

      if (updates.pinCode !== undefined) {
        setLocalPinCode(updates.pinCode || '');
      }
    }

    return success;
  }, [onPinConfigChange]);

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

  // Session count is now managed by useConnectedUsersCount (realtime + polling)

  // Handle reset all sessions
  const handleResetSessions = async () => {
    if (!session) return;
    
    if (activeSessionsCount === 0) {
      toast.info('Nessuna sessione attiva da invalidare.');
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
    if (resolvedPinCode) {
      setEditPinValue(resolvedPinCode);
      setIsEditingPin(true);
    }
  };

  const handleSavePin = async () => {
    const cleanPin = editPinValue.toUpperCase().trim();

    if (cleanPin.length < 4 || cleanPin.length > 8) {
      toast.error('Il PIN deve contenere da 4 a 8 caratteri');
      return;
    }

    if (session) {
      const success = await updateLivePin(cleanPin);

      if (success) {
        await syncPublicPinState(true, cleanPin);
        setIsEditingPin(false);
      }

      return;
    }

    const success = await persistPinConfig({
      pinRequired: localPinRequired,
      pinCode: cleanPin,
    });

    if (success) {
      toast.success(`PIN aggiornato: ${cleanPin}`);
      setIsEditingPin(false);
    }
  };

  const handleRegeneratePin = async () => {
    if (session) {
      const newPin = await regenerateLivePin();
      if (newPin) {
        await syncPublicPinState(true, newPin);
      }
      return;
    }

    const newPin = defaultGeneratePin();
    const success = await persistPinConfig({
      pinRequired: true,
      pinCode: newPin,
    });

    if (success) {
      toast.success(`Nuovo PIN generato: ${newPin}`);
    }
  };

  const handleTogglePin = async (enabled: boolean) => {
    const nextPin = enabled ? (resolvedPinCode || defaultGeneratePin()) : null;

    if (!session) {
      if (!canManageWithoutSession) {
        return;
      }

      setIsTogglingPin(true);

      try {
        const success = await persistPinConfig({
          pinRequired: enabled,
          pinCode: nextPin,
        });

        if (success) {
          toast.success(
            enabled
              ? `PIN attivato: ${nextPin}`
              : 'PIN disattivato'
          );
        } else {
          toast.error('Impossibile aggiornare la configurazione PIN');
        }
      } finally {
        setIsTogglingPin(false);
      }

      return;
    }

    setIsTogglingPin(true);
    try {
      const success = enabled
        ? await restorePin(['openmic', 'dediche'])
        : await removePin();

      if (!success) {
        return;
      }

      await syncPublicPinState(enabled, nextPin);
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
  if (!isActive && !canManageWithoutSession) {
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
      resolvedPinActive ? "border-secondary/50 bg-secondary/5" : "border-border/50"
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {resolvedPinActive ? (
              <Lock className="w-5 h-5 md:w-4 md:h-4 text-secondary" />
            ) : (
              <Unlock className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-base md:text-sm">{title}</span>
            {resolvedPinActive && (
              <Badge className="bg-secondary/20 text-secondary text-xs">
                ATTIVO
              </Badge>
            )}
          </div>
          
          {canEditPin && (
            <Switch
              checked={resolvedPinActive}
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
          {resolvedPinActive
            ? session
              ? 'Gli utenti devono inserire il PIN per accedere'
              : 'PIN configurato: sarà richiesto non appena attivi l\'evento'
            : 'Puoi attivare o disattivare il PIN prima o durante l\'evento'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-2 space-y-4">
        {/* PIN Display - only when active */}
        {resolvedPinActive && (
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
                      {resolvedPinCode}
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
                        onClick={() => copyToClipboard(resolvedPinCode, 'pin')}
                        className="h-8 w-8"
                        disabled={!resolvedPinCode}
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

                {canEditPin && !isEditingPin && (
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

                {session && (
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
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-4 py-4">
                        {!eventUrl ? (
                          <div className="w-48 h-48 bg-muted rounded-xl flex flex-col items-center justify-center text-center p-4">
                            <p className="text-sm text-muted-foreground">Link evento non disponibile</p>
                            <p className="text-xs text-muted-foreground mt-2">Prova a rigenerare il link</p>
                          </div>
                        ) : qrCodeDataUrl ? (
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
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground max-w-xs break-all">
                            {eventUrl || 'Non disponibile'}
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
                                }).catch((err) => {
                                  console.error('Clipboard error:', err);
                                  toast.error('Errore nel copiare il link');
                                });
                              } else {
                                toast.error('Link non disponibile');
                              }
                            }} 
                            variant="outline" 
                            className="gap-2"
                            disabled={!eventUrl}
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
                                try {
                                  const link = document.createElement('a');
                                  link.href = qrCodeDataUrl;
                                  link.download = 'qr-code-evento.png';
                                  link.style.display = 'none';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  toast.success('Download avviato!');
                                } catch (error) {
                                  console.error('Download error:', error);
                                  window.open(qrCodeDataUrl, '_blank');
                                  toast.info('Tieni premuto sull\'immagine per salvare');
                                }
                              } else {
                                toast.error('QR Code non disponibile');
                              }
                            }}
                            variant="outline"
                            className="gap-2"
                            disabled={!qrCodeDataUrl}
                          >
                            <Download className="w-4 h-4" />
                            Scarica
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {!session && (
              <p className="text-xs text-muted-foreground">
                Il PIN è già configurato e puoi cambiarlo anche prima dell'avvio dell'evento.
              </p>
            )}

            {/* Event Link */}
            {session && eventUrl && (
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
                {canEditPin && (
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
            {session && canEditPin && (
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

            {/* Show PIN on TV/Trasmetti toggle */}
            {session && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Mostra PIN su TV e Trasmetti</p>
                      <p className="text-xs text-muted-foreground">
                        Il PIN sarà visibile sotto il QR code nelle pagine di proiezione
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={showPinOnGate}
                    onCheckedChange={handleToggleShowPin}
                    className="scale-110 md:scale-100"
                  />
                </div>
              </>
            )}

          </>
        )}

        {/* Active Sessions Count + Reset (show whenever there is an active session) */}
        {canDisconnectAll && (
          <>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
              <button
                type="button"
                onClick={() => session && activeSessionsCount > 0 && setShowUsersDialog(true)}
                className={cn(
                  "flex items-center gap-2 text-sm text-muted-foreground transition-colors",
                  session && activeSessionsCount > 0
                    ? "hover:text-foreground cursor-pointer"
                    : "cursor-default"
                )}
              >
                <Users className="w-4 h-4" />
                <span>
                  {!session
                    ? '0 utenti connessi'
                    : loadingSessionCount
                      ? 'Caricamento...'
                      : activeSessionsCount > 0
                        ? `${activeSessionsCount} utenti connessi`
                        : 'Nessun utente connesso'}
                </span>
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                    disabled={!session || activeSessionsCount === 0 || resetting}
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

            {/* Connected Users Dialog */}
            {session && (
              <ConnectedUsersDialog
                open={showUsersDialog}
                onOpenChange={setShowUsersDialog}
                liveSessionId={session.id}
                onSessionsChanged={refreshSessionCount}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

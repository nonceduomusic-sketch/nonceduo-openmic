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

interface FreeModePinConfig {
  id: string;
  isActive: boolean;
  pinEnabled: boolean;
  pinCode: string | null;
  showPinOnGate: boolean;
}

interface PinProtectionCardProps {
  title?: string;
  freeModeConfig?: FreeModePinConfig;
  onUpdateFreeModeConfig?: (updates: {
    pin_enabled?: boolean;
    pin_code?: string | null;
    show_pin_on_gate?: boolean;
  }) => Promise<boolean>;
}

interface DraftPinSession {
  id: string;
  pin_code: string;
  protected_formats: FormatType[];
  event_link_code: string | null;
}

const DEFAULT_FORMATS: FormatType[] = ['openmic', 'dediche'];

const generateDraftPin = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

export const PinProtectionCard: React.FC<PinProtectionCardProps> = ({
  title = 'Protezione PIN',
  freeModeConfig,
  onUpdateFreeModeConfig,
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

  const canDisconnectAll = isOwner || staffRole === 'owner' || staffRole === 'admin';

  const { resetAllSessions, resetting } = useAdminPinSessionReset();
  const {
    count: activeSessionsCount,
    loading: loadingSessionCount,
    refresh: refreshSessionCount,
  } = useConnectedUsersCount(session?.id || null);

  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<'pin' | 'link' | null>(null);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [editPinValue, setEditPinValue] = useState('');
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const [showPinOnGate, setShowPinOnGate] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [draftSession, setDraftSession] = useState<DraftPinSession | null>(null);
  const [draftLoading, setDraftLoading] = useState(Boolean(freeModeConfig));

  const eventIsActive = freeModeConfig?.isActive ?? isActive;
  const displayIsPinActive = freeModeConfig?.pinEnabled ?? isPinActive;

  const fetchDraftSession = useCallback(async () => {
    if (!freeModeConfig) {
      setDraftSession(null);
      setDraftLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('id, pin_code, protected_formats, event_link_code')
        .eq('section', 'global')
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[PinProtectionCard] Error loading draft session:', error);
        setDraftSession(null);
        return;
      }

      if (!data) {
        setDraftSession(null);
        return;
      }

      setDraftSession({
        id: data.id,
        pin_code: String(data.pin_code || '').toUpperCase().trim(),
        protected_formats: ((data.protected_formats as FormatType[] | null) ?? []).filter(Boolean) as FormatType[],
        event_link_code: data.event_link_code ?? null,
      });
    } catch (error) {
      console.error('[PinProtectionCard] Error loading draft session:', error);
      setDraftSession(null);
    } finally {
      setDraftLoading(false);
    }
  }, [freeModeConfig]);

  useEffect(() => {
    setDraftLoading(Boolean(freeModeConfig));
    void fetchDraftSession();
  }, [fetchDraftSession, session?.id, isPinActive]);

  useEffect(() => {
    if (freeModeConfig) {
      setShowPinOnGate(Boolean(freeModeConfig.showPinOnGate));
      return;
    }

    const loadShowPinSetting = async () => {
      const { data: liveData } = await supabase
        .from('event_booking_rules')
        .select('show_pin_on_gate')
        .eq('event_status', 'live')
        .maybeSingle();

      setShowPinOnGate((liveData as any)?.show_pin_on_gate ?? false);
    };

    void loadShowPinSetting();
  }, [freeModeConfig?.id, freeModeConfig?.showPinOnGate]);

  useEffect(() => {
    void syncPinDisplayToLAN({
      pinCode: isPinActive ? session?.pin_code ?? null : null,
      showPinOnGate: isPinActive && showPinOnGate,
      pinRequired: isPinActive,
    });
  }, [session?.pin_code, isPinActive, showPinOnGate]);

  const persistFreeModeConfig = useCallback(
    async (updates: {
      pin_enabled?: boolean;
      pin_code?: string | null;
      show_pin_on_gate?: boolean;
    }) => {
      if (!freeModeConfig || !onUpdateFreeModeConfig) {
        return true;
      }

      return onUpdateFreeModeConfig(updates);
    },
    [freeModeConfig, onUpdateFreeModeConfig]
  );

  const syncPublicPinState = useCallback(
    async (enabled: boolean, pinCode: string | null) => {
      if (freeModeConfig) {
        await persistFreeModeConfig({ pin_enabled: enabled, pin_code: pinCode });
        return;
      }

      try {
        const { data: liveData } = await supabase
          .from('event_booking_rules')
          .select('id')
          .eq('event_status', 'live')
          .maybeSingle();

        if (liveData?.id) {
          await supabase
            .from('event_booking_rules')
            .update({
              pin_required: enabled,
              pin_code: pinCode,
            } as any)
            .eq('id', liveData.id);
        }
      } catch (error) {
        console.error('[PinProtectionCard] Error syncing public PIN state:', error);
      }
    },
    [freeModeConfig, persistFreeModeConfig]
  );

  const upsertDraftSession = useCallback(
    async (updates: Partial<DraftPinSession>): Promise<DraftPinSession | null> => {
      if (!freeModeConfig) return null;

      const pinCode = String(
        updates.pin_code ?? draftSession?.pin_code ?? freeModeConfig.pinCode ?? generateDraftPin()
      )
        .toUpperCase()
        .trim();

      const protectedFormats =
        (updates.protected_formats ?? draftSession?.protected_formats ?? DEFAULT_FORMATS).filter(Boolean) as FormatType[];

      const eventLinkCode = updates.event_link_code ?? draftSession?.event_link_code ?? null;

      try {
        if (draftSession?.id) {
          const { data, error } = await supabase
            .from('live_sessions')
            .update({
              pin_code: pinCode,
              protected_formats: protectedFormats,
              event_link_code: eventLinkCode,
              custom_pin: pinCode,
              is_active: false,
            } as any)
            .eq('id', draftSession.id)
            .select('id, pin_code, protected_formats, event_link_code')
            .single();

          if (error) throw error;

          const nextDraft = {
            id: data.id,
            pin_code: String(data.pin_code || '').toUpperCase().trim(),
            protected_formats: ((data.protected_formats as FormatType[] | null) ?? []).filter(Boolean) as FormatType[],
            event_link_code: data.event_link_code ?? null,
          };

          setDraftSession(nextDraft);
          return nextDraft;
        }

        const { data, error } = await supabase
          .from('live_sessions')
          .insert({
            section: 'global',
            pin_code: pinCode,
            protected_formats: protectedFormats,
            event_link_code: eventLinkCode,
            custom_pin: pinCode,
            is_active: false,
          })
          .select('id, pin_code, protected_formats, event_link_code')
          .single();

        if (error) throw error;

        const nextDraft = {
          id: data.id,
          pin_code: String(data.pin_code || '').toUpperCase().trim(),
          protected_formats: ((data.protected_formats as FormatType[] | null) ?? []).filter(Boolean) as FormatType[],
          event_link_code: data.event_link_code ?? null,
        };

        setDraftSession(nextDraft);
        return nextDraft;
      } catch (error) {
        console.error('[PinProtectionCard] Error saving draft session:', error);
        toast.error('Errore nel salvataggio della configurazione PIN');
        return null;
      }
    },
    [draftSession, freeModeConfig]
  );

  const displayPinCode = String(
    session?.pin_code ?? draftSession?.pin_code ?? freeModeConfig?.pinCode ?? ''
  )
    .toUpperCase()
    .trim();

  const currentFormats = (session?.protected_formats?.length
    ? session.protected_formats
    : draftSession?.protected_formats?.length
      ? draftSession.protected_formats
      : DEFAULT_FORMATS) as FormatType[];

  const eventUrl = session ? getEventUrl() : null;

  useEffect(() => {
    if (showQR && eventUrl) {
      QRCode.toDataURL(eventUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a3a',
          light: '#ffffff',
        },
      })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [showQR, eventUrl]);

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
      metadata: { invalidated_count: count },
    });

    toast.success(`${count} sessioni invalidate. Tutti gli utenti devono reinserire il PIN.`);
    setTimeout(refreshSessionCount, 1000);
  };

  const handleToggleShowPin = async (checked: boolean) => {
    setShowPinOnGate(checked);

    if (freeModeConfig) {
      const success = await persistFreeModeConfig({ show_pin_on_gate: checked });
      if (!success) {
        setShowPinOnGate(!checked);
        toast.error('Impossibile aggiornare la visibilità del PIN');
        return;
      }

      toast.success(checked ? 'PIN visibile nella pagina di accesso' : 'PIN nascosto dalla pagina di accesso');
      return;
    }

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

    toast.success(checked ? 'PIN visibile nella pagina di accesso' : 'PIN nascosto dalla pagina di accesso');
  };

  const handleFormatToggle = async (format: FormatType, checked: boolean) => {
    const newFormats = checked
      ? Array.from(new Set([...currentFormats, format]))
      : currentFormats.filter((f) => f !== format);

    if (newFormats.length === 0) {
      toast.error('Seleziona almeno un format');
      return;
    }

    if (session && displayIsPinActive) {
      await updateFormats(newFormats as FormatType[]);
      return;
    }

    const draft = await upsertDraftSession({
      pin_code: displayPinCode || generateDraftPin(),
      protected_formats: newFormats as FormatType[],
    });

    if (draft) {
      toast.success('Format aggiornati');
    }
  };

  const copyToClipboard = (text: string, type: 'pin' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success(type === 'pin' ? 'PIN copiato!' : 'Link copiato!');
  };

  const handleEditPin = () => {
    setEditPinValue(displayPinCode || generateDraftPin());
    setIsEditingPin(true);
  };

  const handleSavePin = async () => {
    const cleanPin = editPinValue.toUpperCase().trim();
    if (cleanPin.length < 4 || cleanPin.length > 8) {
      toast.error('Il PIN deve essere tra 4 e 8 caratteri');
      return;
    }

    if (session) {
      const success = await updatePin(cleanPin);
      if (success) {
        await syncPublicPinState(displayIsPinActive, cleanPin);
        setIsEditingPin(false);
      }
      return;
    }

    const draft = await upsertDraftSession({
      pin_code: cleanPin,
      protected_formats: currentFormats,
    });

    if (!draft) return;

    await syncPublicPinState(displayIsPinActive, cleanPin);
    setIsEditingPin(false);
    toast.success(`PIN aggiornato: ${cleanPin}`);
  };

  const handleRegeneratePin = async () => {
    if (session) {
      const newPin = await regeneratePin();
      if (newPin) {
        await syncPublicPinState(displayIsPinActive, newPin);
      }
      return;
    }

    const newPin = generateDraftPin();
    const draft = await upsertDraftSession({
      pin_code: newPin,
      protected_formats: currentFormats,
    });

    if (!draft) return;

    await syncPublicPinState(displayIsPinActive, newPin);
    toast.success(`Nuovo PIN generato: ${newPin}`);
  };

  const handleTogglePin = async (enabled: boolean) => {
    setIsTogglingPin(true);

    try {
      const currentPin = displayPinCode || generateDraftPin();

      if (session) {
        const success = enabled
          ? await restorePin(currentFormats)
          : await removePin();

        if (!success) return;

        await syncPublicPinState(enabled, currentPin);
        return;
      }

      if (enabled) {
        if (eventIsActive) {
          const { error } = await supabase
            .from('live_sessions')
            .insert({
              section: 'global',
              pin_code: currentPin,
              protected_formats: currentFormats,
              is_active: true,
            });

          if (error) throw error;
        } else {
          const draft = await upsertDraftSession({
            pin_code: currentPin,
            protected_formats: currentFormats,
          });

          if (!draft) return;
        }
      }

      await syncPublicPinState(enabled, currentPin);
      toast.success(enabled ? 'Protezione PIN riattivata' : 'Protezione PIN rimossa – accesso diretto attivo');
    } catch (error) {
      console.error('[PinProtectionCard] Error toggling PIN:', error);
      toast.error('Errore nell’aggiornamento della protezione PIN');
    } finally {
      setIsTogglingPin(false);
    }
  };

  if (loading || draftLoading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  const showFullContent = Boolean(freeModeConfig) || Boolean(session);

  return (
    <Card
      className={cn(
        'glass-card transition-all duration-300',
        displayIsPinActive ? 'border-secondary/50 bg-secondary/5' : 'border-border/50'
      )}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {displayIsPinActive ? (
              <Lock className="w-5 h-5 md:w-4 md:h-4 text-secondary" />
            ) : (
              <Unlock className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-base md:text-sm">{title}</span>
            {displayIsPinActive && (
              <Badge className="bg-secondary/20 text-secondary text-xs">ATTIVO</Badge>
            )}
          </div>

          {isOwner && (
            <Switch
              checked={displayIsPinActive}
              onCheckedChange={handleTogglePin}
              disabled={isTogglingPin}
              className={cn('scale-125 md:scale-100', 'data-[state=checked]:bg-secondary')}
            />
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {displayIsPinActive ? 'Gli utenti devono inserire il PIN per accedere' : 'Accesso libero senza codice'}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-2 space-y-4">
        {showFullContent && (
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
                      {displayPinCode || '----'}
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
                        onClick={() => displayPinCode && copyToClipboard(displayPinCode, 'pin')}
                        className="h-8 w-8"
                        disabled={!displayPinCode}
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
                            <img src={qrCodeDataUrl} alt="QR Code Evento" className="w-48 h-48" />
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

            {isOwner && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Format protetti da PIN:</Label>
                <div className="flex flex-col gap-2 md:flex-row md:gap-4">
                  <label
                    className={cn(
                      'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all',
                      'min-h-[48px]',
                      'bg-muted/30 hover:bg-muted/50',
                      currentFormats.includes('openmic') && 'bg-primary/10 border border-primary/30'
                    )}
                  >
                    <Checkbox
                      checked={currentFormats.includes('openmic')}
                      onCheckedChange={(checked) => handleFormatToggle('openmic', !!checked)}
                      className="w-5 h-5"
                    />
                    <Mic2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Open Mic</span>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all',
                      'min-h-[48px]',
                      'bg-muted/30 hover:bg-muted/50',
                      currentFormats.includes('dediche') && 'bg-secondary/10 border border-secondary/30'
                    )}
                  >
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

        {canDisconnectAll && session && (
          <>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
              <button
                onClick={() => activeSessionsCount > 0 && setShowUsersDialog(true)}
                className={cn(
                  'flex items-center gap-2 text-sm text-muted-foreground transition-colors',
                  activeSessionsCount > 0 && 'hover:text-foreground cursor-pointer'
                )}
              >
                <Users className="w-4 h-4" />
                <span>
                  {loadingSessionCount
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

            <ConnectedUsersDialog
              open={showUsersDialog}
              onOpenChange={setShowUsersDialog}
              liveSessionId={session.id}
              onSessionsChanged={refreshSessionCount}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

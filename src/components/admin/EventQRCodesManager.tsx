import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  QrCode, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  MoreVertical,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  Key,
} from 'lucide-react';
import { useEventQRCodes, EventQRCode } from '@/hooks/useEventQRCodes';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import QRCode from 'qrcode';

interface EventQRCodesManagerProps {
  eventId: string;
  eventType: 'freemode' | 'scheduled';
  eventName?: string;
  isEventLive?: boolean;
}

export const EventQRCodesManager: React.FC<EventQRCodesManagerProps> = ({
  eventId,
  eventType,
  eventName,
  isEventLive = false,
}) => {
  const { toast } = useToast();
  const {
    qrCodes,
    loading,
    generatePIN,
    createQRCode,
    updateQRCode,
    regeneratePIN,
    deleteQRCode,
    toggleActive,
  } = useEventQRCodes(eventId, eventType);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [selectedQR, setSelectedQR] = useState<EventQRCode | null>(null);
  const [newQRName, setNewQRName] = useState('');
  const [newQRPin, setNewQRPin] = useState('');
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [qrImageUrl, setQRImageUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Base URL per il QR code
  const getQRUrl = (pin: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/evento?pin=${pin}`;
  };

  // Genera QR code image
  const generateQRImage = async (pin: string): Promise<string> => {
    try {
      const url = getQRUrl(pin);
      return await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (err) {
      console.error('Error generating QR:', err);
      return '';
    }
  };

  // Handlers
  const handleCreate = async () => {
    if (!newQRName.trim()) {
      toast({
        title: 'Nome richiesto',
        description: 'Inserisci un nome per il QR code',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const pin = newQRPin.trim() || generatePIN();
    const id = await createQRCode({
      name: newQRName.trim(),
      pin_code: pin,
      event_id: eventId,
      event_type: eventType,
    });

    if (id) {
      toast({
        title: 'QR Code creato',
        description: `PIN: ${pin}`,
      });
      setShowCreateDialog(false);
      setNewQRName('');
      setNewQRPin('');
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile creare il QR code. Il PIN potrebbe essere già in uso.',
        variant: 'destructive',
      });
    }
    setIsCreating(false);
  };

  const handleEdit = async () => {
    if (!selectedQR) return;

    const success = await updateQRCode(selectedQR.id, {
      name: editName.trim() || selectedQR.name,
      pin_code: editPin.trim() || selectedQR.pin_code,
    });

    if (success) {
      toast({ title: 'QR Code aggiornato' });
      setShowEditDialog(false);
      setSelectedQR(null);
    } else {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare. Il PIN potrebbe essere già in uso.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedQR) return;

    const success = await deleteQRCode(selectedQR.id);
    if (success) {
      toast({ title: 'QR Code eliminato' });
    }
    setShowDeleteDialog(false);
    setSelectedQR(null);
  };

  const handleRegeneratePIN = async (qr: EventQRCode) => {
    const newPin = await regeneratePIN(qr.id);
    if (newPin) {
      toast({
        title: 'PIN rigenerato',
        description: `Nuovo PIN: ${newPin}`,
      });
    }
  };

  const handleCopyLink = async (pin: string) => {
    const url = getQRUrl(pin);
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copiato!' });
  };

  const handleCopyPIN = async (pin: string) => {
    await navigator.clipboard.writeText(pin);
    toast({ title: 'PIN copiato!' });
  };

  const handleShowQR = async (qr: EventQRCode) => {
    const imageUrl = await generateQRImage(qr.pin_code);
    setQRImageUrl(imageUrl);
    setSelectedQR(qr);
    setShowQRPreview(true);
  };

  const handleDownloadQR = async (qr: EventQRCode) => {
    const imageUrl = await generateQRImage(qr.pin_code);
    const link = document.createElement('a');
    link.download = `qr-${qr.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = imageUrl;
    link.click();
    toast({ title: 'QR Code scaricato' });
  };

  const openEditDialog = (qr: EventQRCode) => {
    setSelectedQR(qr);
    setEditName(qr.name);
    setEditPin(qr.pin_code);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (qr: EventQRCode) => {
    setSelectedQR(qr);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="w-5 h-5 text-primary" />
                QR Code & Accessi
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Genera QR code con PIN univoci per questo evento
              </CardDescription>
            </div>
            <Button onClick={() => {
              setNewQRName('');
              setNewQRPin(generatePIN());
              setShowCreateDialog(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuovo QR
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {qrCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nessun QR code configurato</p>
              <p className="text-xs mt-1">Crea il primo QR per condividere l'accesso all'evento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {qrCodes.map((qr) => (
                <div
                  key={qr.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    qr.is_active 
                      ? "bg-muted/30 border-border" 
                      : "bg-muted/10 border-dashed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => handleShowQR(qr)}
                    >
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{qr.name}</p>
                        {!qr.is_active && (
                          <Badge variant="secondary" className="text-[10px]">Disattivato</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {qr.pin_code}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          • {qr.use_count} scansioni
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(qr.pin_code)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShowQR(qr)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Mostra QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadQR(qr)}>
                          <Download className="w-4 h-4 mr-2" />
                          Scarica QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyPIN(qr.pin_code)}>
                          <Key className="w-4 h-4 mr-2" />
                          Copia PIN
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(getQRUrl(qr.pin_code), '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Apri link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(qr)}>
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegeneratePIN(qr)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Rigenera PIN
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleActive(qr.id, !qr.is_active)}
                        >
                          {qr.is_active ? (
                            <><EyeOff className="w-4 h-4 mr-2" />Disattiva</>
                          ) : (
                            <><Eye className="w-4 h-4 mr-2" />Attiva</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(qr)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info stato evento */}
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-xs",
            isEventLive 
              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
              : "bg-muted/50 text-muted-foreground"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isEventLive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            )} />
            {isEventLive 
              ? "Evento LIVE - I QR code funzionano" 
              : "Evento non attivo - I QR code non funzioneranno"
            }
          </div>
        </CardContent>
      </Card>

      {/* Dialog Crea QR */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo QR Code</DialogTitle>
            <DialogDescription>
              Crea un QR code con PIN univoco per "{eventName || 'questo evento'}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome identificativo *</Label>
              <Input
                value={newQRName}
                onChange={(e) => setNewQRName(e.target.value)}
                placeholder="Es: Venerdì 7 Marzo – Locale Centrale"
              />
            </div>
            <div className="space-y-2">
              <Label>PIN (lascia vuoto per auto-generare)</Label>
              <div className="flex gap-2">
                <Input
                  value={newQRPin}
                  onChange={(e) => setNewQRPin(e.target.value.toUpperCase())}
                  placeholder="Es: ABC123"
                  maxLength={8}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => setNewQRPin(generatePIN())}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Il PIN deve essere univoco. 4-8 caratteri alfanumerici.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Crea QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica QR */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PIN</Label>
              <div className="flex gap-2">
                <Input
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => setEditPin(generatePIN())}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-amber-600">
                ⚠️ Cambiando il PIN, i QR code già distribuiti non funzioneranno più.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleEdit}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview QR */}
      <Dialog open={showQRPreview} onOpenChange={setShowQRPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedQR?.name}</DialogTitle>
            <DialogDescription>
              PIN: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{selectedQR?.pin_code}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {qrImageUrl && (
              <img 
                src={qrImageUrl} 
                alt="QR Code" 
                className="w-64 h-64 rounded-lg border"
              />
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => selectedQR && handleCopyLink(selectedQR.pin_code)}
              className="w-full sm:w-auto"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copia Link
            </Button>
            <Button 
              onClick={() => selectedQR && handleDownloadQR(selectedQR)}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo QR Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Il QR code "{selectedQR?.name}" sarà eliminato definitivamente. 
              Chi ha già questo QR non potrà più usarlo per accedere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

 import React, { useState } from 'react';
 import { useBroadcastRemoteAdmin } from '@/hooks/useBroadcastRemote';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Switch } from '@/components/ui/switch';
 import { 
   Smartphone, Plus, Copy, RefreshCw, Users, Trash2, 
   QrCode, Link2, Key, AlertTriangle, Check, Loader2
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 import QRCode from 'qrcode';
import { getProductionBaseUrl } from '@/lib/productionUrl';
import { AdminRemotePreview } from './AdminRemotePreview';
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
 
 export function BroadcastRemoteSection() {
   const {
     accesses,
     sessions,
     loading,
     createAccess,
     regenerateToken,
     regeneratePIN,
     toggleAccess,
     kickAllSessions,
     deleteAccess,
     getActiveSessionCount,
   } = useBroadcastRemoteAdmin();
 
   const [showCreateDialog, setShowCreateDialog] = useState(false);
   const [newName, setNewName] = useState('');
   const [creating, setCreating] = useState(false);
   const [showQRDialog, setShowQRDialog] = useState<string | null>(null);
   const [qrDataUrl, setQrDataUrl] = useState<string>('');
   const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
 
   const handleCreate = async () => {
     if (!newName.trim()) {
       toast.error('Inserisci un nome');
       return;
     }
     setCreating(true);
     await createAccess(newName.trim());
     setCreating(false);
     setShowCreateDialog(false);
     setNewName('');
   };
 
   const getRemoteUrl = (token: string) => {
    return `${getProductionBaseUrl()}/telecomando/${token}`;
   };
 
   const copyLink = async (token: string) => {
     await navigator.clipboard.writeText(getRemoteUrl(token));
     toast.success('Link copiato!');
   };
 
   const showQR = async (access: typeof accesses[0]) => {
     const url = getRemoteUrl(access.access_token);
     const dataUrl = await QRCode.toDataURL(url, {
       width: 300,
       margin: 2,
       color: { dark: '#000000', light: '#ffffff' },
     });
     setQrDataUrl(dataUrl);
     setShowQRDialog(access.id);
   };
 
   const handleDelete = async (id: string) => {
     await deleteAccess(id);
     setDeleteConfirm(null);
   };
 
   if (loading) {
     return (
       <div className="flex items-center justify-center py-8">
         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-lg font-semibold flex items-center gap-2">
             <Smartphone className="w-5 h-5" />
             Telecomando
           </h3>
           <p className="text-sm text-muted-foreground">
             Condividi l'accesso allo scroll dei testi
           </p>
         </div>
         <Button onClick={() => setShowCreateDialog(true)} size="sm">
           <Plus className="w-4 h-4 mr-2" />
           Nuovo
         </Button>
       </div>
 
       {/* Lista accessi */}
       {accesses.length === 0 ? (
         <Card>
           <CardContent className="py-8 text-center">
             <Smartphone className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
             <p className="text-muted-foreground">
               Nessun telecomando configurato
             </p>
             <Button 
               variant="outline" 
               className="mt-4"
               onClick={() => setShowCreateDialog(true)}
             >
               Crea il primo telecomando
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-3">
           {accesses.map((access) => {
             const activeCount = getActiveSessionCount(access.id);
             const currentAccess = accesses.find(a => a.id === showQRDialog);
 
             return (
               <Card key={access.id} className={cn(!access.is_active && "opacity-60")}>
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between gap-4">
                     <div className="min-w-0 flex-1">
                       <div className="flex items-center gap-2 mb-1">
                         <h4 className="font-medium truncate">{access.name}</h4>
                         {activeCount > 0 && (
                           <Badge variant="secondary" className="flex-shrink-0">
                             <Users className="w-3 h-3 mr-1" />
                             {activeCount}
                           </Badge>
                         )}
                       </div>
                       
                       {/* PIN visibile */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  {access.pin_code}
                </code>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => regeneratePIN(access.id)}
                  title="Rigenera PIN casuale"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Rigenera
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const newPin = prompt('Inserisci nuovo PIN (4-8 caratteri alfanumerici):');
                    if (newPin && /^[A-Za-z0-9]{4,8}$/.test(newPin)) {
                      regeneratePIN(access.id, newPin.toUpperCase());
                    } else if (newPin) {
                      toast.error('PIN non valido. Usa 4-8 caratteri alfanumerici.');
                    }
                  }}
                  title="Imposta PIN personalizzato"
                >
                  <Key className="w-3 h-3 mr-1" />
                  Personalizza
                </Button>
              </div>
            </div>
                     </div>
 
                     {/* Switch attivo */}
                     <Switch
                       checked={access.is_active}
                       onCheckedChange={(checked) => toggleAccess(access.id, checked)}
                     />
                   </div>
 
                   {/* Azioni */}
                   <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => copyLink(access.access_token)}
                     >
                       <Copy className="w-3.5 h-3.5 mr-1.5" />
                       Copia Link
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => showQR(access)}
                     >
                       <QrCode className="w-3.5 h-3.5 mr-1.5" />
                       QR Code
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => regenerateToken(access.id)}
                     >
                       <Link2 className="w-3.5 h-3.5 mr-1.5" />
                       Nuovo Link
                     </Button>
                     {activeCount > 0 && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => kickAllSessions(access.id)}
                       >
                         <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                         Espelli tutti
                       </Button>
                     )}
                     <Button
                       variant="ghost"
                       size="sm"
                       className="text-destructive hover:text-destructive"
                       onClick={() => setDeleteConfirm(access.id)}
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             );
           })}
         </div>
       )}
 
       {/* Dialog creazione */}
       <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Nuovo Telecomando</DialogTitle>
             <DialogDescription>
               Crea un nuovo accesso telecomando per controllare lo scroll dei testi
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Nome</label>
               <Input
                 placeholder="es. Staff Palco, Tecnico Audio..."
                 value={newName}
                 onChange={(e) => setNewName(e.target.value)}
                 autoFocus
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
               Annulla
             </Button>
             <Button onClick={handleCreate} disabled={creating}>
               {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
               Crea Telecomando
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Dialog QR Code */}
       <Dialog open={!!showQRDialog} onOpenChange={() => setShowQRDialog(null)}>
         <DialogContent className="max-w-sm">
           <DialogHeader>
             <DialogTitle>QR Code Telecomando</DialogTitle>
             <DialogDescription>
               Scansiona per accedere al telecomando
             </DialogDescription>
           </DialogHeader>
           <div className="flex flex-col items-center py-4">
             {qrDataUrl && (
               <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-lg" />
             )}
             {showQRDialog && (
               <div className="mt-4 text-center">
                 <p className="text-sm text-muted-foreground mb-1">PIN di accesso:</p>
                 <code className="text-2xl font-mono font-bold tracking-widest">
                   {accesses.find(a => a.id === showQRDialog)?.pin_code}
                 </code>
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>
 
       {/* Conferma eliminazione */}
       <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Eliminare telecomando?</AlertDialogTitle>
             <AlertDialogDescription>
               Questa azione è irreversibile. Tutti gli utenti connessi verranno disconnessi.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Annulla</AlertDialogCancel>
             <AlertDialogAction
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
               onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
             >
               Elimina
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

      {/* Pannello controllo remoto admin */}
      <AdminRemotePreview salaCode="main" />
     </div>
   );
 }
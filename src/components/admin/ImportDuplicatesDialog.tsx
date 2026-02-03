import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Duplicate {
  titolo: string;
  artista: string;
  duplicateOf: string;
}

interface ImportDuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: Duplicate[];
  totalRaw: number;
  uniqueCount: number;
}

export const ImportDuplicatesDialog: React.FC<ImportDuplicatesDialogProps> = ({
  open,
  onOpenChange,
  duplicates,
  totalRaw,
  uniqueCount,
}) => {
  const handleCopyList = () => {
    const text = duplicates.map(d => `${d.titolo} – ${d.artista} → duplicato di: ${d.duplicateOf}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Lista copiata negli appunti');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent" />
            Duplicati nel CSV
          </DialogTitle>
          <DialogDescription>
            Il file contiene {totalRaw} righe, di cui {duplicates.length} sono duplicati.
            Verranno importate {uniqueCount} canzoni uniche.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              I duplicati vengono rilevati in base a titolo + artista (normalizzati).
            </p>
            <Button variant="outline" size="sm" onClick={handleCopyList}>
              <Copy className="w-4 h-4 mr-2" />
              Copia lista
            </Button>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-4 space-y-2">
              {duplicates.map((dup, i) => (
                <div 
                  key={i} 
                  className="p-3 bg-muted/50 rounded-lg text-sm border-l-4 border-accent"
                >
                  <p className="font-medium">
                    {dup.titolo} – {dup.artista}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    → Duplicato di: {dup.duplicateOf}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

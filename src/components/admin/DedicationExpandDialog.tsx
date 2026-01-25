import React from 'react';
import { Heart, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DedicationExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dedicationText: string;
  senderName: string;
  songTitle?: string;
  songArtist?: string;
  fontSizeClass?: string;
}

export const DedicationExpandDialog: React.FC<DedicationExpandDialogProps> = ({
  open,
  onOpenChange,
  dedicationText,
  senderName,
  songTitle,
  songArtist,
  fontSizeClass = 'text-base',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col items-start">
              <span>Dedica di {senderName}</span>
              {songTitle && (
                <span className="text-xs font-normal text-muted-foreground">
                  {songTitle} - {songArtist}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-primary/20">
            <p className={cn(
              "text-foreground leading-relaxed italic whitespace-pre-wrap",
              fontSizeClass
            )}>
              "{dedicationText}"
            </p>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-primary/50"
          >
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

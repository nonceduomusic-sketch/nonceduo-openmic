import React, { useState } from 'react';
import { FileText, Music2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LyricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songTitle: string;
  songArtist: string;
}

export const LyricsDialog: React.FC<LyricsDialogProps> = ({
  open,
  onOpenChange,
  songTitle,
  songArtist,
}) => {
  const handleLyrics = () => {
    const searchQuery = encodeURIComponent(`${songTitle} ${songArtist} testo`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    onOpenChange(false);
  };

  const handleChords = () => {
    const searchQuery = encodeURIComponent(`${songTitle} ${songArtist} testo e accordi`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg neon-text-pink flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            {songTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{songArtist}</p>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleLyrics}
            className="neon-button-pink h-12 text-base"
          >
            <FileText className="w-5 h-5 mr-2" />
            Solo Testo
            <ExternalLink className="w-4 h-4 ml-auto" />
          </Button>

          <Button
            onClick={handleChords}
            className="neon-button-cyan h-12 text-base"
          >
            <Music2 className="w-5 h-5 mr-2" />
            Testo e Accordi
            <ExternalLink className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

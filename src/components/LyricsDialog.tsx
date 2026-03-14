import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, BookOpen, Loader2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { findLyricsUrl } from '@/lib/lyricsLookup';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lyricsResult, setLyricsResult] = useState<{ url: string; hasLyrics: boolean } | null>(null);

  useEffect(() => {
    if (!open) {
      setLyricsResult(null);
      return;
    }

    const checkForSong = async () => {
      setLoading(true);
      try {
        const result = await findLyricsUrl(songTitle, songArtist);
        setLyricsResult(result);
      } catch (error) {
        console.error('Error checking for song:', error);
        setLyricsResult({ url: '/lyrics/not-found', hasLyrics: false });
      } finally {
        setLoading(false);
      }
    };

    checkForSong();
  }, [open, songTitle, songArtist]);

  const handleViewLyrics = useCallback(() => {
    if (lyricsResult) {
      onOpenChange(false);
      navigate(lyricsResult.url);
    }
  }, [lyricsResult, navigate, onOpenChange]);

  const handleViewChordsGoogle = useCallback(() => {
    const query = encodeURIComponent(`testo e accordi ${songTitle} ${songArtist}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
    onOpenChange(false);
  }, [songTitle, songArtist, onOpenChange]);

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
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Button
                onClick={handleViewLyrics}
                className="neon-button-pink h-12 text-base"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Visualizza Testo
              </Button>
              <Button
                onClick={handleViewChordsGoogle}
                variant="outline"
                className="h-12 text-base border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Visualizza Testo e Accordi
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

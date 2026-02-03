import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Music2, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
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

interface LyricsResult {
  type: 'internal' | 'external';
  url: string;
  songId?: string;
}

export const LyricsDialog: React.FC<LyricsDialogProps> = ({
  open,
  onOpenChange,
  songTitle,
  songArtist,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);

  // Check if song exists in database when dialog opens
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
        // Fallback to external search
        const searchQuery = encodeURIComponent(`${songTitle} ${songArtist} testo`);
        setLyricsResult({ 
          type: 'external', 
          url: `https://www.google.com/search?q=${searchQuery}` 
        });
      } finally {
        setLoading(false);
      }
    };

    checkForSong();
  }, [open, songTitle, songArtist]);

  const handleViewLyrics = useCallback(() => {
    if (lyricsResult?.type === 'internal') {
      onOpenChange(false);
      navigate(lyricsResult.url);
    }
  }, [lyricsResult, navigate, onOpenChange]);

  const handleSearchLyrics = useCallback(() => {
    if (lyricsResult?.type === 'external') {
      window.open(lyricsResult.url, '_blank');
    } else {
      const searchQuery = encodeURIComponent(`${songTitle} ${songArtist} testo`);
      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    }
    onOpenChange(false);
  }, [lyricsResult, songTitle, songArtist, onOpenChange]);

  const handleSearchChords = useCallback(() => {
    const searchQuery = encodeURIComponent(`${songTitle} ${songArtist} testo e accordi`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
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
              {/* Show internal lyrics button if song found in database */}
              {lyricsResult?.type === 'internal' ? (
                <Button
                  onClick={handleViewLyrics}
                  className="neon-button-pink h-12 text-base"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Visualizza Testo
                </Button>
              ) : (
                <Button
                  onClick={handleSearchLyrics}
                  className="neon-button-pink h-12 text-base"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Cerca Testo
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </Button>
              )}

              <Button
                onClick={handleSearchChords}
                className="neon-button-cyan h-12 text-base"
              >
                <Music2 className="w-5 h-5 mr-2" />
                Testo e Accordi
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

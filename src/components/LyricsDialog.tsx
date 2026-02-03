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
import { supabase } from '@/integrations/supabase/client';

interface LyricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songTitle: string;
  songArtist: string;
}

interface SongMatch {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
}

export const LyricsDialog: React.FC<LyricsDialogProps> = ({
  open,
  onOpenChange,
  songTitle,
  songArtist,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [matchedSong, setMatchedSong] = useState<SongMatch | null>(null);
  const [checked, setChecked] = useState(false);

  // Check if song exists in database when dialog opens
  useEffect(() => {
    if (!open) {
      setMatchedSong(null);
      setChecked(false);
      return;
    }

    const checkForSong = async () => {
      setLoading(true);
      try {
        // Normalize search terms
        const normalizedTitle = songTitle.toLowerCase().trim();
        const normalizedArtist = songArtist.toLowerCase().trim();
        
        // Try exact match first using ilike with proper escaping
        const { data, error } = await supabase
          .from('songs')
          .select('id, titolo, artista, testo')
          .ilike('titolo', normalizedTitle)
          .limit(10);

        if (!error && data && data.length > 0) {
          // Find best match - prefer exact title+artist match
          const exactMatch = data.find(s => 
            s.titolo.toLowerCase().trim() === normalizedTitle && 
            s.artista.toLowerCase().trim() === normalizedArtist
          );

          if (exactMatch) {
            setMatchedSong(exactMatch);
          } else {
            // Take first match with same title
            setMatchedSong(data[0]);
          }
        } else {
          // Fallback: search by artist if title didn't match
          const { data: artistData } = await supabase
            .from('songs')
            .select('id, titolo, artista, testo')
            .ilike('artista', normalizedArtist)
            .limit(20);
          
          if (artistData && artistData.length > 0) {
            const partialMatch = artistData.find(s => 
              s.titolo.toLowerCase().includes(normalizedTitle) ||
              normalizedTitle.includes(s.titolo.toLowerCase())
            );
            setMatchedSong(partialMatch || null);
          }
        }
      } catch (error) {
        console.error('Error checking for song:', error);
      } finally {
        setLoading(false);
        setChecked(true);
      }
    };

    checkForSong();
  }, [open, songTitle, songArtist]);

  const handleViewLyrics = useCallback(() => {
    if (matchedSong) {
      onOpenChange(false);
      navigate(`/lyrics/${matchedSong.id}`);
    }
  }, [matchedSong, navigate, onOpenChange]);

  const handleSearchLyrics = useCallback(() => {
    const searchQuery = encodeURIComponent(`${songTitle} ${songArtist} testo`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    onOpenChange(false);
  }, [songTitle, songArtist, onOpenChange]);

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
              {matchedSong && matchedSong.testo ? (
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

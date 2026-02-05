import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown, Tv, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminRemotePreviewProps {
  salaCode?: string;
}

export function AdminRemotePreview({ salaCode = 'main' }: AdminRemotePreviewProps) {
  const { session, updateSession } = useBroadcast(salaCode);
  const [currentSong, setCurrentSong] = useState<{ titolo: string; artista: string; testo: string | null } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isBroadcasting = (session as any)?.is_broadcasting ?? false;
  const highlightLine = session?.highlight_line ?? 0;

  const lines = useMemo(() => 
    currentSong?.testo?.split('\n').filter(line => line.trim()) || []
  , [currentSong?.testo]);

  // Fetch current song
  useEffect(() => {
    const fetchSong = async () => {
      if (!session?.current_song_id) {
        setCurrentSong(null);
        return;
      }

      const { data } = await supabase
        .from('songs')
        .select('titolo, artista, testo')
        .eq('id', session.current_song_id)
        .single();

      if (data) setCurrentSong(data);
    };

    fetchSong();
  }, [session?.current_song_id]);

  // Auto-scroll to highlighted line (within container only)
  useEffect(() => {
    if (scrollContainerRef.current && showPreview && lines.length > 0) {
      const container = scrollContainerRef.current;
      const lineElement = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement;
      if (lineElement) {
        // Calculate scroll position to center the highlighted line
        const containerHeight = container.clientHeight;
        const lineTop = lineElement.offsetTop;
        const lineHeight = lineElement.offsetHeight;
        const scrollTarget = lineTop - (containerHeight / 2) + (lineHeight / 2);
        container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      }
    }
  }, [highlightLine, showPreview, lines.length]);
 
   // Controlli scroll (admin ha permessi diretti)
   const scrollUp = async () => {
     const newLine = Math.max(0, highlightLine - 1);
     await updateSession({ highlight_line: newLine });
   };
 
   const scrollDown = async () => {
     const newLine = Math.min(lines.length - 1, highlightLine + 1);
     await updateSession({ highlight_line: newLine });
   };
 
   const scrollToLine = async (lineIndex: number) => {
     await updateSession({ highlight_line: lineIndex });
   };
 
   return (
     <Card className="mt-4">
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base flex items-center gap-2">
             <Tv className="w-4 h-4" />
             Controllo Remoto Admin
           </CardTitle>
           <div className="flex items-center gap-2">
             <Label htmlFor="show-preview" className="text-sm text-muted-foreground">
               {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
             </Label>
             <Switch
               id="show-preview"
               checked={showPreview}
               onCheckedChange={setShowPreview}
             />
           </div>
         </div>
       </CardHeader>
 
       {showPreview && (
         <CardContent className="pt-0">
           {!isBroadcasting || lines.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Tv className="w-10 h-10 mx-auto mb-2 opacity-50" />
               <p className="text-sm">
                 {isBroadcasting ? 'Nessun testo disponibile' : 'Trasmissione non attiva'}
               </p>
             </div>
           ) : (
             <div className="space-y-3">
               {/* Song info */}
               <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                 <div className="min-w-0">
                   <p className="font-medium text-sm truncate">{currentSong?.titolo}</p>
                   <p className="text-xs text-muted-foreground truncate">{currentSong?.artista}</p>
                 </div>
                 <div className="text-right">
                   <div className="text-lg font-bold tabular-nums">{highlightLine + 1}</div>
                   <div className="text-xs text-muted-foreground">di {lines.length}</div>
                 </div>
               </div>
 
              {/* Lyrics preview - scrollable div with prominent highlight */}
              <div 
                ref={scrollContainerRef}
                className="h-48 rounded-lg border bg-muted/30 overflow-y-auto p-2 space-y-0.5"
              >
                {lines.map((line, index) => {
                  const isHighlighted = highlightLine === index;
                  const isPast = index < highlightLine;
                  const distance = Math.abs(index - highlightLine);
                  // Fade lines based on distance for context
                  const opacity = isHighlighted ? 1 : distance === 1 ? 0.8 : distance === 2 ? 0.6 : 0.4;
                  
                  return (
                    <button
                      key={index}
                      data-line={index}
                      onClick={() => scrollToLine(index)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-xs transition-all duration-200",
                        isHighlighted && "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/70 scale-[1.02]",
                        isPast && !isHighlighted && "text-muted-foreground",
                        !isHighlighted && !isPast && "text-foreground hover:bg-muted"
                      )}
                      style={{ opacity: isHighlighted ? 1 : opacity }}
                    >
                      {line || '\u00A0'}
                    </button>
                  );
                })}
              </div>
 
               {/* Controls */}
               <div className="flex items-center justify-center gap-3">
                 <Button
                   size="sm"
                   variant="outline"
                   className="h-10 w-10 rounded-full"
                   onClick={scrollUp}
                   disabled={highlightLine === 0}
                 >
                   <ChevronUp className="w-5 h-5" />
                 </Button>
                 
                 <Button
                   size="sm"
                   variant="outline"
                   className="h-10 w-10 rounded-full"
                   onClick={scrollDown}
                   disabled={highlightLine >= lines.length - 1}
                 >
                   <ChevronDown className="w-5 h-5" />
                 </Button>
               </div>
             </div>
           )}
         </CardContent>
       )}
     </Card>
   );
 }
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play, Pause, RotateCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProcessResult {
  id: string;
  title: string;
  success: boolean;
  error?: string;
}

export const LyricsReformatCard: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [totalSongs, setTotalSongs] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<ProcessResult[]>([]);
  const [currentSong, setCurrentSong] = useState<string | null>(null);

  const pauseRef = React.useRef(false);

  const fetchTotalCount = async () => {
    const { count } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .not('testo', 'is', null)
      .neq('testo', '');
    
    setTotalSongs(count || 0);
    return count || 0;
  };

  const processBatch = async (offset: number): Promise<{ continue: boolean; processed: number; success: number; fail: number }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reformat-lyrics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ batchSize: 5, offset }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setLastResults(data.results);
        setCurrentSong(data.results[data.results.length - 1]?.title || null);
      }

      return {
        continue: data.processed > 0,
        processed: data.processed || 0,
        success: data.successCount || 0,
        fail: data.failCount || 0,
      };
    } catch (error) {
      console.error('Batch error:', error);
      return { continue: false, processed: 0, success: 0, fail: 1 };
    }
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    pauseRef.current = false;
    
    const total = await fetchTotalCount();
    let offset = currentOffset;
    let processed = totalProcessed;
    let successes = successCount;
    let fails = failCount;

    toast.info('Avvio riformattazione testi...', { duration: 2000 });

    while (offset < total && !pauseRef.current) {
      setCurrentOffset(offset);
      
      const result = await processBatch(offset);
      
      if (!result.continue && result.processed === 0) {
        // No more songs to process
        break;
      }

      processed += result.processed;
      successes += result.success;
      fails += result.fail;

      setTotalProcessed(processed);
      setSuccessCount(successes);
      setFailCount(fails);

      offset += 5;

      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    
    if (!pauseRef.current) {
      toast.success(`Completato! ${successes} successi, ${fails} errori`);
    } else {
      toast.info('Riformattazione in pausa');
    }
  };

  const pauseProcessing = () => {
    pauseRef.current = true;
    setIsPaused(true);
    setIsProcessing(false);
  };

  const resetProgress = () => {
    setCurrentOffset(0);
    setTotalProcessed(0);
    setSuccessCount(0);
    setFailCount(0);
    setLastResults([]);
    setCurrentSong(null);
    setIsPaused(false);
    pauseRef.current = false;
  };

  const progress = totalSongs ? Math.round((totalProcessed / totalSongs) * 100) : 0;

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-lg">Riformattazione Testi AI</CardTitle>
          </div>
          {totalSongs !== null && (
            <Badge variant="outline" className="text-purple-400 border-purple-400/50">
              {totalSongs} canzoni
            </Badge>
          )}
        </div>
        <CardDescription>
          Riformatta tutti i testi in stile Spotify con AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        {(isProcessing || totalProcessed > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-mono">{totalProcessed}/{totalSongs || '?'}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {successCount}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  {failCount}
                </span>
              </div>
              {currentSong && (
                <span className="truncate max-w-[150px]">
                  Ultimo: {currentSong}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isProcessing ? (
            <Button
              onClick={startProcessing}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={isProcessing}
            >
              <Play className="w-4 h-4 mr-2" />
              {isPaused ? 'Riprendi' : totalProcessed > 0 ? 'Continua' : 'Avvia'}
            </Button>
          ) : (
            <Button
              onClick={pauseProcessing}
              variant="outline"
              className="flex-1 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pausa
            </Button>
          )}
          
          <Button
            onClick={resetProgress}
            variant="outline"
            size="icon"
            disabled={isProcessing}
            title="Reset progresso"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Status */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Elaborazione in corso... non chiudere la pagina</span>
          </div>
        )}

        {/* Last Results */}
        {lastResults.length > 0 && !isProcessing && (
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            <p className="text-muted-foreground font-medium">Ultimi elaborati:</p>
            {lastResults.slice(-5).map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {r.success ? (
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                )}
                <span className="truncate">{r.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

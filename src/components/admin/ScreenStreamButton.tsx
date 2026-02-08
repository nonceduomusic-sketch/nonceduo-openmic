import React, { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ScreenStreamButtonProps {
  salaCode?: string;
  disabled?: boolean;
  className?: string;
}

export function ScreenStreamButton({ 
  salaCode = 'main', 
  disabled = false,
  className 
}: ScreenStreamButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [streamUrl, setStreamUrl] = useState('http://192.168.1.11:8080');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current state
  useEffect(() => {
    const fetchState = async () => {
      const { data } = await supabase
        .from('broadcast_sessions')
        .select('screen_stream_active, screen_stream_url')
        .eq('sala_code', salaCode)
        .single();
      
      if (data) {
        setIsActive((data as any).screen_stream_active || false);
        if ((data as any).screen_stream_url) {
          setStreamUrl((data as any).screen_stream_url);
        }
      }
    };
    
    fetchState();

    // Subscribe to changes
    const channel = supabase
      .channel(`screen-stream-${salaCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcast_sessions',
          filter: `sala_code=eq.${salaCode}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setIsActive(newData.screen_stream_active || false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salaCode]);

  const handleToggle = async () => {
    if (isActive) {
      // Stop streaming
      setIsLoading(true);
      try {
        await supabase
          .from('broadcast_sessions')
          .update({
            screen_stream_active: false,
          } as any)
          .eq('sala_code', salaCode);
        
        setIsActive(false);
        toast.success('ScreenStream fermato');
      } catch (error) {
        toast.error('Errore durante lo stop');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show dialog to configure URL
      setShowDialog(true);
    }
  };

  const handleStart = async () => {
    if (!streamUrl.trim()) {
      toast.error('Inserisci un URL valido');
      return;
    }

    setIsLoading(true);
    try {
      await supabase
        .from('broadcast_sessions')
        .update({
          screen_stream_active: true,
          screen_stream_url: streamUrl.trim(),
        } as any)
        .eq('sala_code', salaCode);
      
      setIsActive(true);
      setShowDialog(false);
      toast.success('ScreenStream avviato! La TV mostrerà lo stream.');
    } catch (error) {
      toast.error('Errore durante l\'avvio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={isActive ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={cn(
          "h-10 font-medium transition-all",
          isLoading && "animate-pulse",
          className
        )}
      >
        {isActive ? (
          <>
            <X className="w-4 h-4 mr-2" />
            Stop Stream
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4 mr-2" />
            ScreenStream
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-orange-500" />
              ScreenStream App
            </DialogTitle>
            <DialogDescription>
              Inserisci l'indirizzo del server ScreenStream per mostrarlo sulla TV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stream-url">URL dello stream</Label>
              <Input
                id="stream-url"
                placeholder="http://192.168.1.11:8080"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Trova l'URL nell'app ScreenStream sul tuo telefono/tablet
              </p>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm space-y-2">
              <p className="font-medium text-primary">
                📱 Come funziona:
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-sm">
                <li>Avvia l'app ScreenStream sul dispositivo</li>
                <li>Copia l'indirizzo IP mostrato (es: http://192.168.1.11:8080)</li>
                <li>Incollalo qui e premi "Avvia"</li>
                <li>La TV mostrerà lo schermo del dispositivo</li>
              </ol>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p>
                <strong>⚠️ Importante:</strong> Il dispositivo con ScreenStream e la TV devono essere sulla stessa rete WiFi.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleStart}
              disabled={isLoading}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Avvia ScreenStream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

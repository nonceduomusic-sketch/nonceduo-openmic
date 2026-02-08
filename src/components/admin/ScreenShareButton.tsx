import React, { useState } from 'react';
import { Monitor, MonitorOff, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useScreenShareBroadcaster } from '@/hooks/useScreenShare';

interface ScreenShareButtonProps {
  salaCode?: string;
  disabled?: boolean;
  className?: string;
}

export function ScreenShareButton({ 
  salaCode = 'main', 
  disabled = false,
  className 
}: ScreenShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCountdown, setSelectedCountdown] = useState<string>('3');
  
  const {
    isSharing,
    isConnecting,
    countdown,
    error,
    startScreenShare,
    stopScreenShare,
  } = useScreenShareBroadcaster({ 
    salaCode,
    onStreamStart: () => setShowDialog(false),
    onStreamEnd: () => {},
  });

  const handleStartClick = () => {
    if (isSharing) {
      stopScreenShare();
    } else {
      setShowDialog(true);
    }
  };

  const handleConfirmStart = () => {
    startScreenShare(parseInt(selectedCountdown, 10));
  };

  // Show countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
        <div className="text-center space-y-6">
          <Timer className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <div className="text-8xl font-bold text-white">{countdown}</div>
          <p className="text-white/70 text-xl">Passa all'app da condividere...</p>
          <Progress 
            value={((parseInt(selectedCountdown) - countdown) / parseInt(selectedCountdown)) * 100} 
            className="w-64 mx-auto h-2"
          />
          <Button 
            variant="outline" 
            onClick={stopScreenShare}
            className="mt-4"
          >
            Annulla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant={isSharing ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleStartClick}
        disabled={disabled || isConnecting}
        className={cn(
          "h-10 font-medium transition-all",
          isSharing && "bg-destructive hover:bg-destructive/90",
          isConnecting && "animate-pulse",
          className
        )}
      >
        {isSharing ? (
          <>
            <MonitorOff className="w-4 h-4 mr-2" />
            Stop Screen
          </>
        ) : isConnecting ? (
          <>
            <Monitor className="w-4 h-4 mr-2 animate-spin" />
            Connessione...
          </>
        ) : (
          <>
            <Monitor className="w-4 h-4 mr-2" />
            Avvia Screen
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Condividi Schermo
            </DialogTitle>
            <DialogDescription>
              Lo schermo del tablet verrà trasmesso sulla TV in tempo reale.
              Usa il timer per avere tempo di passare all'app da mostrare.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="countdown" className="min-w-fit">
                Timer prima dello streaming:
              </Label>
              <Select
                value={selectedCountdown}
                onValueChange={setSelectedCountdown}
              >
                <SelectTrigger id="countdown" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 sec</SelectItem>
                  <SelectItem value="5">5 sec</SelectItem>
                  <SelectItem value="10">10 sec</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm space-y-2">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                📱 Come funziona:
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-sm">
                <li>Clicca "Avvia" e seleziona lo schermo</li>
                <li>Usa il timer per passare all'altra app</li>
                <li>La TV mostrerà tutto in tempo reale</li>
                <li>Clicca "Stop Screen" per terminare</li>
              </ol>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p>
                <strong>Nota:</strong> Funziona meglio su tablet Android con Chrome.
                Le funzioni testi Lovable restano disponibili.
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
              onClick={handleConfirmStart}
              className="bg-primary hover:bg-primary/90"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Avvia Screen Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

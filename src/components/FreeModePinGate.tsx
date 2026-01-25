import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinInputField } from "@/components/PinInputField";
import { toast } from "sonner";

interface FreeModePinGateProps {
  format: 'openmic' | 'dediche';
  formatDisplayName: string;
  expectedPin: string;
  onPinValidated: () => void;
  backTo?: string;
  backLabel?: string;
}

/**
 * FreeModePinGate - Gate PIN per Free Mode
 * 
 * Valida il PIN direttamente contro il valore passato (da free_mode_settings)
 * e salva lo stato di validazione in sessionStorage per persistenza durante la sessione.
 */
export const FreeModePinGate: React.FC<FreeModePinGateProps> = ({
  format,
  formatDisplayName,
  expectedPin,
  onPinValidated,
  backTo = "/app",
  backLabel = "Torna all'app",
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async () => {
    if (loading || !pin) return;
    
    setLoading(true);
    setError(null);

    try {
      // Normalize both PINs for comparison
      const normalizedEntered = pin.toUpperCase().trim();
      const normalizedExpected = expectedPin.toUpperCase().trim();
      
      if (normalizedEntered === normalizedExpected) {
        // Save validation to sessionStorage for persistence during session
        const sessionKey = `freemode_pin_${format}`;
        sessionStorage.setItem(sessionKey, 'validated');
        
        toast.success(`Accesso a ${formatDisplayName} sbloccato!`);
        onPinValidated();
      } else {
        setAttempts(prev => prev + 1);
        setError("PIN non valido. Riprova.");
        setPin("");
        
        if (attempts >= 4) {
          toast.error("Troppi tentativi falliti. Riprova più tardi.");
        }
      }
    } catch (err) {
      console.error('PIN validation error:', err);
      setError("Errore nella validazione del PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link 
              to={backTo} 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{backLabel}</span>
            </Link>
            
            <h1 className="font-display text-lg font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Accesso Protetto
            </h1>
            
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold">
              {formatDisplayName}
            </h2>
            <p className="text-muted-foreground">
              Inserisci il PIN per accedere all'evento
            </p>
          </div>

          {/* PIN Input */}
          <div className="space-y-4">
            <PinInputField
              value={pin}
              onChange={setPin}
              error={error || undefined}
              isValidating={loading}
              disabled={loading || attempts >= 10}
            />

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !pin || attempts >= 10}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifica...
                </>
              ) : (
                "Accedi"
              )}
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Chiedi il PIN allo staff per accedere
          </p>

          {/* Rate limit warning */}
          {attempts >= 5 && (
            <p className="text-xs text-destructive">
              Attenzione: {10 - attempts} tentativi rimanenti
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default FreeModePinGate;

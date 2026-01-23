import React, { useState } from 'react';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFormatPinValidator, FormatKey } from '@/hooks/useFormatGating';

interface FormatPinGateProps {
  format: FormatKey;
  formatDisplayName: string;
  onPinValidated: () => void;
  backTo?: string;
  backLabel?: string;
}

export const FormatPinGate: React.FC<FormatPinGateProps> = ({
  format,
  formatDisplayName,
  onPinValidated,
  backTo = '/app',
  backLabel = 'Torna all\'app',
}) => {
  const [pin, setPin] = useState('');
  const { validatePin, validating, isValid } = useFormatPinValidator(format);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = await validatePin(pin);
    if (valid) {
      onPinValidated();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {formatDisplayName} – Serata Live
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Per accedere al contenuto live, inserisci il PIN annunciato dal performer.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Inserisci PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className={cn(
                  "text-center text-2xl font-mono tracking-[0.3em] h-14 uppercase",
                  isValid === false && "border-destructive focus:ring-destructive"
                )}
                maxLength={8}
                autoFocus
                autoComplete="off"
              />
              
              {isValid === false && (
                <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>PIN non valido – chiedi il codice al performer o al locale</span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg neon-button-cyan"
              disabled={pin.length < 4 || validating}
            >
              {validating ? 'Verifica...' : 'Accedi'}
            </Button>
          </form>

          <div className="pt-4 border-t border-border">
            <Link to={backTo}>
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

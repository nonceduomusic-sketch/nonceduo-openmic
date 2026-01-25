import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isValid?: boolean;
  isValidating?: boolean;
  disabled?: boolean;
}

export const PinInputField: React.FC<PinInputFieldProps> = ({
  value,
  onChange,
  error,
  isValid,
  isValidating,
  disabled
}) => {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <Label htmlFor="pin-code" className="flex items-center gap-2 text-sm font-medium">
        <Shield className="w-4 h-4 text-primary" />
        Codice Serata Live
        <span className="text-destructive">*</span>
      </Label>
      
      <div className="relative">
        <Input
          id="pin-code"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Inserisci il PIN (es. ABCD1234)"
          maxLength={8}
          disabled={disabled}
          className={cn(
            "font-mono text-lg tracking-wider uppercase text-center pr-10",
            "transition-all duration-200",
            error && "border-destructive focus-visible:ring-destructive",
            isValid && "border-secondary focus-visible:ring-secondary"
          )}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValidating ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isValid ? (
            <CheckCircle2 className="w-4 h-4 text-secondary animate-in fade-in-0 zoom-in-50" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-destructive animate-in fade-in-0 shake" />
          ) : null}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Chiedi il codice al performer o al locale
      </p>
    </div>
  );
};

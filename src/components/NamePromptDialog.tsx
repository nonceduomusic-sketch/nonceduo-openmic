import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Inserisci il tuo nome")
  .max(50, "Nome troppo lungo (massimo 50 caratteri)");

interface NamePromptDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  initialValue?: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
}

export const NamePromptDialog: React.FC<NamePromptDialogProps> = ({
  open,
  title = "Come ti chiami?",
  description = "Serve il tuo nome per unirti al gruppo e scrivere la dedica.",
  initialValue = "",
  confirmLabel = "Continua",
  onOpenChange,
  onConfirm,
}) => {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setTouched(false);
    }
  }, [open, initialValue]);

  const validation = useMemo(() => nameSchema.safeParse(value), [value]);
  const error = touched && !validation.success ? validation.error.errors[0]?.message : undefined;

  const handleConfirm = () => {
    setTouched(true);
    if (!validation.success) return;
    onConfirm(validation.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Il tuo nome"
            autoFocus
            maxLength={50}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

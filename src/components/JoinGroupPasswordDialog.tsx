import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Conversation } from '@/hooks/useConversations';

interface JoinGroupPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  passwordHint?: string;
  onSubmit: (password: string) => Promise<boolean>;
}

export const JoinGroupPasswordDialog: React.FC<JoinGroupPasswordDialogProps> = ({
  open,
  onOpenChange,
  conversation,
  passwordHint,
  onSubmit,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Inserisci la password');
      return;
    }

    setLoading(true);
    try {
      const success = await onSubmit(password);
      if (success) {
        setPassword('');
        onOpenChange(false);
      } else {
        setError('Password errata');
      }
    } catch {
      setError('Password errata');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPassword('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-secondary" />
            Gruppo protetto
          </DialogTitle>
          <DialogDescription>
            {conversation?.name ? (
              <>Il gruppo "{conversation.name}" è protetto da password.</>
            ) : (
              <>Questo gruppo è protetto da password.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {passwordHint && (
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-foreground">
                <span className="font-medium">Suggerimento:</span> {passwordHint}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="groupPassword">Password</Label>
            <div className="relative">
              <Input
                id="groupPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password"
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="neon-button-cyan"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Entra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

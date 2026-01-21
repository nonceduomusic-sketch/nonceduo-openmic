import React, { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, Loader2 } from 'lucide-react';
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

interface GroupPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onSetPassword: (
    conversationId: string, 
    password: string | null, 
    hint?: string
  ) => Promise<boolean>;
}

export const GroupPasswordDialog: React.FC<GroupPasswordDialogProps> = ({
  open,
  onOpenChange,
  conversation,
  onSetPassword,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState(conversation.password_hint || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasExistingPassword = !!conversation.password_hash;

  const handleSetPassword = async () => {
    setError('');

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (password && password.length < 4) {
      setError('La password deve avere almeno 4 caratteri');
      return;
    }

    setLoading(true);
    try {
      const success = await onSetPassword(
        conversation.id, 
        password || null,
        hint || undefined
      );
      if (success) {
        setPassword('');
        setConfirmPassword('');
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setLoading(true);
    try {
      const success = await onSetPassword(conversation.id, null);
      if (success) {
        setPassword('');
        setConfirmPassword('');
        setHint('');
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-secondary" />
            Password del gruppo
          </DialogTitle>
          <DialogDescription>
            {hasExistingPassword 
              ? 'Questo gruppo è protetto da password. Puoi modificarla o rimuoverla.'
              : 'Imposta una password per proteggere l\'accesso al gruppo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasExistingPassword && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <Lock className="w-4 h-4 text-secondary" />
              <span className="text-sm text-foreground">Password attualmente impostata</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              {hasExistingPassword ? 'Nuova password' : 'Password'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasExistingPassword ? 'Lascia vuoto per rimuovere' : 'Inserisci password'}
                className="pr-10"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Conferma password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hint">Suggerimento (opzionale)</Label>
            <Input
              id="hint"
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Es: Il nome della band"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Verrà mostrato agli utenti quando provano ad entrare
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasExistingPassword && (
            <Button
              variant="outline"
              onClick={handleRemovePassword}
              disabled={loading}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Unlock className="w-4 h-4 mr-2" />
              )}
              Rimuovi password
            </Button>
          )}
          <Button
            onClick={handleSetPassword}
            disabled={loading || (!password && !hasExistingPassword)}
            className="neon-button-cyan"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            {hasExistingPassword ? 'Aggiorna password' : 'Imposta password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, User, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const resetSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username deve essere almeno 3 caratteri')
    .max(50, 'Username troppo lungo'),
  password: z.string()
    .min(8, 'Password deve essere almeno 8 caratteri')
    .max(100, 'Password troppo lunga'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Le password non corrispondono',
  path: ['confirmPassword']
});

const AdminReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token mancante. Richiedi un nuovo link di reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = resetSchema.safeParse({ username, password, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Input non valido');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('reset-admin-credentials', {
        body: { token, username: username.trim(), password }
      });

      if (fnError || !data?.success) {
        setError(data?.error || 'Errore durante il reset');
        toast.error(data?.error || 'Errore durante il reset');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success('Credenziali aggiornate con successo!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/admin');
      }, 3000);

    } catch {
      setError('Errore durante il reset');
      toast.error('Errore durante il reset');
    }

    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-card p-8 neon-border-cyan border-2 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="font-display text-2xl font-bold text-green-400 mb-2">
            Reset Completato!
          </h1>
          <p className="text-muted-foreground">
            Le tue credenziali sono state aggiornate. Verrai reindirizzato al login...
          </p>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-card p-8 neon-border-pink border-2 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="font-display text-2xl font-bold text-red-400 mb-2">
            Link Non Valido
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={() => navigate('/admin')}
            className="neon-button-cyan"
          >
            Torna al Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card p-8 neon-border-cyan border-2">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold neon-text-cyan">
            Reset Credenziali
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Imposta nuove credenziali admin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Nuovo Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci nuovo username..."
                className="pl-10 bg-muted border-border focus:border-primary"
                maxLength={50}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Nuova Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri..."
                className="pl-10 bg-muted border-border focus:border-primary"
                maxLength={100}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Conferma Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la password..."
                className="pl-10 bg-muted border-border focus:border-primary"
                maxLength={100}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!username.trim() || !password.trim() || !confirmPassword.trim() || isLoading}
            className="w-full neon-button-cyan h-12 font-display font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aggiornamento...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salva Credenziali
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminReset;

import React, { useState } from 'react';
import { Lock, User, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';
import { z } from 'zod';

// Input validation schema
const loginSchema = z.object({
  username: z.string()
    .trim()
    .min(1, 'Username obbligatorio')
    .max(50, 'Username troppo lungo'),
  password: z.string()
    .min(1, 'Password obbligatoria')
    .max(100, 'Password troppo lunga'),
});

export const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Input non valido');
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function to validate admin credentials
      const { data, error: fnError } = await supabase.functions.invoke('admin-login', {
        body: { username: username.trim(), password }
      });

      if (fnError || !data?.success) {
        toast.error(data?.error || 'Credenziali non valide');
        setIsLoading(false);
        return;
      }

      // Sign in with the admin email and password
      const { error: signInError } = await login(data.email, password);
      
      if (signInError) {
        toast.error('Errore durante il login');
        setIsLoading(false);
        return;
      }

      toast.success(`Benvenuto, ${data.username}!`);
    } catch {
      toast.error('Errore durante il login');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card p-8 neon-border-cyan border-2">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold neon-text-cyan">
            Admin Login
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Pannello di gestione Non c'è Duo - Open Mic
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci username..."
                className="pl-10 bg-muted border-border focus:border-primary"
                maxLength={50}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci password..."
                className="pl-10 pr-10 bg-muted border-border focus:border-primary"
                maxLength={100}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!username.trim() || !password.trim() || isLoading}
            className="w-full neon-button-cyan h-12 font-display font-semibold"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {isLoading ? 'Accesso...' : 'Accedi'}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={async () => {
                const { toast: sonnerToast } = await import('sonner');
                sonnerToast.loading('Invio email di reset...');
                try {
                  const { data, error } = await supabase.functions.invoke('request-password-reset');
                  if (error || !data?.success) {
                    sonnerToast.dismiss();
                    sonnerToast.error(data?.error || 'Errore nell\'invio dell\'email');
                  } else {
                    sonnerToast.dismiss();
                    sonnerToast.success('Email di reset inviata a nonceduo.music@gmail.com');
                  }
                } catch {
                  sonnerToast.dismiss();
                  sonnerToast.error('Errore nell\'invio dell\'email');
                }
              }}
              className="text-sm text-muted-foreground hover:text-secondary transition-colors underline cursor-pointer"
            >
              Hai dimenticato le credenziali?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

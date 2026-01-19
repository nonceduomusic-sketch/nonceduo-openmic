import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

export const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username.trim())
        .eq('password_hash', password)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        toast.error('Errore durante il login');
        setIsLoading(false);
        return;
      }

      if (!data) {
        toast.error('Credenziali non valide');
        setIsLoading(false);
        return;
      }

      login(data.username);
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
            Pannello di gestione karaoke
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci password..."
                className="pl-10 bg-muted border-border focus:border-primary"
              />
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
        </form>
      </div>
    </div>
  );
};

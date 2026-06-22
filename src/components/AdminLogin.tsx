import React, { useState, forwardRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, User, LogIn, Eye, EyeOff, Home, Music, Users, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  getStaffOfflineStatus,
  tryMasterPinLogin,
  pingLocalServer,
  type MasterPinStatus,
} from '@/lib/localStaffAuth';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username obbligatorio').max(50, 'Username troppo lungo'),
  password: z.string().min(1, 'Password obbligatoria').max(100, 'Password troppo lunga'),
});

export const AdminLogin = forwardRef<HTMLDivElement>((_, ref) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [staffStatus, setStaffStatus] = useState<MasterPinStatus | null>(null);
  const [localReachable, setLocalReachable] = useState(false);
  const [showMasterPinDialog, setShowMasterPinDialog] = useState(false);
  const { login, setLocalStaffSession } = useAdmin();

  // Detect local-server availability to offer offline UX
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await pingLocalServer();
      if (!alive) return;
      setLocalReachable(ok);
      if (ok) {
        const s = await getStaffOfflineStatus();
        if (alive) setStaffStatus(s);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Input non valido');
      return;
    }

    setIsLoading(true);
    try {
      // Resolve username → email via admin-login function (requires Internet).
      // If it fails (offline), assume the user typed an email directly and try offline login.
      let email: string | null = null;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('admin-login', {
          body: { username: username.trim(), password },
        });
        if (!fnError && data?.success) {
          email = data.email;
        }
      } catch { /* offline: handled below */ }

      // If we have no email and the user typed something looking like an email, use it
      if (!email && username.includes('@')) email = username.trim();

      if (!email) {
        // Edge function failed AND no email-like input — could be offline + username only.
        toast.error('Per il primo accesso offline, inserisci l\'email completa (non lo username).');
        setIsLoading(false);
        return;
      }

      const { error, offline } = await login(email, password);
      if (error) {
        toast.error(error.message || 'Credenziali non valide');
      } else if (offline) {
        toast.success('Accesso offline tramite cache locale 🔌');
      } else {
        toast.success(`Benvenuto!`);
      }
    } catch (e) {
      toast.error('Errore durante il login');
    }
    setIsLoading(false);
  };

  const showEmergencyButton = localReachable && staffStatus?.master_pin_enabled;

  return (
    <div ref={ref} className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/openmic" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">Open Mic</span>
          </Link>
          <Link to="/social/auth" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-colors">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Community</span>
          </Link>
        </div>
      </div>

      <div className="w-full max-w-sm glass-card p-8 neon-border-cyan border-2">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold neon-text-cyan">Admin Login</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Pannello di gestione Non c'è Duo - Open Mic
          </p>
        </div>

        {localReachable && staffStatus && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
            <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <div>🔌 <strong>Modalità Locale disponibile</strong> ({staffStatus.cached_emails_count} Staff in cache).</div>
              <div>Se sei offline puoi accedere con la stessa email + password usate online.</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username {localReachable && <span className="text-muted-foreground">(o email se offline)</span>}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci username o email..."
                className="pl-10 bg-muted border-border focus:border-primary"
                maxLength={100}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
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

          <div className="text-center pt-2 space-y-2">
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
              className="text-sm text-muted-foreground hover:text-secondary transition-colors underline cursor-pointer block w-full"
            >
              Hai dimenticato le credenziali?
            </button>

            {showEmergencyButton && (
              <button
                type="button"
                onClick={() => setShowMasterPinDialog(true)}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
              >
                <ShieldAlert className="w-3 h-3" />
                Accesso di emergenza locale
              </button>
            )}
          </div>
        </form>
      </div>

      <MasterPinDialog
        open={showMasterPinDialog}
        onClose={() => setShowMasterPinDialog(false)}
        onSuccess={(session) => {
          setLocalStaffSession(session);
          setShowMasterPinDialog(false);
          toast.success(`Accesso di emergenza attivo (${session.role}) 🆘`);
        }}
      />
    </div>
  );
});

AdminLogin.displayName = 'AdminLogin';

// ─── Master PIN dialog ───
const MasterPinDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: (session: import('@/lib/localStaffAuth').LocalStaffSession) => void;
}> = ({ open, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    const r = await tryMasterPinLogin(pin.trim());
    setLoading(false);
    if (r.ok && r.session) {
      setPin('');
      onSuccess(r.session);
    } else {
      const msg = r.error === 'master_pin_disabled' ? 'Master PIN non configurato sul server'
        : r.error === 'rate_limited' ? 'Troppi tentativi, riprova tra qualche minuto'
          : r.error === 'pin_invalid' ? 'PIN errato'
            : 'Server locale non raggiungibile';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Accesso Staff di Emergenza
          </DialogTitle>
          <DialogDescription>
            Usa il <strong>STAFF_MASTER_PIN</strong> configurato in <code>local-server/.env</code>.
            Concede accesso Staff <strong>solo locale</strong> finché Internet non torna.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Master PIN"
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          maxLength={20}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={submit} disabled={loading || !pin.trim()}>
            {loading ? 'Verifica…' : 'Accedi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

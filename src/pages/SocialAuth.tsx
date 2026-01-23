import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { SEO } from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';
import { SectionOffLanding } from '@/components/SectionOffLanding';
import { useSectionStatus } from '@/hooks/useSectionStatus';
import { z } from 'zod';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  KeyRound,
  Shield
} from 'lucide-react';

// Validation schemas
const emailSchema = z.string().email('Email non valida');
const passwordSchema = z.string().min(6, 'La password deve avere almeno 6 caratteri');
const displayNameSchema = z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(50, 'Nome troppo lungo');

const SocialAuth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { status: communityStatus, loading: communityLoading } = useSectionStatus('community');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string; confirmPassword?: string; privacy?: string }>({});

  // Check for password reset mode (from email link)
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      setIsResetMode(true);
    }
  }, [searchParams]);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !isResetMode) {
        navigate('/social/dashboard');
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
      } else if (session && !isResetMode) {
        navigate('/social/dashboard');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate, isResetMode]);

  // IMPORTANT: keep gating AFTER all hooks (useState/useEffect) to respect React Rules of Hooks.
  const communityDisabled = !communityLoading && !!communityStatus && !communityStatus.isEnabled;
  if (communityLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (communityDisabled) {
    return (
      <SectionOffLanding
        title="Community"
        description="La Community è momentaneamente non disponibile, ma tornerà attiva durante gli eventi. Per info e date, contattaci."
        backTo="/"
        backLabel="Torna al sito"
        secondaryBackTo="/app"
        secondaryBackLabel="Torna all'app"
      />
    );
  }

  const validateForm = (isSignup: boolean): boolean => {
    const newErrors: typeof errors = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0]?.message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0]?.message;
      }
    }
    
    if (isSignup) {
      try {
        displayNameSchema.parse(displayName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.displayName = e.errors[0]?.message;
        }
      }
      
      // Privacy checkbox validation
      if (!privacyAccepted) {
        newErrors.privacy = 'Devi accettare l\'informativa privacy per registrarti';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Credenziali non valide',
            description: 'Email o password errati. Riprova.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'Email non confermata',
            description: 'Controlla la tua casella email e clicca sul link di conferma.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Errore',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/social/auth`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName.trim(),
          },
        },
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Email già registrata',
            description: 'Questa email è già associata a un account. Prova ad accedere.',
            variant: 'destructive',
          });
          setActiveTab('login');
        } else {
          toast({
            title: 'Errore',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else if (data.user) {
        // Create profile manually
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + data.user.id.substring(0, 4);
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: data.user.id,
            display_name: displayName.trim(),
            username: username,
            is_online: false,
            last_seen_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
        
        // Try to send welcome email (non-blocking)
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: email.trim(),
              displayName: displayName.trim(),
              username: username,
            },
          });
        } catch (emailErr) {
          console.log('Welcome email not sent:', emailErr);
        }
        
        // Show confirmation pending state
        setConfirmationPending(true);
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrors({ email: 'Inserisci la tua email' });
      return;
    }
    
    try {
      emailSchema.parse(email);
    } catch {
      setErrors({ email: 'Email non valida' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/social/auth?type=recovery`,
      });
      
      if (error) {
        toast({
          title: 'Errore',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Email inviata',
          description: 'Se l\'email è registrata, riceverai un link per reimpostare la password.',
        });
      }
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/social/auth`,
        },
      });
      
      if (error) {
        toast({
          title: 'Errore',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setErrors({ password: 'La password deve avere almeno 6 caratteri' });
      return;
    }
    
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Le password non corrispondono' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast({
          title: 'Errore',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password aggiornata!',
          description: 'La tua password è stata cambiata con successo.',
        });
        setIsResetMode(false);
        navigate('/social/dashboard');
      }
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmation pending screen
  if (confirmationPending) {
    return (
      <>
        <SEO title="Conferma Email | Community Non Ce Duo" description="Conferma la tua email" />
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Controlla la tua email! 📬</h2>
              <p className="text-muted-foreground mb-6">
                Ti abbiamo inviato un link di conferma a<br />
                <strong className="text-foreground">{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Clicca sul link nell'email per attivare il tuo account e accedere alla community.
              </p>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setConfirmationPending(false);
                    setActiveTab('login');
                  }}
                >
                  Ho confermato, vai al login
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setConfirmationPending(false);
                    setActiveTab('signup');
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Email sbagliata? Torna indietro
                </Button>
                <p className="text-xs text-muted-foreground">
                  Non hai ricevuto l'email? Controlla la cartella spam.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Password reset mode
  if (isResetMode) {
    return (
      <>
        <SEO title="Nuova Password | Community Non Ce Duo" description="Imposta la tua nuova password" />
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Nuova Password</CardTitle>
              <CardDescription>Scegli una nuova password sicura</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimo 6 caratteri"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Conferma Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ripeti la password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-accent"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Aggiornamento...
                    </>
                  ) : (
                    'Salva Nuova Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Forgot password form
  if (showForgotPassword) {
    return (
      <>
        <SEO title="Recupera Password | Community Non Ce Duo" description="Recupera la tua password" />
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          </div>

          <button 
            onClick={() => setShowForgotPassword(false)}
            className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Torna al login</span>
          </button>

          <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Password dimenticata?</CardTitle>
              <CardDescription>
                Inserisci la tua email e ti invieremo un link per reimpostare la password
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {emailSent ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">Email inviata!</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Se l'email è registrata, riceverai un link per reimpostare la password.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setEmailSent(false);
                    }}
                  >
                    Torna al login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="la-tua@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-accent"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      'Invia link di recupero'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Main login/signup form
  return (
    <>
      <SEO 
        title="Accedi | Community Non Ce Duo"
        description="Accedi o registrati per unirti alla community di Non Ce Duo"
      />
      
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        </div>

        {/* Navigation links */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              to="/openmic" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Open Mic
            </Link>
            <Link 
              to="/messaggi" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dediche
            </Link>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-orbitron">
              {activeTab === 'login' ? 'Bentornato!' : 'Unisciti a noi'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'login' 
                ? 'Accedi al tuo account per continuare'
                : 'Crea il tuo account in pochi secondi'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="la-tua@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Password dimenticata?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 pr-11"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Accesso in corso...
                      </>
                    ) : (
                      'Accedi'
                    )}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">oppure</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continua con Google
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Come ti chiami?</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Il tuo nome"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-11"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="la-tua@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimo 6 caratteri"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 pr-11"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  {/* Privacy Checkbox - GDPR Required */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Checkbox
                        id="privacy-accept"
                        checked={privacyAccepted}
                        onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                        className="mt-0.5"
                        disabled={isLoading}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="privacy-accept" 
                          className="text-sm font-normal cursor-pointer leading-relaxed"
                        >
                          Ho letto e accetto l'
                          <Link 
                            to="/privacy" 
                            target="_blank"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Shield className="w-3 h-3" />
                            Informativa Privacy
                          </Link>
                        </Label>
                      </div>
                    </div>
                    {errors.privacy && <p className="text-sm text-destructive">{errors.privacy}</p>}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90"
                    disabled={isLoading || !privacyAccepted}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creazione account...
                      </>
                    ) : (
                      'Crea Account'
                    )}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">oppure</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Registrati con Google
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    📧 Riceverai un'email di conferma per attivare il tuo account
                  </p>
                </form>
              </TabsContent>
            </Tabs>
            
            <p className="text-center text-sm text-muted-foreground mt-6">
              Registrandoti accetti i nostri{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                termini e l'informativa privacy
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SocialAuth;

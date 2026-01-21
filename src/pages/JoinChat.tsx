import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Users, ArrowRight, AlertCircle, Music, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface InviteInfo {
  conversation_name: string;
  is_group: boolean;
  is_public: boolean;
}

const JoinChat: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  // Get/create session ID
  useEffect(() => {
    const safeGet = (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };

    const safeSet = (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
    };

    const generateId = () => {
      try {
        const cryptoAny = crypto as any;
        if (typeof cryptoAny?.randomUUID === 'function') {
          return cryptoAny.randomUUID();
        }
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
      } catch {}
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    let id = safeGet('user_session_id');
    if (!id) {
      id = generateId();
      safeSet('user_session_id', id);
    }
    setSessionId(id);

    const savedName = safeGet('user_name');
    if (savedName) setName(savedName);
  }, []);

  // Fetch invite info
  useEffect(() => {
    const fetchInviteInfo = async () => {
      if (!code) {
        setError('Codice invito mancante');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: 'getInviteInfo', invite_code: code }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          setError(data.error || 'Link non valido');
          setLoading(false);
          return;
        }

        setInviteInfo(data);
      } catch (err) {
        setError('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteInfo();
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Inserisci il tuo nome');
      return;
    }

    if (!code || !sessionId) return;

    setJoining(true);
    try {
      localStorage.setItem('user_name', name.trim());

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'joinViaInvite',
          invite_code: code,
          participant_name: name.trim(),
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Errore nel join');
        setJoining(false);
        return;
      }

      if (data.already_member) {
        toast.info('Sei già membro di questa chat');
      } else {
        toast.success('Ti sei unito alla chat!');
      }

      // Navigate to messages page
      navigate('/messaggi');
    } catch (err) {
      toast.error('Errore imprevisto');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto animate-pulse">
              <MessageCircle className="w-10 h-10 text-secondary" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-2 border-secondary/30 animate-ping" />
          </div>
          <p className="mt-4 text-muted-foreground">Caricamento invito...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
        </div>
        
        <div className="glass-card p-8 max-w-md w-full text-center relative z-10">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2 text-foreground">Link non valido</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto">
                Torna alla Home
              </Button>
            </Link>
            <Link to="/messaggi">
              <Button className="neon-button-cyan w-full sm:w-auto">
                Vai ai Messaggi
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      <div className="glass-card p-8 max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Non C'è Duo</span>
          </Link>

          {/* Chat icon */}
          <div className="relative mb-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
              inviteInfo?.is_group ? 'bg-gradient-to-br from-secondary/30 to-accent/20' : 'bg-gradient-to-br from-primary/30 to-secondary/20'
            }`}>
              {inviteInfo?.is_group ? (
                <Users className="w-12 h-12 text-secondary" />
              ) : (
                <MessageCircle className="w-12 h-12 text-primary" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 left-0 right-0 mx-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-bounce" style={{ left: 'calc(50% + 30px)' }}>
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
            <span className="text-foreground">Unisciti a </span>
            <span className="neon-text-cyan">{inviteInfo?.conversation_name || 'Chat'}</span>
          </h1>
          <p className="text-muted-foreground">
            {inviteInfo?.is_group 
              ? 'Sei stato invitato a unirti a questo gruppo'
              : 'Sei stato invitato a una conversazione'}
          </p>
          
          {/* Badge */}
          {inviteInfo?.is_group && (
            <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm">
              {inviteInfo.is_public ? '🌍 Gruppo pubblico' : '🔒 Gruppo privato'}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
              Come ti chiami?
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Il tuo nome"
              className="h-12 bg-muted border-border focus:border-secondary text-lg"
              disabled={joining}
              autoFocus
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Questo nome sarà visibile agli altri partecipanti
            </p>
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full neon-button-cyan h-14 font-display font-semibold text-lg"
          >
            {joining ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Unione in corso...
              </>
            ) : (
              <>
                Entra nella chat
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Nessuna registrazione richiesta. Entra e chatta subito! 💬
        </p>
      </div>
    </div>
  );
};

export default JoinChat;

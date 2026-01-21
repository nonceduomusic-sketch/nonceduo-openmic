import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
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
        <MessageCircle className="w-12 h-12 text-secondary animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Link non valido</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate('/')} className="neon-button-cyan">
            Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
            {inviteInfo?.is_group ? (
              <Users className="w-10 h-10 text-secondary" />
            ) : (
              <MessageCircle className="w-10 h-10 text-secondary" />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold neon-text-cyan mb-2">
            Unisciti a {inviteInfo?.conversation_name || 'Chat'}
          </h1>
          <p className="text-muted-foreground">
            {inviteInfo?.is_group 
              ? 'Sei stato invitato a unirti a questo gruppo'
              : 'Sei stato invitato a una conversazione'}
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Il tuo nome
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Come ti chiami?"
              className="bg-muted border-border focus:border-secondary"
              disabled={joining}
            />
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full neon-button-cyan h-12 font-display font-semibold"
          >
            {joining ? 'Unione in corso...' : 'Entra nella chat'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default JoinChat;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMessages, Message } from '@/hooks/useMessages';
import { z } from 'zod';
import { toast } from 'sonner';

const messageSchema = z.object({
  sender_name: z.string().trim()
    .min(2, 'Nome troppo corto (minimo 2 caratteri)')
    .max(50, 'Nome troppo lungo (massimo 50 caratteri)'),
  message_text: z.string().trim()
    .min(5, 'Messaggio troppo corto (minimo 5 caratteri)')
    .max(500, 'Messaggio troppo lungo (massimo 500 caratteri)'),
});

const Messages: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSessionId, setUserSessionId] = useState<string>('');
  const { messages, sendMessage } = useMessages();

  // Generate a unique session ID for this user to track their messages
  useEffect(() => {
    let sessionId = localStorage.getItem('user_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('user_session_id', sessionId);
    }
    setUserSessionId(sessionId);
    
    // Load saved name
    const savedName = localStorage.getItem('user_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = messageSchema.safeParse({ 
      sender_name: name, 
      message_text: message 
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    setIsSubmitting(true);
    
    // Save name for future use
    localStorage.setItem('user_name', validation.data.sender_name);
    
    // Include session ID in the sender name for tracking
    const senderNameWithSession = `${validation.data.sender_name}||${userSessionId}`;
    
    const success = await sendMessage(senderNameWithSession, validation.data.message_text);
    
    if (success) {
      setMessage('');
    }
    
    setIsSubmitting(false);
  };

  // Filter messages from this user's session
  const userMessages = messages.filter((m: Message) => 
    m.sender_name.includes(`||${userSessionId}`)
  );

  const getDisplayName = (senderName: string) => {
    return senderName.split('||')[0];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link to="/openmic">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold neon-text-cyan">
                Scrivi a Noi
              </h1>
              <p className="text-sm text-muted-foreground">
                Inviaci un messaggio, ti risponderemo!
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-lg mx-auto">
        {/* Send Message Form */}
        <div className="glass-card p-6 neon-border-cyan border mb-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-secondary" />
            Nuovo Messaggio
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Il tuo nome o nickname
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Come ti chiami?"
                className="bg-muted border-border focus:border-secondary focus:ring-secondary"
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Il tuo messaggio
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi qui il tuo messaggio..."
                className="bg-muted border-border focus:border-secondary focus:ring-secondary min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/500 caratteri
              </p>
            </div>
            
            <Button
              type="submit"
              disabled={!name.trim() || !message.trim() || isSubmitting}
              className="w-full neon-button-cyan h-12 font-display font-semibold"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Invio...' : 'Invia Messaggio'}
            </Button>
          </form>
        </div>

        {/* User's Messages and Replies */}
        {userMessages.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              I tuoi messaggi
            </h2>
            
            {userMessages.map((msg: Message) => (
              <div key={msg.id} className="glass-card p-4 space-y-3">
                <div className="border-l-4 border-primary pl-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleString('it-IT')}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {getDisplayName(msg.sender_name)}:
                  </p>
                  <p className="text-foreground">{msg.message_text}</p>
                </div>
                
                {msg.admin_reply && (
                  <div className="border-l-4 border-secondary pl-3 bg-secondary/10 p-3 rounded-r-lg">
                    <p className="text-xs text-muted-foreground">
                      Risposta dello staff • {new Date(msg.replied_at!).toLocaleString('it-IT')}
                    </p>
                    <p className="text-foreground">{msg.admin_reply}</p>
                  </div>
                )}
                
                {!msg.admin_reply && (
                  <p className="text-xs text-muted-foreground italic">
                    In attesa di risposta...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;

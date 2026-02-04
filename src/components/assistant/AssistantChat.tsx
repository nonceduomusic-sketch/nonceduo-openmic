import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ChevronLeft, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowStep, FlowOption, getFlowForSection, getStepById } from './AssistantFlows';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  options?: FlowOption[];
}

interface AssistantChatProps {
  isOpen: boolean;
  section: string;
  onClose: () => void;
  onSendMessage: (text: string, senderType: 'user' | 'bot', senderName?: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onUpdateConversation: (updates: { lead_type?: string; lead_score?: number; flow_path?: string[] }) => Promise<void>;
  isMobile: boolean;
}

export const AssistantChat: React.FC<AssistantChatProps> = ({
  isOpen,
  section,
  onClose,
  onSendMessage,
  onUpdateConversation,
  isMobile,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('start');
  const [flowPath, setFlowPath] = useState<string[]>([]);
  const [isChatMode, setIsChatMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const flow = getFlowForSection(section);

  // Initialize with first message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const firstStep = flow[0];
      if (firstStep) {
        setTimeout(() => {
          addBotMessage(firstStep.message, firstStep.options);
        }, 500);
      }
    }
  }, [isOpen, flow, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addBotMessage = (text: string, options?: FlowOption[]) => {
    const newMessage: Message = {
      id: `bot-${Date.now()}`,
      text,
      sender: 'bot',
      timestamp: new Date(),
      options,
    };
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(false);
  };

  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleOptionClick = async (option: FlowOption) => {
    // Add user selection as message
    addUserMessage(`${option.emoji} ${option.label}`);

    // Update flow path
    const newPath = [...flowPath, option.id];
    setFlowPath(newPath);

    // Update conversation with lead info
    if (option.leadType || option.leadScore) {
      await onUpdateConversation({
        lead_type: option.leadType,
        lead_score: option.leadScore,
        flow_path: newPath,
      });
    }

    // Send to backend
    await onSendMessage(
      `${option.emoji} ${option.label}`,
      'user',
      undefined,
      { option_id: option.id, step: currentStep }
    );

    // Handle action
    if (option.action) {
      handleAction(option.action);
      return;
    }

    // Move to next step
    if (option.nextStep) {
      setIsTyping(true);
      setCurrentStep(option.nextStep);

      setTimeout(() => {
        const nextStepData = getStepById(flow, option.nextStep!);
        if (nextStepData) {
          // Send bot response to backend
          onSendMessage(nextStepData.message, 'bot', 'Assistente');
          addBotMessage(nextStepData.message, nextStepData.options);
        }
      }, 800);
    } else if (option.isFinal) {
      // Final step without action - show thank you
      setIsTyping(true);
      setTimeout(() => {
        const thankYou = 'Grazie! 🙏 Se hai altre domande, sono qui per te.';
        onSendMessage(thankYou, 'bot', 'Assistente');
        addBotMessage(thankYou);
      }, 500);
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'whatsapp':
        window.open('https://wa.me/393270505826?text=Ciao!%20Ho%20visto%20il%20sito%20e%20vorrei%20info...', '_blank');
        addBotMessage('Ti ho aperto WhatsApp! 💬 A presto!');
        break;
      case 'instagram':
        window.open('https://instagram.com/nonceduo', '_blank');
        addBotMessage('Ti ho aperto Instagram! 📱 Seguici per restare aggiornato!');
        break;
      case 'events':
        // Could navigate to events page
        addBotMessage('Puoi vedere i nostri prossimi eventi sulla pagina principale! 🎵');
        break;
      case 'repertoire':
        // Could navigate to repertoire
        addBotMessage('Trovi il nostro repertorio nella sezione Open Mic! 🎤 Abbiamo tantissime canzoni!');
        break;
      case 'chat':
        setIsChatMode(true);
        addBotMessage('Perfetto! Scrivi pure il tuo messaggio qui sotto. Ti risponderemo il prima possibile! ✍️');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        break;
    }
  };

  const handleSendFreeText = async () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue('');
    addUserMessage(text);

    // Send to backend
    await onSendMessage(text, 'user');

    // Show confirmation
    setIsTyping(true);
    setTimeout(() => {
      const response = 'Messaggio ricevuto! ✅ Ti risponderemo il prima possibile. Grazie!';
      onSendMessage(response, 'bot', 'Assistente');
      addBotMessage(response);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "fixed z-50",
          isMobile 
            ? "inset-0" 
            : "bottom-4 right-4 w-[380px] h-[550px] rounded-2xl"
        )}
      >
        <div className={cn(
          "h-full flex flex-col",
          "bg-background/95 backdrop-blur-xl",
          "border border-border shadow-2xl shadow-black/20",
          isMobile ? "rounded-none" : "rounded-2xl overflow-hidden"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Non c'è Duo</h3>
                <p className="text-xs text-muted-foreground">Assistente</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    message.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.sender === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                    
                    {/* Options buttons */}
                    {message.options && message.options.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionClick(option)}
                            className={cn(
                              "w-full flex items-center gap-2 p-3 rounded-xl text-left",
                              "bg-background/80 hover:bg-background",
                              "border border-border hover:border-primary/50",
                              "transition-all duration-200 hover:scale-[1.02]",
                              "group"
                            )}
                          >
                            <span className="text-lg flex-shrink-0">{option.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {option.label}
                              </p>
                              {option.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {option.description}
                                </p>
                              )}
                            </div>
                            {option.action && (
                              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input - only show in chat mode */}
          {isChatMode && (
            <div className="p-4 border-t border-border bg-background/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendFreeText()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendFreeText}
                  disabled={!inputValue.trim()}
                  size="icon"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Powered by footer */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
            <p className="text-[10px] text-center text-muted-foreground">
              ⚡ Risposte rapide • 💬 Chat live con lo staff
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

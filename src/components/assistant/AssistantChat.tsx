import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, ExternalLink, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowStep, FlowOption, getFlowForSection, getStepById } from './AssistantFlows';
import { MessageStatusIndicator } from '@/components/MessageStatusIndicator';
import type { AssistantMessage } from '@/hooks/useAssistantWidget';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user' | 'admin';
  timestamp: Date;
  options?: FlowOption[];
  deliveryStatus?: 'sent' | 'delivered' | 'read';
}

interface SongRequestData {
  name?: string;
  title?: string;
  artist?: string;
}

interface AssistantChatProps {
  isOpen: boolean;
  section: string;
  initialFlow?: string;
  initialPrefill?: string;
  onClose: () => void;
  onMinimize?: () => void;
  onSendMessage: (text: string, senderType: 'user' | 'bot', senderName?: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onUpdateConversation: (updates: { lead_type?: string; lead_score?: number; flow_path?: string[]; user_name?: string }) => Promise<void>;
  isMobile: boolean;
  persistedMessages?: AssistantMessage[];
}

export const AssistantChat: React.FC<AssistantChatProps> = ({
  isOpen,
  section,
  initialFlow,
  initialPrefill,
  onClose,
  onMinimize,
  onSendMessage,
  onUpdateConversation,
  isMobile,
  persistedMessages = [],
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('start');
  const [flowPath, setFlowPath] = useState<string[]>([]);
  const [isChatMode, setIsChatMode] = useState(false);
  const [inputMode, setInputMode] = useState<'name' | 'title' | 'artist' | 'free' | null>(null);
  const [songRequestData, setSongRequestData] = useState<SongRequestData>({});
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasHydratedFromDb, setHasHydratedFromDb] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const flow = getFlowForSection(section);

  // Get placeholder based on input mode
  const getInputPlaceholder = () => {
    switch (inputMode) {
      case 'name': return 'Scrivi il tuo nome...';
      case 'title': return 'Scrivi il titolo della canzone...';
      case 'artist': return 'Scrivi artista o band...';
      default: return 'Scrivi un messaggio...';
    }
  };

  // Convert persisted messages to local format and merge with flow messages
  useEffect(() => {
    if (!isOpen) return;

    // If we have persisted messages, (re)hydrate from DB.
    // This is important after refresh: the UI might have already initialized the flow
    // before persistedMessages arrive.
    if (persistedMessages.length > 0) {
      const restored: Message[] = persistedMessages.map(pm => ({
        id: pm.id,
        text: pm.message_text,
        sender: pm.sender_type as 'bot' | 'user' | 'admin',
        timestamp: new Date(pm.created_at),
        options: undefined,
        deliveryStatus: pm.delivery_status,
      }));

      const lastPersistedId = persistedMessages[persistedMessages.length - 1]?.id;
      const alreadyHasLast = lastPersistedId ? messages.some(m => m.id === lastPersistedId) : false;

      if (!hasHydratedFromDb || messages.length === 0 || !alreadyHasLast) {
        setMessages(restored);
        setHasHydratedFromDb(true);
        setHasInitialized(true);

        const hasUserMessages = persistedMessages.some(m => m.sender_type === 'user');
        const hasAdminMessages = persistedMessages.some(m => m.sender_type === 'admin');
        if (hasUserMessages || hasAdminMessages) {
          setIsChatMode(true);
          setInputMode('free');
        }
      }

      return;
    }

    // Initialize with first flow message only if no persisted messages
    if (messages.length === 0 && !hasInitialized) {
      if (initialFlow) {
        const targetStep = getStepById(flow, initialFlow);
        if (targetStep) {
          setTimeout(() => {
            if (initialPrefill) {
              const contextMessage = `🔍 Stavi cercando: "${initialPrefill}"`;
              addBotMessage(contextMessage);
              setTimeout(() => {
                addBotMessage(targetStep.message, targetStep.options);
                if (targetStep.inputMode) {
                  setInputMode(targetStep.inputMode);
                }
              }, 400);
            } else {
              addBotMessage(targetStep.message, targetStep.options);
              if (targetStep.inputMode) {
                setInputMode(targetStep.inputMode);
              }
            }
          }, 300);
          setHasInitialized(true);
          return;
        }
      }
      
      const firstStep = flow[0];
      if (firstStep) {
        setTimeout(() => {
          addBotMessage(firstStep.message, firstStep.options);
          if (firstStep.inputMode) {
            setInputMode(firstStep.inputMode);
          }
        }, 500);
      }
      setHasInitialized(true);
    }
  }, [isOpen, flow, messages.length, initialFlow, initialPrefill, persistedMessages, hasInitialized, hasHydratedFromDb, messages]);

  // Listen for new admin messages from realtime
  useEffect(() => {
    if (persistedMessages.length === 0) return;

    // Find new admin messages not in our local state
    const localIds = new Set(messages.map(m => m.id));
    const newAdminMessages = persistedMessages.filter(
      pm => pm.sender_type === 'admin' && !localIds.has(pm.id)
    );

    if (newAdminMessages.length > 0) {
      setMessages(prev => {
        const updated = [...prev];
        newAdminMessages.forEach(pm => {
          if (!updated.some(m => m.id === pm.id)) {
            updated.push({
              id: pm.id,
              text: pm.message_text,
              sender: 'admin',
              timestamp: new Date(pm.created_at),
              deliveryStatus: pm.delivery_status,
            });
          }
        });
        // Sort by timestamp
        updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return updated;
      });

      // Enable chat mode when admin responds
      if (!isChatMode) {
        setIsChatMode(true);
        setInputMode('free');
      }
    }
  }, [persistedMessages, messages, isChatMode]);

  // Sync delivery status updates from persisted messages to local state
  useEffect(() => {
    if (persistedMessages.length === 0 || messages.length === 0) return;
    
    // Create a map of persisted message statuses
    const statusMap = new Map(
      persistedMessages.map(pm => [pm.id, pm.delivery_status])
    );
    
    // Check if any local message needs status update
    let needsUpdate = false;
    const updatedMessages = messages.map(msg => {
      const persistedStatus = statusMap.get(msg.id);
      if (persistedStatus && persistedStatus !== msg.deliveryStatus) {
        needsUpdate = true;
        return { ...msg, deliveryStatus: persistedStatus as 'sent' | 'delivered' | 'read' };
      }
      return msg;
    });
    
    if (needsUpdate) {
      setMessages(updatedMessages);
    }
  }, [persistedMessages]);
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, isTyping, scrollToBottom]);

  // Focus input when input mode is active
  useEffect(() => {
    if (inputMode && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputMode]);

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
      deliveryStatus: 'sent', // New messages start as "sent"
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleOptionClick = async (option: FlowOption) => {
    addUserMessage(`${option.emoji} ${option.label}`);

    const newPath = [...flowPath, option.id];
    setFlowPath(newPath);

    if (option.leadType || option.leadScore) {
      try {
        await onUpdateConversation({
          lead_type: option.leadType,
          lead_score: option.leadScore,
          flow_path: newPath,
        });
      } catch (err) {
        console.error('[assistant] onUpdateConversation failed:', err);
        addBotMessage('⚠️ Non riesco ad aggiornare la conversazione in questo momento. Riprova tra poco.');
      }
    }

    try {
      await onSendMessage(
        `${option.emoji} ${option.label}`,
        'user',
        undefined,
        { option_id: option.id, step: currentStep }
      );
    } catch (err) {
      console.error('[assistant] onSendMessage failed (option click):', err);
      addBotMessage('⚠️ Errore invio messaggio. Controlla la connessione e riprova.');
      return;
    }

    // Handle input action - show input field
    if (option.action === 'input' && option.inputField) {
      setInputMode(option.inputField);
      setCurrentStep(option.nextStep || currentStep);
      return;
    }

    if (option.action && option.action !== 'input') {
      handleAction(option.action);
      return;
    }

    if (option.nextStep) {
      setIsTyping(true);
      setCurrentStep(option.nextStep);

      setTimeout(() => {
        const nextStepData = getStepById(flow, option.nextStep!);
        if (nextStepData) {
          onSendMessage(nextStepData.message, 'bot', 'Assistente').catch((err) => {
            console.error('[assistant] onSendMessage failed (bot next step):', err);
          });
          addBotMessage(nextStepData.message, nextStepData.options);
          if (nextStepData.inputMode) {
            setInputMode(nextStepData.inputMode);
          }
        }
      }, 800);
    } else if (option.isFinal) {
      if (option.id === 'done') {
        setIsTyping(true);
        setTimeout(() => {
          const thankYou = 'Grazie! 🙏 Se hai altre domande, sono qui per te.';
          onSendMessage(thankYou, 'bot', 'Assistente').catch((err) => {
            console.error('[assistant] onSendMessage failed (thank you):', err);
          });
          addBotMessage(thankYou);
        }, 500);
      }
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'whatsapp':
        window.open('https://wa.me/393270505826?text=Ciao!%20Ho%20visto%20il%20sito%20e%20vorrei%20info...', '_blank');
        addBotMessage('Ti ho aperto WhatsApp! 💬 A presto!');
        break;
      case 'instagram':
        window.open('https://www.instagram.com/nonceduo.music/', '_blank');
        addBotMessage('Ti ho aperto Instagram! 📱 Seguici per restare aggiornato!');
        break;
      case 'events':
        addBotMessage('Puoi vedere i nostri prossimi eventi sulla pagina principale! 🎵');
        break;
      case 'repertoire':
        addBotMessage('Trovi il nostro repertorio nella sezione Open Mic! 🎤 Abbiamo tantissime canzoni!');
        break;
      case 'chat':
        setIsChatMode(true);
        setInputMode('free');
        addBotMessage('Perfetto! Scrivi pure il tuo messaggio qui sotto. Ti risponderemo il prima possibile! ✍️');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        break;
    }
  };

  const handleGuidedInput = async () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue('');
    addUserMessage(text);

    // Save to song request data
    const newData = { ...songRequestData };
    if (inputMode === 'name') {
      newData.name = text;
      await onUpdateConversation({ user_name: text });
    } else if (inputMode === 'title') {
      newData.title = text;
    } else if (inputMode === 'artist') {
      newData.artist = text;
    }
    setSongRequestData(newData);

    // Send to backend with metadata
    try {
      await onSendMessage(text, 'user', newData.name, {
        input_type: inputMode,
        song_request: newData,
      });
    } catch (err) {
      console.error('[assistant] onSendMessage failed (guided input):', err);
      addBotMessage('⚠️ Errore invio messaggio. Controlla la connessione e riprova.');
      return;
    }

    // Move to next step based on current input mode
    if (inputMode === 'name') {
      setIsTyping(true);
      setInputMode(null);
      setTimeout(() => {
        const nextStep = getStepById(flow, 'song_request_title');
        if (nextStep) {
          onSendMessage(nextStep.message, 'bot', 'Assistente').catch((err) => {
            console.error('[assistant] onSendMessage failed (song_request_title):', err);
          });
          addBotMessage(nextStep.message, nextStep.options);
          setInputMode('title');
          setCurrentStep('song_request_title');
        }
      }, 600);
    } else if (inputMode === 'title') {
      setIsTyping(true);
      setInputMode(null);
      setTimeout(() => {
        const nextStep = getStepById(flow, 'song_request_artist');
        if (nextStep) {
          onSendMessage(nextStep.message, 'bot', 'Assistente').catch((err) => {
            console.error('[assistant] onSendMessage failed (song_request_artist):', err);
          });
          addBotMessage(nextStep.message, nextStep.options);
          setInputMode('artist');
          setCurrentStep('song_request_artist');
        }
      }, 600);
    } else if (inputMode === 'artist') {
      setIsTyping(true);
      setInputMode(null);
      // Final step - send complete song request with special flag for Telegram
      const fullRequest = `📝 Richiesta canzone:\n👤 Nome: ${newData.name}\n🎵 Titolo: ${newData.title}\n🎤 Artista: ${newData.artist || 'Non specificato'}`;
      try {
        await onSendMessage(fullRequest, 'user', newData.name, {
          type: 'song_request_complete',
          song_request: newData,
          isComplete: true, // Flag for structured Telegram notification
        });
      } catch (err) {
        console.error('[assistant] onSendMessage failed (song_request_complete):', err);
        addBotMessage('⚠️ Errore invio messaggio. Controlla la connessione e riprova.');
        return;
      }
      
      setTimeout(() => {
        const confirmStep = getStepById(flow, 'song_request_confirm');
        if (confirmStep) {
          onSendMessage(confirmStep.message, 'bot', 'Assistente').catch((err) => {
            console.error('[assistant] onSendMessage failed (song_request_confirm):', err);
          });
          addBotMessage(confirmStep.message, confirmStep.options);
          setCurrentStep('song_request_confirm');
          setIsChatMode(true); // Enable free chat after request
        }
      }, 800);
    }
  };

  // Check if we should show auto-acknowledgment based on conversation history
  const shouldShowAutoAck = useCallback((): boolean => {
    // Always show ack on first user message in the conversation
    const userMessages = messages.filter(m => m.sender === 'user');
    if (userMessages.length <= 1) {
      return true;
    }

    // Find last admin message timestamp
    const adminMessages = messages.filter(m => m.sender === 'admin');
    if (adminMessages.length === 0) {
      // No admin has ever replied - always show ack
      return true;
    }

    const lastAdminMessage = adminMessages[adminMessages.length - 1];
    const lastAdminTime = lastAdminMessage.timestamp.getTime();
    const now = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;

    // Only show ack if last admin message was more than 5 minutes ago
    return (now - lastAdminTime) > fiveMinutesMs;
  }, [messages]);

  const handleSendFreeText = async () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue('');
    addUserMessage(text);

    try {
      await onSendMessage(text, 'user', songRequestData.name);
    } catch (err) {
      console.error('[assistant] onSendMessage failed (free text):', err);
      addBotMessage('⚠️ Errore invio messaggio. Controlla la connessione e riprova.');
      return;
    }

    // Only show auto-acknowledgment if appropriate (first message or no recent admin reply)
    if (shouldShowAutoAck()) {
      setIsTyping(true);
      setTimeout(() => {
        const response = 'Messaggio ricevuto! ✅ Ti risponderemo il prima possibile. Grazie!';
        onSendMessage(response, 'bot', 'Assistente').catch((err) => {
          console.error('[assistant] onSendMessage failed (ack):', err);
        });
        addBotMessage(response);
      }, 800);
    }
  };

  const handleSubmit = () => {
    if (inputMode && inputMode !== 'free') {
      handleGuidedInput();
    } else {
      handleSendFreeText();
    }
  };

  // Reset state when closing
  const handleClose = () => {
    // Don't reset - keep state for persistence
    onClose();
  };

  if (!isOpen) return null;

  // Mobile/tablet UX: il campo deve esserci sempre.
  // Desktop: manteniamo la logica guidata, ma permettiamo comunque chat libera se attivata.
  const showInput = Boolean(inputMode) || isChatMode || isMobile;

  // Handle swipe-down to close on mobile
  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    // If dragged down more than 100px or with high velocity, close
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag={isMobile ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={isMobile ? handleDragEnd : undefined}
        className={cn(
          "fixed z-[100]",
          isMobile 
            ? "inset-0" 
            : "bottom-4 right-4 w-[380px] h-[550px] rounded-2xl"
        )}
        style={isMobile ? { height: '100dvh', minHeight: '-webkit-fill-available' } : undefined}
      >
        <div className={cn(
          "h-full flex flex-col",
          "bg-background backdrop-blur-xl",
          "border border-border shadow-2xl shadow-black/20",
          isMobile ? "rounded-none overflow-hidden" : "rounded-2xl overflow-hidden"
        )}>
          {/* Header - enlarged touch targets on mobile, with safe area padding */}
          <div className={cn(
            "flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 flex-shrink-0",
            isMobile ? "px-3 py-3" : "p-4"
          )}
          style={isMobile ? { paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' } : undefined}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-foreground truncate">Non c'è Duo</h3>
                <p className="text-xs text-muted-foreground">Assistente</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Minimize button - mobile only */}
              {isMobile && onMinimize && (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={onMinimize}
                  className="rounded-full hover:bg-muted flex-shrink-0 w-12 h-12 min-w-12"
                  aria-label="Riduci a icona"
                >
                  <Minimize2 className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size={isMobile ? "default" : "icon"}
                onClick={handleClose}
                className={cn(
                  "rounded-full hover:bg-muted flex-shrink-0",
                  isMobile && "w-12 h-12 min-w-12"
                )}
                aria-label="Chiudi chat"
              >
                <X className={cn(isMobile ? "w-6 h-6" : "w-5 h-5")} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 p-4">
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
                      : message.sender === 'admin'
                        ? "bg-secondary text-secondary-foreground rounded-bl-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    {/* Admin badge */}
                    {message.sender === 'admin' && (
                      <p className="text-[10px] font-semibold mb-1 opacity-80">👤 Staff</p>
                    )}
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                    
                    {/* Message status for user messages */}
                    {message.sender === 'user' && (
                      <div className="flex items-center justify-end mt-1 gap-1">
                        <span className="text-[10px] opacity-60">
                          {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <MessageStatusIndicator 
                          status={message.deliveryStatus || 'sent'} 
                          className="ml-0.5"
                        />
                      </div>
                    )}
                    
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
                            {option.action && option.action !== 'input' && (
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
              
              {/* Scroll anchor */}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input - show when in input mode or chat mode */}
          {showInput && (
            <div className={cn(
              "p-4 border-t border-border bg-background flex-shrink-0",
              isMobile && "pb-safe"
            )}>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={getInputPlaceholder()}
                  className="flex-1 text-base"
                  enterKeyHint="send"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 flex-shrink-0 w-12 h-12 min-w-12"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {inputMode && inputMode !== 'free' && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {inputMode === 'name' && '👤 Step 1/3: Il tuo nome'}
                  {inputMode === 'title' && '🎵 Step 2/3: Titolo canzone'}
                  {inputMode === 'artist' && '🎤 Step 3/3: Artista (opzionale)'}
                </p>
              )}
            </div>
          )}

          {/* Powered by footer */}
          <div className={cn(
            "px-4 py-2 border-t border-border/50 bg-muted/30 flex-shrink-0",
            isMobile && "hidden"
          )}>
            <p className="text-[10px] text-center text-muted-foreground">
              ⚡ Risposte rapide • 💬 Chat live con lo staff
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

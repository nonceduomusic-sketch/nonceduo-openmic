import React, { useEffect, useState } from 'react';
import { X, MessageCircle, Users } from 'lucide-react';
import { ChatMessage } from '@/hooks/useConversations';

interface ChatNotificationPopupProps {
  message: ChatMessage;
  conversationName?: string;
  isGroup?: boolean;
  onClose: () => void;
}

export const ChatNotificationPopup: React.FC<ChatNotificationPopupProps> = ({
  message,
  conversationName,
  isGroup,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-full max-w-sm transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="glass-card p-4 neon-border-cyan border-2 animate-neon-pulse">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isGroup 
              ? 'bg-gradient-to-br from-accent to-secondary' 
              : 'bg-gradient-to-br from-secondary to-primary'
          }`}>
            {isGroup ? (
              <Users className="w-5 h-5 text-accent-foreground" />
            ) : (
              <MessageCircle className="w-5 h-5 text-secondary-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold text-secondary">
              {isGroup ? 'Nuovo messaggio nel gruppo' : 'Nuovo messaggio chat'}
            </h4>
            {conversationName && (
              <p className="text-xs text-muted-foreground">{conversationName}</p>
            )}
            <p className="text-sm text-foreground mt-1">
              Da: <span className="font-medium">{message.sender_name}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {message.message_text}
            </p>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

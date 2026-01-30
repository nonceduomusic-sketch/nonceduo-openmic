import React, { forwardRef, useEffect, useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { Message } from '@/hooks/useMessages';

interface MessageNotificationPopupProps {
  message: Message;
  onClose: () => void;
}

export const MessageNotificationPopup = forwardRef<HTMLDivElement, MessageNotificationPopupProps>(({
  message,
  onClose,
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      ref={ref}
      className={`fixed top-4 right-4 z-50 w-full max-w-sm transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="glass-card p-4 neon-border-cyan border-2 animate-neon-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-secondary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold text-secondary">
              Nuovo Messaggio!
            </h4>
            <p className="text-sm text-foreground mt-1">
              Da: <span className="font-medium">{message.sender_name}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {message.message_text}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

MessageNotificationPopup.displayName = 'MessageNotificationPopup';

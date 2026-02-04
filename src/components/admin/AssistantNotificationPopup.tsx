import React, { forwardRef, useEffect, useState } from 'react';
import { X, Bot } from 'lucide-react';

interface AssistantNotificationPopupProps {
  userName: string;
  messagePreview: string;
  sourceSection: string;
  onClose: () => void;
  onClick: () => void;
}

export const AssistantNotificationPopup = forwardRef<HTMLDivElement, AssistantNotificationPopupProps>(({
  userName,
  messagePreview,
  sourceSection,
  onClose,
  onClick,
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

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const sectionLabel = {
    site: 'Sito',
    openmic: 'Open Mic',
    dediche: 'Dediche',
    community: 'Community',
  }[sourceSection] || 'Sito';

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`fixed top-4 right-4 z-50 w-full max-w-sm transition-all duration-300 cursor-pointer ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="glass-card p-4 neon-border-cyan border-2 animate-neon-pulse hover:scale-[1.02] transition-transform">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-secondary">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold text-primary">
              Nuova richiesta Assistente
            </h4>
            <p className="text-xs text-muted-foreground">
              Da: {sectionLabel}
            </p>
            <p className="text-sm text-foreground mt-1 font-medium">
              {userName || 'Visitatore'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {messagePreview}
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

AssistantNotificationPopup.displayName = 'AssistantNotificationPopup';

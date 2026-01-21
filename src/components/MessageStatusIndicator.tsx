import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusIndicatorProps {
  status: 'sent' | 'delivered' | 'read';
  className?: string;
}

/**
 * WhatsApp-style message status indicator
 * - sent: single gray check
 * - delivered: double gray checks
 * - read: double blue checks
 */
export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({ 
  status, 
  className = '' 
}) => {
  if (status === 'sent') {
    return (
      <Check 
        className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} 
        strokeWidth={2.5}
      />
    );
  }

  if (status === 'delivered') {
    return (
      <CheckCheck 
        className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} 
        strokeWidth={2.5}
      />
    );
  }

  // read status
  return (
    <CheckCheck 
      className={`w-3.5 h-3.5 text-blue-500 ${className}`} 
      strokeWidth={2.5}
    />
  );
};

export default MessageStatusIndicator;

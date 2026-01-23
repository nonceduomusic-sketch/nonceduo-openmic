import React, { forwardRef } from 'react';
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
export const MessageStatusIndicator = forwardRef<HTMLSpanElement, MessageStatusIndicatorProps>(
  ({ status, className = '' }, ref) => {
    if (status === 'sent') {
      return (
        <span ref={ref} className="inline-flex">
          <Check 
            className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} 
            strokeWidth={2.5}
          />
        </span>
      );
    }

    if (status === 'delivered') {
      return (
        <span ref={ref} className="inline-flex">
          <CheckCheck 
            className={`w-3.5 h-3.5 text-muted-foreground/60 ${className}`} 
            strokeWidth={2.5}
          />
        </span>
      );
    }

    // read status
    return (
      <span ref={ref} className="inline-flex">
        <CheckCheck 
          className={`w-3.5 h-3.5 text-blue-500 ${className}`} 
          strokeWidth={2.5}
        />
      </span>
    );
  }
);

MessageStatusIndicator.displayName = 'MessageStatusIndicator';

export default MessageStatusIndicator;

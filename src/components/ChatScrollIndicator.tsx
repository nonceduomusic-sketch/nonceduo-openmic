import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChatScrollIndicatorProps {
  unreadCount: number;
  onClick: () => void;
  visible: boolean;
}

export const ChatScrollIndicator = forwardRef<HTMLDivElement, ChatScrollIndicatorProps>(
  ({ unreadCount, onClick, visible }, ref) => {
    if (!visible) return null;

    return (
      <div ref={ref} className="absolute bottom-24 right-4 z-10">
        <Button
          onClick={onClick}
          size="icon"
          className="rounded-full shadow-lg bg-card hover:bg-card/80 border border-border relative"
        >
          <ChevronDown className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 text-xs font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }
);

ChatScrollIndicator.displayName = 'ChatScrollIndicator';

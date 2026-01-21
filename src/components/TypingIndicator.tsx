import React from 'react';

interface TypingIndicatorProps {
  names?: string[];
  className?: string;
}

/**
 * WhatsApp-style typing indicator with animated dots
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  names = [], 
  className = '' 
}) => {
  const displayText = React.useMemo(() => {
    if (names.length === 0) return 'sta scrivendo';
    if (names.length === 1) return `${names[0]} sta scrivendo`;
    if (names.length === 2) return `${names[0]} e ${names[1]} stanno scrivendo`;
    return `${names[0]} e altri ${names.length - 1} stanno scrivendo`;
  }, [names]);

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <span>{displayText}</span>
      <div className="flex gap-0.5">
        <span 
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" 
          style={{ animationDelay: '0ms', animationDuration: '600ms' }}
        />
        <span 
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" 
          style={{ animationDelay: '150ms', animationDuration: '600ms' }}
        />
        <span 
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" 
          style={{ animationDelay: '300ms', animationDuration: '600ms' }}
        />
      </div>
    </div>
  );
};

export default TypingIndicator;

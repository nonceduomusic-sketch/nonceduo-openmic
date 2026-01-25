import React from 'react';
import { AlertTriangle, Instagram, Facebook, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FreeModeClosureOverlayProps {
  closureTitle: string;
  closureMessage: string;
  className?: string;
}

/**
 * FreeModeClosureOverlay - Displays dynamic closure message from admin settings
 * Shows overlay when Free Mode bookings are closed (expired or limit reached)
 */
export const FreeModeClosureOverlay: React.FC<FreeModeClosureOverlayProps> = ({
  closureTitle,
  closureMessage,
  className,
}) => {
  return (
    <div className={cn(
      "p-6 rounded-xl bg-muted/50 border border-border text-center",
      className
    )}>
      <div className="text-4xl mb-3">🎤</div>
      <h3 className="text-lg font-semibold mb-2">{closureTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        {closureMessage}
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://instagram.com/nonceduo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram className="w-4 h-4 mr-2" />
            Instagram
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://facebook.com/nonceduo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="w-4 h-4 mr-2" />
            Facebook
          </a>
        </Button>
      </div>
    </div>
  );
};

/**
 * FreeModeClosureBanner - Compact banner version for list headers
 */
export const FreeModeClosureBanner: React.FC<FreeModeClosureOverlayProps> = ({
  closureTitle,
  closureMessage,
  className,
}) => {
  return (
    <div className={cn(
      "p-4 rounded-xl border-2 bg-destructive/5 border-destructive/30",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <span className="text-base font-bold text-destructive">
            {closureTitle}
          </span>
          <p className="text-xs text-destructive/70">
            {closureMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FreeModeClosureOverlay;

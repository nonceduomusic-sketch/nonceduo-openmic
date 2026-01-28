import React from 'react';
import { Users } from 'lucide-react';
import { useUnifiedLiveSession } from '@/hooks/useUnifiedLiveSession';
import { useConnectedUsersCount } from '@/hooks/useConnectedUsersCount';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectedUsersStatCardProps {
  className?: string;
}

/**
 * Small card displaying the count of connected users (PIN sessions)
 * Shows the number of users who have entered the event via PIN
 */
export const ConnectedUsersStatCard: React.FC<ConnectedUsersStatCardProps> = ({ className }) => {
  const { session, isPinActive } = useUnifiedLiveSession();
  const { count, loading } = useConnectedUsersCount(session?.id || null);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "bg-muted/50 rounded-lg p-3 text-center transition-all",
            isPinActive && count > 0 && "bg-accent/10 border border-accent/20",
            className
          )}>
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Connessi</span>
            </div>
            <div className={cn(
              "text-xl font-bold transition-all",
              loading && "animate-pulse",
              isPinActive && count > 0 ? "text-accent-foreground" : "text-muted-foreground"
            )}>
              {isPinActive ? count : '—'}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs">
            {isPinActive 
              ? `${count} utenti hanno inserito il PIN e sono connessi all'evento`
              : 'Attiva il PIN per tracciare gli utenti connessi'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConnectedUsersStatCard;

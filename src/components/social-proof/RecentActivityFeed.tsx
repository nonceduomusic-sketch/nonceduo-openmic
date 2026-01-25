import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Music, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'booking' | 'join';
  name: string;
  song?: string;
  timestamp: Date;
}

interface RecentActivityFeedProps {
  activities: Activity[];
  className?: string;
  maxVisible?: number;
}

/**
 * RecentActivityFeed - Feed di attività recenti
 * Mostra le ultime prenotazioni in tempo reale
 */
export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  className,
  maxVisible = 5,
}) => {
  const visibleActivities = activities.slice(0, maxVisible);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'ora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
    return `${Math.floor(seconds / 3600)}h fa`;
  };

  if (visibleActivities.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-xl border bg-card/50 overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/50">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Attività Recente</h3>
        <span className="ml-auto flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-secondary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
        </span>
      </div>

      <div className="divide-y divide-border/30">
        <AnimatePresence mode="popLayout">
          {visibleActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                activity.type === 'booking' 
                  ? "bg-primary/10 text-primary" 
                  : "bg-secondary/10 text-secondary"
              )}>
                {activity.type === 'booking' ? (
                  <Music className="w-4 h-4" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="font-semibold">{activity.name}</span>
                  {activity.type === 'booking' ? (
                    <>
                      {' ha prenotato '}
                      <span className="text-primary">{activity.song}</span>
                    </>
                  ) : (
                    ' si è unito!'
                  )}
                </p>
              </div>

              <span className="text-xs text-muted-foreground flex-shrink-0">
                {getTimeAgo(activity.timestamp)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecentActivityFeed;

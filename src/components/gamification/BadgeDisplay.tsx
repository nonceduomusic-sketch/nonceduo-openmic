import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Badge {
  badge_key: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

interface BadgeDisplayProps {
  badges: Badge[];
  className?: string;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * BadgeDisplay - Mostra i badge guadagnati da un utente
 */
export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  className,
  maxVisible = 5,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl',
  };

  if (badges.length === 0) {
    return null;
  }

  const visibleBadges = badges.slice(0, maxVisible);
  const hiddenCount = badges.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1.5", className)}>
        {visibleBadges.map((badge, index) => (
          <Tooltip key={badge.badge_key}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: index * 0.1,
                }}
                className={cn(
                  "rounded-full bg-gradient-to-br from-primary/20 to-secondary/10",
                  "border border-primary/30 flex items-center justify-center",
                  "cursor-pointer hover:scale-110 transition-transform",
                  sizeClasses[size]
                )}
              >
                <span role="img" aria-label={badge.badge_name}>
                  {badge.badge_icon}
                </span>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="text-center">
                <p className="font-semibold">{badge.badge_name}</p>
                {badge.badge_description && (
                  <p className="text-xs text-muted-foreground mt-1">{badge.badge_description}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "rounded-full bg-muted/50 border border-border/50",
                "flex items-center justify-center text-xs font-medium text-muted-foreground",
                sizeClasses[size]
              )}>
                +{hiddenCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Altri {hiddenCount} badge</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

interface BadgeGridProps {
  badges: Badge[];
  className?: string;
}

/**
 * BadgeGrid - Griglia completa di tutti i badge
 */
export const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  className,
}) => {
  if (badges.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-4xl mb-2">🎯</p>
        <p className="text-muted-foreground text-sm">Nessun badge ancora</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Partecipa alle serate per guadagnare badge!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-3 sm:grid-cols-4 gap-3", className)}>
      {badges.map((badge, index) => (
        <motion.div
          key={badge.badge_key}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30 flex items-center justify-center text-2xl">
            {badge.badge_icon}
          </div>
          <div className="text-center">
            <p className="text-xs font-medium truncate max-w-full">{badge.badge_name}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BadgeDisplay;

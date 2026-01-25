import React from 'react';
import { Trophy, Flame, Heart, Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTopPerformances } from '@/hooks/useLiveInteraction';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * TopPerformancesCard - Mostra la classifica delle performance più votate
 * Per il pannello admin durante l'evento live
 */
export const TopPerformancesCard: React.FC<{ className?: string }> = ({ className }) => {
  const { topPerformances, loading } = useTopPerformances(10);

  if (loading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            Top Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-warning border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topPerformances.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            Top Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="text-center py-6">
            <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Nessun voto ancora
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              I voti del pubblico appariranno qui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <Card className={cn("border-warning/30 bg-warning/5", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          Top Performance
          <Badge variant="secondary" className="ml-auto text-xs">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          {topPerformances.map((perf, index) => (
            <motion.div
              key={perf.reservation_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg",
                index === 0 && "bg-warning/10 border border-warning/30",
                index === 1 && "bg-muted/50",
                index === 2 && "bg-muted/30"
              )}
            >
              {/* Rank */}
              <span className="text-lg font-bold w-8 text-center">
                {getMedalEmoji(index)}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {perf.song_title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {perf.customer_name}
                </p>
              </div>

              {/* Votes */}
              <div className="flex items-center gap-2 text-xs">
                {perf.fire_votes > 0 && (
                  <div className="flex items-center gap-0.5 text-orange-500">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="font-semibold">{perf.fire_votes}</span>
                  </div>
                )}
                {perf.heart_votes > 0 && (
                  <div className="flex items-center gap-0.5 text-primary">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-semibold">{perf.heart_votes}</span>
                  </div>
                )}
                <Badge variant="outline" className="h-5 px-1.5 text-xs font-bold">
                  {perf.total_votes}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

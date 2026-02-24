import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Gamepad2, ArrowRight } from 'lucide-react';
import { useGameSettings, useGameConfigs, useGameScores } from '@/hooks/useGames';

const GamesHub: React.FC = () => {
  const navigate = useNavigate();
  const { data: settings } = useGameSettings();
  const { data: configs } = useGameConfigs();

  const enabledGames = configs?.filter(g => g.is_enabled) || [];

  if (settings && !settings.games_enabled) {
    return (
      <PageLayout variant="main" title="Giochi" showBack backPath="/app">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Gamepad2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">I giochi non sono disponibili al momento</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="main" title="🎮 Giochi" showBack backPath="/app">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold mb-1">Giochi dal Vivo</h1>
          <p className="text-sm text-muted-foreground">Sfida gli altri mentre aspetti il tuo turno!</p>
        </motion.div>

        {/* Games Grid */}
        <div className="space-y-3">
          {enabledGames.map((game, i) => (
            <GameCard key={game.game_key} game={game} index={i} onClick={() => {
              if (game.game_key === 'quiz') navigate('/app/giochi/quiz');
              // Other games will navigate to their routes when built
              else navigate(`/app/giochi/${game.game_key}`);
            }} />
          ))}
        </div>

        {enabledGames.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nessun gioco disponibile al momento</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

const GameCard: React.FC<{ game: any; index: number; onClick: () => void }> = ({ game, index, onClick }) => {
  const { data: scores } = useGameScores(game.game_key, 3);
  const topScore = scores?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{game.game_icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">{game.game_name}</h3>
              {topScore && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Trophy className="w-3 h-3 text-yellow-500" />
                  <span>Record: {topScore.nickname} — {topScore.score.toLocaleString()}</span>
                </div>
              )}
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GamesHub;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Gamepad2, ArrowRight, Clock, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameSettings, useGameConfigs, useGameScores } from '@/hooks/useGames';
import { useFormatActiveCheck } from '@/hooks/useGlobalFormatSettings';

const GamesHub: React.FC = () => {
  const navigate = useNavigate();
  const { data: settings } = useGameSettings();
  const { data: configs } = useGameConfigs();
  const { isActive: isGiochiVisible, loading: visibilityLoading } = useFormatActiveCheck('giochi', 'app');

  // Filter to only show enabled games
  const visibleGames = (configs || []).filter(g => g.is_enabled);

  if (visibilityLoading) {
    return (
      <PageLayout variant="main" title="Giochi" showBack backPath="/app" hideDesktopHeader>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  if (!isGiochiVisible || (settings && !settings.games_enabled)) {
    return (
      <PageLayout variant="main" title="Giochi" showBack backPath="/app" hideDesktopHeader>
        <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            {/* Icon */}
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-primary" />
            </div>

            {/* Title & description */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Giochi Passatempo</h1>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
                Quiz musicali, sfide a tempo e giochi interattivi pensati per divertirti durante le nostre serate dal vivo!
              </p>
            </div>

            {/* Status badge */}
            <Badge variant="outline" className="text-sm px-4 py-2 gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Non disponibile al momento
            </Badge>

            {/* Feature preview cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center space-y-2">
                  <div className="text-2xl">🧠</div>
                  <p className="text-xs sm:text-sm font-medium">Quiz interattivi</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Sfida le tue conoscenze musicali</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center space-y-2">
                  <div className="text-2xl">🏆</div>
                  <p className="text-xs sm:text-sm font-medium">Classifiche live</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Scala la classifica della serata</p>
                </CardContent>
              </Card>
            </div>

            {/* Info box */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p>I giochi si attivano durante le serate dal vivo. Seguici su Instagram per scoprire le prossime date! 🎶</p>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="https://www.instagram.com/nonceduo.music/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <Instagram className="w-5 h-5" />
                  Seguici su Instagram
                </Button>
              </a>
              <Button variant="ghost" className="flex-1" size="lg" onClick={() => navigate('/app')}>
                ← Torna all'app
              </Button>
            </div>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="main" title="🎮 Giochi" showBack backPath="/app" hideDesktopHeader>
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Giochi dal Vivo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Sfida gli altri mentre aspetti il tuo turno!</p>
        </motion.div>

        {/* Games Grid */}
        <div className="space-y-2 sm:space-y-3">
            {visibleGames.map((game, i) => (
            <GameCard key={game.game_key} game={game} index={i} onClick={() => {
              if (game.game_key === 'quiz') navigate('/app/giochi/quiz');
              else navigate(`/app/giochi/${game.game_key}`);
            }} />
          ))}
        </div>

        {visibleGames.length === 0 && (
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
      <Card className="cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] hover:border-primary/50" onClick={onClick}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-3xl sm:text-4xl shrink-0">{game.game_icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base">{game.game_name}</h3>
              {topScore && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />
                  <span className="truncate">Record: {topScore.nickname} — {topScore.score.toLocaleString()}</span>
                </div>
              )}
            </div>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GamesHub;

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Gamepad2, Clock } from 'lucide-react';
import { useGameConfigs } from '@/hooks/useGames';

const GameNotAvailable: React.FC = () => {
  const navigate = useNavigate();
  const { gameKey } = useParams<{ gameKey: string }>();
  const { data: configs } = useGameConfigs();

  const game = configs?.find(g => g.game_key === gameKey);

  return (
    <PageLayout variant="main" title="Gioco" showBack backPath="/app/giochi" hideDesktopHeader>
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Card className="border-2 border-dashed border-muted-foreground/20">
            <CardContent className="p-8 text-center space-y-5">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                {game ? (
                  <span className="text-4xl">{game.game_icon}</span>
                ) : (
                  <Gamepad2 className="w-10 h-10 text-muted-foreground/40" />
                )}
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold">
                  {game ? game.game_name : 'Gioco non trovato'}
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {game
                    ? 'Questo gioco non è attivo al momento. Potrebbe essere disponibile durante il prossimo evento!'
                    : 'Il gioco che stai cercando non esiste o non è ancora stato creato.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <Clock className="w-3.5 h-3.5" />
                <span>Torna più tardi per novità</span>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate('/app/giochi')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna ai Giochi
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default GameNotAvailable;

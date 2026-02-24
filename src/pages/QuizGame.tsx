import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Timer, Zap, RotateCcw, Star, Check, X } from 'lucide-react';
import { useActiveQuizQuestions, useGameScores, useSubmitScore, type QuizQuestion } from '@/hooks/useGames';
import { NamePromptDialog } from '@/components/NamePromptDialog';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';

type GameState = 'menu' | 'playing' | 'result' | 'gameover';

const QUESTION_TIME = 15; // seconds per question
const POINTS_BASE = 100;
const POINTS_TIME_BONUS = 50; // max bonus for fast answers

const QuizGame: React.FC = () => {
  const { data: allQuestions, isLoading } = useActiveQuizQuestions();
  const { data: topScores } = useGameScores('quiz', 5);
  const submitScore = useSubmitScore();

  const [gameState, setGameState] = useState<GameState>('menu');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nickname, setNickname] = useState(() => safeGetItem('local', 'game_nickname') || '');
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  // Shuffle and pick 10 questions
  const startGame = useCallback(() => {
    if (!allQuestions?.length) return;
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setTimeLeft(QUESTION_TIME);
    setGameState('playing');
  }, [allQuestions]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing' || selectedOption !== null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, currentIdx, selectedOption]);

  const handleAnswer = useCallback((option: string | null) => {
    if (selectedOption !== null) return;
    clearInterval(timerRef.current);
    setSelectedOption(option);

    const isCorrect = option === currentQ?.correct_option;
    if (isCorrect) {
      const timeBonus = Math.round((timeLeft / QUESTION_TIME) * POINTS_TIME_BONUS);
      const streakBonus = streak >= 3 ? 25 : 0;
      setScore(prev => prev + POINTS_BASE + timeBonus + streakBonus);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setGameState('result');
  }, [selectedOption, currentQ, timeLeft, streak]);

  const nextQuestion = () => {
    if (currentIdx + 1 >= totalQuestions) {
      setGameState('gameover');
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(QUESTION_TIME);
      setGameState('playing');
    }
  };

  const handleSubmitScore = (name: string) => {
    setNickname(name);
    safeSetItem('local', 'game_nickname', name);
    submitScore.mutate({ game_key: 'quiz', nickname: name, score });
    setShowNameDialog(false);
  };

  const options = currentQ
    ? [
        { key: 'a', text: currentQ.option_a },
        { key: 'b', text: currentQ.option_b },
        ...(currentQ.option_c ? [{ key: 'c', text: currentQ.option_c }] : []),
        ...(currentQ.option_d ? [{ key: 'd', text: currentQ.option_d }] : []),
      ]
    : [];

  return (
    <PageLayout variant="main" title="🎵 Quiz Musicale" showBack backPath="/app/giochi">
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* MENU */}
          {gameState === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="text-center space-y-3">
                <div className="text-6xl">🎵</div>
                <h1 className="text-2xl font-bold">Quiz Musicale</h1>
                <p className="text-muted-foreground text-sm">10 domande, 15 secondi ciascuna. Rispondi veloce per più punti!</p>
              </div>

              <Button className="w-full h-14 text-lg" onClick={startGame} disabled={isLoading || !allQuestions?.length}>
                <Zap className="w-5 h-5 mr-2" />
                {isLoading ? 'Caricamento...' : !allQuestions?.length ? 'Nessuna domanda disponibile' : 'Inizia!'}
              </Button>

              {/* Top Scores */}
              {topScores && topScores.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <h3 className="font-bold text-sm">Classifica</h3>
                    </div>
                    <div className="space-y-2">
                      {topScores.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <span className="w-5 text-center font-bold">{i + 1}</span>
                          <span className="flex-1">{s.nickname}</span>
                          <span className="font-bold text-primary">{s.score}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* PLAYING */}
          {(gameState === 'playing' || gameState === 'result') && currentQ && (
            <motion.div key={`q-${currentIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              {/* Header Stats */}
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline">{currentIdx + 1}/{totalQuestions}</Badge>
                <div className="flex items-center gap-2">
                  {streak >= 3 && <Badge className="bg-orange-500">🔥 x{streak}</Badge>}
                  <Badge variant="secondary"><Star className="w-3 h-3 mr-1" />{score}</Badge>
                </div>
              </div>

              {/* Timer */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1"><Timer className="w-3 h-3" />Tempo</span>
                  <span className={cn("font-bold", timeLeft <= 5 && "text-destructive")}>{timeLeft}s</span>
                </div>
                <Progress value={(timeLeft / QUESTION_TIME) * 100} className="h-2" />
              </div>

              {/* Question */}
              <Card className="border-2">
                <CardContent className="p-5">
                  <p className="font-bold text-lg leading-snug">{currentQ.question_text}</p>
                </CardContent>
              </Card>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2">
                {options.map(opt => {
                  const isSelected = selectedOption === opt.key;
                  const isCorrect = opt.key === currentQ.correct_option;
                  const showResult = gameState === 'result';

                  return (
                    <motion.div key={opt.key} whileTap={!showResult ? { scale: 0.97 } : undefined}>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-auto py-3 px-4 text-left justify-start text-sm font-medium",
                          showResult && isCorrect && "border-green-500 bg-green-500/10 text-green-400",
                          showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                        )}
                        onClick={() => gameState === 'playing' && handleAnswer(opt.key)}
                        disabled={showResult}
                      >
                        <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                          {showResult && isCorrect ? <Check className="w-4 h-4" /> :
                           showResult && isSelected && !isCorrect ? <X className="w-4 h-4" /> :
                           opt.key.toUpperCase()}
                        </span>
                        {opt.text}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Result feedback + Next */}
              {gameState === 'result' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button className="w-full" onClick={nextQuestion}>
                    {currentIdx + 1 >= totalQuestions ? 'Vedi Risultato' : 'Prossima Domanda →'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* GAME OVER */}
          {gameState === 'gameover' && (
            <motion.div key="gameover" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
              <div className="text-6xl">{score >= 700 ? '🏆' : score >= 400 ? '⭐' : '🎵'}</div>
              <div>
                <h2 className="text-3xl font-bold">{score} punti</h2>
                <p className="text-muted-foreground mt-1">
                  {score >= 700 ? 'Fenomeno! Sei un esperto!' :
                   score >= 400 ? 'Ottimo lavoro!' : 'Buon inizio, riprova!'}
                </p>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => {
                  if (!nickname) setShowNameDialog(true);
                  else handleSubmitScore(nickname);
                }}>
                  <Trophy className="w-4 h-4 mr-1" />Salva Punteggio
                </Button>
                <Button variant="outline" className="flex-1" onClick={startGame}>
                  <RotateCcw className="w-4 h-4 mr-1" />Rigioca
                </Button>
              </div>

              <Button variant="ghost" className="w-full" onClick={() => setGameState('menu')}>
                Torna al Menu
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <NamePromptDialog
          open={showNameDialog}
          title="Il tuo nickname"
          description="Inserisci un nome per la classifica"
          initialValue={nickname}
          confirmLabel="Salva Punteggio"
          onOpenChange={setShowNameDialog}
          onConfirm={handleSubmitScore}
        />
      </div>
    </PageLayout>
  );
};

export default QuizGame;

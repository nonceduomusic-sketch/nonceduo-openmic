import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Gamepad2, Settings, Trophy, Monitor, Shuffle, ArrowDownNarrowWide, Trash2
} from 'lucide-react';
import {
  useGameSettings, useUpdateGameSettings,
  useGameConfigs, useToggleGameConfig,
  useGameScores, useClearGameScores,
  useQuizQuestionSets,
} from '@/hooks/useGames';

export const AdminGamesTab: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold">Giochi Passatempo</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Impostazioni e classifiche</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid grid-cols-2 w-full h-auto p-1">
          <TabsTrigger value="settings" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1"><Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span className="hidden sm:inline">Impostazioni</span><span className="sm:hidden">Imp.</span></TabsTrigger>
          <TabsTrigger value="scores" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1"><Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span className="hidden sm:inline">Classifiche</span><span className="sm:hidden">Class.</span></TabsTrigger>
        </TabsList>

        <TabsContent value="settings"><GameSettingsPanel /></TabsContent>
        <TabsContent value="scores"><ScoresPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Settings Panel ───
const GameSettingsPanel: React.FC = () => {
  const { data: settings } = useGameSettings();
  const { data: configs } = useGameConfigs();
  const { data: questionSets } = useQuizQuestionSets();
  const updateSettings = useUpdateGameSettings();
  const toggleGame = useToggleGameConfig();

  if (!settings) return null;

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSettings.mutate({ [key]: value } as any);
    toast.success('Impostazione aggiornata');
  };

  const handleQuizSetting = (updates: Record<string, any>) => {
    updateSettings.mutate(updates as any);
    toast.success('Impostazione quiz aggiornata');
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4"><CardTitle className="text-sm sm:text-base">Impostazioni Globali</CardTitle></CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label className="font-medium text-sm">Giochi Abilitati</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Attiva/disattiva tutti i giochi</p>
            </div>
            <Switch checked={settings.games_enabled} onCheckedChange={v => handleToggle('games_enabled', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Monitor className="w-4 h-4 shrink-0" /><Label className="text-sm">Mostra su TV</Label></div>
            <Switch checked={settings.show_on_tv} onCheckedChange={v => handleToggle('show_on_tv', v)} />
          </div>
          {settings.show_on_tv && (
            <div className="pl-4 sm:pl-6 space-y-2 border-l-2 border-primary/20">
              <Label className="text-xs text-muted-foreground">Modalità display TV</Label>
              <Select
                value={settings.tv_display_mode || 'off'}
                onValueChange={v => handleQuizSetting({ tv_display_mode: v })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">🚫 Nessun gioco visibile</SelectItem>
                  <SelectItem value="banner">📢 Banner discreto</SelectItem>
                  <SelectItem value="fullscreen">🖥️ Schermo pieno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label className="font-medium text-sm">Disponibile a evento chiuso</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Accessibili anche prima dell'evento</p>
            </div>
            <Switch checked={settings.available_when_closed} onCheckedChange={v => handleToggle('available_when_closed', v)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label className="font-medium text-sm">In "Solo Consultabile"</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Modalità visualizza-ma-non-prenota</p>
            </div>
            <Switch checked={settings.available_in_consultable} onCheckedChange={v => handleToggle('available_in_consultable', v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base">Giochi Singoli</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Abilita/disabilita ogni gioco</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
          {configs?.map(game => (
            <div key={game.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl sm:text-2xl shrink-0">{game.game_icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{game.game_name}</p>
                  <p className="text-[11px] text-muted-foreground">{game.game_key}</p>
                </div>
              </div>
              <Switch
                checked={game.is_enabled}
                onCheckedChange={v => {
                  toggleGame.mutate({ id: game.id, is_enabled: v });
                  toast.success(`${game.game_name} ${v ? 'abilitato' : 'disabilitato'}`);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiz Source & Order Settings */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base">⚙️ Sorgente Admin</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Pool domande quando l'utente non sceglie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="space-y-2">
            <Label className="font-medium text-sm">Sorgente Domande</Label>
            <Select
              value={settings.quiz_source_mode}
              onValueChange={v => handleQuizSetting({ quiz_source_mode: v })}
            >
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_catalog">📚 Tutto il catalogo</SelectItem>
                <SelectItem value="all_sets">📋 Elenchi attivi</SelectItem>
                <SelectItem value="general_only">🌐 Solo generali</SelectItem>
                <SelectItem value="specific_sets">🎯 Elenchi specifici</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.quiz_source_mode === 'specific_sets' && questionSets && (
            <div className="space-y-2 pl-3 sm:pl-4 border-l-2 border-primary/20">
              <Label className="text-[11px] sm:text-xs text-muted-foreground">Seleziona gli elenchi</Label>
              {questionSets.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={(settings.quiz_source_set_ids || []).includes(s.id)}
                    onCheckedChange={checked => {
                      const current = settings.quiz_source_set_ids || [];
                      const next = checked
                        ? [...current, s.id]
                        : current.filter((id: string) => id !== s.id);
                      handleQuizSetting({ quiz_source_set_ids: next });
                    }}
                  />
                  <Label className="text-sm cursor-pointer">{s.name}</Label>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label className="font-medium text-sm">Ordine Domande</Label>
            <Select
              value={settings.quiz_order_mode}
              onValueChange={v => handleQuizSetting({ quiz_order_mode: v })}
            >
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="random"><div className="flex items-center gap-2"><Shuffle className="w-4 h-4" />Casuale</div></SelectItem>
                <SelectItem value="sequential"><div className="flex items-center gap-2"><ArrowDownNarrowWide className="w-4 h-4" />Sequenziale</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User-facing choice controls */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base">🎮 Scelta Utente nel Quiz</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Opzioni che l'utente può scegliere prima di giocare</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label className="font-medium text-sm">Permetti scelta all'utente</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Se disattivato, usa solo la sorgente admin</p>
            </div>
            <Switch
              checked={settings.quiz_user_can_choose}
              onCheckedChange={v => handleQuizSetting({ quiz_user_can_choose: v })}
            />
          </div>

          {settings.quiz_user_can_choose && (
            <div className="space-y-2.5 sm:space-y-3 pl-3 sm:pl-4 border-l-2 border-primary/20">
              <Label className="text-[11px] sm:text-xs text-muted-foreground font-semibold">Opzioni visibili</Label>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm">🎲 Casuale</Label>
                <Switch
                  checked={settings.quiz_user_show_random}
                  onCheckedChange={v => handleQuizSetting({ quiz_user_show_random: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm">🌐 Cultura musicale</Label>
                <Switch
                  checked={settings.quiz_user_show_general}
                  onCheckedChange={v => handleQuizSetting({ quiz_user_show_general: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm">📋 Elenchi tematici</Label>
                <Switch
                  checked={settings.quiz_user_show_sets}
                  onCheckedChange={v => handleQuizSetting({ quiz_user_show_sets: v })}
                />
              </div>

              {settings.quiz_user_show_sets && questionSets && questionSets.filter(s => s.is_active).length > 0 && (
                <div className="space-y-2 pl-3 sm:pl-4 border-l-2 border-muted">
                  <Label className="text-[11px] sm:text-xs text-muted-foreground">Elenchi visibili all'utente</Label>
                  {questionSets.filter(s => s.is_active).map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          !(settings.quiz_user_allowed_set_ids?.length) || 
                          (settings.quiz_user_allowed_set_ids || []).includes(s.id)
                        }
                        onCheckedChange={checked => {
                          const allIds = questionSets.filter(x => x.is_active).map(x => x.id);
                          const current = settings.quiz_user_allowed_set_ids?.length
                            ? settings.quiz_user_allowed_set_ids
                            : allIds;
                          const next = checked
                            ? [...current.filter((id: string) => id !== s.id), s.id]
                            : current.filter((id: string) => id !== s.id);
                          handleQuizSetting({ quiz_user_allowed_set_ids: next.length === allIds.length ? [] : next });
                        }}
                      />
                      <Label className="text-sm cursor-pointer">{s.name}</Label>
                    </div>
                  ))}
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Se tutti selezionati, verranno mostrati tutti.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Scores Panel ───
const ScoresPanel: React.FC = () => {
  const { data: configs } = useGameConfigs();
  const clearScores = useClearGameScores();
  const [selectedGame, setSelectedGame] = useState('quiz');
  const { data: scores } = useGameScores(selectedGame, 20);

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Classifiche</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => { clearScores.mutate(selectedGame); toast.success('Classifica svuotata'); }}>
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Svuota
              </Button>
              <Button variant="destructive" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => { clearScores.mutate(undefined); toast.success('Tutte le classifiche svuotate'); }}>
                Svuota tutte
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {configs?.map(g => (
              <Button key={g.game_key} size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3" variant={selectedGame === g.game_key ? 'default' : 'outline'} onClick={() => setSelectedGame(g.game_key)}>
                {g.game_icon} {g.game_name}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {scores?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun punteggio</p>}
            {scores?.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card/30">
                <span className="w-6 text-center font-bold text-xs sm:text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{s.nickname}</span>
                <span className="font-bold text-primary text-sm">{s.score.toLocaleString()}</span>
                {s.is_seed && <Badge variant="outline" className="text-[10px] px-1.5">seed</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGamesTab;

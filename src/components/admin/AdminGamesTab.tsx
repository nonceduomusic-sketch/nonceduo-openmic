import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Gamepad2, Settings, Trophy, HelpCircle, Plus, Trash2, Edit, Save, Eye, EyeOff,
  Monitor, Smartphone, Clock, List, FileText, Download, Upload, Shuffle, ArrowDownNarrowWide
} from 'lucide-react';
import {
  useGameSettings, useUpdateGameSettings,
  useGameConfigs, useToggleGameConfig,
  useGameScores, useClearGameScores,
  useQuizQuestionSets, useCreateQuestionSet, useUpdateQuestionSet, useDeleteQuestionSet,
  useQuizQuestions, useCreateQuizQuestion, useUpdateQuizQuestion, useDeleteQuizQuestion,
  type QuizQuestion, type QuizQuestionSet,
} from '@/hooks/useGames';

export const AdminGamesTab: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold">Giochi Passatempo</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Quiz, classifiche e domande</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid grid-cols-4 w-full h-auto p-1">
          <TabsTrigger value="settings" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1"><Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span className="hidden xs:inline sm:inline">Impostazioni</span><span className="xs:hidden sm:hidden">Imp.</span></TabsTrigger>
          <TabsTrigger value="scores" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1"><Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span className="hidden sm:inline">Classifiche</span><span className="sm:hidden">Class.</span></TabsTrigger>
          <TabsTrigger value="quiz-sets" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1"><List className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />Elenchi</TabsTrigger>
          <TabsTrigger value="quiz-questions" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1"><HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />Domande</TabsTrigger>
        </TabsList>

        <TabsContent value="settings"><GameSettingsPanel /></TabsContent>
        <TabsContent value="scores"><ScoresPanel /></TabsContent>
        <TabsContent value="quiz-sets"><QuizSetsPanel /></TabsContent>
        <TabsContent value="quiz-questions"><QuizQuestionsPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

// ─── CSV Utilities ───
const detectSeparator = (text: string): string => {
  const firstLine = text.split('\n')[0] || '';
  if (firstLine.includes('\t')) return '\t';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
};

const parseCSVLine = (line: string, sep: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === sep && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
};

const escapeCSV = (val: string): string => {
  if (!val) return '';
  if (val.includes(',') || val.includes(';') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
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

// ─── Quiz Sets Panel ───
const QuizSetsPanel: React.FC = () => {
  const { data: sets } = useQuizQuestionSets();
  const { data: allQuestions } = useQuizQuestions();
  const createSet = useCreateQuestionSet();
  const updateSet = useUpdateQuestionSet();
  const deleteSet = useDeleteQuestionSet();
  const updateQuestion = useUpdateQuizQuestion();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingSet, setEditingSet] = useState<QuizQuestionSet | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveFromSetId, setMoveFromSetId] = useState<string>('');
  const [moveToSetId, setMoveToSetId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const questionsForMove = allQuestions?.filter(q =>
    moveFromSetId === '__none__' ? !q.question_set_id : q.question_set_id === moveFromSetId
  ) || [];

  const getQuestionCount = (setId: string) =>
    allQuestions?.filter(q => q.question_set_id === setId).length || 0;

  const handleBulkMove = () => {
    if (!selectedQuestionIds.length) return toast.error('Seleziona almeno una domanda');
    const targetId = moveToSetId === '__none__' ? null : moveToSetId;
    selectedQuestionIds.forEach(id => {
      updateQuestion.mutate({ id, question_set_id: targetId } as any);
    });
    toast.success(`${selectedQuestionIds.length} domande spostate`);
    setSelectedQuestionIds([]);
    setShowMoveDialog(false);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Elenchi Domande</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Crea elenchi tematici per serate diverse</CardDescription>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" variant="outline" onClick={() => { setMoveFromSetId(''); setMoveToSetId(''); setSelectedQuestionIds([]); setShowMoveDialog(true); }}>
                <Shuffle className="w-3.5 h-3.5 mr-1" />Sposta Domande
              </Button>
              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Nuovo Elenco
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
          {sets?.map(s => (
            <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card/50">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm">{s.name}</p>
                  {s.description && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.description}</p>}
                  <p className="text-[10px] text-muted-foreground">{getQuestionCount(s.id)} domande</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {s.is_default && <Badge variant="secondary" className="text-[10px] sm:text-xs">Default</Badge>}
                <Button size="sm" className="h-7 sm:h-8 w-7 sm:w-8 p-0" variant="ghost" onClick={() => {
                  setEditingSet(s); setEditName(s.name); setEditDesc(s.description || '');
                }}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" className="h-7 sm:h-8 w-7 sm:w-8 p-0" variant={s.is_active ? 'default' : 'outline'} onClick={() => {
                  updateSet.mutate({ id: s.id, is_active: !s.is_active });
                  toast.success(s.is_active ? 'Disattivato' : 'Attivato');
                }}>
                  {s.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
                {!s.is_default && (
                  <Button size="sm" className="h-7 sm:h-8 w-7 sm:w-8 p-0" variant="destructive" onClick={() => { deleteSet.mutate(s.id); toast.success('Eliminato'); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo Elenco Domande</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="es. Serata Anni '80" /></div>
            <div><Label>Descrizione (opzionale)</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Tema della serata..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
            <Button onClick={() => {
              if (!newName.trim()) return toast.error('Inserisci un nome');
              createSet.mutate({ name: newName.trim(), description: newDesc.trim() || undefined });
              setNewName(''); setNewDesc('');
              setShowCreate(false);
              toast.success('Elenco creato');
            }}><Save className="w-4 h-4 mr-1" />Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Rename Dialog */}
      <Dialog open={!!editingSet} onOpenChange={open => { if (!open) setEditingSet(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica Elenco</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div><Label>Descrizione</Label><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSet(null)}>Annulla</Button>
            <Button onClick={() => {
              if (!editName.trim()) return toast.error('Il nome è obbligatorio');
              updateSet.mutate({ id: editingSet!.id, name: editName.trim(), description: editDesc.trim() || null } as any);
              setEditingSet(null);
              toast.success('Elenco aggiornato');
            }}><Save className="w-4 h-4 mr-1" />Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Questions Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Sposta Domande tra Elenchi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Da elenco</Label>
              <Select value={moveFromSetId} onValueChange={v => { setMoveFromSetId(v); setSelectedQuestionIds([]); }}>
                <SelectTrigger><SelectValue placeholder="Seleziona origine..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">🌐 Senza elenco</SelectItem>
                  {sets?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">A elenco</Label>
              <Select value={moveToSetId} onValueChange={setMoveToSetId}>
                <SelectTrigger><SelectValue placeholder="Seleziona destinazione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">🌐 Senza elenco</SelectItem>
                  {sets?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {moveFromSetId && (
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto border rounded-lg p-2">
                <div className="flex items-center gap-2 pb-1 border-b">
                  <Checkbox
                    checked={selectedQuestionIds.length === questionsForMove.length && questionsForMove.length > 0}
                    onCheckedChange={checked => setSelectedQuestionIds(checked ? questionsForMove.map(q => q.id) : [])}
                  />
                  <Label className="text-xs font-semibold">Seleziona tutte ({questionsForMove.length})</Label>
                </div>
                {questionsForMove.map(q => (
                  <div key={q.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedQuestionIds.includes(q.id)}
                      onCheckedChange={checked => setSelectedQuestionIds(prev =>
                        checked ? [...prev, q.id] : prev.filter(id => id !== q.id)
                      )}
                    />
                    <span className="text-xs truncate">{q.question_text}</span>
                  </div>
                ))}
                {questionsForMove.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nessuna domanda</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>Annulla</Button>
            <Button onClick={handleBulkMove} disabled={!selectedQuestionIds.length || !moveToSetId || moveFromSetId === moveToSetId}>
              <Shuffle className="w-4 h-4 mr-1" />Sposta ({selectedQuestionIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Quiz Questions Panel with Import/Export ───
const QuizQuestionsPanel: React.FC = () => {
  const { data: sets } = useQuizQuestionSets();
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>();
  const { data: questions } = useQuizQuestions(selectedSetId);
  const { data: allQuestions } = useQuizQuestions(); // all questions for full export
  const createQuestion = useCreateQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion();
  const deleteQuestion = useDeleteQuizQuestion();
  const [showEditor, setShowEditor] = useState(false);
  const [editingQ, setEditingQ] = useState<Partial<QuizQuestion> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedQuestions = React.useMemo(() => {
    if (!questions) return [];
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(item => {
      const setName = sets?.find(s => s.id === item.question_set_id)?.name || '';
      return (
        item.question_text.toLowerCase().includes(q) ||
        item.option_a?.toLowerCase().includes(q) ||
        item.option_b?.toLowerCase().includes(q) ||
        item.option_c?.toLowerCase().includes(q) ||
        item.option_d?.toLowerCase().includes(q) ||
        setName.toLowerCase().includes(q)
      );
    });
  }, [questions, searchQuery, sets]);

  const openNew = () => {
    setEditingQ({
      question_set_id: selectedSetId || sets?.[0]?.id,
      question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
      correct_option: 'a', difficulty: 1,
    });
    setShowEditor(true);
  };

  const openEdit = (q: QuizQuestion) => {
    setEditingQ({ ...q });
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!editingQ?.question_text?.trim() || !editingQ?.option_a?.trim() || !editingQ?.option_b?.trim()) {
      return toast.error('Compila almeno domanda, opzione A e B');
    }
    if (editingQ.id) {
      updateQuestion.mutate(editingQ as any);
      toast.success('Domanda aggiornata');
    } else {
      createQuestion.mutate(editingQ as any);
      toast.success('Domanda creata');
    }
    setShowEditor(false);
    setEditingQ(null);
  };

  // ─── Export ───
  const exportCSV = (questionsToExport: QuizQuestion[], filename: string, includeSetName: boolean) => {
    const headers = ['domanda', 'opzione_a', 'opzione_b', 'opzione_c', 'opzione_d', 'risposta_corretta', 'difficolta'];
    if (includeSetName) headers.push('elenco');

    const rows = questionsToExport.map(q => {
      const setName = sets?.find(s => s.id === q.question_set_id)?.name || '';
      const row = [
        escapeCSV(q.question_text), escapeCSV(q.option_a), escapeCSV(q.option_b),
        escapeCSV(q.option_c || ''), escapeCSV(q.option_d || ''),
        q.correct_option, String(q.difficulty),
      ];
      if (includeSetName) row.push(escapeCSV(setName));
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Esportate ${questionsToExport.length} domande`);
  };

  const handleExportCatalog = () => {
    if (!allQuestions?.length) return toast.error('Nessuna domanda da esportare');
    exportCSV(allQuestions, 'quiz-catalogo-completo.csv', true);
  };

  const handleExportSet = () => {
    if (!questions?.length || !selectedSetId) return toast.error('Seleziona un elenco con domande');
    const setName = sets?.find(s => s.id === selectedSetId)?.name || 'elenco';
    exportCSV(questions, `quiz-${setName.replace(/\s+/g, '-').toLowerCase()}.csv`, false);
  };

  // ─── Import ───
  const [importSetTarget, setImportSetTarget] = useState<string>('__selected__');
  const [showNewSetForImport, setShowNewSetForImport] = useState(false);
  const [newSetNameForImport, setNewSetNameForImport] = useState('');
  const createSetForImport = useCreateQuestionSet();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const sep = detectSeparator(text);
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return toast.error('File vuoto o senza dati');

      const headerLine = lines[0].toLowerCase();
      const hasSetColumn = headerLine.includes('elenco');

      let imported = 0;
      let errors = 0;

      // Build set name → id map
      const setMap: Record<string, string> = {};
      sets?.forEach(s => { setMap[s.name.toLowerCase().trim()] = s.id; });

      // Determine target set
      const targetSetId = importSetTarget === '__selected__' ? selectedSetId :
                          importSetTarget === '__csv__' ? undefined :
                          importSetTarget;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], sep);
        if (cols.length < 5) { errors++; continue; }

        const question_text = cols[0];
        const option_a = cols[1];
        const option_b = cols[2];
        const option_c = cols[3] || null;
        const option_d = cols[4] || null;
        const correct_option = (cols[5] || 'a').toLowerCase().trim();
        const difficulty = parseInt(cols[6]) || 1;
        const setName = hasSetColumn ? (cols[7] || '').trim() : '';

        if (!question_text || !option_a || !option_b) { errors++; continue; }

        // Determine question_set_id
        let question_set_id = targetSetId || sets?.[0]?.id;
        if (importSetTarget === '__csv__' && setName) {
          const matchedId = setMap[setName.toLowerCase()];
          if (matchedId) question_set_id = matchedId;
        }

        createQuestion.mutate({
          question_set_id: question_set_id!,
          question_text, option_a, option_b,
          option_c, option_d,
          correct_option: ['a','b','c','d'].includes(correct_option) ? correct_option : 'a',
          difficulty: Math.min(3, Math.max(1, difficulty)),
        } as any);
        imported++;
      }

      toast.success(`Importate ${imported} domande${errors > 0 ? `, ${errors} righe ignorate` : ''}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Import/Export Card */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base">📥 Import / Export CSV</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Scarica o carica domande in formato CSV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm h-8 sm:h-9" onClick={handleExportCatalog}>
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Catalogo Completo
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm h-8 sm:h-9" onClick={handleExportSet} disabled={!selectedSetId}>
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Elenco Selezionato
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-[10px] sm:text-xs text-muted-foreground">
              Colonne CSV: domanda, opzione_a, opzione_b, opzione_c, opzione_d, risposta, difficolta [, elenco]
            </Label>
            <div>
              <Label className="text-xs font-medium">Elenco di destinazione</Label>
              <Select value={importSetTarget} onValueChange={v => {
                if (v === '__new__') { setShowNewSetForImport(true); return; }
                setImportSetTarget(v);
              }}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__selected__">📋 Elenco selezionato nel filtro</SelectItem>
                  <SelectItem value="__csv__">📄 Leggi dal CSV (colonna "elenco")</SelectItem>
                  <Separator className="my-1" />
                  {sets?.map(s => <SelectItem key={s.id} value={s.id}>📁 {s.name}</SelectItem>)}
                  <Separator className="my-1" />
                  <SelectItem value="__new__">➕ Crea nuovo elenco...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm h-8 sm:h-9" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Carica CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
          </div>
        </CardContent>
      </Card>

      {/* New set for import dialog */}
      <Dialog open={showNewSetForImport} onOpenChange={setShowNewSetForImport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crea Nuovo Elenco per Import</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome elenco</Label><Input value={newSetNameForImport} onChange={e => setNewSetNameForImport(e.target.value)} placeholder="es. Rock Classico" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSetForImport(false)}>Annulla</Button>
            <Button onClick={() => {
              if (!newSetNameForImport.trim()) return toast.error('Inserisci un nome');
              createSetForImport.mutate({ name: newSetNameForImport.trim() }, {
                onSuccess: () => {
                  toast.success('Elenco creato! Selezionalo e poi carica il CSV.');
                  setNewSetNameForImport('');
                  setShowNewSetForImport(false);
                  // After creation, user picks it from dropdown
                },
              });
            }}><Save className="w-4 h-4 mr-1" />Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions List */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Domande Quiz</CardTitle>
            <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={openNew}><Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Nuova Domanda</Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="mb-3 sm:mb-4 space-y-2">
            <div>
              <Label className="text-[11px] sm:text-xs">Filtra per elenco</Label>
              <Select value={selectedSetId || 'all'} onValueChange={v => setSelectedSetId(v === 'all' ? undefined : v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli elenchi</SelectItem>
                  {sets?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] sm:text-xs">Cerca domanda</Label>
              <Input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca per testo, opzioni o elenco..."
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {displayedQuestions?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessuna domanda</p>}
            {displayedQuestions?.map(q => (
              <div key={q.id} className="p-2.5 sm:p-3 rounded-lg border bg-card/30 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs sm:text-sm font-medium flex-1 leading-snug">{q.question_text}</p>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(q)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { deleteQuestion.mutate(q.id); toast.success('Eliminata'); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['a', 'b', 'c', 'd'].map(opt => {
                    const text = q[`option_${opt}` as keyof QuizQuestion] as string;
                    if (!text) return null;
                    return (
                      <Badge key={opt} variant={q.correct_option === opt ? 'default' : 'outline'} className="text-[10px] sm:text-xs px-1.5 py-0.5">
                        {opt.toUpperCase()}: {text}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQ?.id ? 'Modifica Domanda' : 'Nuova Domanda'}</DialogTitle>
          </DialogHeader>
          {editingQ && (
            <div className="space-y-3">
              <div>
                <Label>Elenco</Label>
                <Select value={editingQ.question_set_id || ''} onValueChange={v => setEditingQ(p => ({ ...p!, question_set_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sets?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Domanda</Label>
                <Textarea value={editingQ.question_text || ''} onChange={e => setEditingQ(p => ({ ...p!, question_text: e.target.value }))} placeholder="Scrivi la domanda..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['a', 'b', 'c', 'd'] as const).map(opt => (
                  <div key={opt}>
                    <Label>Opzione {opt.toUpperCase()}{opt === 'c' || opt === 'd' ? ' (opz.)' : ''}</Label>
                    <Input value={(editingQ[`option_${opt}` as keyof typeof editingQ] as string) || ''} onChange={e => setEditingQ(p => ({ ...p!, [`option_${opt}`]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Risposta corretta</Label>
                  <Select value={editingQ.correct_option || 'a'} onValueChange={v => setEditingQ(p => ({ ...p!, correct_option: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">A</SelectItem>
                      <SelectItem value="b">B</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                      <SelectItem value="d">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficoltà</Label>
                  <Select value={String(editingQ.difficulty || 1)} onValueChange={v => setEditingQ(p => ({ ...p!, difficulty: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">⭐ Facile</SelectItem>
                      <SelectItem value="2">⭐⭐ Media</SelectItem>
                      <SelectItem value="3">⭐⭐⭐ Difficile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditor(false)}>Annulla</Button>
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" />Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGamesTab;

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Giochi Interattivi</h2>
          <p className="text-sm text-muted-foreground">Gestisci giochi, classifiche e domande quiz</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="settings" className="text-xs sm:text-sm"><Settings className="w-4 h-4 mr-1 hidden sm:inline" />Impostazioni</TabsTrigger>
          <TabsTrigger value="scores" className="text-xs sm:text-sm"><Trophy className="w-4 h-4 mr-1 hidden sm:inline" />Classifiche</TabsTrigger>
          <TabsTrigger value="quiz-sets" className="text-xs sm:text-sm"><List className="w-4 h-4 mr-1 hidden sm:inline" />Elenchi</TabsTrigger>
          <TabsTrigger value="quiz-questions" className="text-xs sm:text-sm"><HelpCircle className="w-4 h-4 mr-1 hidden sm:inline" />Domande</TabsTrigger>
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
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Impostazioni Globali</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Giochi Abilitati</Label>
              <p className="text-xs text-muted-foreground">Attiva/disattiva tutti i giochi</p>
            </div>
            <Switch checked={settings.games_enabled} onCheckedChange={v => handleToggle('games_enabled', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Smartphone className="w-4 h-4" /><Label>Mostra su App</Label></div>
            <Switch checked={settings.show_on_app} onCheckedChange={v => handleToggle('show_on_app', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /><Label>Mostra su TV</Label></div>
            <Switch checked={settings.show_on_tv} onCheckedChange={v => handleToggle('show_on_tv', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Disponibile a evento chiuso</Label>
              <p className="text-xs text-muted-foreground">Giochi accessibili anche prima dell'evento</p>
            </div>
            <Switch checked={settings.available_when_closed} onCheckedChange={v => handleToggle('available_when_closed', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Disponibile in "Solo Consultabile"</Label>
              <p className="text-xs text-muted-foreground">Giochi in modalità visualizza-ma-non-prenota</p>
            </div>
            <Switch checked={settings.available_in_consultable} onCheckedChange={v => handleToggle('available_in_consultable', v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giochi Singoli</CardTitle>
          <CardDescription>Abilita/disabilita ogni gioco individualmente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {configs?.map(game => (
            <div key={game.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{game.game_icon}</span>
                <div>
                  <p className="font-medium text-sm">{game.game_name}</p>
                  <p className="text-xs text-muted-foreground">{game.game_key}</p>
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
        <CardHeader>
          <CardTitle className="text-base">⚙️ Impostazioni Quiz</CardTitle>
          <CardDescription>Scegli quali domande vengono utilizzate e in che ordine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Sorgente Domande</Label>
            <Select
              value={settings.quiz_source_mode}
              onValueChange={v => handleQuizSetting({ quiz_source_mode: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_catalog">📚 Tutto il catalogo</SelectItem>
                <SelectItem value="all_sets">📋 Tutti gli elenchi (escluse domande senza elenco)</SelectItem>
                <SelectItem value="general_only">🌐 Solo domande generali (senza elenco)</SelectItem>
                <SelectItem value="specific_sets">🎯 Elenchi specifici</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.quiz_source_mode === 'specific_sets' && questionSets && (
            <div className="space-y-2 pl-2 border-l-2 border-primary/20">
              <Label className="text-xs text-muted-foreground">Seleziona gli elenchi da utilizzare</Label>
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
            <Label className="font-medium">Ordine Domande</Label>
            <Select
              value={settings.quiz_order_mode}
              onValueChange={v => handleQuizSetting({ quiz_order_mode: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="random"><div className="flex items-center gap-2"><Shuffle className="w-4 h-4" />Casuale</div></SelectItem>
                <SelectItem value="sequential"><div className="flex items-center gap-2"><ArrowDownNarrowWide className="w-4 h-4" />Sequenziale</div></SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.quiz_order_mode === 'random'
                ? 'Le domande vengono mescolate ad ogni partita'
                : 'Le domande appaiono nell\'ordine in cui sono salvate'}
            </p>
          </div>
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Classifiche</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" onClick={() => { clearScores.mutate(selectedGame); toast.success('Classifica svuotata'); }}>
                <Trash2 className="w-4 h-4 mr-1" />Svuota questa
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { clearScores.mutate(undefined); toast.success('Tutte le classifiche svuotate'); }}>
                Svuota tutte
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {configs?.map(g => (
              <Button key={g.game_key} size="sm" variant={selectedGame === g.game_key ? 'default' : 'outline'} onClick={() => setSelectedGame(g.game_key)}>
                {g.game_icon} {g.game_name}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {scores?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun punteggio</p>}
            {scores?.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded border bg-card/30">
                <span className="w-6 text-center font-bold text-sm">{i + 1}</span>
                <span className="flex-1 text-sm font-medium truncate">{s.nickname}</span>
                <span className="font-bold text-primary">{s.score.toLocaleString()}</span>
                {s.is_seed && <Badge variant="outline" className="text-xs">seed</Badge>}
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
  const createSet = useCreateQuestionSet();
  const updateSet = useUpdateQuestionSet();
  const deleteSet = useDeleteQuestionSet();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Elenchi Domande</CardTitle>
              <CardDescription>Crea elenchi tematici di domande per serate diverse</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" />Nuovo Elenco
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sets?.map(s => (
            <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border bg-card/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{s.name}</p>
                  {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {s.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                <Button size="sm" variant={s.is_active ? 'default' : 'outline'} onClick={() => {
                  updateSet.mutate({ id: s.id, is_active: !s.is_active });
                  toast.success(s.is_active ? 'Elenco disattivato' : 'Elenco attivato');
                }}>
                  {s.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                {!s.is_default && (
                  <Button size="sm" variant="destructive" onClick={() => { deleteSet.mutate(s.id); toast.success('Elenco eliminato'); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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

        // Find or use selected set
        let question_set_id = selectedSetId || sets?.[0]?.id;
        if (setName) {
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
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Import/Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📥 Import / Export CSV</CardTitle>
          <CardDescription>Scarica o carica domande in formato CSV (virgola, punto e virgola, tab)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCatalog} className="flex-1">
              <Download className="w-4 h-4 mr-1" />Scarica Catalogo Completo
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSet} disabled={!selectedSetId} className="flex-1">
              <Download className="w-4 h-4 mr-1" />Scarica Elenco Selezionato
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Carica CSV: colonne = domanda, opzione_a, opzione_b, opzione_c, opzione_d, risposta_corretta, difficolta [, elenco]
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="w-4 h-4 mr-1" />Carica CSV
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Domande Quiz</CardTitle>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nuova Domanda</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label className="text-xs">Filtra per elenco</Label>
            <Select value={selectedSetId || 'all'} onValueChange={v => setSelectedSetId(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli elenchi</SelectItem>
                {sets?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {questions?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessuna domanda</p>}
            {questions?.map(q => (
              <div key={q.id} className="p-3 rounded-lg border bg-card/30 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium flex-1">{q.question_text}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(q)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { deleteQuestion.mutate(q.id); toast.success('Eliminata'); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['a', 'b', 'c', 'd'].map(opt => {
                    const text = q[`option_${opt}` as keyof QuizQuestion] as string;
                    if (!text) return null;
                    return (
                      <Badge key={opt} variant={q.correct_option === opt ? 'default' : 'outline'} className="text-xs">
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

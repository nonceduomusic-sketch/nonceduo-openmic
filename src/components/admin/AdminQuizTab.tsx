import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  HelpCircle, Plus, Trash2, Edit, Save, Eye, EyeOff,
  List, FileText, Download, Upload, Shuffle, AlertTriangle, Search
} from 'lucide-react';
import {
  useQuizQuestionSets, useCreateQuestionSet, useUpdateQuestionSet, useDeleteQuestionSet,
  useQuizQuestions, useCreateQuizQuestion, useUpdateQuizQuestion, useDeleteQuizQuestion,
  DECADES,
  type QuizQuestion, type QuizQuestionSet,
} from '@/hooks/useGames';

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

export const AdminQuizTab: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold">Quiz</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Elenchi, domande, import/export e duplicati</p>
        </div>
      </div>

      <Tabs defaultValue="quiz-sets">
        <TabsList className="grid grid-cols-3 w-full h-auto p-1">
          <TabsTrigger value="quiz-sets" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1">
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />Elenchi
          </TabsTrigger>
          <TabsTrigger value="quiz-questions" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />Domande
          </TabsTrigger>
          <TabsTrigger value="quiz-duplicates" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3 gap-1">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />Duplicati
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quiz-sets"><QuizSetsPanel /></TabsContent>
        <TabsContent value="quiz-questions"><QuizQuestionsPanel /></TabsContent>
        <TabsContent value="quiz-duplicates"><QuizDuplicatesPanel /></TabsContent>
      </Tabs>
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
                <Shuffle className="w-3.5 h-3.5 mr-1" />Sposta
              </Button>
              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />Nuovo
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

// ─── Quiz Duplicates Panel ───
const QuizDuplicatesPanel: React.FC = () => {
  const { data: sets } = useQuizQuestionSets();
  const { data: allQuestions } = useQuizQuestions();
  const deleteQuestion = useDeleteQuizQuestion();

  const duplicates = useMemo(() => {
    if (!allQuestions || allQuestions.length < 2) return [];
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, '').trim();
    const seen = new Map<string, QuizQuestion[]>();
    for (const q of allQuestions) {
      const key = normalize(q.question_text);
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(q);
    }
    return Array.from(seen.values()).filter(group => group.length > 1);
  }, [allQuestions]);

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Nessun duplicato trovato ✓</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-amber-500/30">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {duplicates.length} gruppi di duplicati trovati
          </CardTitle>
          <CardDescription className="text-xs">Puoi eliminare i duplicati mantenendo una sola copia</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-2">
          {duplicates.map((group, i) => (
            <div key={i} className="p-2.5 sm:p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1.5">
              <p className="text-xs sm:text-sm font-medium leading-snug">{group[0].question_text}</p>
              <div className="flex flex-wrap gap-1">
                {group.map(q => {
                  const setName = sets?.find(s => s.id === q.question_set_id)?.name || 'Senza elenco';
                  return (
                    <Badge key={q.id} variant="outline" className="text-[10px]">
                      {setName} | {'⭐'.repeat(q.difficulty)}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {group.slice(1).map(q => (
                  <Button key={q.id} size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={() => { deleteQuestion.mutate(q.id); toast.success('Duplicato eliminato'); }}>
                    <Trash2 className="w-3 h-3 mr-0.5" />Elimina
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Quiz Questions Panel with Import/Export ───
const QuizQuestionsPanel: React.FC = () => {
  const { data: sets } = useQuizQuestionSets();
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [decadeFilter, setDecadeFilter] = useState<string>('all');
  const { data: questions } = useQuizQuestions(selectedSetId);
  const { data: allQuestions } = useQuizQuestions();
  const createQuestion = useCreateQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion();
  const deleteQuestion = useDeleteQuizQuestion();
  const [showEditor, setShowEditor] = useState(false);
  const [editingQ, setEditingQ] = useState<Partial<QuizQuestion> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedQuestions = useMemo(() => {
    if (!questions) return [];
    let result = questions;
    if (difficultyFilter !== 'all') {
      const diff = parseInt(difficultyFilter);
      result = result.filter(q => q.difficulty === diff);
    }
    if (decadeFilter !== 'all') {
      result = result.filter(q => q.decade === decadeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
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
    }
    return result;
  }, [questions, difficultyFilter, decadeFilter, searchQuery, sets]);

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
    const headers = ['domanda', 'opzione_a', 'opzione_b', 'opzione_c', 'opzione_d', 'risposta_corretta', 'difficolta', 'decade'];
    if (includeSetName) headers.push('elenco');

    const rows = questionsToExport.map(q => {
      const setName = sets?.find(s => s.id === q.question_set_id)?.name || '';
      const row = [
        escapeCSV(q.question_text), escapeCSV(q.option_a), escapeCSV(q.option_b),
        escapeCSV(q.option_c || ''), escapeCSV(q.option_d || ''),
        q.correct_option, String(q.difficulty), q.decade || '',
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

      const setMap: Record<string, string> = {};
      sets?.forEach(s => { setMap[s.name.toLowerCase().trim()] = s.id; });

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
            <CardTitle className="text-sm sm:text-base">Domande Quiz ({displayedQuestions.length})</CardTitle>
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] sm:text-xs">Difficoltà</Label>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    <SelectItem value="1">⭐ Facile</SelectItem>
                    <SelectItem value="2">⭐⭐ Media</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] sm:text-xs">Decade</Label>
                <Select value={decadeFilter} onValueChange={setDecadeFilter}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {DECADES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[11px] sm:text-xs">Cerca domanda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cerca per testo, opzioni o elenco..."
                  className="h-9 text-sm pl-9"
                />
              </div>
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
                  {q.decade && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{DECADES.find(d => d.value === q.decade)?.label || q.decade}</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{'⭐'.repeat(q.difficulty)}</Badge>
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
                <Select value={editingQ.question_set_id || '__none__'} onValueChange={v => setEditingQ(p => ({ ...p!, question_set_id: v === '__none__' ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessun elenco</SelectItem>
                    {sets?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                <div>
                  <Label>Decade</Label>
                  <Select value={editingQ.decade || '__none__'} onValueChange={v => setEditingQ(p => ({ ...p!, decade: v === '__none__' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessuna</SelectItem>
                      {DECADES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
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

export default AdminQuizTab;

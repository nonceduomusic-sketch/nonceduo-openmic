import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GameConfig {
  id: string;
  game_key: string;
  game_name: string;
  game_icon: string;
  is_enabled: boolean;
  sort_order: number;
}

export interface GameSettings {
  id: string;
  games_enabled: boolean;
  show_on_app: boolean;
  show_on_tv: boolean;
  available_when_closed: boolean;
  available_in_consultable: boolean;
}

export interface GameScore {
  id: string;
  game_key: string;
  nickname: string;
  score: number;
  played_at: string;
  is_seed: boolean;
}

export interface QuizQuestionSet {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question_set_id: string | null;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  difficulty: number;
  auto_generated: boolean;
}

// ─── Settings ───
export const useGameSettings = () =>
  useQuery({
    queryKey: ['game-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as GameSettings;
    },
  });

export const useUpdateGameSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<GameSettings>) => {
      const { data: existing } = await supabase.from('game_settings').select('id').limit(1).single();
      if (!existing) throw new Error('No settings row');
      const { error } = await supabase
        .from('game_settings')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game-settings'] }),
  });
};

// ─── Game Configs ───
export const useGameConfigs = () =>
  useQuery({
    queryKey: ['game-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_configs')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as GameConfig[];
    },
  });

export const useToggleGameConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('game_configs')
        .update({ is_enabled, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game-configs'] }),
  });
};

// ─── Scores ───
export const useGameScores = (gameKey: string, limit = 10) =>
  useQuery({
    queryKey: ['game-scores', gameKey, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('game_key', gameKey)
        .order('score', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as GameScore[];
    },
  });

export const useSubmitScore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ game_key, nickname, score }: { game_key: string; nickname: string; score: number }) => {
      const { error } = await supabase
        .from('game_scores')
        .insert({ game_key, nickname, score } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['game-scores', vars.game_key] }),
  });
};

export const useClearGameScores = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gameKey?: string) => {
      let query = supabase.from('game_scores').delete();
      if (gameKey) {
        query = query.eq('game_key', gameKey);
      } else {
        query = query.neq('game_key', '___impossible___'); // delete all
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game-scores'] }),
  });
};

// ─── Quiz Question Sets ───
export const useQuizQuestionSets = () =>
  useQuery({
    queryKey: ['quiz-question-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_question_sets')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data || []) as QuizQuestionSet[];
    },
  });

export const useCreateQuestionSet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { error } = await supabase
        .from('quiz_question_sets')
        .insert({ name, description } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz-question-sets'] }),
  });
};

export const useUpdateQuestionSet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuizQuestionSet> & { id: string }) => {
      const { error } = await supabase
        .from('quiz_question_sets')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz-question-sets'] }),
  });
};

export const useDeleteQuestionSet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quiz_question_sets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz-question-sets'] });
      qc.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });
};

// ─── Quiz Questions ───
export const useQuizQuestions = (setId?: string) =>
  useQuery({
    queryKey: ['quiz-questions', setId],
    queryFn: async () => {
      let query = supabase.from('quiz_questions').select('*').order('created_at');
      if (setId) query = query.eq('question_set_id', setId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as QuizQuestion[];
    },
  });

export const useCreateQuizQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Omit<QuizQuestion, 'id' | 'auto_generated'>) => {
      const { error } = await supabase
        .from('quiz_questions')
        .insert(q as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz-questions'] }),
  });
};

export const useUpdateQuizQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuizQuestion> & { id: string }) => {
      const { error } = await supabase
        .from('quiz_questions')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz-questions'] }),
  });
};

export const useDeleteQuizQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz-questions'] }),
  });
};

// ─── Active Quiz Questions for gameplay ───
export const useActiveQuizQuestions = () =>
  useQuery({
    queryKey: ['active-quiz-questions'],
    queryFn: async () => {
      // Get active sets
      const { data: sets } = await supabase
        .from('quiz_question_sets')
        .select('id')
        .eq('is_active', true);

      if (!sets || sets.length === 0) return [];

      const setIds = sets.map(s => s.id);
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .in('question_set_id', setIds);

      if (error) throw error;
      return (data || []) as QuizQuestion[];
    },
  });

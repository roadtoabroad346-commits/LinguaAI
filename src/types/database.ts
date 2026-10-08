/** Database types — Phase 1. Replace with `supabase gen types` output later. */
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export type LearningMode = "guided" | "free";
export type InterfaceLanguage = "kk" | "ru" | "en";

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  level: Level | null;
  learning_mode: LearningMode | null;
  preferred_language: InterfaceLanguage;
  daily_goal_xp: number;
  timezone: string;
  onboarding_completed: boolean;
  native_language: string | null;
  goals: string[];
  placement_score: number | null;
  placement_taken_at: string | null;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlacementResultRow {
  id: string;
  user_id: string;
  score: number;
  total: number;
  level: Level;
  answers: Array<{ questionId: string; selected: number; correct: boolean }>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
      };
      xp_events: {
        Row: { id: string; user_id: string; amount: number; source: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["xp_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["xp_events"]["Row"]>;
      };
      dictionary_entries: {
        Row: {
          id: string;
          user_id: string;
          word: string;
          mastery: number;
          definition: string | null;
          part_of_speech: string | null;
          level: string | null;
          phonetic: string | null;
          example: string | null;
          translation: string | null;
          source: string;
          review_count: number;
          correct_count: number;
          last_reviewed_at: string | null;
          next_review_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["dictionary_entries"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["dictionary_entries"]["Row"]>;
      };
      placement_results: {
        Row: PlacementResultRow;
        Insert: Omit<PlacementResultRow, "id" | "created_at">;
        Update: Partial<PlacementResultRow>;
      };
      activity_events: {
        Row: { id: string; user_id: string; kind: string; title: string; subtitle: string | null; href: string | null; xp: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["activity_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activity_events"]["Row"]>;
      };
      daily_challenge_completions: {
        Row: { id: string; user_id: string; challenge_date: string; score: number; total: number; xp_earned: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["daily_challenge_completions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_challenge_completions"]["Row"]>;
      };
      skill_attempts: {
        Row: { id: string; user_id: string; skill: "grammar" | "reading" | "listening" | "dictation" | "pronunciation" | "speaking" | "writing" | "spelling" | "vocabulary"; slug: string; score: number; total: number; xp_earned: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["skill_attempts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["skill_attempts"]["Row"]>;
      };
      writing_submissions: {
        Row: { id: string; user_id: string; task_slug: string; level: string; text: string; word_count: number; score: number; feedback: unknown; improved_text: string; xp_earned: number; ai: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["writing_submissions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["writing_submissions"]["Row"]>;
      };
      writing_errors: {
        Row: { id: string; user_id: string; submission_id: string; category: "spelling" | "grammar" | "punctuation" | "style" | "vocabulary"; message: string; snippet: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["writing_errors"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["writing_errors"]["Row"]>;
      };
      ai_messages: {
        Row: { id: string; user_id: string; role: "user" | "assistant"; content: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["ai_messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]>;
      };
      speaking_attempts: {
        Row: { id: string; user_id: string; topic_slug: string; level: string; transcript: string; word_count: number; duration_secs: number; score: number; feedback: unknown; xp_earned: number; ai: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["speaking_attempts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["speaking_attempts"]["Row"]>;
      };
      read_aloud_attempts: {
        Row: { id: string; user_id: string; passage_slug: string; level: string; transcript: string; accuracy: number; wpm: number; score: number; missed_words: unknown; xp_earned: number; ai: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["read_aloud_attempts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["read_aloud_attempts"]["Row"]>;
      };
      spelling_attempts: {
        Row: { id: string; user_id: string; session_id: string; mode: "listen" | "meaning" | "missing" | "choice"; word: string; level: string | null; correct: boolean; xp_earned: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["spelling_attempts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["spelling_attempts"]["Row"]>;
      };
      spelling_sessions: {
        Row: { id: string; user_id: string; session_id: string; mode: string; score: number; total: number; xp_earned: number; perfect: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["spelling_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["spelling_sessions"]["Row"]>;
      };
      achievements: {
        Row: { id: string; user_id: string; key: string; unlocked_at: string };
        Insert: Omit<Database["public"]["Tables"]["achievements"]["Row"], "id" | "unlocked_at">;
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
      };
    };
  };
}

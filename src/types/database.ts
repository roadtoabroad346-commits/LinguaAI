/** Database types — Phase 1. Replace with `supabase gen types` output later. */
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export type LearningMode = "guided" | "free";
export type InterfaceLanguage = "kk" | "ru" | "en";

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  level: Level | null;
  level_source: "placement" | "self" | "manual" | "default" | null;
  learning_mode: LearningMode | null;
  preferred_language: InterfaceLanguage;
  daily_goal_xp: number;
  daily_goal_minutes: number | null;
  daily_xp_goal: number | null;
  timezone: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  onboarding_step: number;
  placement_completed: boolean;
  placement_completed_at: string | null;
  native_language: string | null;
  goals: string[];
  target_exam: string | null;
  target_score: string | null;
  target_date: string | null;
  priority_skills: string[];
  interests: string[];
  study_time_preference: string | null;
  obstacles: string[];
  avatar_url: string | null;
  last_seen_at: string | null;
  preferences: Record<string, unknown>;
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
  skill_scores: Record<string, { correct: number; total: number }>;
  correct_answers: number | null;
  duration_seconds: number | null;
  previous_level: Level | null;
  attempt_number: number | null;
  test_version: string;
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
      placement_drafts: {
        Row: {
          id: string;
          user_id: string;
          attempt_key: string;
          status: "in_progress" | "completed";
          section_index: number;
          payload: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          attempt_key: string;
          status?: "in_progress" | "completed";
          section_index?: number;
          payload?: Record<string, unknown>;
        };
        Update: Partial<{
          status: "in_progress" | "completed";
          section_index: number;
          payload: Record<string, unknown>;
        }>;
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
        Row: { id: string; user_id: string; key: string; unlocked_at: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["achievements"]["Row"], "id" | "unlocked_at" | "created_at"> & { unlocked_at?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
      };
      devices: {
        Row: { id: string; user_id: string; first_seen: string; last_seen: string; user_agent: string | null; platform: string | null; screen: string | null; timezone: string | null; language: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["devices"]["Row"], "first_seen" | "last_seen" | "created_at"> & { id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["devices"]["Row"]>;
      };
      vocab_sets: {
        Row: {
          id: string; user_id: string; title: string; description: string;
          language: string; native_language: string; level: string | null;
          category: string; color: string; icon: string;
          is_archived: boolean; is_favorite: boolean;
          last_studied_at: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vocab_sets"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vocab_sets"]["Row"]>;
      };
      vocab_cards: {
        Row: {
          id: string; set_id: string; user_id: string;
          front: string; back: string; word: string; definition: string;
          example: string; example_translation: string;
          part_of_speech: string | null; level: string | null; phonetic: string;
          synonyms: string[]; antonyms: string[]; collocations: string[];
          grammar_notes: string; personal_notes: string; tags: string[]; source: string;
          status: "new" | "learning" | "review" | "relearning" | "mastered";
          mastery: number; ease_factor: number; interval_days: number;
          review_count: number; correct_count: number; lapses: number;
          last_reviewed_at: string | null; next_review_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vocab_cards"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vocab_cards"]["Row"]>;
      };
      vocab_reviews: {
        Row: {
          id: string; user_id: string; card_id: string; set_id: string;
          rating: "again" | "hard" | "good" | "easy" | "known" | "unknown";
          correct: boolean; prev_mastery: number; new_mastery: number;
          prev_interval: number; new_interval: number;
          idempotency_key: string; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vocab_reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vocab_reviews"]["Row"]>;
      };
      security_events: {
        Row: { id: string; user_id: string | null; event_type: "login" | "signup" | "device_new" | "country_change" | "shared_ip" | "password_reset" | "oauth_link"; ip: string | null; country: string | null; region: string | null; city: string | null; user_agent: string | null; device_id: string | null; meta: Record<string, unknown>; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["security_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["security_events"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string; user_id: string; dedupe_key: string;
          category: "onboarding" | "learning" | "review" | "goal" | "streak" | "challenge" | "skills" | "milestone" | "weekly" | "system";
          priority: "low" | "normal" | "high";
          title_key: string; body_key: string; vars: Record<string, unknown>;
          href: string; read_at: string | null; dismissed_at: string | null;
          snoozed_until: string | null; resolved_at: string | null;
          expires_at: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      completion_claims: {
        Row: { id: string; user_id: string; scope: string; key: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["completion_claims"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["completion_claims"]["Row"]>;
      };
    };
  };
}

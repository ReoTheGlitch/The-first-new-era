export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string;
          description_ar: string;
          icon: string;
          id: string;
          title_ar: string;
          xp_reward: number;
        };
        Insert: {
          code: string;
          description_ar: string;
          icon?: string;
          id?: string;
          title_ar: string;
          xp_reward?: number;
        };
        Update: {
          code?: string;
          description_ar?: string;
          icon?: string;
          id?: string;
          title_ar?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      ai_chat_conversations: {
        Row: {
          created_at: string;
          id: string;
          subject: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          subject?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          subject?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_chat_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_chat_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_generated_exams: {
        Row: {
          answers: Json;
          completed_at: string | null;
          created_at: string;
          difficulty: string;
          exam_title: string;
          id: string;
          questions: Json;
          score: number | null;
          subject: string;
          submitted: boolean;
          topic: string | null;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          difficulty: string;
          exam_title: string;
          id?: string;
          questions: Json;
          score?: number | null;
          subject: string;
          submitted?: boolean;
          topic?: string | null;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          difficulty?: string;
          exam_title?: string;
          id?: string;
          questions?: Json;
          score?: number | null;
          subject?: string;
          submitted?: boolean;
          topic?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_interactions: {
        Row: {
          created_at: string;
          id: string;
          model: string;
          prompt_chars: number;
          provider: string;
          response_chars: number;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          model: string;
          prompt_chars: number;
          provider: string;
          response_chars?: number;
          status: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          model?: string;
          prompt_chars?: number;
          provider?: string;
          response_chars?: number;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      attempt_answers: {
        Row: {
          answered_at: string;
          attempt_id: string;
          id: string;
          is_correct: boolean;
          option_id: string;
          question_id: string;
          user_id: string;
        };
        Insert: {
          answered_at?: string;
          attempt_id: string;
          id?: string;
          is_correct: boolean;
          option_id: string;
          question_id: string;
          user_id: string;
        };
        Update: {
          answered_at?: string;
          attempt_id?: string;
          id?: string;
          is_correct?: boolean;
          option_id?: string;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "question_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      concepts: {
        Row: {
          created_at: string;
          explanation_ar: string | null;
          formula_tex: string | null;
          id: string;
          lesson_id: string;
          origin: Database["public"]["Enums"]["content_origin"];
          sort_order: number;
          title_ar: string;
        };
        Insert: {
          created_at?: string;
          explanation_ar?: string | null;
          formula_tex?: string | null;
          id?: string;
          lesson_id: string;
          origin?: Database["public"]["Enums"]["content_origin"];
          sort_order?: number;
          title_ar: string;
        };
        Update: {
          created_at?: string;
          explanation_ar?: string | null;
          formula_tex?: string | null;
          id?: string;
          lesson_id?: string;
          origin?: Database["public"]["Enums"]["content_origin"];
          sort_order?: number;
          title_ar?: string;
        };
        Relationships: [
          {
            foreignKeyName: "concepts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      content_sources: {
        Row: {
          academic_year: string;
          created_at: string;
          id: string;
          notes: string | null;
          origin: Database["public"]["Enums"]["content_origin"];
          retrieved_at: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          title: string;
          url: string | null;
        };
        Insert: {
          academic_year: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          origin: Database["public"]["Enums"]["content_origin"];
          retrieved_at?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          title: string;
          url?: string | null;
        };
        Update: {
          academic_year?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          origin?: Database["public"]["Enums"]["content_origin"];
          retrieved_at?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          title?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          academic_year: string;
          created_at: string;
          id: string;
          sort_order: number;
          source_id: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          subject_id: string;
          title_ar: string;
        };
        Insert: {
          academic_year: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          subject_id: string;
          title_ar: string;
        };
        Update: {
          academic_year?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          subject_id?: string;
          title_ar?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "content_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_preferences: {
        Row: {
          daily_goal_xp: number;
          explanation_length: string;
          explanation_style: string;
          large_text: boolean;
          notify_revision: boolean;
          notify_streak: boolean;
          reduce_motion: boolean;
          show_on_leaderboard: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          daily_goal_xp?: number;
          explanation_length?: string;
          explanation_style?: string;
          large_text?: boolean;
          notify_revision?: boolean;
          notify_streak?: boolean;
          reduce_motion?: boolean;
          show_on_leaderboard?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          daily_goal_xp?: number;
          explanation_length?: string;
          explanation_style?: string;
          large_text?: boolean;
          notify_revision?: boolean;
          notify_streak?: boolean;
          reduce_motion?: boolean;
          show_on_leaderboard?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          completed_at: string | null;
          lesson_id: string;
          progress_pct: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          lesson_id: string;
          progress_pct?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          lesson_id?: string;
          progress_pct?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          body: Json;
          created_at: string;
          id: string;
          objectives_ar: string[];
          origin: Database["public"]["Enums"]["content_origin"];
          overview_ar: string | null;
          sort_order: number;
          source_id: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          title_ar: string;
          unit_id: string;
        };
        Insert: {
          body?: Json;
          created_at?: string;
          id?: string;
          objectives_ar?: string[];
          origin?: Database["public"]["Enums"]["content_origin"];
          overview_ar?: string | null;
          sort_order?: number;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          title_ar: string;
          unit_id: string;
        };
        Update: {
          body?: Json;
          created_at?: string;
          id?: string;
          objectives_ar?: string[];
          origin?: Database["public"]["Enums"]["content_origin"];
          overview_ar?: string | null;
          sort_order?: number;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          title_ar?: string;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "content_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_options: {
        Row: {
          id: string;
          is_correct: boolean;
          label_ar: string;
          question_id: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          is_correct?: boolean;
          label_ar: string;
          question_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          is_correct?: boolean;
          label_ar?: string;
          question_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          concept_id: string;
          created_at: string;
          difficulty: number;
          explanation_ar: string | null;
          id: string;
          origin: Database["public"]["Enums"]["content_origin"];
          prompt_ar: string;
          xp_value: number;
        };
        Insert: {
          concept_id: string;
          created_at?: string;
          difficulty?: number;
          explanation_ar?: string | null;
          id?: string;
          origin?: Database["public"]["Enums"]["content_origin"];
          prompt_ar: string;
          xp_value?: number;
        };
        Update: {
          concept_id?: string;
          created_at?: string;
          difficulty?: number;
          explanation_ar?: string | null;
          id?: string;
          origin?: Database["public"]["Enums"]["content_origin"];
          prompt_ar?: string;
          xp_value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "questions_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          completed_at: string | null;
          concept_id: string;
          correct_count: number;
          id: string;
          started_at: string;
          total_count: number;
          user_id: string;
          xp_awarded: number;
        };
        Insert: {
          completed_at?: string | null;
          concept_id: string;
          correct_count?: number;
          id?: string;
          started_at?: string;
          total_count?: number;
          user_id: string;
          xp_awarded?: number;
        };
        Update: {
          completed_at?: string | null;
          concept_id?: string;
          correct_count?: number;
          id?: string;
          started_at?: string;
          total_count?: number;
          user_id?: string;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          name_ar: string;
          starts_at: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          name_ar: string;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          name_ar?: string;
          starts_at?: string;
        };
        Relationships: [];
      };
      streaks: {
        Row: {
          current_streak: number;
          last_activity_date: string | null;
          longest_streak: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          current_streak?: number;
          last_activity_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_streak?: number;
          last_activity_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          accent: string;
          created_at: string;
          description_ar: string | null;
          id: string;
          is_active: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          accent?: string;
          created_at?: string;
          description_ar?: string | null;
          id?: string;
          is_active?: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          accent?: string;
          created_at?: string;
          description_ar?: string | null;
          id?: string;
          is_active?: boolean;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      units: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          origin: Database["public"]["Enums"]["content_origin"];
          sort_order: number;
          source_id: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          summary_ar: string | null;
          title_ar: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          origin?: Database["public"]["Enums"]["content_origin"];
          sort_order?: number;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          summary_ar?: string | null;
          title_ar: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          origin?: Database["public"]["Enums"]["content_origin"];
          sort_order?: number;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          summary_ar?: string | null;
          title_ar?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "content_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          earned_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          earned_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          earned_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      xp_transactions: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          reason: string;
          ref_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          reason: string;
          ref_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          reason?: string;
          ref_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_leaderboard: {
        Args: { _limit?: number };
        Returns: {
          display_name: string;
          is_me: boolean;
          rank: number;
          total_xp: number;
          user_id: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      content_origin: "official" | "editorial" | "ai_generated" | "demo";
      verification_status: "unverified" | "pending" | "verified";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      content_origin: ["official", "editorial", "ai_generated", "demo"],
      verification_status: ["unverified", "pending", "verified"],
    },
  },
} as const;

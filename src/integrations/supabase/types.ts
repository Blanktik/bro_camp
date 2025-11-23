export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      complaints: {
        Row: {
          admin_id: string | null
          admin_response: string | null
          admin_voice_note_url: string | null
          appeal_response: string | null
          appeal_reviewed_at: string | null
          appeal_reviewed_by: string | null
          appeal_status: string | null
          appeal_submitted_at: string | null
          appeal_text: string | null
          created_at: string
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          edited_at: string | null
          flagged: boolean | null
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          id: string
          is_anonymous: boolean
          media_urls: string[] | null
          moderation_action: string | null
          moderation_notes: string | null
          resolved_at: string | null
          responded_at: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string | null
          viewed_at: string | null
          voice_note_url: string | null
        }
        Insert: {
          admin_id?: string | null
          admin_response?: string | null
          admin_voice_note_url?: string | null
          appeal_response?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          created_at?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          edited_at?: string | null
          flagged?: boolean | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          is_anonymous?: boolean
          media_urls?: string[] | null
          moderation_action?: string | null
          moderation_notes?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          viewed_at?: string | null
          voice_note_url?: string | null
        }
        Update: {
          admin_id?: string | null
          admin_response?: string | null
          admin_voice_note_url?: string | null
          appeal_response?: string | null
          appeal_reviewed_at?: string | null
          appeal_reviewed_by?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          created_at?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          edited_at?: string | null
          flagged?: boolean | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          is_anonymous?: boolean
          media_urls?: string[] | null
          moderation_action?: string | null
          moderation_notes?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          viewed_at?: string | null
          voice_note_url?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          location: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          location?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          location?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          interests: string[] | null
          updated_at: string
          year: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id: string
          interests?: string[] | null
          updated_at?: string
          year?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          interests?: string[] | null
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "admin", "super_admin"],
    },
  },
} as const

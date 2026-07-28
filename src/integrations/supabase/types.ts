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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          country: string | null
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      anon_free_trial_usage: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_hash: string | null
          ip_hash: string
          result_data_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_hash?: string | null
          ip_hash: string
          result_data_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_hash?: string | null
          ip_hash?: string
          result_data_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_events: {
        Row: {
          archived_at: string | null
          created_at: string
          detail: string | null
          id: string
          kind: string
          metadata: Json
          resolved_at: string | null
          severity: string
          source: string | null
          status: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          source?: string | null
          status?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gallery_categories: {
        Row: {
          background_prompt: string | null
          created_at: string
          emoji: string
          group_id: string
          id: string
          label: string
          position: number
          refreshed_at: string | null
          unsplash_query: string | null
          updated_at: string
        }
        Insert: {
          background_prompt?: string | null
          created_at?: string
          emoji: string
          group_id: string
          id: string
          label: string
          position?: number
          refreshed_at?: string | null
          unsplash_query?: string | null
          updated_at?: string
        }
        Update: {
          background_prompt?: string | null
          created_at?: string
          emoji?: string
          group_id?: string
          id?: string
          label?: string
          position?: number
          refreshed_at?: string | null
          unsplash_query?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_url: string
          photographer_name: string | null
          photographer_url: string | null
          position: number
          source: string
          thumb_url: string | null
          unsplash_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_url: string
          photographer_name?: string | null
          photographer_url?: string | null
          position?: number
          source: string
          thumb_url?: string | null
          unsplash_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string
          photographer_name?: string | null
          photographer_url?: string | null
          position?: number
          source?: string
          thumb_url?: string | null
          unsplash_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gallery_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inference_jobs: {
        Row: {
          cost: number
          created_at: string
          credits_charged: number
          engine: string
          error: string | null
          id: string
          is_admin_mock: boolean
          kind: string
          mask_data: string | null
          prediction_id: string
          result_data_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          credits_charged?: number
          engine: string
          error?: string | null
          id?: string
          is_admin_mock?: boolean
          kind: string
          mask_data?: string | null
          prediction_id: string
          result_data_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          credits_charged?: number
          engine?: string
          error?: string | null
          id?: string
          is_admin_mock?: boolean
          kind?: string
          mask_data?: string | null
          prediction_id?: string
          result_data_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      iyzico_orders: {
        Row: {
          amount: number
          amount_try: number
          completed_at: string | null
          conversation_id: string
          created_at: string
          credits: number
          currency: string
          description: string
          display_amount: number
          display_currency: string
          error_message: string | null
          fx_rate: number | null
          id: string
          iyzico_payment_id: string | null
          iyzico_token: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_try: number
          completed_at?: string | null
          conversation_id: string
          created_at?: string
          credits: number
          currency?: string
          description: string
          display_amount?: number
          display_currency?: string
          error_message?: string | null
          fx_rate?: number | null
          id?: string
          iyzico_payment_id?: string | null
          iyzico_token?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_try?: number
          completed_at?: string | null
          conversation_id?: string
          created_at?: string
          credits?: number
          currency?: string
          description?: string
          display_amount?: number
          display_currency?: string
          error_message?: string | null
          fx_rate?: number | null
          id?: string
          iyzico_payment_id?: string | null
          iyzico_token?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kaspi_orders: {
        Row: {
          amount_kzt: number
          completed_at: string | null
          created_at: string
          credits_granted: number
          holder_name: string
          holder_name_normalized: string
          id: string
          requested_credits: number
          sms_payload: Json | null
          status: string
          user_id: string
        }
        Insert: {
          amount_kzt: number
          completed_at?: string | null
          created_at?: string
          credits_granted?: number
          holder_name: string
          holder_name_normalized: string
          id?: string
          requested_credits?: number
          sms_payload?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          amount_kzt?: number
          completed_at?: string | null
          created_at?: string
          credits_granted?: number
          holder_name?: string
          holder_name_normalized?: string
          id?: string
          requested_credits?: number
          sms_payload?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          country: string
          country_code: string
          created_at: string
          id: string
          lang: string
          name: string
          quote: string
          rating: number | null
          role: string
          sort_order: number
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          country: string
          country_code: string
          created_at?: string
          id?: string
          lang?: string
          name: string
          quote: string
          rating?: number | null
          role: string
          sort_order?: number
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          country?: string
          country_code?: string
          created_at?: string
          id?: string
          lang?: string
          name?: string
          quote?: string
          rating?: number | null
          role?: string
          sort_order?: number
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signup_ips: {
        Row: {
          created_at: string
          id: string
          ip: string
          throttled: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          throttled?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          throttled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credits: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cutout_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_hash: string
          model: string | null
          result_data_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_hash: string
          model?: string | null
          result_data_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_hash?: string
          model?: string | null
          result_data_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_templates: {
        Row: {
          category: string
          created_at: string
          data_url: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          data_url: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          data_url?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_stale_feedback_events: { Args: never; Returns: number }
      consume_credit: { Args: never; Returns: number }
      consume_credits: { Args: { _n: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_billing_admin: { Args: { _user_id: string }; Returns: boolean }
      purge_stale_inference_jobs: { Args: never; Returns: number }
      purge_stale_user_templates: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

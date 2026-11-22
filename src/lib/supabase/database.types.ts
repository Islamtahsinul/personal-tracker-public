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
      gun_reference: {
        Row: {
          action_type: string | null
          barrel_length: string | null
          caliber: string | null
          capacity: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          image_attribution: string | null
          image_url: string | null
          imported_at: string
          license: string | null
          manufacturer: string | null
          model: string | null
          name: string
          overall_length: string | null
          production_years: string | null
          search_text: string | null
          source: string
          source_url: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          action_type?: string | null
          barrel_length?: string | null
          caliber?: string | null
          capacity?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          imported_at?: string
          license?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          overall_length?: string | null
          production_years?: string | null
          search_text?: string | null
          source: string
          source_url?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          action_type?: string | null
          barrel_length?: string | null
          caliber?: string | null
          capacity?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          imported_at?: string
          license?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          overall_length?: string | null
          production_years?: string | null
          search_text?: string | null
          source?: string
          source_url?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      item_enrichment_records: {
        Row: {
          external_id: string | null
          external_url: string | null
          fetched_at: string
          id: string
          item_id: string
          provider: string
          raw_data: Json | null
        }
        Insert: {
          external_id?: string | null
          external_url?: string | null
          fetched_at?: string
          id?: string
          item_id: string
          provider: string
          raw_data?: Json | null
        }
        Update: {
          external_id?: string | null
          external_url?: string | null
          fetched_at?: string
          id?: string
          item_id?: string
          provider?: string
          raw_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "item_enrichment_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          item_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          item_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          item_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "item_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "tracker_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_field_values_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tags: {
        Row: {
          item_id: string
          tag_id: string
        }
        Insert: {
          item_id: string
          tag_id: string
        }
        Update: {
          item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          archived_at: string | null
          backdrop_url: string | null
          created_at: string
          external_id: string | null
          external_source: string | null
          external_url: string | null
          id: string
          image_url: string | null
          is_favorite: boolean
          notes: string | null
          rating: number | null
          status_id: string | null
          subtitle: string | null
          title: string
          tracker_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          backdrop_url?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          notes?: string | null
          rating?: number | null
          status_id?: string | null
          subtitle?: string | null
          title: string
          tracker_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          backdrop_url?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          notes?: string | null
          rating?: number | null
          status_id?: string | null
          subtitle?: string | null
          title?: string
          tracker_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "tracker_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_read: boolean
          published_at: string | null
          relevance_score: number
          source_name: string | null
          summary_bullet_points: Json
          title: string
          topic: string | null
          url: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          published_at?: string | null
          relevance_score?: number
          source_name?: string | null
          summary_bullet_points?: Json
          title: string
          topic?: string | null
          url: string
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          published_at?: string | null
          relevance_score?: number
          source_name?: string | null
          summary_bullet_points?: Json
          title?: string
          topic?: string | null
          url?: string
        }
        Relationships: []
      }
      news_briefings: {
        Row: {
          category_briefings: Json
          created_at: string
          date_string: string
          id: string
          summary_markdown: string
          top_stories: Json
        }
        Insert: {
          category_briefings?: Json
          created_at?: string
          date_string: string
          id?: string
          summary_markdown: string
          top_stories?: Json
        }
        Update: {
          category_briefings?: Json
          created_at?: string
          date_string?: string
          id?: string
          summary_markdown?: string
          top_stories?: Json
        }
        Relationships: []
      }
      news_user_settings: {
        Row: {
          ai_api_key: string | null
          custom_model_name: string | null
          id: string
          mute_keywords: Json
          news_api_key: string | null
          selected_ai_provider: string
          topic_weights: Json
          updated_at: string
        }
        Insert: {
          ai_api_key?: string | null
          custom_model_name?: string | null
          id?: string
          mute_keywords?: Json
          news_api_key?: string | null
          selected_ai_provider?: string
          topic_weights?: Json
          updated_at?: string
        }
        Update: {
          ai_api_key?: string | null
          custom_model_name?: string | null
          id?: string
          mute_keywords?: Json
          news_api_key?: string | null
          selected_ai_provider?: string
          topic_weights?: Json
          updated_at?: string
        }
        Relationships: []
      }
      plant_reference: {
        Row: {
          common_name: string
          created_at: string
          description: string | null
          edibility: string | null
          family: string | null
          habitat: string | null
          id: string
          identification_notes: string | null
          image_attribution: string | null
          image_url: string | null
          imported_at: string
          license: string | null
          other_common_names: string[] | null
          safety_caveat: string
          scientific_name: string | null
          search_text: string | null
          season: string | null
          source: string
          source_url: string | null
          toxicity_notes: string | null
          updated_at: string
        }
        Insert: {
          common_name: string
          created_at?: string
          description?: string | null
          edibility?: string | null
          family?: string | null
          habitat?: string | null
          id?: string
          identification_notes?: string | null
          image_attribution?: string | null
          image_url?: string | null
          imported_at?: string
          license?: string | null
          other_common_names?: string[] | null
          safety_caveat?: string
          scientific_name?: string | null
          search_text?: string | null
          season?: string | null
          source: string
          source_url?: string | null
          toxicity_notes?: string | null
          updated_at?: string
        }
        Update: {
          common_name?: string
          created_at?: string
          description?: string | null
          edibility?: string | null
          family?: string | null
          habitat?: string | null
          id?: string
          identification_notes?: string | null
          image_attribution?: string | null
          image_url?: string | null
          imported_at?: string
          license?: string | null
          other_common_names?: string[] | null
          safety_caveat?: string
          scientific_name?: string | null
          search_text?: string | null
          season?: string | null
          source?: string
          source_url?: string | null
          toxicity_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tracker_field_options: {
        Row: {
          color: string | null
          created_at: string
          field_id: string
          id: string
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          field_id: string
          id?: string
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          color?: string | null
          created_at?: string
          field_id?: string
          id?: string
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "tracker_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_fields: {
        Row: {
          created_at: string
          field_type: string
          help_text: string | null
          id: string
          is_personal: boolean
          is_required: boolean
          key: string
          label: string
          show_in_card: boolean
          sort_order: number
          tracker_id: string
        }
        Insert: {
          created_at?: string
          field_type: string
          help_text?: string | null
          id?: string
          is_personal?: boolean
          is_required?: boolean
          key: string
          label: string
          show_in_card?: boolean
          sort_order?: number
          tracker_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_personal?: boolean
          is_required?: boolean
          key?: string
          label?: string
          show_in_card?: boolean
          sort_order?: number
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_fields_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          key: string
          label: string
          sort_order: number
          tracker_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          key: string
          label: string
          sort_order?: number
          tracker_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          key?: string
          label?: string
          sort_order?: number
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_statuses_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      trackers: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_archived: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          slug?: string
          sort_order?: number
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
      add_trackers_for_user: {
        Args: { p_trackers_json: Json; p_user_id: string }
        Returns: {
          inserted: boolean
          name: string
          slug: string
        }[]
      }
      bootstrap_default_trackers: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      search_gun_reference: {
        Args: { max_results?: number; q: string }
        Returns: {
          action_type: string | null
          barrel_length: string | null
          caliber: string | null
          capacity: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          image_attribution: string | null
          image_url: string | null
          imported_at: string
          license: string | null
          manufacturer: string | null
          model: string | null
          name: string
          overall_length: string | null
          production_years: string | null
          search_text: string | null
          source: string
          source_url: string | null
          updated_at: string
          weight: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "gun_reference"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_plant_reference: {
        Args: { max_results?: number; q: string }
        Returns: {
          common_name: string
          created_at: string
          description: string | null
          edibility: string | null
          family: string | null
          habitat: string | null
          id: string
          identification_notes: string | null
          image_attribution: string | null
          image_url: string | null
          imported_at: string
          license: string | null
          other_common_names: string[] | null
          safety_caveat: string
          scientific_name: string | null
          search_text: string | null
          season: string | null
          source: string
          source_url: string | null
          toxicity_notes: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "plant_reference"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

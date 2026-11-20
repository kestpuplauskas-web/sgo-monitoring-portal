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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          body: string
          cover_url: string
          created_at: string
          excerpt: string
          id: string
          meta_description: string
          meta_title: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          cover_url?: string
          created_at?: string
          excerpt?: string
          id?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          cover_url?: string
          created_at?: string
          excerpt?: string
          id?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message: string
          last_message_at: string
          page: string
          status: string
          token: string
          visitor_email: string
          visitor_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string
          last_message_at?: string
          page?: string
          status?: string
          token: string
          visitor_email?: string
          visitor_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string
          last_message_at?: string
          page?: string
          status?: string
          token?: string
          visitor_email?: string
          visitor_name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string
          created_at: string
          email: string
          id: string
          inverter: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          email: string
          id?: string
          inverter?: string
          name: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          id?: string
          inverter?: string
          name?: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          city: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          notes: string
          page: string
          phone: string
          power: string
          service: string
          status: string
        }
        Insert: {
          city?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          notes?: string
          page?: string
          phone?: string
          power?: string
          service?: string
          status?: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string
          page?: string
          phone?: string
          power?: string
          service?: string
          status?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          device: string
          id: number
          path: string
          referrer: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device?: string
          id?: never
          path: string
          referrer?: string
          visitor_id?: string
        }
        Update: {
          created_at?: string
          device?: string
          id?: never
          path?: string
          referrer?: string
          visitor_id?: string
        }
        Relationships: []
      }
      plan_orders: {
        Row: {
          admin_notes: string
          city: string
          client_id: string | null
          created_at: string
          email: string
          id: string
          installer: string
          inverter: string
          name: string
          order_no: string
          phone: string
          plan_id: string | null
          plan_name: string
          price_label: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string
          city: string
          client_id?: string | null
          created_at?: string
          email: string
          id?: string
          installer?: string
          inverter?: string
          name: string
          order_no: string
          phone: string
          plan_id?: string | null
          plan_name: string
          price_label?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string
          city?: string
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          installer?: string
          inverter?: string
          name?: string
          order_no?: string
          phone?: string
          plan_id?: string | null
          plan_name?: string
          price_label?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          activation_fee: number
          active: boolean
          benefit: string
          features: string[]
          id: string
          name: string
          old_price: number | null
          period_label: string
          price: number
          promo: string
          recommended: boolean
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          activation_fee?: number
          active?: boolean
          benefit?: string
          features?: string[]
          id?: string
          name: string
          old_price?: number | null
          period_label?: string
          price?: number
          promo?: string
          recommended?: boolean
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          activation_fee?: number
          active?: boolean
          benefit?: string
          features?: string[]
          id?: string
          name?: string
          old_price?: number | null
          period_label?: string
          price?: number
          promo?: string
          recommended?: boolean
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "editor"
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
    Enums: {
      app_role: ["admin", "manager", "editor"],
    },
  },
} as const

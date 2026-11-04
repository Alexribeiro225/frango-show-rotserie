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
      announcements: {
        Row: {
          body: string
          created_at: string
          id: number
          image_url: string | null
          is_active: boolean
          owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: number
          image_url?: string | null
          is_active?: boolean
          owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: number
          image_url?: string | null
          is_active?: boolean
          owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      combo_components: {
        Row: {
          combo_product_id: number
          component_product_id: number
          quantity_per_combo: number
        }
        Insert: {
          combo_product_id: number
          component_product_id: number
          quantity_per_combo: number
        }
        Update: {
          combo_product_id?: number
          component_product_id?: number
          quantity_per_combo?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_components_combo_product_id_fkey"
            columns: ["combo_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kiwify_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: Json
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_fee: number | null
          fulfillment: string
          id: number
          items: Json
          notes: string
          owner_id: string | null
          paid_at: string | null
          payment_method: string
          picked_up_at: string | null
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          address?: Json
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_fee?: number | null
          fulfillment: string
          id?: number
          items: Json
          notes?: string
          owner_id?: string | null
          paid_at?: string | null
          payment_method: string
          picked_up_at?: string | null
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          address?: Json
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number | null
          fulfillment?: string
          id?: number
          items?: Json
          notes?: string
          owner_id?: string | null
          paid_at?: string | null
          payment_method?: string
          picked_up_at?: string | null
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: number
          image_url: string
          is_active: boolean
          is_popular: boolean
          name: string
          owner_id: string | null
          price: number
          sort_order: number
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id?: number
          image_url?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          owner_id?: string | null
          price: number
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: number
          image_url?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          owner_id?: string | null
          price?: number
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string
          ends_at: string | null
          id: number
          image_url: string | null
          is_active: boolean
          owner_id: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          owner_id?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          owner_id?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_plans: {
        Row: {
          billing_interval: string
          checkout_url: string
          created_at: string
          description: string
          features: Json
          id: number
          is_active: boolean
          kiwify_product_id: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          checkout_url: string
          created_at?: string
          description?: string
          features?: Json
          id?: number
          is_active?: boolean
          kiwify_product_id?: string | null
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          checkout_url?: string
          created_at?: string
          description?: string
          features?: Json
          id?: number
          is_active?: boolean
          kiwify_product_id?: string | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      saas_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          customer_email: string
          is_blocked: boolean
          is_main_store: boolean
          plan_id: number | null
          provider: string
          provider_subscription_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          customer_email: string
          is_blocked?: boolean
          is_main_store?: boolean
          plan_id?: number | null
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          customer_email?: string
          is_blocked?: boolean
          is_main_store?: boolean
          plan_id?: number | null
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_kiwify_subscription_event: {
        Args: { p_event: Json }
        Returns: string
      }
      consume_combo_inventory: { Args: { p_items: Json }; Returns: undefined }
      create_counter_sale: {
        Args: { p_items: Json; p_payment_method: string }
        Returns: Json
      }
      create_order: {
        Args: {
          p_address: Json
          p_customer_name: string
          p_customer_phone: string
          p_fulfillment: string
          p_items: Json
          p_notes: string
          p_payment_method: string
        }
        Returns: Json
      }
      create_store_order: {
        Args: {
          p_address: Json
          p_customer_name: string
          p_customer_phone: string
          p_fulfillment: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_store_id: string
        }
        Returns: Json
      }
      current_store_owner: { Args: never; Returns: string }
      delete_orders_by_ids: { Args: { p_ids: number[] }; Returns: number }
      delete_orders_in_range: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      email_registered: { Args: { p_email: string }; Returns: boolean }
      has_active_saas_subscription: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      main_store_owner: { Args: never; Returns: string }
      public_store_content: { Args: { p_store_id?: string }; Returns: Json }
      save_combo_components: {
        Args: { p_combo_product_id: number; p_components: Json }
        Returns: undefined
      }
      set_main_store: { Args: { p_user_id: string }; Returns: undefined }
      store_accepts_orders: { Args: { p_owner: string }; Returns: boolean }
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

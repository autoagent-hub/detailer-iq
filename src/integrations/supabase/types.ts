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
      profiles: {
        Row: {
          addon_ceramic: number
          addon_pet_hair: number
          addon_stains: number
          allow_photos: boolean
          business_name: string
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          notify_include_notes: boolean
          notify_include_photos: boolean
          notify_telegram: boolean
          packages: Json
          phone: string
          sedan_base: number
          services: Json
          slug: string
          suv_base: number
          tagline: string
          telegram_auth_code: string
          telegram_chat_id: string | null
          timezone: string
          truck_base: number
          vehicle_categories: Json
        }
        Insert: {
          addon_ceramic?: number
          addon_pet_hair?: number
          addon_stains?: number
          allow_photos?: boolean
          business_name?: string
          created_at?: string
          currency?: string
          id: string
          logo_url?: string | null
          notify_include_notes?: boolean
          notify_include_photos?: boolean
          notify_telegram?: boolean
          packages?: Json
          phone?: string
          sedan_base?: number
          services?: Json
          slug: string
          suv_base?: number
          tagline?: string
          telegram_auth_code?: string
          telegram_chat_id?: string | null
          timezone?: string
          truck_base?: number
          vehicle_categories?: Json
        }
        Update: {
          addon_ceramic?: number
          addon_pet_hair?: number
          addon_stains?: number
          allow_photos?: boolean
          business_name?: string
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          notify_include_notes?: boolean
          notify_include_photos?: boolean
          notify_telegram?: boolean
          packages?: Json
          phone?: string
          sedan_base?: number
          services?: Json
          slug?: string
          suv_base?: number
          tagline?: string
          telegram_auth_code?: string
          telegram_chat_id?: string | null
          timezone?: string
          truck_base?: number
          vehicle_categories?: Json
        }
        Relationships: []
      }
      quotes: {
        Row: {
          addons: string[]
          created_at: string
          currency: string
          customer_name: string
          customer_phone: string
          detailer_id: string
          estimated_price: number
          id: string
          notes: string
          photo_urls: string[]
          service_key: string
          service_label: string
          service_price: number
          vehicle_desc: string
          vehicle_type: string
        }
        Insert: {
          addons?: string[]
          created_at?: string
          currency?: string
          customer_name: string
          customer_phone: string
          detailer_id: string
          estimated_price: number
          id?: string
          notes?: string
          photo_urls?: string[]
          service_key?: string
          service_label?: string
          service_price?: number
          vehicle_desc?: string
          vehicle_type: string
        }
        Update: {
          addons?: string[]
          created_at?: string
          currency?: string
          customer_name?: string
          customer_phone?: string
          detailer_id?: string
          estimated_price?: number
          id?: string
          notes?: string
          photo_urls?: string[]
          service_key?: string
          service_label?: string
          service_price?: number
          vehicle_desc?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_detailer_id_fkey"
            columns: ["detailer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_pricing: {
        Args: { _slug: string }
        Returns: {
          addon_ceramic: number
          addon_pet_hair: number
          addon_stains: number
          allow_photos: boolean
          business_name: string
          currency: string
          id: string
          logo_url: string
          packages: Json
          phone: string
          sedan_base: number
          services: Json
          slug: string
          suv_base: number
          tagline: string
          truck_base: number
          vehicle_categories: Json
        }[]
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
    Enums: {},
  },
} as const

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          new_data: Json | null;
          old_data: Json | null;
          record_id: string | null;
          school_id: string | null;
          table_name: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          record_id?: string | null;
          school_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          record_id?: string | null;
          school_id?: string | null;
          table_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string | null;
          expires_at: string;
          full_name: string | null;
          id: string;
          invited_by: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string;
          title: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          full_name?: string | null;
          id?: string;
          invited_by?: string | null;
          phone?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string;
          title?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          full_name?: string | null;
          id?: string;
          invited_by?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          school_id?: string;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      school_memberships: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string;
          status: Database["public"]["Enums"]["membership_status"];
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string;
          status?: Database["public"]["Enums"]["membership_status"];
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          school_id?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          address: string | null;
          city: string | null;
          country_code: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          email: string | null;
          features: NonNullable<Json>;
          id: string;
          logo_path: string | null;
          name: string;
          phone: string | null;
          plan: Database["public"]["Enums"]["school_plan"];
          region: string | null;
          settings: NonNullable<Json>;
          short_name: string | null;
          slug: string;
          status: Database["public"]["Enums"]["school_status"];
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          email?: string | null;
          features?: NonNullable<Json>;
          id?: string;
          logo_path?: string | null;
          name: string;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["school_plan"];
          region?: string | null;
          settings?: NonNullable<Json>;
          short_name?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["school_status"];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          email?: string | null;
          features?: NonNullable<Json>;
          id?: string;
          logo_path?: string | null;
          name?: string;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["school_plan"];
          region?: string | null;
          settings?: NonNullable<Json>;
          short_name?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["school_status"];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_locale: "fr" | "wo";
      app_role: "owner" | "director" | "censor" | "supervisor" | "accountant" | "secretary" | "teacher" | "parent" | "driver";
      membership_status: "invited" | "active" | "suspended";
      school_plan: "pilot" | "starter" | "school" | "establishment" | "group";
      school_status: "trial" | "active" | "suspended" | "archived";
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
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_locale: ["fr", "wo"],
      app_role: ["owner", "director", "censor", "supervisor", "accountant", "secretary", "teacher", "parent", "driver"],
      membership_status: ["invited", "active", "suspended"],
      school_plan: ["pilot", "starter", "school", "establishment", "group"],
      school_status: ["trial", "active", "suspended", "archived"],
    },
  },
} as const;

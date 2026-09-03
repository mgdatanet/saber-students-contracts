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
      class_semesters: {
        Row: {
          class_id: string
          end_date: string
          id: string
          n: number
          start_date: string
        }
        Insert: {
          class_id: string
          end_date: string
          id?: string
          n: number
          start_date: string
        }
        Update: {
          class_id?: string
          end_date?: string
          id?: string
          n?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_semesters_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          application_fee_per_sem: number
          bls_fee: number
          books_supplies_fee: number
          clinical_hours_a: number | null
          clinical_hours_b: number | null
          code: string
          cohort_label: string | null
          created_at: string
          credits_total: number
          id: string
          locked: boolean
          materials_supplies_fee: number
          method_of_delivery: Database["public"]["Enums"]["delivery_method"]
          min_grade_pct: number
          months_total: number
          other_costs_fee: number
          program_id: string
          registration_fee_per_sem: number
          schedule: Database["public"]["Enums"]["class_schedule"]
          signer_id: string | null
          skills_lab_fee: number
          testing_fee: number
          theory_lab_hours_a: number | null
          theory_lab_hours_b: number | null
          tuition_per_credit: number
          updated_at: string
          weeks_total: number
        }
        Insert: {
          application_fee_per_sem?: number
          bls_fee?: number
          books_supplies_fee?: number
          clinical_hours_a?: number | null
          clinical_hours_b?: number | null
          code: string
          cohort_label?: string | null
          created_at?: string
          credits_total: number
          id?: string
          locked?: boolean
          materials_supplies_fee?: number
          method_of_delivery?: Database["public"]["Enums"]["delivery_method"]
          min_grade_pct: number
          months_total: number
          other_costs_fee?: number
          program_id: string
          registration_fee_per_sem?: number
          schedule: Database["public"]["Enums"]["class_schedule"]
          signer_id?: string | null
          skills_lab_fee?: number
          testing_fee?: number
          theory_lab_hours_a?: number | null
          theory_lab_hours_b?: number | null
          tuition_per_credit: number
          updated_at?: string
          weeks_total: number
        }
        Update: {
          application_fee_per_sem?: number
          bls_fee?: number
          books_supplies_fee?: number
          clinical_hours_a?: number | null
          clinical_hours_b?: number | null
          code?: string
          cohort_label?: string | null
          created_at?: string
          credits_total?: number
          id?: string
          locked?: boolean
          materials_supplies_fee?: number
          method_of_delivery?: Database["public"]["Enums"]["delivery_method"]
          min_grade_pct?: number
          months_total?: number
          other_costs_fee?: number
          program_id?: string
          registration_fee_per_sem?: number
          schedule?: Database["public"]["Enums"]["class_schedule"]
          signer_id?: string | null
          skills_lab_fee?: number
          testing_fee?: number
          theory_lab_hours_a?: number | null
          theory_lab_hours_b?: number | null
          tuition_per_credit?: number
          updated_at?: string
          weeks_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "signers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_text_blocks: {
        Row: {
          content: string
          key: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_text_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_theme: {
        Row: {
          base_font_size_pt: number
          border_color: string
          font_family: string
          id: string
          logo_max_height_px: number
          primary_color: string
          section_title_text_color: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_font_size_pt?: number
          border_color?: string
          font_family?: string
          id?: string
          logo_max_height_px?: number
          primary_color?: string
          section_title_text_color?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_font_size_pt?: number
          border_color?: string
          font_family?: string
          id?: string
          logo_max_height_px?: number
          primary_color?: string
          section_title_text_color?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_theme_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          class_id: string
          contract_number: string
          id: string
          issued_at: string
          issued_by: string | null
          pdf_path: string | null
          status: Database["public"]["Enums"]["contract_status"]
          student_id: string
          totals_snapshot: Json
          tuition_per_credit_applied: number
        }
        Insert: {
          class_id: string
          contract_number: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          student_id: string
          totals_snapshot: Json
          tuition_per_credit_applied: number
        }
        Update: {
          class_id?: string
          contract_number?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          student_id?: string
          totals_snapshot?: Json
          tuition_per_credit_applied?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_contracts: {
        Row: {
          historical_student_id: string
          id: string
          issued_at: string | null
          pdf_path: string | null
          totals_snapshot: Json | null
        }
        Insert: {
          historical_student_id: string
          id?: string
          issued_at?: string | null
          pdf_path?: string | null
          totals_snapshot?: Json | null
        }
        Update: {
          historical_student_id?: string
          id?: string
          issued_at?: string | null
          pdf_path?: string | null
          totals_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_contracts_historical_student_id_fkey"
            columns: ["historical_student_id"]
            isOneToOne: false
            referencedRelation: "historical_students"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_semester_aid: {
        Row: {
          credits: number | null
          efc: number | null
          fees: number | null
          historical_student_id: string
          id: string
          pell: number | null
          plus: number | null
          semester_n: number
          sub: number | null
          unsub: number | null
        }
        Insert: {
          credits?: number | null
          efc?: number | null
          fees?: number | null
          historical_student_id: string
          id?: string
          pell?: number | null
          plus?: number | null
          semester_n: number
          sub?: number | null
          unsub?: number | null
        }
        Update: {
          credits?: number | null
          efc?: number | null
          fees?: number | null
          historical_student_id?: string
          id?: string
          pell?: number | null
          plus?: number | null
          semester_n?: number
          sub?: number | null
          unsub?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_semester_aid_historical_student_id_fkey"
            columns: ["historical_student_id"]
            isOneToOne: false
            referencedRelation: "historical_students"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_students: {
        Row: {
          address: string | null
          contract_date: string | null
          date_of_birth: string | null
          first_name: string | null
          id: string
          imported_at: string
          last_name: string | null
          legacy_class_code: string | null
          middle_initial: string | null
          mobile: string | null
          phone: string | null
          program_code: string | null
          ssn: string | null
        }
        Insert: {
          address?: string | null
          contract_date?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          imported_at?: string
          last_name?: string | null
          legacy_class_code?: string | null
          middle_initial?: string | null
          mobile?: string | null
          phone?: string | null
          program_code?: string | null
          ssn?: string | null
        }
        Update: {
          address?: string | null
          contract_date?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          imported_at?: string
          last_name?: string | null
          legacy_class_code?: string | null
          middle_initial?: string | null
          mobile?: string | null
          phone?: string | null
          program_code?: string | null
          ssn?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          approved?: boolean
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      programs: {
        Row: {
          active: boolean
          application_fee_per_sem: number
          bls_fee: number
          books_supplies_fee: number
          clinical_hours_a: number | null
          clinical_hours_b: number | null
          code: string
          created_at: string
          credential_name: string
          credits_total: number
          default_tuition_per_credit: number
          degree_type: Database["public"]["Enums"]["degree_type"]
          id: string
          materials_supplies_fee: number
          min_grade_pct: number
          months_total: number
          name: string
          other_costs_fee: number
          registration_fee_per_sem: number
          skills_lab_fee: number
          testing_fee: number
          theory_lab_hours_a: number | null
          theory_lab_hours_b: number | null
          updated_at: string
          weeks_total: number
        }
        Insert: {
          active?: boolean
          application_fee_per_sem?: number
          bls_fee?: number
          books_supplies_fee?: number
          clinical_hours_a?: number | null
          clinical_hours_b?: number | null
          code: string
          created_at?: string
          credential_name: string
          credits_total?: number
          default_tuition_per_credit?: number
          degree_type: Database["public"]["Enums"]["degree_type"]
          id?: string
          materials_supplies_fee?: number
          min_grade_pct?: number
          months_total?: number
          name: string
          other_costs_fee?: number
          registration_fee_per_sem?: number
          skills_lab_fee?: number
          testing_fee?: number
          theory_lab_hours_a?: number | null
          theory_lab_hours_b?: number | null
          updated_at?: string
          weeks_total?: number
        }
        Update: {
          active?: boolean
          application_fee_per_sem?: number
          bls_fee?: number
          books_supplies_fee?: number
          clinical_hours_a?: number | null
          clinical_hours_b?: number | null
          code?: string
          created_at?: string
          credential_name?: string
          credits_total?: number
          default_tuition_per_credit?: number
          degree_type?: Database["public"]["Enums"]["degree_type"]
          id?: string
          materials_supplies_fee?: number
          min_grade_pct?: number
          months_total?: number
          name?: string
          other_costs_fee?: number
          registration_fee_per_sem?: number
          skills_lab_fee?: number
          testing_fee?: number
          theory_lab_hours_a?: number | null
          theory_lab_hours_b?: number | null
          updated_at?: string
          weeks_total?: number
        }
        Relationships: []
      }
      signers: {
        Row: {
          active: boolean
          full_name: string
          id: string
          title: string | null
        }
        Insert: {
          active?: boolean
          full_name: string
          id?: string
          title?: string | null
        }
        Update: {
          active?: boolean
          full_name?: string
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      student_semester_aid: {
        Row: {
          credits: number
          efc: number
          fees: number
          id: string
          pell: number
          plus: number
          semester_n: number
          student_id: string
          sub: number
          unsub: number
        }
        Insert: {
          credits?: number
          efc?: number
          fees?: number
          id?: string
          pell?: number
          plus?: number
          semester_n: number
          student_id: string
          sub?: number
          unsub?: number
        }
        Update: {
          credits?: number
          efc?: number
          fees?: number
          id?: string
          pell?: number
          plus?: number
          semester_n?: number
          student_id?: string
          sub?: number
          unsub?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_semester_aid_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          class_id: string
          contract_date: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          id: string
          last_name: string
          middle_initial: string | null
          mobile: string | null
          phone: string | null
          ssn: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          class_id: string
          contract_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          id?: string
          last_name: string
          middle_initial?: string | null
          mobile?: string | null
          phone?: string | null
          ssn?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          class_id?: string
          contract_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          id?: string
          last_name?: string
          middle_initial?: string | null
          mobile?: string | null
          phone?: string | null
          ssn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          id: string
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      class_schedule: "Day" | "Evening"
      contract_status: "issued"
      degree_type: "associate" | "diploma"
      delivery_method: "Residential" | "Blended Hybrid" | "Full Distance"
      user_role: "admin" | "staff"
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
      class_schedule: ["Day", "Evening"],
      contract_status: ["issued"],
      degree_type: ["associate", "diploma"],
      delivery_method: ["Residential", "Blended Hybrid", "Full Distance"],
      user_role: ["admin", "staff"],
    },
  },
} as const

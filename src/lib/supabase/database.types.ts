export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          is_current: boolean;
          label: string;
          period_kind: Database["public"]["Enums"]["period_kind"];
          school_id: string;
          starts_on: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          is_current?: boolean;
          label: string;
          period_kind?: Database["public"]["Enums"]["period_kind"];
          school_id: string;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          is_current?: boolean;
          label?: string;
          period_kind?: Database["public"]["Enums"]["period_kind"];
          school_id?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_records: {
        Row: {
          class_id: string;
          created_at: string;
          date: string;
          school_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          created_at?: string;
          date: string;
          school_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          date?: string;
          school_id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_school_id_class_id_date_fkey";
            columns: ["session_id", "school_id", "class_id", "date"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id", "school_id", "class_id", "date"];
          },
          {
            foreignKeyName: "attendance_records_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      attendance_sessions: {
        Row: {
          class_id: string;
          created_at: string;
          date: string;
          id: string;
          school_id: string;
          slot: Database["public"]["Enums"]["attendance_slot"];
          taken_at: string;
          taken_by: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          created_at?: string;
          date: string;
          id?: string;
          school_id: string;
          slot: Database["public"]["Enums"]["attendance_slot"];
          taken_at: string;
          taken_by?: string | null;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          date?: string;
          id?: string;
          school_id?: string;
          slot?: Database["public"]["Enums"]["attendance_slot"];
          taken_at?: string;
          taken_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
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
      classes: {
        Row: {
          academic_year_id: string;
          capacity: number | null;
          created_at: string;
          homeroom_staff_id: string | null;
          id: string;
          level_id: string;
          name: string;
          room: string | null;
          school_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          capacity?: number | null;
          created_at?: string;
          homeroom_staff_id?: string | null;
          id?: string;
          level_id: string;
          name: string;
          room?: string | null;
          school_id: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          capacity?: number | null;
          created_at?: string;
          homeroom_staff_id?: string | null;
          id?: string;
          level_id?: string;
          name?: string;
          room?: string | null;
          school_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "classes_homeroom_staff_id_school_id_fkey";
            columns: ["homeroom_staff_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "school_staff";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "classes_level_id_school_id_fkey";
            columns: ["level_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      cycles: {
        Row: {
          code: Database["public"]["Enums"]["cycle_code"];
          created_at: string;
          grading_scale: Database["public"]["Enums"]["grading_scale"];
          id: string;
          label: string;
          position: number;
          school_id: string;
        };
        ComputedFields: never;
        Insert: {
          code: Database["public"]["Enums"]["cycle_code"];
          created_at?: string;
          grading_scale: Database["public"]["Enums"]["grading_scale"];
          id?: string;
          label: string;
          position?: number;
          school_id: string;
        };
        Update: {
          code?: Database["public"]["Enums"]["cycle_code"];
          created_at?: string;
          grading_scale?: Database["public"]["Enums"]["grading_scale"];
          id?: string;
          label?: string;
          position?: number;
          school_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cycles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_requests: {
        Row: {
          city: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          handled_by: string | null;
          id: string;
          message: string | null;
          phone: string;
          role: string;
          school_name: string;
          status: Database["public"]["Enums"]["demo_request_status"];
          students_range: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          handled_by?: string | null;
          id?: string;
          message?: string | null;
          phone: string;
          role: string;
          school_name: string;
          status?: Database["public"]["Enums"]["demo_request_status"];
          students_range?: string | null;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          handled_by?: string | null;
          id?: string;
          message?: string | null;
          phone?: string;
          role?: string;
          school_name?: string;
          status?: Database["public"]["Enums"]["demo_request_status"];
          students_range?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          academic_year_id: string;
          class_id: string;
          created_at: string;
          enrolled_on: string;
          id: string;
          left_on: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          class_id: string;
          created_at?: string;
          enrolled_on?: string;
          id?: string;
          left_on?: string | null;
          school_id: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          class_id?: string;
          created_at?: string;
          enrolled_on?: string;
          id?: string;
          left_on?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_academic_year_id_fkey";
            columns: ["class_id", "academic_year_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "academic_year_id"];
          },
          {
            foreignKeyName: "enrollments_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "enrollments_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      guardians: {
        Row: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          profession: string | null;
          school_id: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          phone?: string | null;
          profession?: string | null;
          school_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          profession?: string | null;
          school_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guardians_school_id_fkey";
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
      level_subjects: {
        Row: {
          coefficient: number;
          created_at: string;
          id: string;
          level_id: string;
          school_id: string;
          subject_id: string;
          weekly_hours: number | null;
        };
        ComputedFields: never;
        Insert: {
          coefficient?: number;
          created_at?: string;
          id?: string;
          level_id: string;
          school_id: string;
          subject_id: string;
          weekly_hours?: number | null;
        };
        Update: {
          coefficient?: number;
          created_at?: string;
          id?: string;
          level_id?: string;
          school_id?: string;
          subject_id?: string;
          weekly_hours?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "level_subjects_level_id_school_id_fkey";
            columns: ["level_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "level_subjects_subject_id_school_id_fkey";
            columns: ["subject_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      levels: {
        Row: {
          code: string;
          created_at: string;
          cycle_id: string;
          exam: string | null;
          id: string;
          label: string;
          position: number;
          school_id: string;
          series: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          cycle_id: string;
          exam?: string | null;
          id?: string;
          label: string;
          position?: number;
          school_id: string;
          series?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          cycle_id?: string;
          exam?: string | null;
          id?: string;
          label?: string;
          position?: number;
          school_id?: string;
          series?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "levels_cycle_id_school_id_fkey";
            columns: ["cycle_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "cycles";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      periods: {
        Row: {
          academic_year_id: string;
          created_at: string;
          ends_on: string;
          id: string;
          label: string;
          locked_at: string | null;
          locked_by: string | null;
          position: number;
          school_id: string;
          starts_on: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          created_at?: string;
          ends_on: string;
          id?: string;
          label: string;
          locked_at?: string | null;
          locked_by?: string | null;
          position: number;
          school_id: string;
          starts_on: string;
        };
        Update: {
          academic_year_id?: string;
          created_at?: string;
          ends_on?: string;
          id?: string;
          label?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          position?: number;
          school_id?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "periods_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
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
      school_staff: {
        Row: {
          contract: Database["public"]["Enums"]["staff_contract"] | null;
          created_at: string;
          created_by: string | null;
          cycle: Database["public"]["Enums"]["cycle_code"] | null;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string;
          sex: Database["public"]["Enums"]["sex"] | null;
          status: Database["public"]["Enums"]["person_status"];
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          contract?: Database["public"]["Enums"]["staff_contract"] | null;
          created_at?: string;
          created_by?: string | null;
          cycle?: Database["public"]["Enums"]["cycle_code"] | null;
          email?: string | null;
          full_name: string;
          id?: string;
          phone?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          school_id: string;
          sex?: Database["public"]["Enums"]["sex"] | null;
          status?: Database["public"]["Enums"]["person_status"];
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          contract?: Database["public"]["Enums"]["staff_contract"] | null;
          created_at?: string;
          created_by?: string | null;
          cycle?: Database["public"]["Enums"]["cycle_code"] | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          school_id?: string;
          sex?: Database["public"]["Enums"]["sex"] | null;
          status?: Database["public"]["Enums"]["person_status"];
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "school_staff_school_id_fkey";
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
      student_documents: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          id: string;
          kind: Database["public"]["Enums"]["student_document_kind"];
          mime_type: string | null;
          school_id: string;
          size_bytes: number | null;
          student_id: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          id?: string;
          kind: Database["public"]["Enums"]["student_document_kind"];
          mime_type?: string | null;
          school_id: string;
          size_bytes?: number | null;
          student_id: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["student_document_kind"];
          mime_type?: string | null;
          school_id?: string;
          size_bytes?: number | null;
          student_id?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      student_guardians: {
        Row: {
          can_pay: boolean;
          created_at: string;
          guardian_id: string;
          is_primary: boolean;
          receives_notifications: boolean;
          relationship: Database["public"]["Enums"]["guardian_relationship"];
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          can_pay?: boolean;
          created_at?: string;
          guardian_id: string;
          is_primary?: boolean;
          receives_notifications?: boolean;
          relationship?: Database["public"]["Enums"]["guardian_relationship"];
          school_id: string;
          student_id: string;
        };
        Update: {
          can_pay?: boolean;
          created_at?: string;
          guardian_id?: string;
          is_primary?: boolean;
          receives_notifications?: boolean;
          relationship?: Database["public"]["Enums"]["guardian_relationship"];
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_school_id_fkey";
            columns: ["guardian_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "student_guardians_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      students: {
        Row: {
          address: string | null;
          birth_date: string | null;
          birth_place: string | null;
          created_at: string;
          created_by: string | null;
          first_name: string;
          id: string;
          last_name: string;
          matricule: string;
          medical_notes: string | null;
          nationality: string | null;
          photo_path: string | null;
          school_id: string;
          sex: Database["public"]["Enums"]["sex"];
          status: Database["public"]["Enums"]["person_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          birth_date?: string | null;
          birth_place?: string | null;
          created_at?: string;
          created_by?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          matricule: string;
          medical_notes?: string | null;
          nationality?: string | null;
          photo_path?: string | null;
          school_id: string;
          sex: Database["public"]["Enums"]["sex"];
          status?: Database["public"]["Enums"]["person_status"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          birth_date?: string | null;
          birth_place?: string | null;
          created_at?: string;
          created_by?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          matricule?: string;
          medical_notes?: string | null;
          nationality?: string | null;
          photo_path?: string | null;
          school_id?: string;
          sex?: Database["public"]["Enums"]["sex"];
          status?: Database["public"]["Enums"]["person_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          name_ar: string | null;
          position: number;
          school_id: string;
          short_name: string | null;
          subject_group: string | null;
          track: Database["public"]["Enums"]["subject_track"];
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          name_ar?: string | null;
          position?: number;
          school_id: string;
          short_name?: string | null;
          subject_group?: string | null;
          track?: Database["public"]["Enums"]["subject_track"];
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          name_ar?: string | null;
          position?: number;
          school_id?: string;
          short_name?: string | null;
          subject_group?: string | null;
          track?: Database["public"]["Enums"]["subject_track"];
        };
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      teaching_assignments: {
        Row: {
          class_id: string;
          created_at: string;
          id: string;
          school_id: string;
          staff_id: string;
          subject_id: string;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          created_at?: string;
          id?: string;
          school_id: string;
          staff_id: string;
          subject_id: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          id?: string;
          school_id?: string;
          staff_id?: string;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "teaching_assignments_staff_id_school_id_fkey";
            columns: ["staff_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "school_staff";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "teaching_assignments_subject_id_school_id_fkey";
            columns: ["subject_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_student_guardian: { Args: { p_guardian: Json; p_school_id: string; p_student_id: string }; Returns: string };
      import_students: { Args: { p_rows: Json; p_school_id: string }; Returns: Json };
      register_student: {
        Args: { p_class_id: string; p_guardians: Json; p_school_id: string; p_student: Json };
        Returns: string;
      };
      remove_student_guardian: { Args: { p_guardian_id: string; p_school_id: string; p_student_id: string }; Returns: undefined };
      replace_level_subjects: { Args: { p_rows: Json; p_school_id: string }; Returns: number };
      set_primary_guardian: { Args: { p_guardian_id: string; p_school_id: string; p_student_id: string }; Returns: undefined };
      submit_roll_call: {
        Args: {
          p_class_id: string;
          p_date: string;
          p_marks: Json;
          p_operation_id: string;
          p_slot: Database["public"]["Enums"]["attendance_slot"];
          p_taken_at: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_locale: "fr" | "wo";
      app_role: "owner" | "director" | "censor" | "supervisor" | "accountant" | "secretary" | "teacher" | "parent" | "driver";
      attendance_slot: "morning" | "afternoon";
      attendance_status: "present" | "absent" | "late";
      cycle_code: "prescolaire" | "elementaire" | "moyen" | "secondaire";
      demo_request_status: "new" | "contacted" | "scheduled" | "closed";
      enrollment_status: "active" | "transferred" | "left" | "completed";
      grading_scale: "appreciation" | "ten" | "twenty";
      guardian_relationship: "father" | "mother" | "guardian" | "grandparent" | "uncle" | "aunt" | "sibling" | "other";
      membership_status: "invited" | "active" | "suspended";
      period_kind: "semester" | "trimester";
      person_status: "active" | "inactive";
      school_plan: "pilot" | "starter" | "school" | "establishment" | "group";
      school_status: "trial" | "active" | "suspended" | "archived";
      sex: "F" | "M";
      staff_contract: "permanent" | "vacataire";
      student_document_kind: "birth_certificate" | "photo" | "previous_report" | "medical" | "other";
      subject_track: "french" | "arabic";
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
      attendance_slot: ["morning", "afternoon"],
      attendance_status: ["present", "absent", "late"],
      cycle_code: ["prescolaire", "elementaire", "moyen", "secondaire"],
      demo_request_status: ["new", "contacted", "scheduled", "closed"],
      enrollment_status: ["active", "transferred", "left", "completed"],
      grading_scale: ["appreciation", "ten", "twenty"],
      guardian_relationship: ["father", "mother", "guardian", "grandparent", "uncle", "aunt", "sibling", "other"],
      membership_status: ["invited", "active", "suspended"],
      period_kind: ["semester", "trimester"],
      person_status: ["active", "inactive"],
      school_plan: ["pilot", "starter", "school", "establishment", "group"],
      school_status: ["trial", "active", "suspended", "archived"],
      sex: ["F", "M"],
      staff_contract: ["permanent", "vacataire"],
      student_document_kind: ["birth_certificate", "photo", "previous_report", "medical", "other"],
      subject_track: ["french", "arabic"],
    },
  },
} as const;

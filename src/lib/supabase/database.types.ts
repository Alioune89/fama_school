export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      absence_justifications: {
        Row: {
          comment: string | null;
          created_at: string;
          file_path: string | null;
          from_date: string;
          id: string;
          mime_type: string | null;
          reason: Database["public"]["Enums"]["justification_reason"];
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewed_by_name: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["justification_status"];
          student_id: string;
          submitted_by: string | null;
          submitted_by_name: string;
          to_date: string;
        };
        ComputedFields: never;
        Insert: {
          comment?: string | null;
          created_at?: string;
          file_path?: string | null;
          from_date: string;
          id?: string;
          mime_type?: string | null;
          reason: Database["public"]["Enums"]["justification_reason"];
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_by_name?: string | null;
          school_id: string;
          status?: Database["public"]["Enums"]["justification_status"];
          student_id: string;
          submitted_by?: string | null;
          submitted_by_name: string;
          to_date: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          file_path?: string | null;
          from_date?: string;
          id?: string;
          mime_type?: string | null;
          reason?: Database["public"]["Enums"]["justification_reason"];
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_by_name?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["justification_status"];
          student_id?: string;
          submitted_by?: string | null;
          submitted_by_name?: string;
          to_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "absence_justifications_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
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
      announcement_recipients: {
        Row: {
          announcement_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          announcement_id: string;
          user_id: string;
        };
        Update: {
          announcement_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          audience: string;
          body: string;
          class_ids: string[];
          guardian_ids: string[];
          id: string;
          published_at: string;
          published_by: string | null;
          published_by_name: string;
          recipient_count: number;
          school_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          audience: string;
          body: string;
          class_ids?: string[];
          guardian_ids?: string[];
          id?: string;
          published_at?: string;
          published_by?: string | null;
          published_by_name: string;
          recipient_count?: number;
          school_id: string;
          title: string;
        };
        Update: {
          audience?: string;
          body?: string;
          class_ids?: string[];
          guardian_ids?: string[];
          id?: string;
          published_at?: string;
          published_by?: string | null;
          published_by_name?: string;
          recipient_count?: number;
          school_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_changes: {
        Row: {
          new_status: Database["public"]["Enums"]["attendance_status"];
          previous_status: Database["public"]["Enums"]["attendance_status"] | null;
          school_id: string;
          student_id: string;
          submission_id: string;
        };
        ComputedFields: never;
        Insert: {
          new_status: Database["public"]["Enums"]["attendance_status"];
          previous_status?: Database["public"]["Enums"]["attendance_status"] | null;
          school_id: string;
          student_id: string;
          submission_id: string;
        };
        Update: {
          new_status?: Database["public"]["Enums"]["attendance_status"];
          previous_status?: Database["public"]["Enums"]["attendance_status"] | null;
          school_id?: string;
          student_id?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_changes_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "attendance_changes_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "attendance_submissions";
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
      attendance_submissions: {
        Row: {
          absent_count: number;
          class_id: string;
          date: string;
          id: string;
          is_first: boolean;
          late_count: number;
          outcome: string;
          received_at: string;
          school_id: string;
          session_id: string | null;
          slot: Database["public"]["Enums"]["attendance_slot"];
          submitted_by: string | null;
          taken_at: string;
        };
        ComputedFields: never;
        Insert: {
          absent_count?: number;
          class_id: string;
          date: string;
          id: string;
          is_first?: boolean;
          late_count?: number;
          outcome: string;
          received_at?: string;
          school_id: string;
          session_id?: string | null;
          slot: Database["public"]["Enums"]["attendance_slot"];
          submitted_by?: string | null;
          taken_at: string;
        };
        Update: {
          absent_count?: number;
          class_id?: string;
          date?: string;
          id?: string;
          is_first?: boolean;
          late_count?: number;
          outcome?: string;
          received_at?: string;
          school_id?: string;
          session_id?: string | null;
          slot?: Database["public"]["Enums"]["attendance_slot"];
          submitted_by?: string | null;
          taken_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_submissions_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "attendance_submissions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
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
      billing_schedules: {
        Row: {
          academic_year_id: string;
          due_day: number;
          first_month: string;
          installments: number;
          school_id: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          due_day?: number;
          first_month: string;
          installments?: number;
          school_id: string;
        };
        Update: {
          academic_year_id?: string;
          due_day?: number;
          first_month?: string;
          installments?: number;
          school_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_schedules_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      chapter_progress: {
        Row: {
          chapter_id: string;
          class_id: string;
          school_id: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
          validated_at: string | null;
          validated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          class_id: string;
          school_id: string;
          status: string;
          updated_at?: string;
          updated_by?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Update: {
          chapter_id?: string;
          class_id?: string;
          school_id?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_progress_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "programme_chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_progress_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
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
      conversation_reads: {
        Row: {
          conversation_id: string;
          read_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          last_message_at: string;
          parent_id: string;
          parent_name: string;
          school_id: string;
          student_id: string;
          subject: string;
          teacher_id: string | null;
          teacher_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_message_at?: string;
          parent_id: string;
          parent_name: string;
          school_id: string;
          student_id: string;
          subject: string;
          teacher_id?: string | null;
          teacher_name?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_message_at?: string;
          parent_id?: string;
          parent_name?: string;
          school_id?: string;
          student_id?: string;
          subject?: string;
          teacher_id?: string | null;
          teacher_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      council_decisions: {
        Row: {
          class_id: string;
          general_appreciation: string | null;
          period_id: string;
          sanction: Database["public"]["Enums"]["council_sanction"] | null;
          school_id: string;
          student_id: string;
          updated_at: string;
          updated_by: string | null;
          withhold_mention: boolean;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          general_appreciation?: string | null;
          period_id: string;
          sanction?: Database["public"]["Enums"]["council_sanction"] | null;
          school_id: string;
          student_id: string;
          updated_at?: string;
          updated_by?: string | null;
          withhold_mention?: boolean;
        };
        Update: {
          class_id?: string;
          general_appreciation?: string | null;
          period_id?: string;
          sanction?: Database["public"]["Enums"]["council_sanction"] | null;
          school_id?: string;
          student_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          withhold_mention?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "council_decisions_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "council_decisions_period_id_school_id_fkey";
            columns: ["period_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "council_decisions_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
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
      evaluations: {
        Row: {
          class_id: string;
          created_at: string;
          created_by: string | null;
          grades_entered_at: string | null;
          grades_entered_by: string | null;
          held_on: string;
          id: string;
          kind: Database["public"]["Enums"]["evaluation_kind"];
          max_score: number | null;
          period_id: string;
          published_at: string | null;
          school_id: string;
          subject_id: string;
          title: string;
          updated_at: string;
          weight: number;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          created_at?: string;
          created_by?: string | null;
          grades_entered_at?: string | null;
          grades_entered_by?: string | null;
          held_on: string;
          id?: string;
          kind: Database["public"]["Enums"]["evaluation_kind"];
          max_score?: number | null;
          period_id: string;
          published_at?: string | null;
          school_id: string;
          subject_id: string;
          title: string;
          updated_at?: string;
          weight?: number;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          created_by?: string | null;
          grades_entered_at?: string | null;
          grades_entered_by?: string | null;
          held_on?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["evaluation_kind"];
          max_score?: number | null;
          period_id?: string;
          published_at?: string | null;
          school_id?: string;
          subject_id?: string;
          title?: string;
          updated_at?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "evaluations_period_id_school_id_fkey";
            columns: ["period_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "evaluations_subject_id_school_id_fkey";
            columns: ["subject_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: Database["public"]["Enums"]["expense_category"];
          created_at: string;
          id: string;
          label: string;
          method: Database["public"]["Enums"]["payment_method"];
          recorded_by: string | null;
          reference: string | null;
          school_id: string;
          spent_on: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          category: Database["public"]["Enums"]["expense_category"];
          created_at?: string;
          id?: string;
          label: string;
          method?: Database["public"]["Enums"]["payment_method"];
          recorded_by?: string | null;
          reference?: string | null;
          school_id: string;
          spent_on?: string;
        };
        Update: {
          amount?: number;
          category?: Database["public"]["Enums"]["expense_category"];
          created_at?: string;
          id?: string;
          label?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          recorded_by?: string | null;
          reference?: string | null;
          school_id?: string;
          spent_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_rates: {
        Row: {
          academic_year_id: string;
          amount: number;
          fee_type_id: string;
          level_id: string;
          school_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          amount: number;
          fee_type_id: string;
          level_id: string;
          school_id: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          amount?: number;
          fee_type_id?: string;
          level_id?: string;
          school_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_rates_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "fee_rates_fee_type_id_school_id_fkey";
            columns: ["fee_type_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "fee_types";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "fee_rates_level_id_school_id_fkey";
            columns: ["level_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      fee_types: {
        Row: {
          active: boolean;
          created_at: string;
          frequency: Database["public"]["Enums"]["fee_frequency"];
          id: string;
          kind: Database["public"]["Enums"]["fee_kind"];
          name: string;
          optional: boolean;
          position: number;
          school_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          frequency: Database["public"]["Enums"]["fee_frequency"];
          id?: string;
          kind: Database["public"]["Enums"]["fee_kind"];
          name: string;
          optional?: boolean;
          position?: number;
          school_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          frequency?: Database["public"]["Enums"]["fee_frequency"];
          id?: string;
          kind?: Database["public"]["Enums"]["fee_kind"];
          name?: string;
          optional?: boolean;
          position?: number;
          school_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_types_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      grades: {
        Row: {
          acquisition: Database["public"]["Enums"]["acquisition_level"] | null;
          evaluation_id: string;
          school_id: string;
          score: number | null;
          status: Database["public"]["Enums"]["grade_status"];
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          acquisition?: Database["public"]["Enums"]["acquisition_level"] | null;
          evaluation_id: string;
          school_id: string;
          score?: number | null;
          status: Database["public"]["Enums"]["grade_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          acquisition?: Database["public"]["Enums"]["acquisition_level"] | null;
          evaluation_id?: string;
          school_id?: string;
          score?: number | null;
          status?: Database["public"]["Enums"]["grade_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grades_evaluation_id_school_id_fkey";
            columns: ["evaluation_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "evaluations";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "grades_student_id_school_id_fkey";
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
      invoice_lines: {
        Row: {
          amount: number;
          base_amount: number;
          discount_percent: number;
          fee_type_id: string | null;
          id: string;
          invoice_id: string;
          label: string;
          position: number;
          school_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          base_amount: number;
          discount_percent?: number;
          fee_type_id?: string | null;
          id?: string;
          invoice_id: string;
          label: string;
          position?: number;
          school_id: string;
        };
        Update: {
          amount?: number;
          base_amount?: number;
          discount_percent?: number;
          fee_type_id?: string | null;
          id?: string;
          invoice_id?: string;
          label?: string;
          position?: number;
          school_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_fee_type_id_school_id_fkey";
            columns: ["fee_type_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "fee_types";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          academic_year_id: string;
          amount_paid: number;
          billing_month: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          due_on: string;
          id: string;
          issued_by: string | null;
          issued_on: string;
          label: string;
          number: string;
          school_id: string;
          student_id: string;
          total: number;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          amount_paid?: number;
          billing_month?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          due_on: string;
          id?: string;
          issued_by?: string | null;
          issued_on?: string;
          label: string;
          number: string;
          school_id: string;
          student_id: string;
          total: number;
        };
        Update: {
          academic_year_id?: string;
          amount_paid?: number;
          billing_month?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          due_on?: string;
          id?: string;
          issued_by?: string | null;
          issued_on?: string;
          label?: string;
          number?: string;
          school_id?: string;
          student_id?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "invoices_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
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
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string | null;
          sender_name: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          sender_name: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          sender_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          id: string;
          last_error: string | null;
          next_attempt_at: string;
          notification_id: string;
          provider_id: string | null;
          sent_at: string | null;
          status: string;
          to_address: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          channel: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          notification_id: string;
          provider_id?: string | null;
          sent_at?: string | null;
          status?: string;
          to_address: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          notification_id?: string;
          provider_id?: string | null;
          sent_at?: string | null;
          status?: string;
          to_address?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          push: boolean;
          sms: boolean;
          updated_at: string;
          user_id: string;
          whatsapp: boolean;
        };
        ComputedFields: never;
        Insert: {
          push?: boolean;
          sms?: boolean;
          updated_at?: string;
          user_id?: string;
          whatsapp?: boolean;
        };
        Update: {
          push?: boolean;
          sms?: boolean;
          updated_at?: string;
          user_id?: string;
          whatsapp?: boolean;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          dedupe_key: string;
          id: string;
          kind: string;
          link: string | null;
          params: NonNullable<Json>;
          read_at: string | null;
          school_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dedupe_key: string;
          id?: string;
          kind: string;
          link?: string | null;
          params?: NonNullable<Json>;
          read_at?: string | null;
          school_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dedupe_key?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          params?: NonNullable<Json>;
          read_at?: string | null;
          school_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      online_payments: {
        Row: {
          amount: number;
          checkout_url: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          failure_reason: string | null;
          id: string;
          invoice_ids: string[];
          payment_id: string | null;
          provider: string;
          provider_token: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["online_payment_status"];
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          checkout_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          failure_reason?: string | null;
          id?: string;
          invoice_ids: string[];
          payment_id?: string | null;
          provider: string;
          provider_token?: string | null;
          school_id: string;
          status?: Database["public"]["Enums"]["online_payment_status"];
          student_id: string;
        };
        Update: {
          amount?: number;
          checkout_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          failure_reason?: string | null;
          id?: string;
          invoice_ids?: string[];
          payment_id?: string | null;
          provider?: string;
          provider_token?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["online_payment_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "online_payments_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "online_payments_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      payment_allocations: {
        Row: {
          amount: number;
          invoice_id: string;
          payment_id: string;
          school_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          invoice_id: string;
          payment_id: string;
          school_id: string;
        };
        Update: {
          amount?: number;
          invoice_id?: string;
          payment_id?: string;
          school_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_reminders: {
        Row: {
          channel: string;
          id: string;
          overdue_amount: number;
          school_id: string;
          sent_at: string;
          sent_by: string | null;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          channel: string;
          id?: string;
          overdue_amount: number;
          school_id: string;
          sent_at?: string;
          sent_by?: string | null;
          student_id: string;
        };
        Update: {
          channel?: string;
          id?: string;
          overdue_amount?: number;
          school_id?: string;
          sent_at?: string;
          sent_by?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_reminders_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          cancel_reason: string | null;
          cancel_requested_at: string | null;
          cancel_requested_by: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          number: string;
          received_by: string | null;
          received_on: string;
          reference: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          cancel_reason?: string | null;
          cancel_requested_at?: string | null;
          cancel_requested_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          number: string;
          received_by?: string | null;
          received_on?: string;
          reference?: string | null;
          school_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
          student_id: string;
        };
        Update: {
          amount?: number;
          cancel_reason?: string | null;
          cancel_requested_at?: string | null;
          cancel_requested_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          number?: string;
          received_by?: string | null;
          received_on?: string;
          reference?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
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
      programme_chapters: {
        Row: {
          academic_year_id: string;
          created_at: string;
          id: string;
          level_id: string;
          position: number;
          school_id: string;
          sessions: number;
          subject_id: string;
          target_month: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          created_at?: string;
          id?: string;
          level_id: string;
          position?: number;
          school_id: string;
          sessions?: number;
          subject_id: string;
          target_month?: string | null;
          title: string;
        };
        Update: {
          academic_year_id?: string;
          created_at?: string;
          id?: string;
          level_id?: string;
          position?: number;
          school_id?: string;
          sessions?: number;
          subject_id?: string;
          target_month?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "programme_chapters_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "programme_chapters_level_id_school_id_fkey";
            columns: ["level_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "programme_chapters_subject_id_school_id_fkey";
            columns: ["subject_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      report_cards: {
        Row: {
          class_id: string;
          code: string;
          data: NonNullable<Json>;
          generated_at: string;
          generated_by: string | null;
          id: string;
          period_id: string;
          published_at: string | null;
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          code?: string;
          data: NonNullable<Json>;
          generated_at?: string;
          generated_by?: string | null;
          id?: string;
          period_id: string;
          published_at?: string | null;
          school_id: string;
          student_id: string;
        };
        Update: {
          class_id?: string;
          code?: string;
          data?: NonNullable<Json>;
          generated_at?: string;
          generated_by?: string | null;
          id?: string;
          period_id?: string;
          published_at?: string | null;
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_cards_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "report_cards_period_id_school_id_fkey";
            columns: ["period_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "report_cards_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      school_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_on: string;
          id: string;
          kind: string;
          school_id: string;
          staff_only: boolean;
          starts_on: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_on: string;
          id?: string;
          kind: string;
          school_id: string;
          staff_only?: boolean;
          starts_on: string;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_on?: string;
          id?: string;
          kind?: string;
          school_id?: string;
          staff_only?: boolean;
          starts_on?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_events_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
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
      staff_availability: {
        Row: {
          days: number[];
          ends_at: string;
          starts_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          days?: number[];
          ends_at?: string;
          starts_at?: string;
          user_id?: string;
        };
        Update: {
          days?: number[];
          ends_at?: string;
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      student_arrivals: {
        Row: {
          date: string;
          id: string;
          received_at: string;
          scanned_at: string;
          scanned_by: string | null;
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          date: string;
          id: string;
          received_at?: string;
          scanned_at: string;
          scanned_by?: string | null;
          school_id: string;
          student_id: string;
        };
        Update: {
          date?: string;
          id?: string;
          received_at?: string;
          scanned_at?: string;
          scanned_by?: string | null;
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_arrivals_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      student_departures: {
        Row: {
          date: string;
          id: string;
          received_at: string;
          scanned_at: string;
          scanned_by: string | null;
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          date: string;
          id: string;
          received_at?: string;
          scanned_at: string;
          scanned_by?: string | null;
          school_id: string;
          student_id: string;
        };
        Update: {
          date?: string;
          id?: string;
          received_at?: string;
          scanned_at?: string;
          scanned_by?: string | null;
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_departures_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
      };
      student_discounts: {
        Row: {
          academic_year_id: string;
          created_at: string;
          created_by: string | null;
          fee_type_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["discount_kind"];
          label: string | null;
          percent: number;
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          created_at?: string;
          created_by?: string | null;
          fee_type_id?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["discount_kind"];
          label?: string | null;
          percent: number;
          school_id: string;
          student_id: string;
        };
        Update: {
          academic_year_id?: string;
          created_at?: string;
          created_by?: string | null;
          fee_type_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["discount_kind"];
          label?: string | null;
          percent?: number;
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_discounts_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "student_discounts_fee_type_id_school_id_fkey";
            columns: ["fee_type_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "fee_types";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "student_discounts_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
        ];
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
      student_fee_options: {
        Row: {
          academic_year_id: string;
          created_at: string;
          fee_type_id: string;
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          academic_year_id: string;
          created_at?: string;
          fee_type_id: string;
          school_id: string;
          student_id: string;
        };
        Update: {
          academic_year_id?: string;
          created_at?: string;
          fee_type_id?: string;
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_fee_options_academic_year_id_school_id_fkey";
            columns: ["academic_year_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "student_fee_options_fee_type_id_school_id_fkey";
            columns: ["fee_type_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "fee_types";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "student_fee_options_student_id_school_id_fkey";
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
      student_reports: {
        Row: {
          author_name: string;
          category: Database["public"]["Enums"]["report_category"];
          class_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          message: string;
          occurred_at: string;
          school_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_name: string;
          category: Database["public"]["Enums"]["report_category"];
          class_id: string;
          created_at?: string;
          created_by?: string | null;
          id: string;
          message: string;
          occurred_at: string;
          school_id: string;
          student_id: string;
        };
        Update: {
          author_name?: string;
          category?: Database["public"]["Enums"]["report_category"];
          class_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message?: string;
          occurred_at?: string;
          school_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_reports_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "student_reports_student_id_school_id_fkey";
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
          badge_token: string;
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
          badge_token?: string;
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
          badge_token?: string;
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
      subject_appreciations: {
        Row: {
          class_id: string;
          period_id: string;
          school_id: string;
          student_id: string;
          subject_id: string;
          text: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          period_id: string;
          school_id: string;
          student_id: string;
          subject_id: string;
          text: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          class_id?: string;
          period_id?: string;
          school_id?: string;
          student_id?: string;
          subject_id?: string;
          text?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subject_appreciations_class_id_school_id_fkey";
            columns: ["class_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "subject_appreciations_period_id_school_id_fkey";
            columns: ["period_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "subject_appreciations_student_id_school_id_fkey";
            columns: ["student_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id", "school_id"];
          },
          {
            foreignKeyName: "subject_appreciations_subject_id_school_id_fkey";
            columns: ["subject_id", "school_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "school_id"];
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
      user_consents: {
        Row: {
          decided_at: string;
          granted: boolean;
          kind: string;
          policy_version: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          decided_at?: string;
          granted: boolean;
          kind: string;
          policy_version: string;
          user_id?: string;
        };
        Update: {
          decided_at?: string;
          granted?: boolean;
          kind?: string;
          policy_version?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_student_guardian: { Args: { p_guardian: Json; p_school_id: string; p_student_id: string }; Returns: string };
      attendance_absence_summary: {
        Args: { p_from: string; p_school_id: string; p_to: string };
        Returns: {
          absences: number;
          class_name: string;
          first_name: string;
          justified: number;
          last_absence: string;
          last_name: string;
          lates: number;
          student_id: string;
        }[];
      };
      cancel_invoice: { Args: { p_invoice_id: string; p_reason: string }; Returns: undefined };
      claim_deliveries: { Args: { p_limit?: number }; Returns: Json };
      decide_payment_cancellation: { Args: { p_approve: boolean; p_payment_id: string }; Returns: undefined };
      finish_delivery: { Args: { p_error?: string; p_id: string; p_ok: boolean; p_provider_id?: string }; Returns: undefined };
      import_students: { Args: { p_rows: Json; p_school_id: string }; Returns: Json };
      issue_invoices: { Args: { p_month?: string; p_year_id: string }; Returns: number };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
      prune_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      publish_announcement: {
        Args: {
          p_audience: string;
          p_body: string;
          p_class_ids?: string[];
          p_guardian_ids?: string[];
          p_school_id: string;
          p_title: string;
        };
        Returns: Json;
      };
      record_arrival: { Args: { p_operation_id: string; p_scanned_at: string; p_student_id: string }; Returns: string };
      record_departure: { Args: { p_operation_id: string; p_scanned_at: string; p_student_id: string }; Returns: string };
      record_payment: {
        Args: {
          p_amount: number;
          p_invoice_ids?: string[];
          p_method: Database["public"]["Enums"]["payment_method"];
          p_note?: string;
          p_reference?: string;
          p_student_id: string;
        };
        Returns: string;
      };
      register_student: {
        Args: { p_class_id: string; p_guardians: Json; p_school_id: string; p_student: Json };
        Returns: string;
      };
      release_stuck_deliveries: { Args: Record<PropertyKey, never>; Returns: number };
      remove_student_guardian: { Args: { p_guardian_id: string; p_school_id: string; p_student_id: string }; Returns: undefined };
      renew_student_badge: { Args: { p_student_id: string }; Returns: undefined };
      replace_level_subjects: { Args: { p_rows: Json; p_school_id: string }; Returns: number };
      report_card_download_blocked: { Args: { p_report_card_id: string }; Returns: boolean };
      request_payment_cancellation: { Args: { p_payment_id: string; p_reason: string }; Returns: undefined };
      review_absence_justification: {
        Args: { p_id: string; p_note?: string; p_status: Database["public"]["Enums"]["justification_status"] };
        Returns: undefined;
      };
      save_council_decisions: { Args: { p_class_id: string; p_items: Json; p_period_id: string }; Returns: undefined };
      save_report_cards: { Args: { p_cards: Json; p_class_id: string; p_period_id: string }; Returns: number };
      save_subject_appreciations: {
        Args: { p_class_id: string; p_items: Json; p_period_id: string; p_subject_id: string };
        Returns: undefined;
      };
      send_message: { Args: { p_body: string; p_conversation_id: string }; Returns: undefined };
      set_chapter_progress: { Args: { p_chapter_id: string; p_class_id: string; p_status: string }; Returns: undefined };
      set_online_payment_checkout: { Args: { p_checkout_url: string; p_id: string; p_token: string }; Returns: undefined };
      set_period_lock: { Args: { p_lock: boolean; p_period_id: string }; Returns: undefined };
      set_primary_guardian: { Args: { p_guardian_id: string; p_school_id: string; p_student_id: string }; Returns: undefined };
      settle_online_payment: {
        Args: {
          p_id: string;
          p_reason?: string;
          p_reference?: string;
          p_status: Database["public"]["Enums"]["online_payment_status"];
        };
        Returns: string;
      };
      start_conversation: {
        Args: { p_body: string; p_parent_id: string; p_student_id: string; p_subject: string; p_teacher_id: string };
        Returns: string;
      };
      start_online_payment: { Args: { p_invoice_ids: string[]; p_provider: string; p_student_id: string }; Returns: Json };
      student_contacts: { Args: { p_student_id: string }; Returns: Json };
      student_parent_contacts: { Args: { p_student_id: string }; Returns: Json };
      submit_absence_justification: {
        Args: {
          p_comment?: string;
          p_file_path?: string;
          p_from: string;
          p_mime_type?: string;
          p_reason: Database["public"]["Enums"]["justification_reason"];
          p_student_id: string;
          p_to: string;
        };
        Returns: string;
      };
      submit_grades: {
        Args: { p_entered_at: string; p_evaluation_id: string; p_marks: Json; p_operation_id: string };
        Returns: string;
      };
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
      submit_student_report: {
        Args: {
          p_category: Database["public"]["Enums"]["report_category"];
          p_class_id: string;
          p_message: string;
          p_occurred_at: string;
          p_operation_id: string;
          p_student_id: string;
        };
        Returns: string;
      };
      upcoming_compositions: { Args: { p_student_ids: string[] }; Returns: Json };
      validate_chapter: { Args: { p_approve: boolean; p_chapter_id: string; p_class_id: string }; Returns: undefined };
      verify_report_card: { Args: { p_client: string; p_code: string }; Returns: Json };
      withdraw_absence_justification: { Args: { p_id: string }; Returns: string };
    };
    Enums: {
      acquisition_level: "acquired" | "in_progress" | "not_acquired";
      app_locale: "fr" | "wo";
      app_role: "owner" | "director" | "censor" | "supervisor" | "accountant" | "secretary" | "teacher" | "parent" | "driver";
      attendance_slot: "morning" | "afternoon";
      attendance_status: "present" | "absent" | "late";
      council_sanction: "warning" | "blame";
      cycle_code: "prescolaire" | "elementaire" | "moyen" | "secondaire";
      demo_request_status: "new" | "contacted" | "scheduled" | "closed";
      discount_kind: "sibling" | "scholarship" | "staff" | "other";
      enrollment_status: "active" | "transferred" | "left" | "completed";
      evaluation_kind: "devoir" | "interrogation" | "composition";
      expense_category: "salaries" | "rent" | "utilities" | "supplies" | "maintenance" | "transport" | "food" | "other";
      fee_frequency: "once" | "monthly";
      fee_kind: "registration" | "tuition" | "canteen" | "transport" | "uniform" | "parents_association" | "exam" | "other";
      grade_status: "graded" | "absent" | "excused";
      grading_scale: "appreciation" | "ten" | "twenty";
      guardian_relationship: "father" | "mother" | "guardian" | "grandparent" | "uncle" | "aunt" | "sibling" | "other";
      justification_reason: "illness" | "medical" | "family" | "other";
      justification_status: "pending" | "accepted" | "refused";
      membership_status: "invited" | "active" | "suspended";
      online_payment_status: "pending" | "succeeded" | "failed" | "cancelled";
      payment_method: "cash" | "wave" | "orange_money" | "free_money" | "bank_transfer" | "check" | "online";
      payment_status: "valid" | "cancel_requested" | "cancelled";
      period_kind: "semester" | "trimester";
      person_status: "active" | "inactive";
      report_category: "behavior" | "health" | "homework" | "equipment" | "other";
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
      acquisition_level: ["acquired", "in_progress", "not_acquired"],
      app_locale: ["fr", "wo"],
      app_role: ["owner", "director", "censor", "supervisor", "accountant", "secretary", "teacher", "parent", "driver"],
      attendance_slot: ["morning", "afternoon"],
      attendance_status: ["present", "absent", "late"],
      council_sanction: ["warning", "blame"],
      cycle_code: ["prescolaire", "elementaire", "moyen", "secondaire"],
      demo_request_status: ["new", "contacted", "scheduled", "closed"],
      discount_kind: ["sibling", "scholarship", "staff", "other"],
      enrollment_status: ["active", "transferred", "left", "completed"],
      evaluation_kind: ["devoir", "interrogation", "composition"],
      expense_category: ["salaries", "rent", "utilities", "supplies", "maintenance", "transport", "food", "other"],
      fee_frequency: ["once", "monthly"],
      fee_kind: ["registration", "tuition", "canteen", "transport", "uniform", "parents_association", "exam", "other"],
      grade_status: ["graded", "absent", "excused"],
      grading_scale: ["appreciation", "ten", "twenty"],
      guardian_relationship: ["father", "mother", "guardian", "grandparent", "uncle", "aunt", "sibling", "other"],
      justification_reason: ["illness", "medical", "family", "other"],
      justification_status: ["pending", "accepted", "refused"],
      membership_status: ["invited", "active", "suspended"],
      online_payment_status: ["pending", "succeeded", "failed", "cancelled"],
      payment_method: ["cash", "wave", "orange_money", "free_money", "bank_transfer", "check", "online"],
      payment_status: ["valid", "cancel_requested", "cancelled"],
      period_kind: ["semester", "trimester"],
      person_status: ["active", "inactive"],
      report_category: ["behavior", "health", "homework", "equipment", "other"],
      school_plan: ["pilot", "starter", "school", "establishment", "group"],
      school_status: ["trial", "active", "suspended", "archived"],
      sex: ["F", "M"],
      staff_contract: ["permanent", "vacataire"],
      student_document_kind: ["birth_certificate", "photo", "previous_report", "medical", "other"],
      subject_track: ["french", "arabic"],
    },
  },
} as const;

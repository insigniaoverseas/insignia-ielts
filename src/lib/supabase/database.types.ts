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
      answer_marks: {
        Row: {
          attempt_id: string
          is_correct: boolean
          marks_awarded: number
          overridden_at: string | null
          overridden_by: string | null
          override_note: string | null
          q_number: number
          question_type: string
          scored_at: string
          section_no: number
        }
        Insert: {
          attempt_id: string
          is_correct: boolean
          marks_awarded?: number
          overridden_at?: string | null
          overridden_by?: string | null
          override_note?: string | null
          q_number: number
          question_type: string
          scored_at?: string
          section_no: number
        }
        Update: {
          attempt_id?: string
          is_correct?: boolean
          marks_awarded?: number
          overridden_at?: string | null
          overridden_by?: string | null
          override_note?: string | null
          q_number?: number
          question_type?: string
          scored_at?: string
          section_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "answer_marks_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_marks_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          answered_at: string
          attempt_id: string
          flagged: boolean
          given_answer: string | null
          q_number: number
          revision: number
          section_no: number
          updated_at: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          flagged?: boolean
          given_answer?: string | null
          q_number: number
          revision?: number
          section_no: number
          updated_at?: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          flagged?: boolean
          given_answer?: string | null
          q_number?: number
          revision?: number
          section_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_targets: {
        Row: {
          assignment_id: string
          batch_id: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          assignment_id: string
          batch_id?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          assignment_id?: string
          batch_id?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_targets_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_targets_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_unlocks: {
        Row: {
          assignment_id: string
          at: string
          extra_attempts: number
          id: string
          reason: string | null
          student_id: string
          unlocked_by: string | null
          until: string
        }
        Insert: {
          assignment_id: string
          at?: string
          extra_attempts?: number
          id?: string
          reason?: string | null
          student_id: string
          unlocked_by?: string | null
          until: string
        }
        Update: {
          assignment_id?: string
          at?: string
          extra_attempts?: number
          id?: string
          reason?: string | null
          student_id?: string
          unlocked_by?: string | null
          until?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_unlocks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_unlocks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_unlocks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_review: boolean
          available_from: string
          band_scale_id: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          due_by: string | null
          id: string
          max_attempts: number
          released_by: string | null
          results_release: string
          results_released_at: string | null
          test_id: string
        }
        Insert: {
          allow_review?: boolean
          available_from?: string
          band_scale_id?: string | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          due_by?: string | null
          id?: string
          max_attempts?: number
          released_by?: string | null
          results_release?: string
          results_released_at?: string | null
          test_id: string
        }
        Update: {
          allow_review?: boolean
          available_from?: string
          band_scale_id?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          due_by?: string | null
          id?: string
          max_attempts?: number
          released_by?: string | null
          results_release?: string
          results_released_at?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_band_scale_id_fkey"
            columns: ["band_scale_id"]
            isOneToOne: false
            referencedRelation: "band_scales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_events: {
        Row: {
          at: string
          attempt_id: string
          id: string
          meta: Json
          type: string
        }
        Insert: {
          at?: string
          attempt_id: string
          id?: string
          meta?: Json
          type: string
        }
        Update: {
          at?: string
          attempt_id?: string
          id?: string
          meta?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_scores: {
        Row: {
          attempt_id: string
          band: number | null
          below_band: number | null
          raw_score: number
          scored_at: string
          section_scores: Json
        }
        Insert: {
          attempt_id: string
          band?: number | null
          below_band?: number | null
          raw_score: number
          scored_at?: string
          section_scores?: Json
        }
        Update: {
          attempt_id?: string
          band?: number | null
          below_band?: number | null
          raw_score?: number
          scored_at?: string
          section_scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "attempt_scores_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          assignment_id: string | null
          audio_completed_at: string | null
          audio_downloaded_at: string | null
          audio_started_at: string | null
          content_version: number
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          kind: string
          last_autosave_at: string | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          tab_switches: number
          test_id: string
          time_remaining_seconds: number | null
        }
        Insert: {
          assignment_id?: string | null
          audio_completed_at?: string | null
          audio_downloaded_at?: string | null
          audio_started_at?: string | null
          content_version: number
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          kind: string
          last_autosave_at?: string | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          tab_switches?: number
          test_id: string
          time_remaining_seconds?: number | null
        }
        Update: {
          assignment_id?: string | null
          audio_completed_at?: string | null
          audio_downloaded_at?: string | null
          audio_started_at?: string | null
          content_version?: number
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          kind?: string
          last_autosave_at?: string | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          tab_switches?: number
          test_id?: string
          time_remaining_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          branch_id: string | null
          entity: string
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          branch_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          branch_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      band_scale_rows: {
        Row: {
          band: number | null
          raw_max: number
          raw_min: number
          scale_id: string
        }
        Insert: {
          band?: number | null
          raw_max: number
          raw_min: number
          scale_id: string
        }
        Update: {
          band?: number | null
          raw_max?: number
          raw_min?: number
          scale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "band_scale_rows_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "band_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      band_scales: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          skill: string
          variant: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          skill: string
          variant: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          skill?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "band_scales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_students: {
        Row: {
          batch_id: string
          joined_at: string
          left_at: string | null
          student_id: string
        }
        Insert: {
          batch_id: string
          joined_at?: string
          left_at?: string | null
          student_id: string
        }
        Update: {
          batch_id?: string
          joined_at?: string
          left_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_teachers: {
        Row: {
          batch_id: string
          created_at: string
          teacher_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          teacher_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_teachers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          branch_id: string
          created_at: string
          ends_on: string | null
          id: string
          name: string
          starts_on: string
          status: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          ends_on?: string | null
          id?: string
          name: string
          starts_on: string
          status?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          starts_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          batch_id: string | null
          branch_id: string
          country_code: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          name: string
          phone: string | null
          plan_template: Json | null
          role_id: string
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          batch_id?: string | null
          branch_id: string
          country_code?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          name: string
          phone?: string | null
          plan_template?: Json | null
          role_id: string
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          batch_id?: string | null
          branch_id?: string
          country_code?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          name?: string
          phone?: string | null
          plan_template?: Json | null
          role_id?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_resets: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          requested_ip: unknown
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          requested_ip?: unknown
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          requested_ip?: unknown
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_resets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_history: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          id: string
          new_expiry: string | null
          old_expiry: string | null
          plan_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          id?: string
          new_expiry?: string | null
          old_expiry?: string | null
          plan_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          id?: string
          new_expiry?: string | null
          old_expiry?: string | null
          plan_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "student_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      student_plan_notes: {
        Row: {
          body: string
          created_at: string
          plan_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          plan_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          plan_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_plan_notes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "student_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_plan_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_plans: {
        Row: {
          created_at: string
          created_by: string | null
          expires_on: string
          id: string
          plan_name: string
          starts_on: string
          status: string
          student_id: string
          test_quota: number | null
          tests_used: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_on: string
          id?: string
          plan_name: string
          starts_on: string
          status?: string
          student_id: string
          test_quota?: number | null
          tests_used?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_on?: string
          id?: string
          plan_name?: string
          starts_on?: string
          status?: string
          student_id?: string
          test_quota?: number | null
          tests_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          audio_duration_seconds: number | null
          content_version: number
          created_at: string
          created_by: string | null
          difficulty: string
          duration_seconds: number
          id: string
          kind: string
          practice_question_type: string | null
          published_at: string | null
          r2_assets_prefix: string | null
          r2_audio_key: string | null
          r2_content_key: string | null
          r2_key_key: string | null
          r2_transcript_key: string | null
          section_count: number
          skill: string
          status: string
          tags: string[]
          title: string
          total_questions: number
          transfer_seconds: number
          updated_at: string
          variant: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          content_version?: number
          created_at?: string
          created_by?: string | null
          difficulty: string
          duration_seconds: number
          id?: string
          kind: string
          practice_question_type?: string | null
          published_at?: string | null
          r2_assets_prefix?: string | null
          r2_audio_key?: string | null
          r2_content_key?: string | null
          r2_key_key?: string | null
          r2_transcript_key?: string | null
          section_count: number
          skill: string
          status?: string
          tags?: string[]
          title: string
          total_questions: number
          transfer_seconds?: number
          updated_at?: string
          variant: string
        }
        Update: {
          audio_duration_seconds?: number | null
          content_version?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          duration_seconds?: number
          id?: string
          kind?: string
          practice_question_type?: string | null
          published_at?: string | null
          r2_assets_prefix?: string | null
          r2_audio_key?: string | null
          r2_content_key?: string | null
          r2_key_key?: string | null
          r2_transcript_key?: string | null
          section_count?: number
          skill?: string
          status?: string
          tags?: string[]
          title?: string
          total_questions?: number
          transfer_seconds?: number
          updated_at?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          device_secret_hash: string
          failed_pin_attempts: number
          id: string
          label: string | null
          last_used_at: string | null
          locked_until: string | null
          pin_hash: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_secret_hash: string
          failed_pin_attempts?: number
          id?: string
          label?: string | null
          last_used_at?: string | null
          locked_until?: string | null
          pin_hash: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_secret_hash?: string
          failed_pin_attempts?: number
          id?: string
          label?: string | null
          last_used_at?: string | null
          locked_until?: string | null
          pin_hash?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          device_id: string | null
          id: string
          ip: unknown
          issued_at: string
          last_seen_at: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_id?: string | null
          id?: string
          ip?: unknown
          issued_at?: string
          last_seen_at?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_id?: string | null
          id?: string
          ip?: unknown
          issued_at?: string
          last_seen_at?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          branch_id: string
          country_code: string | null
          created_at: string
          created_by: string | null
          dob: string | null
          email: string
          guardian_consent: boolean
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          name: string
          phone: string | null
          role_id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email: string
          guardian_consent?: boolean
          guardian_name?: string | null
          guardian_phone?: string | null
          id: string
          name: string
          phone?: string | null
          role_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string
          guardian_consent?: boolean
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          name?: string
          phone?: string | null
          role_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_token_hash: string; p_user_id: string }
        Returns: string
      }
      bump_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: {
          attempts: number
          locked: boolean
          window_start: string
        }[]
      }
      clear_rate_limit: { Args: { p_key: string }; Returns: undefined }
      complete_first_run_setup: {
        Args: {
          p_branch_address: string
          p_branch_name: string
          p_country_code?: string
          p_owner_name: string
          p_phone?: string
        }
        Returns: string
      }
      complete_password_reset: {
        Args: { p_token_hash: string }
        Returns: string
      }
      expire_stale_invitations: { Args: never; Returns: number }
      find_password_reset: {
        Args: { p_token_hash: string }
        Returns: {
          email: string
          expired: boolean
          name: string
          used: boolean
          user_id: string
        }[]
      }
      first_run_pending: { Args: never; Returns: boolean }
      peek_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: {
          attempts: number
          locked: boolean
          window_start: string
        }[]
      }
      purge_old_password_resets: { Args: never; Returns: number }
      purge_old_rate_limits: { Args: never; Returns: number }
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

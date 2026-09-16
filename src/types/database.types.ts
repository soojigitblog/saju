export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_roles: {
        Row: {
          user_id: string;
          role: "USER" | "ADMIN";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role: "USER" | "ADMIN";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: "USER" | "ADMIN";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_definitions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_versions: {
        Row: {
          id: string;
          prompt_definition_id: string;
          version: number;
          system_prompt: string;
          user_prompt_template: string;
          output_schema: Json;
          status: "DRAFT" | "ACTIVE" | "ARCHIVED";
          model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prompt_definition_id: string;
          version: number;
          system_prompt: string;
          user_prompt_template: string;
          output_schema?: Json;
          status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prompt_definition_id?: string;
          version?: number;
          system_prompt?: string;
          user_prompt_template?: string;
          output_schema?: Json;
          status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_versions_prompt_definition_id_fkey";
            columns: ["prompt_definition_id"];
            isOneToOne: false;
            referencedRelation: "prompt_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_description: string;
          description: string;
          regular_price: number;
          sale_price: number;
          thumbnail_url: string | null;
          product_type: string;
          prompt_version_id: string | null;
          template_id: string;
          free_ratio: number;
          status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          short_description?: string;
          description?: string;
          regular_price: number;
          sale_price: number;
          thumbnail_url?: string | null;
          product_type?: string;
          prompt_version_id?: string | null;
          template_id?: string;
          free_ratio?: number;
          status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          short_description?: string;
          description?: string;
          regular_price?: number;
          sale_price?: number;
          thumbnail_url?: string | null;
          product_type?: string;
          prompt_version_id?: string | null;
          template_id?: string;
          free_ratio?: number;
          status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_prompt_version_id_fkey";
            columns: ["prompt_version_id"];
            isOneToOne: false;
            referencedRelation: "prompt_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          guest_session_id: string | null;
          nickname: string;
          gender: "male" | "female";
          birth_date: string;
          birth_time: string | null;
          birth_time_unknown: boolean;
          calendar_type: "solar" | "lunar";
          birth_place: string;
          marital_status: "unmarried" | "married" | "prefer_not" | null;
          has_children: "yes" | "no" | "prefer_not" | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          nickname: string;
          gender: "male" | "female";
          birth_date: string;
          birth_time?: string | null;
          birth_time_unknown?: boolean;
          calendar_type: "solar" | "lunar";
          birth_place: string;
          marital_status?: "unmarried" | "married" | "prefer_not" | null;
          has_children?: "yes" | "no" | "prefer_not" | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          nickname?: string;
          gender?: "male" | "female";
          birth_date?: string;
          birth_time?: string | null;
          birth_time_unknown?: boolean;
          calendar_type?: "solar" | "lunar";
          birth_place?: string;
          marital_status?: "unmarried" | "married" | "prefer_not" | null;
          has_children?: "yes" | "no" | "prefer_not" | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fortune_charts: {
        Row: {
          id: string;
          profile_id: string;
          chart_version: string;
          raw_chart_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          chart_version?: string;
          raw_chart_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          chart_version?: string;
          raw_chart_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fortune_charts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      free_results: {
        Row: {
          id: string;
          profile_id: string;
          chart_id: string;
          prompt_version_id: string | null;
          result_json: Json | null;
          model: string | null;
          prompt_version: string | null;
          generation_status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          error_message: string | null;
          error_code: string | null;
          attempt_count: number;
          input_tokens: number | null;
          output_tokens: number | null;
          total_tokens: number | null;
          provider_request_id: string | null;
          generation_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          chart_id: string;
          prompt_version_id?: string | null;
          result_json?: Json | null;
          model?: string | null;
          prompt_version?: string | null;
          generation_status?: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          error_message?: string | null;
          error_code?: string | null;
          attempt_count?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          provider_request_id?: string | null;
          generation_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          chart_id?: string;
          prompt_version_id?: string | null;
          result_json?: Json | null;
          model?: string | null;
          prompt_version?: string | null;
          generation_status?: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          error_message?: string | null;
          error_code?: string | null;
          attempt_count?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          provider_request_id?: string | null;
          generation_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_no: string;
          user_id: string | null;
          guest_session_id: string | null;
          profile_id: string;
          product_id: string;
          source_result_id: string | null;
          source_tarot_reading_id: string | null;
          amount: number;
          currency: string;
          product_name_snapshot: string | null;
          payment_method: "BANK_TRANSFER" | "TOSS";
          depositor_name: string | null;
          depositor_name_normalized: string | null;
          expires_at: string | null;
          status:
            | "PENDING"
            | "PAID"
            | "GENERATING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "REFUNDED"
            | "EXPIRED";
          access_token_hash: string | null;
          paid_at: string | null;
          payment_check_requested_at?: string | null;
          payment_check_notified_at?: string | null;
          cancelled_at: string | null;
          refunded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_no: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          profile_id: string;
          product_id: string;
          source_result_id?: string | null;
          source_tarot_reading_id?: string | null;
          amount: number;
          currency?: string;
          product_name_snapshot?: string | null;
          payment_method?: "BANK_TRANSFER" | "TOSS";
          depositor_name?: string | null;
          depositor_name_normalized?: string | null;
          expires_at?: string | null;
          status?:
            | "PENDING"
            | "PAID"
            | "GENERATING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "REFUNDED"
            | "EXPIRED";
          access_token_hash?: string | null;
          paid_at?: string | null;
          payment_check_requested_at?: string | null;
          payment_check_notified_at?: string | null;
          cancelled_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_no?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          profile_id?: string;
          product_id?: string;
          source_result_id?: string | null;
          source_tarot_reading_id?: string | null;
          amount?: number;
          currency?: string;
          product_name_snapshot?: string | null;
          payment_method?: "BANK_TRANSFER" | "TOSS";
          depositor_name?: string | null;
          depositor_name_normalized?: string | null;
          expires_at?: string | null;
          status?:
            | "PENDING"
            | "PAID"
            | "GENERATING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "REFUNDED"
            | "EXPIRED";
          access_token_hash?: string | null;
          paid_at?: string | null;
          payment_check_requested_at?: string | null;
          payment_check_notified_at?: string | null;
          cancelled_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: "TOSS" | "KAKAO" | "NAVER" | "BANK_TRANSFER";
          payment_key: string | null;
          payment_method: string | null;
          provider_status: string | null;
          amount: number;
          requested_amount: number | null;
          approved_amount: number | null;
          provider_order_id: string | null;
          approved_at: string | null;
          cancelled_at: string | null;
          raw_response: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: "TOSS" | "KAKAO" | "NAVER" | "BANK_TRANSFER";
          payment_key?: string | null;
          payment_method?: string | null;
          provider_status?: string | null;
          amount: number;
          requested_amount?: number | null;
          approved_amount?: number | null;
          provider_order_id?: string | null;
          approved_at?: string | null;
          cancelled_at?: string | null;
          raw_response?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: "TOSS" | "KAKAO" | "NAVER" | "BANK_TRANSFER";
          payment_key?: string | null;
          payment_method?: string | null;
          provider_status?: string | null;
          amount?: number;
          requested_amount?: number | null;
          approved_amount?: number | null;
          provider_order_id?: string | null;
          approved_at?: string | null;
          cancelled_at?: string | null;
          raw_response?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      bank_transactions: {
        Row: {
          id: string;
          provider: "HANA";
          external_transaction_id: string | null;
          fingerprint: string;
          occurred_at: string;
          amount: number;
          depositor_name_masked: string | null;
          match_status: "UNMATCHED" | "MATCHED" | "AMBIGUOUS" | "IGNORED";
          matched_order_id: string | null;
          manual_approved_by: string | null;
          manual_approved_at: string | null;
          manual_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider?: "HANA";
          external_transaction_id?: string | null;
          fingerprint: string;
          occurred_at: string;
          amount: number;
          depositor_name_masked?: string | null;
          match_status?: "UNMATCHED" | "MATCHED" | "AMBIGUOUS" | "IGNORED";
          matched_order_id?: string | null;
          manual_approved_by?: string | null;
          manual_approved_at?: string | null;
          manual_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: "HANA";
          external_transaction_id?: string | null;
          fingerprint?: string;
          occurred_at?: string;
          amount?: number;
          depositor_name_masked?: string | null;
          match_status?: "UNMATCHED" | "MATCHED" | "AMBIGUOUS" | "IGNORED";
          matched_order_id?: string | null;
          manual_approved_by?: string | null;
          manual_approved_at?: string | null;
          manual_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bank_poller_health: {
        Row: {
          id: string;
          status: "IDLE" | "RUNNING" | "ERROR" | "SESSION_EXPIRED";
          last_success_at: string | null;
          last_error_safe: string | null;
          last_fetched_count: number;
          last_matched_count: number;
          last_ambiguous_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: "IDLE" | "RUNNING" | "ERROR" | "SESSION_EXPIRED";
          last_success_at?: string | null;
          last_error_safe?: string | null;
          last_fetched_count?: number;
          last_matched_count?: number;
          last_ambiguous_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: "IDLE" | "RUNNING" | "ERROR" | "SESSION_EXPIRED";
          last_success_at?: string | null;
          last_error_safe?: string | null;
          last_fetched_count?: number;
          last_matched_count?: number;
          last_ambiguous_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          order_id: string;
          profile_id: string;
          product_id: string;
          prompt_version_id: string | null;
          prompt_version: string | null;
          model: string | null;
          result_json: Json | null;
          html_url: string | null;
          pdf_url: string | null;
          generation_status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          error_message: string | null;
          error_code: string | null;
          attempt_count: number;
          input_tokens: number | null;
          output_tokens: number | null;
          total_tokens: number | null;
          provider_request_id: string | null;
          generation_key: string | null;
          generated_at: string | null;
          estimated_ai_cost_usd: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          profile_id: string;
          product_id: string;
          prompt_version_id?: string | null;
          prompt_version?: string | null;
          model?: string | null;
          result_json?: Json | null;
          html_url?: string | null;
          pdf_url?: string | null;
          generation_status?: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          error_message?: string | null;
          error_code?: string | null;
          attempt_count?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          provider_request_id?: string | null;
          generation_key?: string | null;
          generated_at?: string | null;
          estimated_ai_cost_usd?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          profile_id?: string;
          product_id?: string;
          prompt_version_id?: string | null;
          prompt_version?: string | null;
          model?: string | null;
          result_json?: Json | null;
          html_url?: string | null;
          pdf_url?: string | null;
          generation_status?: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          error_message?: string | null;
          error_code?: string | null;
          attempt_count?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          provider_request_id?: string | null;
          generation_key?: string | null;
          generated_at?: string | null;
          estimated_ai_cost_usd?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_generations: {
        Row: {
          id: string;
          generation_key: string;
          result_type: "free" | "paid" | "tarot_cross" | "paid_tarot_cross";
          profile_id: string | null;
          chart_id: string | null;
          order_id: string | null;
          prompt_version_id: string | null;
          engine_version: string;
          provider_version: string | null;
          provider: "openai" | "gemini" | "mock" | null;
          model: string;
          status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          input_tokens: number | null;
          output_tokens: number | null;
          total_tokens: number | null;
          provider_request_id: string | null;
          error_code: string | null;
          error_message: string | null;
          attempt_count: number;
          started_at: string | null;
          completed_at: string | null;
          latency_ms: number | null;
          estimated_ai_cost_usd: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          generation_key: string;
          result_type: "free" | "paid" | "tarot_cross" | "paid_tarot_cross";
          profile_id?: string | null;
          chart_id?: string | null;
          order_id?: string | null;
          prompt_version_id?: string | null;
          engine_version: string;
          provider_version?: string | null;
          provider?: "openai" | "gemini" | "mock" | null;
          model: string;
          status?: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          provider_request_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          attempt_count?: number;
          started_at?: string | null;
          completed_at?: string | null;
          latency_ms?: number | null;
          estimated_ai_cost_usd?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          generation_key?: string;
          result_type?: "free" | "paid" | "tarot_cross" | "paid_tarot_cross";
          profile_id?: string | null;
          chart_id?: string | null;
          order_id?: string | null;
          prompt_version_id?: string | null;
          engine_version?: string;
          provider_version?: string | null;
          provider?: "openai" | "gemini" | "mock" | null;
          model?: string;
          status?: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          provider_request_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          attempt_count?: number;
          started_at?: string | null;
          completed_at?: string | null;
          latency_ms?: number | null;
          estimated_ai_cost_usd?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_sessions: {
        Row: {
          id: string;
          session_id: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          referrer: string | null;
          landing_path: string | null;
          first_seen_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          referrer?: string | null;
          landing_path?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          referrer?: string | null;
          landing_path?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          event_name: string;
          product_id: string | null;
          order_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          event_name: string;
          product_id?: string | null;
          order_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string | null;
          event_name?: string;
          product_id?: string | null;
          order_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      feedbacks: {
        Row: {
          id: string;
          guest_session_id: string;
          user_id: string | null;
          target_type: "FORTUNE" | "TAROT" | "CROSS_READING";
          target_id: string;
          rating: number | null;
          tags: string[];
          more_fun_than_saju_alone: "YES" | "NO" | null;
          most_resonant: "SAJU" | "TAROT" | "CROSS" | "SIMILAR" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guest_session_id: string;
          user_id?: string | null;
          target_type: "FORTUNE" | "TAROT" | "CROSS_READING";
          target_id: string;
          rating?: number | null;
          tags?: string[];
          more_fun_than_saju_alone?: "YES" | "NO" | null;
          most_resonant?: "SAJU" | "TAROT" | "CROSS" | "SIMILAR" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          guest_session_id?: string;
          user_id?: string | null;
          target_type?: "FORTUNE" | "TAROT" | "CROSS_READING";
          target_id?: string;
          rating?: number | null;
          tags?: string[];
          more_fun_than_saju_alone?: "YES" | "NO" | null;
          most_resonant?: "SAJU" | "TAROT" | "CROSS" | "SIMILAR" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_issues: {
        Row: {
          id: string;
          kind: "BUG_REPORT" | "CLIENT_ERROR";
          guest_session_id: string | null;
          analytics_session_id: string | null;
          path: string | null;
          user_agent: string | null;
          message: string;
          details: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: "BUG_REPORT" | "CLIENT_ERROR";
          guest_session_id?: string | null;
          analytics_session_id?: string | null;
          path?: string | null;
          user_agent?: string | null;
          message: string;
          details?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: "BUG_REPORT" | "CLIENT_ERROR";
          guest_session_id?: string | null;
          analytics_session_id?: string | null;
          path?: string | null;
          user_agent?: string | null;
          message?: string;
          details?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      refund_requests: {
        Row: {
          id: string;
          order_id: string;
          guest_session_id: string | null;
          user_id: string | null;
          reason: string;
          screenshot_data_url: string | null;
          status: "PENDING" | "APPROVED" | "REJECTED";
          admin_note: string | null;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          guest_session_id?: string | null;
          user_id?: string | null;
          reason: string;
          screenshot_data_url?: string | null;
          status?: "PENDING" | "APPROVED" | "REJECTED";
          admin_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          guest_session_id?: string | null;
          user_id?: string | null;
          reason?: string;
          screenshot_data_url?: string | null;
          status?: "PENDING" | "APPROVED" | "REJECTED";
          admin_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_user_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums = never;

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
          amount: number;
          status:
            | "PENDING"
            | "PAID"
            | "GENERATING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "REFUNDED";
          access_token_hash: string | null;
          paid_at: string | null;
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
          amount: number;
          status?:
            | "PENDING"
            | "PAID"
            | "GENERATING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "REFUNDED";
          access_token_hash?: string | null;
          paid_at?: string | null;
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
          amount?: number;
          status?:
            | "PENDING"
            | "PAID"
            | "GENERATING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "REFUNDED";
          access_token_hash?: string | null;
          paid_at?: string | null;
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
          provider: "TOSS" | "KAKAO" | "NAVER";
          payment_key: string | null;
          payment_method: string | null;
          provider_status: string | null;
          amount: number;
          approved_at: string | null;
          cancelled_at: string | null;
          raw_response: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: "TOSS" | "KAKAO" | "NAVER";
          payment_key?: string | null;
          payment_method?: string | null;
          provider_status?: string | null;
          amount: number;
          approved_at?: string | null;
          cancelled_at?: string | null;
          raw_response?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: "TOSS" | "KAKAO" | "NAVER";
          payment_key?: string | null;
          payment_method?: string | null;
          provider_status?: string | null;
          amount?: number;
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_generations: {
        Row: {
          id: string;
          generation_key: string;
          result_type: "free" | "paid";
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          generation_key: string;
          result_type: "free" | "paid";
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          generation_key?: string;
          result_type?: "free" | "paid";
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

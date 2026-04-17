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
      institutions: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      offices: {
        Row: {
          id: string;
          institution_id: string | null;
          name: string;
          slug: string;
          white_label: Json;
          settings: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id?: string | null;
          name: string;
          slug: string;
          white_label?: Json;
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string | null;
          name?: string;
          slug?: string;
          white_label?: Json;
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          phone: string | null;
          two_fa_enabled: boolean;
          role: 'super_admin' | 'office_admin' | 'broker';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          phone?: string | null;
          two_fa_enabled?: boolean;
          role: 'super_admin' | 'office_admin' | 'broker';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          two_fa_enabled?: boolean;
          role?: 'super_admin' | 'office_admin' | 'broker';
          created_at?: string;
        };
        Relationships: [];
      };
      brokers: {
        Row: {
          id: string;
          user_id: string;
          office_id: string;
          is_office_admin: boolean;
          settings: Json;
          is_active: boolean;
          invited_at: string | null;
          activated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          office_id: string;
          is_office_admin?: boolean;
          settings?: Json;
          is_active?: boolean;
          invited_at?: string | null;
          activated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          office_id?: string;
          is_office_admin?: boolean;
          settings?: Json;
          is_active?: boolean;
          invited_at?: string | null;
          activated_at?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          role: 'super_admin' | 'office_admin' | 'broker';
          office_id: string | null;
          token: string;
          status: 'pending' | 'accepted' | 'expired';
          sent_at: string;
          accepted_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          role: 'super_admin' | 'office_admin' | 'broker';
          office_id?: string | null;
          token?: string;
          status?: 'pending' | 'accepted' | 'expired';
          sent_at?: string;
          accepted_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'super_admin' | 'office_admin' | 'broker';
          office_id?: string | null;
          token?: string;
          status?: 'pending' | 'accepted' | 'expired';
          sent_at?: string;
          accepted_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          broker_id: string;
          office_id: string;
          p1_name: string;
          p1_nif: string | null;
          p1_email: string | null;
          p1_phone: string | null;
          p1_employment_type: string | null;
          p1_birth_date: string | null;
          p2_name: string | null;
          p2_nif: string | null;
          p2_email: string | null;
          p2_phone: string | null;
          p2_employment_type: string | null;
          p2_birth_date: string | null;
          mortgage_type: string | null;
          property_value: number | null;
          loan_amount: number | null;
          term_months: number | null;
          property_address: string | null;
          notes_general: string | null;
          process_step: ProcessStep;
          portal_token: string;
          terms_accepted_at: string | null;
          terms_signature_data: string | null;
          terms_ip: string | null;
          terms_user_agent: string | null;
          email: string | null;
          auth_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          office_id: string;
          p1_name: string;
          p1_nif?: string | null;
          p1_email?: string | null;
          p1_phone?: string | null;
          p1_employment_type?: string | null;
          p1_birth_date?: string | null;
          p2_name?: string | null;
          p2_nif?: string | null;
          p2_email?: string | null;
          p2_phone?: string | null;
          p2_employment_type?: string | null;
          p2_birth_date?: string | null;
          mortgage_type?: string | null;
          property_value?: number | null;
          loan_amount?: number | null;
          term_months?: number | null;
          property_address?: string | null;
          notes_general?: string | null;
          process_step?: ProcessStep;
          portal_token?: string;
          terms_accepted_at?: string | null;
          terms_signature_data?: string | null;
          terms_ip?: string | null;
          terms_user_agent?: string | null;
          email?: string | null;
          auth_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          broker_id?: string;
          office_id?: string;
          p1_name?: string;
          p1_nif?: string | null;
          p1_email?: string | null;
          p1_phone?: string | null;
          p1_employment_type?: string | null;
          p1_birth_date?: string | null;
          p2_name?: string | null;
          p2_nif?: string | null;
          p2_email?: string | null;
          p2_phone?: string | null;
          p2_employment_type?: string | null;
          p2_birth_date?: string | null;
          mortgage_type?: string | null;
          property_value?: number | null;
          loan_amount?: number | null;
          term_months?: number | null;
          property_address?: string | null;
          notes_general?: string | null;
          process_step?: ProcessStep;
          portal_token?: string;
          terms_accepted_at?: string | null;
          terms_signature_data?: string | null;
          terms_ip?: string | null;
          terms_user_agent?: string | null;
          email?: string | null;
          auth_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_requests: {
        Row: {
          id: string;
          client_id: string;
          proponente: 'p1' | 'p2' | 'shared';
          doc_type: string | null;
          label: string;
          description: string | null;
          is_mandatory: boolean;
          max_files: number;
          sort_order: number;
          status: 'pending' | 'em_analise' | 'approved' | 'rejected';
          broker_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          proponente?: 'p1' | 'p2' | 'shared';
          doc_type?: string | null;
          label: string;
          description?: string | null;
          is_mandatory?: boolean;
          max_files?: number;
          sort_order?: number;
          status?: 'pending' | 'em_analise' | 'uploaded' | 'approved' | 'rejected';
          broker_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          proponente?: 'p1' | 'p2' | 'shared';
          doc_type?: string | null;
          label?: string;
          description?: string | null;
          is_mandatory?: boolean;
          max_files?: number;
          sort_order?: number;
          status?: 'pending' | 'em_analise' | 'uploaded' | 'approved' | 'rejected';
          broker_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      document_uploads: {
        Row: {
          id: string;
          document_request_id: string;
          client_id: string;
          storage_path: string;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: 'client' | 'broker';
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          document_request_id: string;
          client_id: string;
          storage_path: string;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by: 'client' | 'broker';
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          document_request_id?: string;
          client_id?: string;
          storage_path?: string;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: 'client' | 'broker';
          uploaded_at?: string;
        };
        Relationships: [];
      };
      propostas: {
        Row: {
          id: string;
          client_id: string;
          broker_id: string;
          title: string | null;
          comparison_data: Json;
          insurance_data: Json;
          one_time_charges: Json;
          monthly_charges: Json;
          notes: string | null;
          is_visible_to_client: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          broker_id: string;
          title?: string | null;
          comparison_data?: Json;
          insurance_data?: Json;
          one_time_charges?: Json;
          monthly_charges?: Json;
          notes?: string | null;
          is_visible_to_client?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          broker_id?: string;
          title?: string | null;
          comparison_data?: Json;
          insurance_data?: Json;
          one_time_charges?: Json;
          monthly_charges?: Json;
          notes?: string | null;
          is_visible_to_client?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      broker_notes: {
        Row: {
          id: string;
          client_id: string;
          broker_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          broker_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          broker_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          impersonating_user_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          impersonating_user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          impersonating_user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string | null;
          office_id: string | null;
          subject: string;
          message: string;
          status: 'open' | 'in_progress' | 'resolved';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          office_id?: string | null;
          subject: string;
          message: string;
          status?: 'open' | 'in_progress' | 'resolved';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          office_id?: string | null;
          subject?: string;
          message?: string;
          status?: 'open' | 'in_progress' | 'resolved';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_events: {
        Row: {
          id: string;
          client_id: string;
          event_type: string | null;
          payload: Json | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          event_type?: string | null;
          payload?: Json | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          event_type?: string | null;
          payload?: Json | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type ProcessStep =
  | 'lead'
  | 'docs_pending'
  | 'docs_complete'
  | 'propostas_sent'
  | 'approved'
  | 'closed';

export type DocTypeTemplate = {
  id: string;
  label: string;
  description?: string;
  proponente: 'p1' | 'p2' | 'shared';
  is_mandatory: boolean;
  max_files: number;
};

export type UserRole = 'super_admin' | 'office_admin' | 'broker';

// Typed office settings/white_label for application use
export type OfficeWhiteLabel = {
  logo_url: string | null;
  primary_color: string;
  email_from_name: string;
};

export type OfficeSettings = {
  propostas_enabled: boolean;
  required_fields: string[];
  doc_types: DocTypeTemplate[];
  plan: string;
  stripe_customer_id: string | null;
};

export type BrokerSettings = {
  propostas_enabled: boolean | null;
};

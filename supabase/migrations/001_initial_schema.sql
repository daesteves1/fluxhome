-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- TABLES
-- =========================================

CREATE TABLE institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  white_label jsonb DEFAULT '{"logo_url":null,"primary_color":"#1E40AF","email_from_name":"FluxHome"}'::jsonb,
  settings jsonb DEFAULT '{"propostas_enabled":true,"required_fields":[],"doc_types":[],"plan":"free","stripe_customer_id":null}'::jsonb,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  phone text,
  two_fa_enabled bool DEFAULT false,
  role text NOT NULL CHECK (role IN ('super_admin','office_admin','broker')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  is_office_admin bool DEFAULT false,
  settings jsonb DEFAULT '{"propostas_enabled":null}'::jsonb,
  is_active bool DEFAULT true,
  invited_at timestamptz,
  activated_at timestamptz
);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin','office_admin','broker')),
  office_id uuid REFERENCES offices(id) ON DELETE CASCADE,
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  sent_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  p1_name text NOT NULL,
  p1_nif text,
  p1_email text,
  p1_phone text,
  p1_employment_type text,
  p1_birth_date date,
  p2_name text,
  p2_nif text,
  p2_email text,
  p2_phone text,
  p2_employment_type text,
  p2_birth_date date,
  mortgage_type text,
  property_value numeric,
  loan_amount numeric,
  term_months int,
  property_address text,
  notes_general text,
  process_step text DEFAULT 'lead' CHECK (process_step IN ('lead','docs_pending','docs_complete','propostas_sent','approved','closed')),
  portal_token uuid UNIQUE DEFAULT gen_random_uuid(),
  terms_accepted_at timestamptz,
  terms_signature_data text,
  terms_ip text,
  terms_user_agent text,
  email text,
  auth_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  proponente text DEFAULT 'shared' CHECK (proponente IN ('p1','p2','shared')),
  doc_type text,
  label text NOT NULL,
  description text,
  is_mandatory bool DEFAULT true,
  max_files int DEFAULT 5,
  sort_order int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending','uploaded','approved','rejected')),
  broker_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  file_size int,
  mime_type text,
  uploaded_by text NOT NULL CHECK (uploaded_by IN ('client','broker')),
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE RESTRICT,
  title text,
  comparison_data jsonb DEFAULT '[]'::jsonb,
  insurance_data jsonb DEFAULT '{}'::jsonb,
  one_time_charges jsonb DEFAULT '[]'::jsonb,
  monthly_charges jsonb DEFAULT '[]'::jsonb,
  notes text,
  is_visible_to_client bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE broker_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  impersonating_user_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type text,
  payload jsonb,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX idx_brokers_user_id ON brokers(user_id);
CREATE INDEX idx_brokers_office_id ON brokers(office_id);
CREATE INDEX idx_clients_broker_id ON clients(broker_id);
CREATE INDEX idx_clients_office_id ON clients(office_id);
CREATE INDEX idx_clients_portal_token ON clients(portal_token);
CREATE INDEX idx_document_requests_client_id ON document_requests(client_id);
CREATE INDEX idx_document_uploads_client_id ON document_uploads(client_id);
CREATE INDEX idx_document_uploads_request_id ON document_uploads(document_request_id);
CREATE INDEX idx_propostas_client_id ON propostas(client_id);
CREATE INDEX idx_broker_notes_client_id ON broker_notes(client_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- =========================================
-- UPDATED_AT TRIGGER
-- =========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER propostas_updated_at
  BEFORE UPDATE ON propostas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

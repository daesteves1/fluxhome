-- Add lead capture columns to offices
ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS lead_capture_enabled       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_capture_hero_title    text,
  ADD COLUMN IF NOT EXISTS lead_capture_hero_subtitle text,
  ADD COLUMN IF NOT EXISTS lead_capture_primary_color text,
  ADD COLUMN IF NOT EXISTS lead_capture_logo_url      text,
  ADD COLUMN IF NOT EXISTS bdp_intermediario_number   text;

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id             uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,

  -- Applicant 1
  p1_nome               text NOT NULL,
  p1_email              text,
  p1_telefone           text,
  p1_nif                text,
  p1_data_nascimento    date,
  p1_tipo_emprego       text,

  -- Applicant 2 (optional)
  p2_nome               text,
  p2_email              text,
  p2_telefone           text,
  p2_nif                text,
  p2_data_nascimento    date,
  p2_tipo_emprego       text,

  -- Operation
  tipo_operacao         text NOT NULL,  -- 'aquisicao' | 'construcao' | 'refinanciamento' | 'transferencia'
  valor_imovel          numeric,
  montante_pretendido   numeric,
  prazo_pretendido      integer,        -- months
  localizacao_imovel    text,

  -- Contact preferences
  horario_preferencial  text,           -- 'manha' | 'tarde' | 'qualquer'
  mensagem              text,

  -- Metadata
  status                text NOT NULL DEFAULT 'novo',
  -- 'novo' | 'visto' | 'em_contacto' | 'qualificado' | 'convertido' | 'descartado'
  assigned_broker_id    uuid REFERENCES brokers(id) ON DELETE SET NULL,
  converted_client_id   uuid REFERENCES clients(id) ON DELETE SET NULL,
  turnstile_token       text,
  ip_address            text,
  user_agent            text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS leads_office_id_idx ON leads(office_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at_trigger ON leads;
CREATE TRIGGER leads_updated_at_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Brokers of the same office can read leads
CREATE POLICY "brokers_read_office_leads" ON leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brokers
      WHERE brokers.office_id = leads.office_id
        AND brokers.user_id = auth.uid()
        AND brokers.is_active = true
    )
  );

-- Brokers of the same office can update leads (status changes, assignment, notes)
CREATE POLICY "brokers_update_office_leads" ON leads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brokers
      WHERE brokers.office_id = leads.office_id
        AND brokers.user_id = auth.uid()
        AND brokers.is_active = true
    )
  );

-- Insert is done via service role only (public API route uses service role client)
-- No public insert policy needed

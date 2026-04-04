-- ─── bank_propostas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_propostas (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id                  uuid NOT NULL REFERENCES brokers(id),
  office_id                  uuid NOT NULL REFERENCES offices(id),
  bank_name                  text NOT NULL,
  rate_type                  text CHECK (rate_type IN ('variavel', 'fixa', 'mista')),
  fixed_period_years         integer,
  loan_amount                numeric,
  term_months                integer,
  euribor_index              text CHECK (euribor_index IN ('3m', '6m', '12m', 'na')),
  spread                     numeric,
  tan                        numeric,
  taeg                       numeric,
  monthly_payment            numeric,
  -- Insurance — bank
  vida_banco                 numeric,
  multiriscos_banco          numeric,
  -- Insurance — external
  vida_externa               numeric,
  multiriscos_externa        numeric,
  -- One-time charges
  comissao_avaliacao         numeric,
  comissao_estudo            numeric,
  abertura_processo          numeric,
  comissao_formalizacao      numeric,
  comissao_solicitadoria     numeric,
  doc_particular_autenticado numeric,
  copia_certificada          numeric,
  imposto_selo_mutuo         numeric,
  imposto_selo_aquisicao     numeric,
  imt                        numeric,
  deposito_dpa               numeric,
  comissao_tramitacao        numeric,
  cheque_bancario            numeric,
  registo                    numeric,
  escritura                  numeric,
  -- Monthly charges
  manutencao_conta           numeric,
  manutencao_anual           boolean NOT NULL DEFAULT false,
  -- Other
  bank_pdf_path              text,
  notes                      text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- ─── mapa_comparativo ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mapa_comparativo (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id                 uuid NOT NULL REFERENCES brokers(id),
  office_id                 uuid NOT NULL REFERENCES offices(id),
  title                     text NOT NULL DEFAULT 'Mapa Comparativo',
  proposta_ids              jsonb NOT NULL DEFAULT '[]',
  recommended_proposta_id   uuid,
  highlighted_cells         jsonb NOT NULL DEFAULT '{}',
  is_visible_to_client      boolean NOT NULL DEFAULT false,
  broker_notes              text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE bank_propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapa_comparativo ENABLE ROW LEVEL SECURITY;

-- Brokers: full access to records in their office
CREATE POLICY "brokers_access_bank_propostas" ON bank_propostas
  FOR ALL TO authenticated
  USING (
    office_id IN (
      SELECT office_id FROM brokers WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "brokers_access_mapa_comparativo" ON mapa_comparativo
  FOR ALL TO authenticated
  USING (
    office_id IN (
      SELECT office_id FROM brokers WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Anon (portal): read only visible mapos via portal token
CREATE POLICY "portal_read_mapa_comparativo" ON mapa_comparativo
  FOR SELECT TO anon
  USING (
    is_visible_to_client = true
    AND client_id IN (SELECT id FROM clients WHERE portal_token IS NOT NULL)
  );

CREATE POLICY "portal_read_bank_propostas" ON bank_propostas
  FOR SELECT TO anon
  USING (
    client_id IN (
      SELECT mc.client_id FROM mapa_comparativo mc
      WHERE mc.is_visible_to_client = true
        AND id::text = ANY(
          SELECT jsonb_array_elements_text(mc.proposta_ids) FROM mapa_comparativo mc2
          WHERE mc2.client_id = bank_propostas.client_id AND mc2.is_visible_to_client = true
        )
    )
  );

-- ─── Updated-at triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_propostas_updated_at
  BEFORE UPDATE ON bank_propostas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mapa_comparativo_updated_at
  BEFORE UPDATE ON mapa_comparativo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

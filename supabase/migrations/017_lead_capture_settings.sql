-- New office-level settings for lead capture page
ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS lead_capture_headline        text,
  ADD COLUMN IF NOT EXISTS lead_capture_subheadline     text,
  ADD COLUMN IF NOT EXISTS lead_capture_cta_label       text,
  ADD COLUMN IF NOT EXISTS lead_capture_show_bank_logos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS website_url                  text,
  ADD COLUMN IF NOT EXISTS office_nif                   text,
  ADD COLUMN IF NOT EXISTS office_address               text;

-- Extra fields captured by the redesigned form
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS rendimento_mensal   numeric,
  ADD COLUMN IF NOT EXISTS num_proponentes     integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS imovel_escolhido    boolean,
  ADD COLUMN IF NOT EXISTS vender_imovel_atual boolean,
  ADD COLUMN IF NOT EXISTS consent_marketing   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nome_proprio        text,
  ADD COLUMN IF NOT EXISTS apelido             text;

-- Add per-proponent insurance fields to bank_propostas
-- Run via Supabase SQL editor or psql

ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS vida_p1_banco numeric;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS vida_p1_externa numeric;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS vida_p2_banco numeric;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS vida_p2_externa numeric;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS multiriscos_banco numeric;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS multiriscos_externa numeric;

ALTER TABLE bank_propostas
  ADD COLUMN IF NOT EXISTS vida_p1_recomendada text DEFAULT 'externa'
  CHECK (vida_p1_recomendada IN ('banco', 'externa'));

ALTER TABLE bank_propostas
  ADD COLUMN IF NOT EXISTS vida_p2_recomendada text DEFAULT 'externa'
  CHECK (vida_p2_recomendada IN ('banco', 'externa'));

ALTER TABLE bank_propostas
  ADD COLUMN IF NOT EXISTS multiriscos_recomendada text DEFAULT 'banco'
  CHECK (multiriscos_recomendada IN ('banco', 'externa'));

-- Add settings column to offices if missing
ALTER TABLE offices ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- Add settings column to brokers if missing
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- Migrate existing test data (update as needed)
-- UPDATE bank_propostas SET multiriscos_banco = 18.58 WHERE id = 'cb99abe8-db09-4056-812f-33235a6d9f01';

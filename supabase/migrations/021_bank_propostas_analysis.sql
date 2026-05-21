-- Passo 3: add FINE analysis fields to bank_propostas
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS juros_totais NUMERIC;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS cenario_stress_euribor NUMERIC;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS cenario_stress_tan NUMERIC;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS cenario_stress_prestacao NUMERIC;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS cenario_stress_mtic NUMERIC;

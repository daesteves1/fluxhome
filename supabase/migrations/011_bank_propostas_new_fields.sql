-- Add new fields to bank_propostas table
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS validade_ate date;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS valor_residual numeric;
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS condicoes_spread text[];
ALTER TABLE bank_propostas ADD COLUMN IF NOT EXISTS outras_comissoes_mensais numeric;

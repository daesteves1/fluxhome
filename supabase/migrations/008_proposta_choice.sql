-- Add proposta_choice column to clients table
-- Stores the client's confirmed choice from a proposta comparison
-- Structure: { proposta_id, bank_name, insurance_choice, confirmed_at }
ALTER TABLE clients ADD COLUMN IF NOT EXISTS proposta_choice jsonb;

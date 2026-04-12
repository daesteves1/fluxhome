-- Add document_template column to offices table
ALTER TABLE offices ADD COLUMN IF NOT EXISTS document_template jsonb DEFAULT '[]';

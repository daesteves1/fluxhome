-- Fix document_requests status constraint: remove 'uploaded', ensure valid values
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('pending', 'em_analise', 'approved', 'rejected'));

-- Migrate any lingering 'uploaded' rows to 'em_analise'
UPDATE document_requests SET status = 'em_analise' WHERE status = 'uploaded';

-- Add proponente and is_mandatory columns if not already present
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS proponente text NOT NULL DEFAULT 'p1';
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true;

-- =========================================
-- REMOVE 'uploaded' STATUS — REPLACE WITH 'em_analise'
-- =========================================

-- Migrate any existing 'uploaded' rows first
UPDATE document_requests SET status = 'em_analise' WHERE status = 'uploaded';

-- Drop old constraint and add new one (no 'uploaded')
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('pending', 'em_analise', 'approved', 'rejected'));

-- =========================================
-- FIX MAX_FILES FOR EXISTING DOCUMENT REQUESTS
-- =========================================

-- Per-proponente docs (doc_type = 'p1_key' or 'p2_key')
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%bi_cc';
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%comp_morada';
UPDATE document_requests SET max_files = 3 WHERE doc_type LIKE '%recibos';
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%decl_irs';
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%nota_liq_irs';
UPDATE document_requests SET max_files = 3 WHERE doc_type LIKE '%extratos_banco';
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%mapa_resp';
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%contrato_trab';
UPDATE document_requests SET max_files = 1 WHERE doc_type LIKE '%decl_inicio_at';

-- Shared / specific docs (doc_type = key directly)
UPDATE document_requests SET max_files = 2 WHERE doc_type = 'cpcv';
UPDATE document_requests SET max_files = 1 WHERE doc_type = 'cad_pred';
UPDATE document_requests SET max_files = 1 WHERE doc_type = 'cert_perm';
UPDATE document_requests SET max_files = 1 WHERE doc_type = 'fich_tec';
UPDATE document_requests SET max_files = 1 WHERE doc_type = 'contrato_cred_atual';
UPDATE document_requests SET max_files = 3 WHERE doc_type = 'extratos_emp';

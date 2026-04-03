-- =========================================
-- ADD em_analise TO document_requests STATUS
-- =========================================

ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('pending', 'em_analise', 'uploaded', 'approved', 'rejected'));

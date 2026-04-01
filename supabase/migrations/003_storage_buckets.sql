-- =========================================
-- STORAGE BUCKETS
-- =========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('client-documents', 'client-documents', false, 52428800, ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('office-assets', 'office-assets', true, 5242880, ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml'
  ]),
  ('terms-signatures', 'terms-signatures', false, 5242880, ARRAY[
    'image/png',
    'application/pdf'
  ])
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- STORAGE POLICIES
-- =========================================

-- client-documents: authenticated can read their office's docs
CREATE POLICY "authenticated_read_client_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
      OR
      (
        (SELECT get_broker_office_id()) IS NOT NULL AND
        (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
      )
    )
  );

CREATE POLICY "authenticated_insert_client_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents' AND
    (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
  );

CREATE POLICY "authenticated_delete_client_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'office_admin')
      OR
      (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
    )
  );

-- anon can insert to client-documents (for portal uploads)
CREATE POLICY "anon_insert_client_docs" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'client-documents');

-- office-assets: public bucket, authenticated can insert/update
CREATE POLICY "office_assets_authenticated_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'office-assets' AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'office_admin') AND
      (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
    )
  );

-- terms-signatures: authenticated read
CREATE POLICY "authenticated_read_terms" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'terms-signatures' AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
      OR
      (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
    )
  );

-- anon can insert terms signatures (from portal)
CREATE POLICY "anon_insert_terms" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'terms-signatures');

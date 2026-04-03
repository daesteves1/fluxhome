-- =========================================
-- STORAGE POLICIES FOR propostas-docs
-- (bucket created in 004, policies missing)
-- =========================================

-- Authenticated users can read propostas-docs for their office
CREATE POLICY "authenticated_read_propostas_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'propostas-docs' AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
      OR
      (
        (SELECT get_broker_office_id()) IS NOT NULL AND
        (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
      )
    )
  );

-- Authenticated brokers/admins can insert propostas-docs for their office
CREATE POLICY "authenticated_insert_propostas_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'propostas-docs' AND
    (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
  );

-- Authenticated admins can delete propostas-docs for their office
CREATE POLICY "authenticated_delete_propostas_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'propostas-docs' AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'office_admin')
      OR
      (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
    )
  );

-- =========================================
-- STORAGE POLICIES FOR office-assets
-- (update policy missing from 003)
-- =========================================

CREATE POLICY "office_assets_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'office-assets' AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'office_admin') AND
    (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
  )
  WITH CHECK (
    bucket_id = 'office-assets' AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'office_admin') AND
    (storage.foldername(name))[1] = (SELECT get_broker_office_id())::text
  );

-- office-assets: public read (bucket is public, but explicit policy for clarity)
CREATE POLICY "office_assets_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'office-assets');

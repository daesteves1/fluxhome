-- =========================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_broker_office_id()
RETURNS uuid AS $$
  SELECT office_id FROM brokers WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_broker_id()
RETURNS uuid AS $$
  SELECT id FROM brokers WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================
-- INSTITUTIONS
-- =========================================

-- super_admin: full access
CREATE POLICY "super_admin_institutions_all" ON institutions
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- office_admin / broker: read only
CREATE POLICY "office_users_institutions_read" ON institutions
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('office_admin', 'broker'));

-- =========================================
-- OFFICES
-- =========================================

CREATE POLICY "super_admin_offices_all" ON offices
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_users_own_office_read" ON offices
  FOR SELECT TO authenticated
  USING (id = get_broker_office_id());

CREATE POLICY "office_admin_own_office_update" ON offices
  FOR UPDATE TO authenticated
  USING (id = get_broker_office_id() AND get_user_role() = 'office_admin')
  WITH CHECK (id = get_broker_office_id() AND get_user_role() = 'office_admin');

-- anon can read office for portal
CREATE POLICY "anon_offices_read" ON offices
  FOR SELECT TO anon
  USING (is_active = true);

-- =========================================
-- USERS
-- =========================================

CREATE POLICY "super_admin_users_all" ON users
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "users_read_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "office_admin_read_office_users" ON users
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'office_admin' AND
    id IN (
      SELECT user_id FROM brokers WHERE office_id = get_broker_office_id()
    )
  );

-- =========================================
-- BROKERS
-- =========================================

CREATE POLICY "super_admin_brokers_all" ON brokers
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_brokers_office" ON brokers
  FOR ALL TO authenticated
  USING (office_id = get_broker_office_id() AND get_user_role() = 'office_admin')
  WITH CHECK (office_id = get_broker_office_id() AND get_user_role() = 'office_admin');

CREATE POLICY "broker_read_own" ON brokers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =========================================
-- INVITATIONS
-- =========================================

CREATE POLICY "super_admin_invitations_all" ON invitations
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_invitations_office" ON invitations
  FOR ALL TO authenticated
  USING (office_id = get_broker_office_id() AND get_user_role() = 'office_admin')
  WITH CHECK (office_id = get_broker_office_id() AND get_user_role() = 'office_admin');

-- anon can read invitation by token (for activation)
CREATE POLICY "anon_invitations_by_token" ON invitations
  FOR SELECT TO anon
  USING (true);

-- =========================================
-- CLIENTS
-- =========================================

CREATE POLICY "super_admin_clients_all" ON clients
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_clients_office" ON clients
  FOR ALL TO authenticated
  USING (office_id = get_broker_office_id() AND get_user_role() = 'office_admin')
  WITH CHECK (office_id = get_broker_office_id() AND get_user_role() = 'office_admin');

CREATE POLICY "broker_own_clients" ON clients
  FOR ALL TO authenticated
  USING (broker_id = get_broker_id() AND get_user_role() = 'broker')
  WITH CHECK (broker_id = get_broker_id() AND get_user_role() = 'broker');

-- anon: read own client row by portal_token (for portal)
CREATE POLICY "anon_client_portal_read" ON clients
  FOR SELECT TO anon
  USING (portal_token IS NOT NULL);

-- anon: update terms fields only
CREATE POLICY "anon_client_terms_update" ON clients
  FOR UPDATE TO anon
  USING (portal_token IS NOT NULL)
  WITH CHECK (portal_token IS NOT NULL);

-- =========================================
-- DOCUMENT REQUESTS
-- =========================================

CREATE POLICY "super_admin_doc_requests_all" ON document_requests
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_doc_requests_office" ON document_requests
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  )
  WITH CHECK (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  );

CREATE POLICY "broker_own_doc_requests" ON document_requests
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'broker' AND
    client_id IN (SELECT id FROM clients WHERE broker_id = get_broker_id())
  )
  WITH CHECK (
    get_user_role() = 'broker' AND
    client_id IN (SELECT id FROM clients WHERE broker_id = get_broker_id())
  );

-- anon: read document requests for their client
CREATE POLICY "anon_doc_requests_portal" ON document_requests
  FOR SELECT TO anon
  USING (true);

-- =========================================
-- DOCUMENT UPLOADS
-- =========================================

CREATE POLICY "super_admin_doc_uploads_all" ON document_uploads
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_doc_uploads_office" ON document_uploads
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  )
  WITH CHECK (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  );

CREATE POLICY "broker_own_doc_uploads" ON document_uploads
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'broker' AND
    client_id IN (SELECT id FROM clients WHERE broker_id = get_broker_id())
  )
  WITH CHECK (
    get_user_role() = 'broker' AND
    client_id IN (SELECT id FROM clients WHERE broker_id = get_broker_id())
  );

-- anon: insert uploads for their client portal
CREATE POLICY "anon_doc_uploads_insert" ON document_uploads
  FOR INSERT TO anon
  WITH CHECK (true);

-- anon: read own uploads
CREATE POLICY "anon_doc_uploads_read" ON document_uploads
  FOR SELECT TO anon
  USING (true);

-- =========================================
-- PROPOSTAS
-- =========================================

CREATE POLICY "super_admin_propostas_all" ON propostas
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_propostas_office" ON propostas
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  )
  WITH CHECK (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  );

CREATE POLICY "broker_own_propostas" ON propostas
  FOR ALL TO authenticated
  USING (broker_id = get_broker_id() AND get_user_role() = 'broker')
  WITH CHECK (broker_id = get_broker_id() AND get_user_role() = 'broker');

-- anon: read visible propostas for portal
CREATE POLICY "anon_propostas_visible" ON propostas
  FOR SELECT TO anon
  USING (is_visible_to_client = true);

-- =========================================
-- BROKER NOTES
-- =========================================

CREATE POLICY "super_admin_broker_notes_all" ON broker_notes
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "office_admin_broker_notes_office" ON broker_notes
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  )
  WITH CHECK (
    get_user_role() = 'office_admin' AND
    client_id IN (SELECT id FROM clients WHERE office_id = get_broker_office_id())
  );

CREATE POLICY "broker_own_notes" ON broker_notes
  FOR ALL TO authenticated
  USING (broker_id = get_broker_id() AND get_user_role() = 'broker')
  WITH CHECK (broker_id = get_broker_id() AND get_user_role() = 'broker');

-- =========================================
-- AUDIT LOG
-- =========================================

CREATE POLICY "super_admin_audit_all" ON audit_log
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "audit_insert_authenticated" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =========================================
-- NOTIFICATION EVENTS
-- =========================================

CREATE POLICY "super_admin_notifications_all" ON notification_events
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "broker_notifications_own" ON notification_events
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM clients WHERE broker_id = get_broker_id())
  );

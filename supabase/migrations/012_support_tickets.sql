CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  office_id uuid REFERENCES offices(id),
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brokers_own_tickets" ON support_tickets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_tickets" ON support_tickets
  FOR ALL USING (auth.role() = 'service_role');

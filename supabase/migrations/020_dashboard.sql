-- ── dashboard_snapshots ──────────────────────────────────────────────────────
-- Materialized dashboard KPIs refreshed every 15-30 min.
-- scope_key = 'office' for office-wide snapshot, or broker UUID for broker scope.
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id     uuid        NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  scope_key     text        NOT NULL, -- 'office' | broker_id
  snapshot_date date        NOT NULL DEFAULT CURRENT_DATE,
  data          jsonb       NOT NULL DEFAULT '{}',
  computed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (office_id, scope_key, snapshot_date)
);

ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_snapshots" ON dashboard_snapshots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "office_read_snapshots" ON dashboard_snapshots
  FOR SELECT USING (
    office_id IN (
      SELECT office_id FROM brokers
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_snapshots_office_scope
  ON dashboard_snapshots(office_id, scope_key, snapshot_date DESC);

-- ── dashboard_layer_toggles ──────────────────────────────────────────────────
-- Super-admin toggles individual dashboard layers per office.
CREATE TABLE IF NOT EXISTS dashboard_layer_toggles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id   uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  layer       text NOT NULL CHECK (layer IN ('hero', 'action_board', 'pipeline_health', 'performance')),
  enabled     bool NOT NULL DEFAULT true,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (office_id, layer)
);

ALTER TABLE dashboard_layer_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_layer_toggles" ON dashboard_layer_toggles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "office_read_layer_toggles" ON dashboard_layer_toggles
  FOR SELECT USING (
    office_id IN (
      SELECT office_id FROM brokers
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_layer_toggles_office
  ON dashboard_layer_toggles(office_id);

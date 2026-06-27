-- ============================================================
-- Sprint 2 — dossiers + photos
-- Idempotent (safe to re-run)
-- ============================================================

-- ── Ensure handle_updated_at function exists ────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Table dossiers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dossiers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id          uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_by       uuid NOT NULL REFERENCES profiles(id),
  plate            text,
  no_plate         boolean NOT NULL DEFAULT false,
  vehicle_type     text NOT NULL DEFAULT 'unknown'
                   CHECK (vehicle_type IN ('va', 'epave', 'unknown')),
  vehicle_brand    text,
  vehicle_model    text,
  vehicle_color    text,
  location_spot    text,
  location_notes   text,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN (
                     'open', 'validated', 'lrar_sent', 'deadline_running',
                     'deadline_expired', 'opj_contacted', 'removal_scheduled',
                     'resolved', 'cancelled'
                   )),
  lrar_sent_at     timestamptz,
  deadline_at      timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dossiers_org_idx  ON dossiers(organization_id);
CREATE INDEX IF NOT EXISTS dossiers_site_idx ON dossiers(site_id);
CREATE INDEX IF NOT EXISTS dossiers_status_idx ON dossiers(status);

-- ── Table photos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id   uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  photo_type   text NOT NULL DEFAULT 'general'
               CHECK (photo_type IN ('plate', 'front', 'side', 'rear', 'damage', 'general')),
  taken_at     timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_dossier_idx ON photos(dossier_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos   ENABLE ROW LEVEL SECURITY;

-- dossiers: members of the same org can read/write
DROP POLICY IF EXISTS "dossiers_select" ON dossiers;
CREATE POLICY "dossiers_select" ON dossiers
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dossiers_insert" ON dossiers;
CREATE POLICY "dossiers_insert" ON dossiers
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "dossiers_update" ON dossiers;
CREATE POLICY "dossiers_update" ON dossiers
  FOR UPDATE USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- photos: same org check via dossier
DROP POLICY IF EXISTS "photos_select" ON photos;
CREATE POLICY "photos_select" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dossiers d
      WHERE d.id = photos.dossier_id
        AND d.organization_id = (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "photos_insert" ON photos;
CREATE POLICY "photos_insert" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers d
      WHERE d.id = photos.dossier_id
        AND d.organization_id = (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- ── Trigger updated_at ───────────────────────────────────────
DROP TRIGGER IF EXISTS dossiers_updated_at ON dossiers;
CREATE TRIGGER dossiers_updated_at
  BEFORE UPDATE ON dossiers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

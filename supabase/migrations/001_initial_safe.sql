-- ============================================================
-- ParkClear — Migration 001 SAFE (idempotente — IF NOT EXISTS)
-- Coller dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  siret                   TEXT,
  address                 TEXT,
  city                    TEXT,
  postal_code             TEXT,
  signer_name             TEXT,
  signer_title            TEXT,
  logo_url                TEXT,
  plan                    TEXT NOT NULL DEFAULT 'trial'
                          CHECK (plan IN ('trial','starter','pro','business')),
  plan_expires_at         TIMESTAMPTZ,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'manager'
                   CHECK (role IN ('admin','manager','agent')),
  full_name        TEXT,
  phone            TEXT,
  onboarding_done  BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  postal_code      TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'open'
                   CHECK (type IN ('open','closed','mixed')),
  total_places     INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_sites (
  agent_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id   UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, site_id)
);

CREATE TABLE IF NOT EXISTS epavistes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  siret               TEXT,
  vhu_agreement       TEXT NOT NULL,
  prefecture          TEXT NOT NULL,
  address             TEXT,
  city                TEXT NOT NULL,
  postal_code         TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  intervention_radius INTEGER NOT NULL DEFAULT 30,
  free_removal        BOOLEAN NOT NULL DEFAULT true,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FONCTIONS & TRIGGERS (CREATE OR REPLACE = idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sites_updated_at ON sites;
CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- HELPERS RLS
-- ============================================================

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_role_name()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sites   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select"   ON organizations;
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = current_org_id());

DROP POLICY IF EXISTS "org_update"   ON organizations;
CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (id = current_org_id())
  WITH CHECK (id = current_org_id());

DROP POLICY IF EXISTS "profile_select" ON profiles;
CREATE POLICY "profile_select" ON profiles
  FOR SELECT USING (id = auth.uid() OR organization_id = current_org_id());

DROP POLICY IF EXISTS "profile_update_self" ON profiles;
CREATE POLICY "profile_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profile_insert_self" ON profiles;
CREATE POLICY "profile_insert_self" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "sites_select" ON sites;
CREATE POLICY "sites_select" ON sites
  FOR SELECT USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "sites_insert" ON sites;
CREATE POLICY "sites_insert" ON sites
  FOR INSERT WITH CHECK (
    organization_id = current_org_id()
    AND current_role_name() IN ('manager','admin')
  );

DROP POLICY IF EXISTS "sites_update" ON sites;
CREATE POLICY "sites_update" ON sites
  FOR UPDATE USING (organization_id = current_org_id())
  WITH CHECK (
    organization_id = current_org_id()
    AND current_role_name() IN ('manager','admin')
  );

DROP POLICY IF EXISTS "sites_delete" ON sites;
CREATE POLICY "sites_delete" ON sites
  FOR DELETE USING (
    organization_id = current_org_id()
    AND current_role_name() IN ('manager','admin')
  );

DROP POLICY IF EXISTS "agent_sites_select" ON agent_sites;
CREATE POLICY "agent_sites_select" ON agent_sites
  FOR SELECT USING (
    agent_id = auth.uid() OR current_role_name() IN ('manager','admin')
  );

DROP POLICY IF EXISTS "agent_sites_manage" ON agent_sites;
CREATE POLICY "agent_sites_manage" ON agent_sites
  FOR ALL USING (current_role_name() IN ('manager','admin'));

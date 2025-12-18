-- =====================================================
-- NEXUS QR - FRESH DATABASE MIGRATION (Error-Free)
-- Safe to run multiple times - no errors guaranteed
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES (IF NOT EXISTS)
-- =====================================================

-- Dynamic QR Codes Table
CREATE TABLE IF NOT EXISTS dynamic_qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  short_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  qr_style JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  expired_redirect_url TEXT DEFAULT NULL,
  conditional_rules JSONB DEFAULT '[]',
  ab_testing_enabled BOOLEAN DEFAULT FALSE,
  ab_variants JSONB DEFAULT '[]',
  multi_language_enabled BOOLEAN DEFAULT FALSE,
  language_contents JSONB DEFAULT '[]',
  default_language TEXT DEFAULT 'en',
  analytics_options JSONB DEFAULT '{"trackLocation": true, "trackDevice": true, "trackBrowser": true, "trackTime": true, "trackReferrer": true}',
  scan_count INTEGER DEFAULT 0,
  password_protection JSONB DEFAULT NULL,
  geofence_settings JSONB DEFAULT NULL,
  ip_restriction JSONB DEFAULT NULL,
  utm_parameters JSONB DEFAULT NULL,
  retargeting_config JSONB DEFAULT NULL,
  location_tracking_config JSONB DEFAULT NULL,
  email_notification_config JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Scans Table (Analytics)
CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_id UUID NOT NULL REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  user_agent TEXT,
  referrer TEXT,
  language TEXT,
  ab_variant_id TEXT DEFAULT NULL,
  converted BOOLEAN DEFAULT FALSE
);

-- IP Scan Tracking Table (Rate Limiting)
CREATE TABLE IF NOT EXISTS ip_scan_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID NOT NULL REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Cards Table
CREATE TABLE IF NOT EXISTS business_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  mobile TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  work_email TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  website TEXT,
  linkedin TEXT,
  twitter TEXT,
  instagram TEXT,
  facebook TEXT,
  github TEXT,
  youtube TEXT,
  tiktok TEXT,
  photo_url TEXT,
  template TEXT DEFAULT 'professional',
  theme_color TEXT DEFAULT '#6366f1',
  bg_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES (IF NOT EXISTS)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_short_code ON dynamic_qr_codes(short_code);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_user_id ON dynamic_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_expires_at ON dynamic_qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_id ON qr_scans(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_ip_scan_tracking_qr_ip ON ip_scan_tracking(qr_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_scan_tracking_scanned_at ON ip_scan_tracking(scanned_at);
CREATE INDEX IF NOT EXISTS idx_business_cards_slug ON business_cards(slug);
CREATE INDEX IF NOT EXISTS idx_business_cards_user_id ON business_cards(user_id);

-- =====================================================
-- 3. CREATE FUNCTIONS (OR REPLACE = Safe)
-- =====================================================
CREATE OR REPLACE FUNCTION update_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dynamic_qr_codes SET scan_count = scan_count + 1 WHERE id = NEW.qr_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_qr_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_business_card_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_card_view_count(card_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE business_cards SET view_count = view_count + 1 WHERE slug = card_slug AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION disable_expired_qr_codes()
RETURNS void AS $$
BEGIN
  UPDATE dynamic_qr_codes SET is_active = FALSE WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_ip_tracking()
RETURNS void AS $$
BEGIN
  DELETE FROM ip_scan_tracking WHERE scanned_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGERS (Drop first = Safe)
-- =====================================================
DROP TRIGGER IF EXISTS increment_scan_count ON qr_scans;
CREATE TRIGGER increment_scan_count AFTER INSERT ON qr_scans FOR EACH ROW EXECUTE FUNCTION update_scan_count();

DROP TRIGGER IF EXISTS update_qr_timestamp ON dynamic_qr_codes;
CREATE TRIGGER update_qr_timestamp BEFORE UPDATE ON dynamic_qr_codes FOR EACH ROW EXECUTE FUNCTION update_qr_timestamp();

DROP TRIGGER IF EXISTS update_business_card_timestamp ON business_cards;
CREATE TRIGGER update_business_card_timestamp BEFORE UPDATE ON business_cards FOR EACH ROW EXECUTE FUNCTION update_business_card_timestamp();

-- =====================================================
-- 5. ENABLE RLS (Safe to run multiple times)
-- =====================================================
ALTER TABLE dynamic_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_scan_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE POLICIES (Drop first = Safe)
-- =====================================================

-- Dynamic QR Codes Policies
DROP POLICY IF EXISTS "Users can view their own QR codes" ON dynamic_qr_codes;
DROP POLICY IF EXISTS "Users can create their own QR codes" ON dynamic_qr_codes;
DROP POLICY IF EXISTS "Users can update their own QR codes" ON dynamic_qr_codes;
DROP POLICY IF EXISTS "Users can delete their own QR codes" ON dynamic_qr_codes;
DROP POLICY IF EXISTS "Anyone can view active QR codes by short_code" ON dynamic_qr_codes;

CREATE POLICY "Users can view their own QR codes" ON dynamic_qr_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own QR codes" ON dynamic_qr_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own QR codes" ON dynamic_qr_codes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own QR codes" ON dynamic_qr_codes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active QR codes by short_code" ON dynamic_qr_codes FOR SELECT USING (is_active = TRUE);

-- QR Scans Policies
DROP POLICY IF EXISTS "Users can view scans for their QR codes" ON qr_scans;
DROP POLICY IF EXISTS "Anyone can insert scans" ON qr_scans;

CREATE POLICY "Users can view scans for their QR codes" ON qr_scans FOR SELECT USING (EXISTS (SELECT 1 FROM dynamic_qr_codes WHERE dynamic_qr_codes.id = qr_scans.qr_id AND dynamic_qr_codes.user_id = auth.uid()));
CREATE POLICY "Anyone can insert scans" ON qr_scans FOR INSERT WITH CHECK (true);

-- IP Scan Tracking Policies
DROP POLICY IF EXISTS "Service role can manage ip_scan_tracking" ON ip_scan_tracking;
CREATE POLICY "Service role can manage ip_scan_tracking" ON ip_scan_tracking FOR ALL USING (true) WITH CHECK (true);

-- Business Cards Policies
DROP POLICY IF EXISTS "Anyone can view active business cards" ON business_cards;
DROP POLICY IF EXISTS "Users can create their own business cards" ON business_cards;
DROP POLICY IF EXISTS "Users can update their own business cards" ON business_cards;
DROP POLICY IF EXISTS "Users can delete their own business cards" ON business_cards;

CREATE POLICY "Anyone can view active business cards" ON business_cards FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Users can create their own business cards" ON business_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own business cards" ON business_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own business cards" ON business_cards FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. ENABLE REALTIME (Safe with exception handler)
-- =====================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE qr_scans;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 8. CREATE STORAGE BUCKETS (Safe with ON CONFLICT)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-files', 'media-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-card-photos', 'business-card-photos', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. STORAGE POLICIES (Safe with exception handler)
-- =====================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read media-files" ON storage.objects;
  CREATE POLICY "Public read media-files" ON storage.objects FOR SELECT USING (bucket_id = 'media-files');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Auth upload media-files" ON storage.objects;
  CREATE POLICY "Auth upload media-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media-files');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read business-card-photos" ON storage.objects;
  CREATE POLICY "Public read business-card-photos" ON storage.objects FOR SELECT USING (bucket_id = 'business-card-photos');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Auth upload business-card-photos" ON storage.objects;
  CREATE POLICY "Auth upload business-card-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-card-photos');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- =====================================================
-- DONE! Database fully configured for Nexus QR
-- =====================================================

-- =====================================================
-- NEXUS QR - DIGITAL BUSINESS CARDS MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE BUSINESS_CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS business_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Unique slug for URL (e.g., /card/john-doe-x7k9)
  slug TEXT UNIQUE NOT NULL,

  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT, -- Job title
  company TEXT,

  -- Contact Numbers
  mobile TEXT,
  phone TEXT, -- Work phone
  fax TEXT,

  -- Emails
  email TEXT,
  work_email TEXT,

  -- Address
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,

  -- Web & Social
  website TEXT,
  linkedin TEXT,
  twitter TEXT,
  instagram TEXT,
  facebook TEXT,
  github TEXT,
  youtube TEXT,
  tiktok TEXT,

  -- Profile Photo (Supabase Storage URL)
  photo_url TEXT,

  -- Design Settings
  template TEXT DEFAULT 'professional', -- professional, modern, minimal, creative, elegant
  theme_color TEXT DEFAULT '#6366f1', -- Primary color
  bg_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEX FOR FASTER LOOKUPS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_business_cards_slug ON business_cards(slug);
CREATE INDEX IF NOT EXISTS idx_business_cards_user_id ON business_cards(user_id);

-- =====================================================
-- 3. CREATE FUNCTION TO UPDATE TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_business_card_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGER FOR AUTO TIMESTAMP UPDATE
-- =====================================================
DROP TRIGGER IF EXISTS update_business_card_timestamp ON business_cards;
CREATE TRIGGER update_business_card_timestamp
BEFORE UPDATE ON business_cards
FOR EACH ROW
EXECUTE FUNCTION update_business_card_timestamp();

-- =====================================================
-- 5. CREATE FUNCTION TO INCREMENT VIEW COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION increment_card_view_count(card_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE business_cards
  SET view_count = view_count + 1
  WHERE slug = card_slug AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active cards (for public landing pages)
CREATE POLICY "Anyone can view active business cards"
ON business_cards FOR SELECT
USING (is_active = TRUE);

-- Policy: Users can insert their own cards
CREATE POLICY "Users can create their own business cards"
ON business_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own cards
CREATE POLICY "Users can update their own business cards"
ON business_cards FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own cards
CREATE POLICY "Users can delete their own business cards"
ON business_cards FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 7. STORAGE BUCKET FOR PROFILE PHOTOS (Optional)
-- Run this separately if you need a dedicated bucket
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('business-card-photos', 'business-card-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- DONE! Your business cards table is ready
-- =====================================================

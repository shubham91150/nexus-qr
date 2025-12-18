-- =====================================================
-- NEXUS QR - SECURE STORAGE POLICIES
-- Private buckets with ownership-based access
-- Run in Supabase SQL Editor after creating buckets
-- =====================================================

-- STEP 1: Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- QR-MEDIA BUCKET POLICIES (images, videos, audio)
-- =====================================================

-- User can READ only their own files
DROP POLICY IF EXISTS "User can read own qr media" ON storage.objects;
CREATE POLICY "User can read own qr media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'qr-media'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can UPLOAD only inside their own folder
DROP POLICY IF EXISTS "User upload own qr media" ON storage.objects;
CREATE POLICY "User upload own qr media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qr-media'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can UPDATE only their own files
DROP POLICY IF EXISTS "User update own qr media" ON storage.objects;
CREATE POLICY "User update own qr media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'qr-media'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can DELETE only their own files
DROP POLICY IF EXISTS "User delete own qr media" ON storage.objects;
CREATE POLICY "User delete own qr media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qr-media'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- QR-DOCS BUCKET POLICIES (pdf, documents, zip)
-- =====================================================

-- User can READ only their own documents
DROP POLICY IF EXISTS "User can read own qr docs" ON storage.objects;
CREATE POLICY "User can read own qr docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'qr-docs'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can UPLOAD only inside their own folder
DROP POLICY IF EXISTS "User upload own qr docs" ON storage.objects;
CREATE POLICY "User upload own qr docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qr-docs'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can UPDATE only their own documents
DROP POLICY IF EXISTS "User update own qr docs" ON storage.objects;
CREATE POLICY "User update own qr docs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'qr-docs'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can DELETE only their own documents
DROP POLICY IF EXISTS "User delete own qr docs" ON storage.objects;
CREATE POLICY "User delete own qr docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qr-docs'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- BUSINESS CARD PHOTOS BUCKET POLICIES
-- =====================================================

-- User can READ only their own photos
DROP POLICY IF EXISTS "User can read own card photos" ON storage.objects;
CREATE POLICY "User can read own card photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'business-card-photos'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can UPLOAD only inside their own folder
DROP POLICY IF EXISTS "User upload own card photos" ON storage.objects;
CREATE POLICY "User upload own card photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-card-photos'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- User can DELETE only their own photos
DROP POLICY IF EXISTS "User delete own card photos" ON storage.objects;
CREATE POLICY "User delete own card photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-card-photos'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- DONE!
-- Now create buckets in Dashboard (Public: OFF):
-- 1. qr-media
-- 2. qr-docs
-- 3. business-card-photos
-- =====================================================

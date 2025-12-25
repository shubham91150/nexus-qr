-- QR Code Folders Migration
-- Run this in Supabase SQL Editor

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS qr_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1', -- Default indigo color
  icon TEXT DEFAULT 'folder', -- Icon name
  parent_id UUID REFERENCES qr_folders(id) ON DELETE SET NULL, -- For nested folders
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add folder_id to dynamic_qr_codes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dynamic_qr_codes' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE dynamic_qr_codes ADD COLUMN folder_id UUID REFERENCES qr_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_folders_user_id ON qr_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_folders_parent_id ON qr_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_folder_id ON dynamic_qr_codes(folder_id);

-- 4. Enable RLS on qr_folders
ALTER TABLE qr_folders ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for qr_folders
DROP POLICY IF EXISTS "Users can view their own folders" ON qr_folders;
CREATE POLICY "Users can view their own folders" ON qr_folders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own folders" ON qr_folders;
CREATE POLICY "Users can insert their own folders" ON qr_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own folders" ON qr_folders;
CREATE POLICY "Users can update their own folders" ON qr_folders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own folders" ON qr_folders;
CREATE POLICY "Users can delete their own folders" ON qr_folders
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updated_at
DROP TRIGGER IF EXISTS folder_updated_at ON qr_folders;
CREATE TRIGGER folder_updated_at
  BEFORE UPDATE ON qr_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_updated_at();

-- 8. Create function to get folder QR count
CREATE OR REPLACE FUNCTION get_folder_qr_count(folder_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM dynamic_qr_codes WHERE folder_id = folder_uuid);
END;
$$ LANGUAGE plpgsql;

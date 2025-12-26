-- =====================================================
-- NEXUS QR - QR TEMPLATES MIGRATION
-- Allows users to save their QR code designs as reusable templates
-- =====================================================

-- =====================================================
-- 1. QR TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template Metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom', -- 'custom', 'business', 'social', 'marketing', 'event'

  -- Template Preview (small base64 image for gallery)
  preview_image TEXT,

  -- Style Configuration (the actual template data)
  style_config JSONB NOT NULL,

  -- Template Settings
  is_public BOOLEAN DEFAULT FALSE, -- Allow sharing with other users
  is_featured BOOLEAN DEFAULT FALSE, -- Admin can feature templates
  use_count INTEGER DEFAULT 0, -- Track popularity

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. PRESET TEMPLATES TABLE (System Templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS preset_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Template Metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'minimal', 'colorful', 'business', 'creative'

  -- Template Preview
  preview_image TEXT,

  -- Style Configuration
  style_config JSONB NOT NULL,

  -- Display Order
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_qr_templates_user_id ON qr_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_templates_category ON qr_templates(category);
CREATE INDEX IF NOT EXISTS idx_qr_templates_is_public ON qr_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_preset_templates_category ON preset_templates(category);
CREATE INDEX IF NOT EXISTS idx_preset_templates_active ON preset_templates(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 4. AUTO UPDATE TIMESTAMP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS update_qr_template_timestamp ON qr_templates;
CREATE TRIGGER update_qr_template_timestamp
BEFORE UPDATE ON qr_templates
FOR EACH ROW
EXECUTE FUNCTION update_template_timestamp();

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE qr_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_templates ENABLE ROW LEVEL SECURITY;

-- User Templates Policies
DROP POLICY IF EXISTS "Users can view their own templates" ON qr_templates;
CREATE POLICY "Users can view their own templates"
ON qr_templates FOR SELECT
USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can create their own templates" ON qr_templates;
CREATE POLICY "Users can create their own templates"
ON qr_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON qr_templates;
CREATE POLICY "Users can update their own templates"
ON qr_templates FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON qr_templates;
CREATE POLICY "Users can delete their own templates"
ON qr_templates FOR DELETE
USING (auth.uid() = user_id);

-- Preset Templates Policies (public read-only)
DROP POLICY IF EXISTS "Anyone can view active preset templates" ON preset_templates;
CREATE POLICY "Anyone can view active preset templates"
ON preset_templates FOR SELECT
USING (is_active = TRUE);

-- =====================================================
-- 7. INSERT DEFAULT PRESET TEMPLATES
-- =====================================================
INSERT INTO preset_templates (name, description, category, sort_order, style_config) VALUES
-- Minimal Category
('Classic Black', 'Clean black and white QR code', 'minimal', 1, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#000000",
  "bgColor": "#ffffff",
  "isGradient": false,
  "gradientType": "linear",
  "fgColor2": "#000000",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": false,
  "cornerSquareColor": "#000000",
  "cornerDotColor": "#000000",
  "dotsType": "square",
  "cornerSquareType": "square",
  "cornerDotType": "square",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
('Soft Dots', 'Rounded dots with soft appearance', 'minimal', 2, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#374151",
  "bgColor": "#ffffff",
  "isGradient": false,
  "gradientType": "linear",
  "fgColor2": "#374151",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": false,
  "cornerSquareColor": "#374151",
  "cornerDotColor": "#374151",
  "dotsType": "circle",
  "cornerSquareType": "circle",
  "cornerDotType": "dot",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
-- Colorful Category
('Ocean Blue', 'Blue gradient for professional look', 'colorful', 1, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#0ea5e9",
  "bgColor": "#ffffff",
  "isGradient": true,
  "gradientType": "linear",
  "fgColor2": "#0369a1",
  "gradientRotation": 135,
  "bgTransparent": false,
  "customCornerColor": true,
  "cornerSquareColor": "#0369a1",
  "cornerDotColor": "#0369a1",
  "dotsType": "uniform-pills",
  "cornerSquareType": "rounded",
  "cornerDotType": "dot",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
('Sunset Gradient', 'Warm orange to pink gradient', 'colorful', 2, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#f97316",
  "bgColor": "#ffffff",
  "isGradient": true,
  "gradientType": "linear",
  "fgColor2": "#ec4899",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": true,
  "cornerSquareColor": "#ec4899",
  "cornerDotColor": "#ec4899",
  "dotsType": "circle",
  "cornerSquareType": "three-sided",
  "cornerDotType": "dot",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
('Forest Green', 'Natural green gradient', 'colorful', 3, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#22c55e",
  "bgColor": "#ffffff",
  "isGradient": true,
  "gradientType": "linear",
  "fgColor2": "#15803d",
  "gradientRotation": 180,
  "bgTransparent": false,
  "customCornerColor": true,
  "cornerSquareColor": "#15803d",
  "cornerDotColor": "#15803d",
  "dotsType": "uniform-pills",
  "cornerSquareType": "rounded",
  "cornerDotType": "square",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
-- Business Category
('Corporate Blue', 'Professional business style', 'business', 1, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "H",
  "fgColor": "#1e40af",
  "bgColor": "#ffffff",
  "isGradient": false,
  "gradientType": "linear",
  "fgColor2": "#1e40af",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": false,
  "cornerSquareColor": "#1e40af",
  "cornerDotColor": "#1e40af",
  "dotsType": "square",
  "cornerSquareType": "square",
  "cornerDotType": "square",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "solid"
}'),
('Executive Gray', 'Sophisticated dark gray', 'business', 2, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "H",
  "fgColor": "#1f2937",
  "bgColor": "#f9fafb",
  "isGradient": false,
  "gradientType": "linear",
  "fgColor2": "#1f2937",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": false,
  "cornerSquareColor": "#1f2937",
  "cornerDotColor": "#1f2937",
  "dotsType": "uniform-pills",
  "cornerSquareType": "three-sided",
  "cornerDotType": "square",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "solid"
}'),
-- Creative Category
('Neon Purple', 'Vibrant purple for creative projects', 'creative', 1, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#a855f7",
  "bgColor": "#18181b",
  "isGradient": true,
  "gradientType": "linear",
  "fgColor2": "#6366f1",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": true,
  "cornerSquareColor": "#6366f1",
  "cornerDotColor": "#a855f7",
  "dotsType": "circle",
  "cornerSquareType": "circle",
  "cornerDotType": "dot",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
('Diamond Style', 'Unique diamond pattern', 'creative', 2, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#0f172a",
  "bgColor": "#ffffff",
  "isGradient": false,
  "gradientType": "linear",
  "fgColor2": "#0f172a",
  "gradientRotation": 45,
  "bgTransparent": false,
  "customCornerColor": true,
  "cornerSquareColor": "#6366f1",
  "cornerDotColor": "#6366f1",
  "dotsType": "sharp-diamond",
  "cornerSquareType": "two-sided",
  "cornerDotType": "square",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}'),
('Mixed Art', 'Artistic mixed pattern', 'creative', 3, '{
  "size": 1000,
  "padding": 20,
  "errorCorrectionLevel": "M",
  "fgColor": "#dc2626",
  "bgColor": "#ffffff",
  "isGradient": true,
  "gradientType": "radial",
  "fgColor2": "#991b1b",
  "gradientRotation": 0,
  "bgTransparent": false,
  "customCornerColor": true,
  "cornerSquareColor": "#991b1b",
  "cornerDotColor": "#dc2626",
  "dotsType": "mixed",
  "cornerSquareType": "three-sided",
  "cornerDotType": "dot",
  "frameType": "none",
  "logoImage": null,
  "logoSize": 0.25,
  "logoPadding": 0,
  "logoBackground": "transparent"
}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE! Templates system is ready
-- =====================================================

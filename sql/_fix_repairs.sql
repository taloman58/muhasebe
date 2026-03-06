-- ============================================
-- REPAIRS TABLO GÜNCELLEME
-- Tamir sayfası için eksik kolonları ekle
-- Supabase SQL Editor'da çalıştırın
-- ============================================

CREATE TABLE IF NOT EXISTS repairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  service_no VARCHAR(30) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  device_brand VARCHAR(60),
  device_model VARCHAR(100),
  imei VARCHAR(20),
  screen_password VARCHAR(50),
  sim_pin VARCHAR(10),
  fault_description TEXT,
  accessories TEXT,
  notes TEXT,
  pattern_image TEXT,        -- base64 PNG
  status VARCHAR(20) DEFAULT 'bekliyor'
    CHECK (status IN ('bekliyor','tamirde','tamamlandi','teslim','iptal')),
  parts_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  images JSONB DEFAULT '[]',
  received_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Var olan tabloya eksik kolonları ekle
ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS service_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS screen_password VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sim_pin VARCHAR(10),
  ADD COLUMN IF NOT EXISTS pattern_image TEXT,
  ADD COLUMN IF NOT EXISTS accessories TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_brand VARCHAR(60),
  ADD COLUMN IF NOT EXISTS device_model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS imei VARCHAR(20),
  ADD COLUMN IF NOT EXISTS fault_description TEXT;

-- Status check constraint güncelle
DO $$
BEGIN
  ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE repairs
  ADD CONSTRAINT repairs_status_check
  CHECK (status IN ('bekliyor','tamirde','tamamlandi','teslim','iptal'));

-- RLS
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repairs_select" ON repairs;
DROP POLICY IF EXISTS "repairs_insert" ON repairs;
DROP POLICY IF EXISTS "repairs_update" ON repairs;
DROP POLICY IF EXISTS "repairs_delete" ON repairs;
CREATE POLICY "repairs_select" ON repairs FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "repairs_insert" ON repairs FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "repairs_update" ON repairs FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "repairs_delete" ON repairs FOR DELETE USING (license_id = get_user_license_id());

-- Schema cache yenile
NOTIFY pgrst, 'reload schema';

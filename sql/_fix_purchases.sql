-- ============================================
-- PURCHASES + INVENTORY TABLO GÜNCELLEME
-- Eksik kolonları ekle
-- Supabase SQL Editor'da çalıştırın
-- ============================================

-- 1. PURCHASES tablosuna eksik kolonları ekle
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS inventory_id UUID,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS color VARCHAR(30),
  ADD COLUMN IF NOT EXISTS quality VARCHAR(30),
  ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ DEFAULT now();

-- Eski customer_id kolonunu supplier_id olarak zaten aldık, ama
-- eski tablo customer_id ile gelmiş olabilir:
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- payment_method check constraint güncelle (taksit eklendi)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'purchases'::regclass AND contype = 'c' AND conname ILIKE '%payment%'
  ) THEN
    ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_payment_method_check;
  END IF;
END $$;

ALTER TABLE purchases
  ADD CONSTRAINT purchases_payment_method_check
  CHECK (payment_method IN ('nakit', 'havale', 'kredi_karti', 'taksit', 'takas') OR payment_method IS NULL);

-- item_type için default ver (mevcut satırlarda NULL olmaması için)
UPDATE purchases SET item_type = 'telefon' WHERE item_type IS NULL;

-- 2. INVENTORY tablosu (yoksa oluştur)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  type VARCHAR(50) NOT NULL,
  color VARCHAR(30),
  quality VARCHAR(30),
  stock_quantity INTEGER DEFAULT 0,
  purchase_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_select" ON inventory;
DROP POLICY IF EXISTS "inv_insert" ON inventory;
DROP POLICY IF EXISTS "inv_update" ON inventory;
DROP POLICY IF EXISTS "inv_delete" ON inventory;
CREATE POLICY "inv_select" ON inventory FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "inv_insert" ON inventory FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "inv_update" ON inventory FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "inv_delete" ON inventory FOR DELETE USING (license_id = get_user_license_id());

-- 4. Schema cache yenile
NOTIFY pgrst, 'reload schema';

-- ============================================
-- SATIŞ + KASA TABLOLARI
-- Supabase SQL Editor'da çalıştırın
-- ============================================

-- 0. PHONES tablosuna satış takip kolonları ekle
ALTER TABLE phones
  ADD COLUMN IF NOT EXISTS sold_to UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sold_price DECIMAL(12,2);

-- 1. SALES tablosu
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(20) DEFAULT 'nakit'
    CHECK (payment_method IN ('nakit','kk','havale','veresiye','taksit')),
  items JSONB DEFAULT '[]',  -- [{id, name, price, qty, source}]
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- 2. CASH_TRANSACTIONS tablosu (kasa hareketleri)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) DEFAULT 'gelir'
    CHECK (type IN ('gelir','gider','borc','odeme')),
  payment_method VARCHAR(20),
  description TEXT,
  reference_id UUID,  -- sales.id veya repairs.id
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS — SALES
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sales_delete" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "sales_delete" ON sales FOR DELETE USING (license_id = get_user_license_id());

-- 4. RLS — CASH_TRANSACTIONS
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_select" ON cash_transactions;
DROP POLICY IF EXISTS "cash_insert" ON cash_transactions;
DROP POLICY IF EXISTS "cash_update" ON cash_transactions;
DROP POLICY IF EXISTS "cash_delete" ON cash_transactions;
CREATE POLICY "cash_select" ON cash_transactions FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "cash_insert" ON cash_transactions FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "cash_update" ON cash_transactions FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "cash_delete" ON cash_transactions FOR DELETE USING (license_id = get_user_license_id());

-- 5. Schema cache yenile
NOTIFY pgrst, 'reload schema';

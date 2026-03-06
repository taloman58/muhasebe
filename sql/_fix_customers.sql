-- ============================================
-- CUSTOMERS TABLO GÜNCELLEME
-- Eksik kolonları ekle + type kısıtlamasını güncelle
-- Supabase SQL Editor'da çalıştırın
-- ============================================

-- 1. Eksik sütunları ekle
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
  ADD COLUMN IF NOT EXISTS phone2 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS photo VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Mevcut type CHECK kısıtlamasını kaldır (adı bilinmiyor olabilir)
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'customers'::regclass AND contype = 'c' AND conname ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE customers DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END $$;

-- 3. Yeni kısıtlamayı ekle (tüm geçerli değerler)
ALTER TABLE customers
  ADD CONSTRAINT customers_type_check
  CHECK (type IN ('toptanci', 'satici', 'alici', 'bayi', 'genel'));

-- 4. Supabase cache yenile
NOTIFY pgrst, 'reload schema';


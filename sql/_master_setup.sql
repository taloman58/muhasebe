-- ============================================
-- GSM OFIS PRO - TEK SEFERDE KURULUM
-- Supabase SQL Editor'da çalıştır
-- Zaten olan tablolar atlanır (IF NOT EXISTS)
-- ============================================

-- ══════════════════════════════════════
-- 1. LİSANSLAR (muhtemelen zaten var)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 1,
  current_users INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- ══════════════════════════════════════
-- 2. KULLANICI PROFİLLERİ (muhtemelen zaten var)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'sales', 'technician', 'accountant')),
  license_id UUID REFERENCES licenses(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- ══════════════════════════════════════
-- 3. TELEFONLAR / STOK
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS phones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  device_type VARCHAR(20) DEFAULT 'telefon' CHECK (device_type IN ('telefon', 'tablet', 'bilgisayar', 'laptop', 'diger')),
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  storage VARCHAR(20),
  ram VARCHAR(20),
  screen_size VARCHAR(20),
  color VARCHAR(30),
  imei VARCHAR(20),
  imei2 VARCHAR(20),
  cosmetic VARCHAR(30),
  issues TEXT,
  accessories TEXT,
  seller_name VARCHAR(100),
  seller_phone VARCHAR(20),
  purchase_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2),
  id_photo VARCHAR(255),
  images JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'stokta' CHECK (status IN ('stokta', 'satildi', 'tamirde', 'iade', 'rezerve', 'hurda')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 4. MÜŞTERİLER
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  type VARCHAR(20) DEFAULT 'genel' CHECK (type IN ('toptanci', 'satici', 'alici', 'bayi', 'genel')),
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone2 VARCHAR(20),
  address TEXT,
  iban VARCHAR(34),
  photo VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 5. ENVANTER / AKSESUARLAR (Yeni eklendi)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  type VARCHAR(50) NOT NULL, -- EKRAN, KASA, ŞARJ, vs.
  color VARCHAR(30),
  quality VARCHAR(30),
  stock_quantity INTEGER DEFAULT 0,
  purchase_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 6. ALIŞ İŞLEMLERİ
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  supplier_id UUID REFERENCES customers(id), -- Tedarikçi
  item_type VARCHAR(50) NOT NULL, -- telefon, EKRAN, ŞARJ vs.
  phone_id UUID REFERENCES phones(id), -- Eğer telefon ise
  inventory_id UUID REFERENCES inventory(id), -- Eğer aksesuar/parça ise
  quantity INTEGER DEFAULT 1,
  purchase_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2), -- Öngörülen satış fiyatı
  color VARCHAR(30),
  quality VARCHAR(30),
  payment_method VARCHAR(30) CHECK (payment_method IN ('nakit', 'havale', 'kredi_karti', 'taksit', 'takas')),
  invoice_no VARCHAR(50),
  notes TEXT,
  purchase_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 7. SATIŞ İŞLEMLERİ
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES customers(id),
  item_type VARCHAR(50) NOT NULL, -- telefon, aksesuar vs
  phone_id UUID REFERENCES phones(id),
  inventory_id UUID REFERENCES inventory(id),
  quantity INTEGER DEFAULT 1,
  sale_price DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30) CHECK (payment_method IN ('nakit', 'havale', 'kredi_karti', 'taksit', 'takas', 'acik_hesap')),
  warranty_days INTEGER DEFAULT 0,
  invoice_no VARCHAR(50),
  notes TEXT,
  sale_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 8. TAKSİT PLANLARI
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  sale_id UUID NOT NULL REFERENCES sales(id),
  installment_no INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 8. TAMİR / SERVİS
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS repairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  service_no VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  device_brand VARCHAR(50) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  device_imei VARCHAR(20),
  fault_description TEXT NOT NULL,
  diagnosis TEXT,
  parts_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  parts_used JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'kabul_edildi' CHECK (status IN (
    'kabul_edildi', 'inceleniyor', 'parca_bekleniyor',
    'tamir_ediliyor', 'tamamlandi', 'teslim_edildi', 'iptal'
  )),
  images JSONB DEFAULT '[]',
  received_date TIMESTAMPTZ DEFAULT now(),
  estimated_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  delivered_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 9. KASA HAREKETLERİ (customer_id dahil)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  created_by UUID REFERENCES auth.users(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('gelir', 'gider')),
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'nakit',
  description TEXT,
  customer_id UUID REFERENCES customers(id),
  related_sale_id UUID REFERENCES sales(id),
  related_purchase_id UUID REFERENCES purchases(id),
  related_repair_id UUID REFERENCES repairs(id),
  transaction_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- 10. AUDIT LOG
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID REFERENCES licenses(id),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(30) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════
-- RLS POLİTİKALARI
-- ══════════════════════════════════════════════

-- Yardımcı fonksiyon
CREATE OR REPLACE FUNCTION get_user_license_id()
RETURNS UUID AS $$
  SELECT license_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS aktif et
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- USER PROFILES (Kişi kendi profilini okuyabilir/güncelleyebilir)
DROP POLICY IF EXISTS "users_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_read_own_profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- PHONES
DROP POLICY IF EXISTS "phones_select" ON phones;
DROP POLICY IF EXISTS "phones_insert" ON phones;
DROP POLICY IF EXISTS "phones_update" ON phones;
DROP POLICY IF EXISTS "phones_delete" ON phones;
CREATE POLICY "phones_select" ON phones FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "phones_insert" ON phones FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "phones_update" ON phones FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "phones_delete" ON phones FOR DELETE USING (license_id = get_user_license_id());

-- INVENTORY
DROP POLICY IF EXISTS "inv_select" ON inventory;
DROP POLICY IF EXISTS "inv_insert" ON inventory;
DROP POLICY IF EXISTS "inv_update" ON inventory;
DROP POLICY IF EXISTS "inv_delete" ON inventory;
CREATE POLICY "inv_select" ON inventory FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "inv_insert" ON inventory FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "inv_update" ON inventory FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "inv_delete" ON inventory FOR DELETE USING (license_id = get_user_license_id());

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (license_id = get_user_license_id());
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (license_id = get_user_license_id());

-- PURCHASES
DROP POLICY IF EXISTS "purchases_select" ON purchases;
DROP POLICY IF EXISTS "purchases_insert" ON purchases;
CREATE POLICY "purchases_select" ON purchases FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "purchases_insert" ON purchases FOR INSERT WITH CHECK (license_id = get_user_license_id());

-- SALES
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (license_id = get_user_license_id());

-- INSTALLMENTS
DROP POLICY IF EXISTS "installments_select" ON installments;
DROP POLICY IF EXISTS "installments_insert" ON installments;
CREATE POLICY "installments_select" ON installments FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "installments_insert" ON installments FOR INSERT WITH CHECK (license_id = get_user_license_id());

-- REPAIRS
DROP POLICY IF EXISTS "repairs_select" ON repairs;
DROP POLICY IF EXISTS "repairs_insert" ON repairs;
DROP POLICY IF EXISTS "repairs_update" ON repairs;
CREATE POLICY "repairs_select" ON repairs FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "repairs_insert" ON repairs FOR INSERT WITH CHECK (license_id = get_user_license_id());
CREATE POLICY "repairs_update" ON repairs FOR UPDATE USING (license_id = get_user_license_id());

-- CASH_TRANSACTIONS
DROP POLICY IF EXISTS "cash_select" ON cash_transactions;
DROP POLICY IF EXISTS "cash_insert" ON cash_transactions;
CREATE POLICY "cash_select" ON cash_transactions FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "cash_insert" ON cash_transactions FOR INSERT WITH CHECK (license_id = get_user_license_id());

-- AUDIT_LOG
DROP POLICY IF EXISTS "audit_select" ON audit_log;
DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_select" ON audit_log FOR SELECT USING (license_id = get_user_license_id());
CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (license_id = get_user_license_id());


-- ══════════════════════════════════════════════
-- BITTI! Tablolar + RLS hazır
-- ══════════════════════════════════════════════

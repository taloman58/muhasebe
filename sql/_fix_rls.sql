-- ============================================
-- ACİL DÜZELTME: user_profiles sonsuz döngü
-- Supabase SQL Editor'da çalıştırın
-- ============================================

-- 1. user_profiles üstündeki TÜm politikaları sil
DROP POLICY IF EXISTS "users_read_own_profile"   ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "profiles_select"          ON user_profiles;
DROP POLICY IF EXISTS "profiles_insert"          ON user_profiles;
DROP POLICY IF EXISTS "profiles_update"          ON user_profiles;
DROP POLICY IF EXISTS "profiles_delete"          ON user_profiles;

-- Supabase'in kendi policy isimlerini de sil (varsa)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. RLS'i kapat ve yeniden aç (temiz başlangıç)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. SADECE auth.uid() = id kullan (get_user_license_id() ASLA çağrılmaz!)
-- Bu sayede sonsuz döngü olmaz.
CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. get_user_license_id() fonksiyonunu SECURITY DEFINER ile yenile
-- Bu sayede diğer tablolar (phones, customers vs.) bu fonksiyonu çağırdığında
-- user_profiles'ı RLS'yi atlayarak okuyabilir → tekrar döngü olmaz.
CREATE OR REPLACE FUNCTION get_user_license_id()
RETURNS UUID AS $$
  SELECT license_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Test (bunu da çalıştırın, sonuç görmelisiniz)
-- SELECT id, username, license_id FROM user_profiles WHERE id = auth.uid();


/* ============================================
   GSM OFIS PRO - Ortak Yardımcı Fonksiyonlar (utils.js)
   Tüm sayfaların kullandığı global fonksiyonlar
   ============================================ */

// ══════════════════════════════════════
//  OTURUM YARDIMCI FONKSİYONLARI
// ══════════════════════════════════════
async function getActiveSession() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      showToast('Oturum bulunamadı! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => { window.location.href = '../login.html'; }, 1500);
      return null;
    }
    return session;
  } catch (e) {
    showToast('Oturum hatası: ' + e.message);
    return null;
  }
}

async function getUserLicenseId(userId) {
  const { data, error } = await db
    .from('user_profiles')
    .select('license_id')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Profil hatası (hata kodu):', error.code, error.message);
    if (error.code === 'PGRST116') {
      showToast('Kullanıcı profili bulunamadı. Lütfen yeniden kayıt olun.', 'error');
    } else if (error.message?.includes('permission') || error.code === '42501') {
      showToast('Profil okuma izni yok — Supabase SQL Editor\'da _fix_rls.sql dosyasını çalıştırın.', 'error');
    } else {
      showToast('Profil hatası: ' + error.message, 'error');
    }
    return null;
  }

  if (!data) {
    showToast('Kullanıcı profili bulunamadı. Lütfen kayıt formundan giriş yapın.', 'error');
    return null;
  }

  if (!data.license_id) {
    showToast('Bu hesaba lisans atanmamış. Yöneticinizle iletişime geçin.', 'error');
    return null;
  }

  return data;
}

// ══════════════════════════════════════
//  CACHE SİSTEMİ (localStorage)
//  Gereksiz Supabase isteklerini önler
//  Sayfa geçişlerinde anında veri gösterir
// ══════════════════════════════════════
const AppCache = {
  // Cache'e yaz (TTL = saniye cinsinden ömür)
  set(key, value, ttlSeconds) {
    try {
      const item = {
        data: value,
        expiresAt: Date.now() + (ttlSeconds * 1000)
      };
      localStorage.setItem('gsm_' + key, JSON.stringify(item));
    } catch (e) { /* quota aşılırsa sessizce devam */ }
  },

  // Cache'den oku (süresi dolmuşsa null döner)
  get(key) {
    try {
      const raw = localStorage.getItem('gsm_' + key);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (Date.now() > item.expiresAt) {
        localStorage.removeItem('gsm_' + key);
        return null;
      }
      return item.data;
    } catch (e) { return null; }
  },

  // Belirli key'i sil
  remove(key) {
    localStorage.removeItem('gsm_' + key);
  },

  // Tüm gsm_ cache'i temizle (çıkış yapınca)
  clearAll() {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('gsm_')) localStorage.removeItem(k);
    });
  }
};

// ══════════════════════════════════════
//  CACHE'Lİ PROFİL BİLGİSİ
//  İlk yüklemede cache'den anında gösterir
//  Arka planda taze veriyi getirir
// ══════════════════════════════════════
async function getCachedProfile() {
  // 1. Önce cache'den hemen göster
  const cached = AppCache.get('user_profile');
  if (cached) return cached;

  // 2. Cache yoksa veya süresi dolmuşsa backend'den çek
  if (typeof checkSession !== 'function' || !db) return null;
  const sessionRes = await checkSession();
  if (sessionRes && sessionRes.loggedIn && sessionRes.profile) {
    const profile = {
      username: sessionRes.profile.username || 'Kullanıcı',
      role: sessionRes.profile.role
    };
    // 10 dakika cache'le
    AppCache.set('user_profile', profile, 600);
    return profile;
  }
  return null;
}

// ══════════════════════════════════════
//  CACHE'Lİ TICKER VERİSİ
//  Sayfa açılır açılmaz eski veriyi gösterir
//  Arka planda günceller
// ══════════════════════════════════════
async function getCachedTickerData() {
  if (!db) return null;
  
  // Auth kontrolü
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return null;
  } catch (_) { return null; }

  try {
    const [stockRes, repairOpenRes, repairDoneRes] = await Promise.allSettled([
      db.from('phones').select('id', { count: 'exact', head: true }),
      db.from('repairs').select('id', { count: 'exact', head: true }).in('status', ['bekliyor', 'tamirde']),
      db.from('repairs').select('id', { count: 'exact', head: true }).eq('status', 'tamamlandi')
    ]);

    const data = {
      stokAdet:  stockRes.status      === 'fulfilled' ? (stockRes.value?.count      ?? 0) : 0,
      acikTamir: repairOpenRes.status === 'fulfilled' ? (repairOpenRes.value?.count ?? 0) : 0,
      tammTamir: repairDoneRes.status === 'fulfilled' ? (repairDoneRes.value?.count ?? 0) : 0,
      updatedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    // 2 dakika cache'le  
    AppCache.set('ticker_data', data, 120);
    return data;
  } catch (e) {
    console.warn('Ticker veri hatası:', e.message);
    return AppCache.get('ticker_data'); // hata varsa eski cache'i dön
  }
}

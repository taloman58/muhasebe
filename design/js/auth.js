/* ============================================
   GSM OFIS PRO - Authentication (auth.js)
   Supabase ile giriş, kayıt, şifre sıfırlama
   Tüm işlemler backend (Supabase RLS)
   ============================================ */

// ── Supabase Config ──
const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';

// Supabase client instance (CDN global'i ile çakışmaması için 'db' adı)
var db = null;

function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  }
  return false;
}

// ══════════════════════════════════════
//  İNTERNET KONTROLÜ
// ══════════════════════════════════════
async function checkInternet() {
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/', {
      method: 'HEAD',
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

// ══════════════════════════════════════
//  GİRİŞ (LOGIN)
//  E-posta VEYA kullanıcı adı ile giriş
//  Tüm kontroller Supabase tarafında
// ══════════════════════════════════════
async function loginUser(identifier, password) {
  try {
    let email = identifier;

    // Kullanıcı adı mı e-posta mı kontrol et
    if (!identifier.includes('@')) {
      // Kullanıcı adı girmiş → Supabase'den e-postayı bul
      const { data: result, error: rpcErr } = await db.rpc('get_email_by_username', {
        p_username: identifier
      });

      if (rpcErr) {
        console.error('Username lookup error:', rpcErr);
        return { success: false, error: 'Kullanıcı arama hatası' };
      }

      if (!result || !result.success) {
        return { success: false, error: result?.error || 'Kullanıcı bulunamadı' };
      }

      email = result.email;
    }

    // 1. Supabase Auth ile giriş
    const { data, error } = await db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Auth error:', error.message);
      if (error.message.includes('Invalid login')) {
        return { success: false, error: 'E-posta/kullanıcı adı veya şifre hatalı' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, error: 'E-posta adresiniz doğrulanmamış' };
      }
      return { success: false, error: 'Giriş hatası: ' + error.message };
    }

    if (!data || !data.user) {
      return { success: false, error: 'Kullanıcı bilgileri alınamadı' };
    }

    // 2. Lisans + profil kontrolü (TAMAMEN SUPABASE TARAFINDA)
    const { data: loginResult, error: loginErr } = await db.rpc('check_user_login', {
      p_user_id: data.user.id
    });

    if (loginErr) {
      console.error('License check error:', loginErr);
      await db.auth.signOut();
      return { success: false, error: 'Lisans kontrol hatası' };
    }

    if (!loginResult || !loginResult.valid) {
      await db.auth.signOut();
      return { success: false, error: loginResult?.reason || 'Giriş reddedildi' };
    }

    return {
      success: true,
      user: data.user,
      profile: {
        username: loginResult.username,
        role: loginResult.role
      },
      session: data.session
    };

  } catch (e) {
    console.error('Login error:', e);
    return { success: false, error: 'Bağlantı hatası: ' + e.message };
  }
}

// ══════════════════════════════════════
//  KAYIT (REGISTER)
//  Tüm doğrulamalar Supabase tarafında (RPC + RLS)
// ══════════════════════════════════════
async function registerUser(email, password, username, phone, licenseKey) {
  try {
    // 1. Supabase Auth ile kayıt
    const { data: authData, error: authError } = await db.auth.signUp({
      email: email,
      password: password
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Bu e-posta adresi zaten kayıtlı' };
      }
      return { success: false, error: 'Kayıt hatası: ' + authError.message };
    }

    if (!authData || !authData.user) {
      return { success: false, error: 'Kullanıcı oluşturulamadı' };
    }

    // 2. Profil + lisans doğrulama (TAMAMEN SUPABASE TARAFINDA)
    const { data: result, error: rpcError } = await db.rpc('validate_and_assign_license', {
      p_user_id: authData.user.id,
      p_license_key: licenseKey,
      p_username: username,
      p_phone: phone
    });

    if (rpcError) {
      return { success: false, error: 'İşlem hatası: ' + rpcError.message };
    }

    if (result && !result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      message: 'Kayıt başarılı! Giriş yapabilirsiniz.',
      user: authData.user
    };

  } catch (e) {
    return { success: false, error: 'Bağlantı hatası: ' + e.message };
  }
}

// ══════════════════════════════════════
//  ŞİFREMİ UNUTTUM
// ══════════════════════════════════════
async function resetPassword(email) {
  try {
    // Eğer kullanıcı adı girdiyse, e-postayı bul
    if (!email.includes('@')) {
      const { data: result } = await db.rpc('get_email_by_username', {
        p_username: email
      });
      if (result && result.success) {
        email = result.email;
      } else {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }
    }

    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });

    if (error) {
      return { success: false, error: 'Şifre sıfırlama hatası: ' + error.message };
    }

    return {
      success: true,
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
    };

  } catch (e) {
    return { success: false, error: 'Bağlantı hatası: ' + e.message };
  }
}

// ══════════════════════════════════════
//  OTURUM KONTROLÜ
//  Sayfa açılışında mevcut oturum var mı kontrol
// ══════════════════════════════════════
async function checkSession() {
  try {
    const { data: { session } } = await db.auth.getSession();

    if (!session) {
      return { loggedIn: false };
    }

    // Lisans hala geçerli mi kontrol et (Supabase RPC)
    const { data: result, error } = await db.rpc('check_user_login', {
      p_user_id: session.user.id
    });

    if (error || !result || !result.valid) {
      await db.auth.signOut();
      return { loggedIn: false, reason: result?.reason || 'Oturum geçersiz' };
    }

    return {
      loggedIn: true,
      user: session.user,
      profile: {
        username: result.username,
        role: result.role
      },
      session: session
    };
  } catch (e) {
    return { loggedIn: false };
  }
}

// ══════════════════════════════════════
//  ÇIKIŞ
// ══════════════════════════════════════
async function logoutUser() {
  await db.auth.signOut();
  window.location.href = 'login.html';
}


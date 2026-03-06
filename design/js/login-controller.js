/* ============================================
   GSM OFIS PRO - Login Controller (login-controller.js)
   Login sayfası UI kontrolleri
   Tasarım (HTML/CSS) ve fonksiyon (JS) ayrı
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Supabase başlat ──
  if (!initSupabase()) {
    showMessage('İnternet bağlantısı gerekli. Supabase yüklenemedi.', 'error');
  }

  // ── İnternet kontrolü ──
  checkInternetStatus();
  setInterval(checkInternetStatus, 30000); // 30 sn'de bir kontrol

  // ── Oturum kontrolü ──
  checkExistingSession();

  // ── Tab eventleri ──
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showForm(tab.dataset.form);
    });
  });

});

// ══════════════════════════════════════
//  FORM GEÇİŞLERİ
// ══════════════════════════════════════
function showForm(formName) {
  // Tüm formları gizle
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  // Hedef formu göster
  const form = document.getElementById(`form-${formName}`);
  if (form) form.classList.add('active');

  // Tab'ları güncelle
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.form === formName);
  });

  // Şifremi unuttum formunda tab'ları gizleme
  const tabs = document.getElementById('auth-tabs');
  if (formName === 'forgot') {
    tabs.style.display = 'none';
  } else {
    tabs.style.display = 'flex';
  }

  // Mesajı temizle
  hideMessage();
}

// ══════════════════════════════════════
//  GİRİŞ İŞLEMİ
// ══════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login');

  if (!email || !password) {
    showMessage('Tüm alanları doldurun', 'error');
    return;
  }

  // Loading state
  btn.classList.add('loading');
  btn.disabled = true;
  hideMessage();

  const result = await loginUser(email, password);

  btn.classList.remove('loading');
  btn.disabled = false;

  if (result.success) {
    showMessage('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
    // Ana sayfaya yönlendir
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } else {
    showMessage(result.error, 'error');
  }
}

// ══════════════════════════════════════
//  KAYIT İŞLEMİ
// ══════════════════════════════════════
async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const licenseKey = document.getElementById('reg-license').value.trim();
  const btn = document.getElementById('btn-register');

  if (!username || !email || !phone || !password || !licenseKey) {
    showMessage('Tüm alanları doldurun', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('Şifre en az 6 karakter olmalı', 'error');
    return;
  }

  // Loading state
  btn.classList.add('loading');
  btn.disabled = true;
  hideMessage();

  const result = await registerUser(email, password, username, phone, licenseKey);

  btn.classList.remove('loading');
  btn.disabled = false;

  if (result.success) {
    showMessage(result.message, 'success');
    // 2 sn sonra login formuna geç
    setTimeout(() => {
      showForm('login');
    }, 2000);
  } else {
    showMessage(result.error, 'error');
  }
}

// ══════════════════════════════════════
//  ŞİFRE SIFIRLAMA İŞLEMİ
// ══════════════════════════════════════
async function handleForgot(e) {
  e.preventDefault();

  const email = document.getElementById('forgot-email').value.trim();
  const btn = document.getElementById('btn-forgot');

  if (!email) {
    showMessage('E-posta adresinizi girin', 'error');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  hideMessage();

  const result = await resetPassword(email);

  btn.classList.remove('loading');
  btn.disabled = false;

  if (result.success) {
    showMessage(result.message, 'success');
  } else {
    showMessage(result.error, 'error');
  }
}

// ══════════════════════════════════════
//  YARDIMCI FONKSİYONLAR
// ══════════════════════════════════════

// Mesaj göster
function showMessage(text, type) {
  const el = document.getElementById('auth-message');
  el.textContent = text;
  el.className = `auth-message show ${type}`;
}

// Mesaj gizle
function hideMessage() {
  const el = document.getElementById('auth-message');
  el.className = 'auth-message';
}

// Şifre göster/gizle
function togglePassword(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    iconEl.textContent = '🙈';
  } else {
    input.type = 'password';
    iconEl.textContent = '👁️';
  }
}

// İnternet durumu kontrolü
async function checkInternetStatus() {
  const statusEl = document.getElementById('internet-status');
  const online = await checkInternet();

  if (!online) {
    statusEl.classList.add('offline');
    statusEl.style.display = 'block';
  } else {
    statusEl.classList.remove('offline');
    statusEl.style.display = 'none';
  }
}

// Mevcut oturum kontrolü
async function checkExistingSession() {
  if (!db) return;

  const session = await checkSession();
  if (session.loggedIn) {
    // Zaten giriş yapmış, ana sayfaya yönlendir
    window.location.href = 'index.html';
  } else if (session.reason) {
    showMessage(session.reason, 'warning');
  }
}

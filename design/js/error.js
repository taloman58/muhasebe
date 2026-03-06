/* ============================================
   GSM OFIS PRO - Global Error Handler (error.js)
   Tüm formlar için hata yönetimi
   Hatalı alan: kırmızı kenarlık + altına * açıklama
   + Telefon formatı
   ============================================ */

// ── Hata göster: input'un kenarlığı kırmızı + altına mesaj ──
function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Kırmızı kenarlık
  input.style.borderColor = '#ef4444';
  input.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.15)';
  input.style.background = '#fef2f2';

  // Varsa eski hatayı sil
  clearFieldError(inputId);

  // Hata mesajı elementi
  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.id = inputId + '-error';
  errorEl.innerHTML = '<span style="color:#ef4444;font-weight:700;margin-right:3px">*</span> ' + message;
  input.parentNode.appendChild(errorEl);

  // İlk hatalı alana scroll + focus
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  input.focus();

  // Focus olunca hatayı kaldır
  input.addEventListener('focus', () => clearFieldError(inputId), { once: true });
  input.addEventListener('input', () => clearFieldError(inputId), { once: true });
}

// ── Hata temizle ──
function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    input.style.background = '';
  }
  const errorEl = document.getElementById(inputId + '-error');
  if (errorEl) errorEl.remove();
}

// ── Tüm hataları temizle ──
function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
    el.style.background = '';
  });
}

// ── Form doğrulama (zorunlu alanlar) ──
function validateForm(fields) {
  clearAllErrors();
  let valid = true;
  let firstError = null;

  fields.forEach(({ id, label, minLength, pattern }) => {
    const input = document.getElementById(id);
    if (!input) return;

    const val = input.value.trim();
    if (!val) {
      showFieldError(id, `${label} zorunludur`);
      if (!firstError) firstError = id;
      valid = false;
    } else if (minLength && val.length < minLength) {
      showFieldError(id, `${label} en az ${minLength} karakter olmalı`);
      if (!firstError) firstError = id;
      valid = false;
    } else if (pattern && !pattern.test(val)) {
      showFieldError(id, `${label} formatı geçersiz`);
      if (!firstError) firstError = id;
      valid = false;
    }
  });

  // İlk hatalı alana focus
  if (firstError) {
    const el = document.getElementById(firstError);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  }

  return valid;
}

// ── Global hata mesajı (toast tarzı) ──
function showToast(message, type = 'error') {
  const old = document.getElementById('global-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'global-toast';
  toast.className = 'global-toast ' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ══════════════════════════════════════
//  SUPABASE HATA ÇÖZÜMLEME
//  Hangi alan hatalı? → field-level hata göster
// ══════════════════════════════════════
function handleSupabaseError(error, fieldMap) {
  if (!error) return;
  const msg = error.message || error.details || String(error);

  // Check constraint hatası → hangi alan?
  // Supabase format: "new row for relation \"phones\" violates check constraint \"phones_device_type_check\""
  const checkMatch = msg.match(/violates check constraint "(\w+)_(\w+)_check"/);
  if (checkMatch && fieldMap) {
    const fieldName = checkMatch[2]; // ör: "device_type"
    const inputId = fieldMap[fieldName];
    if (inputId) {
      showFieldError(inputId, 'Geçersiz değer seçtiniz');
      return;
    }
  }

  // Not-null constraint → hangi alan?
  const nullMatch = msg.match(/null value in column "(\w+)"/);
  if (nullMatch && fieldMap) {
    const fieldName = nullMatch[1];
    const inputId = fieldMap[fieldName];
    if (inputId) {
      showFieldError(inputId, 'Bu alan zorunludur');
      return;
    }
  }

  // Foreign key hatası
  if (msg.includes('violates foreign key')) {
    showToast('Bağlı kayıt bulunamadı. İlgili kaydın mevcut olduğundan emin olun.');
    return;
  }

  // Duplicate key
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    showToast('Bu kayıt zaten mevcut');
    return;
  }

  // Genel hata — gerçek Supabase mesajını göster
  console.error('Supabase error:', msg);
  showToast(translateError(error));
}

// ── Supabase hata mesajlarını Türkçe'ye çevir ──
function translateError(error) {
  if (!error) return 'Bilinmeyen hata';
  const msg = error.message || String(error);

  const translations = {
    'JWT expired': 'Oturum süresi doldu, lütfen tekrar giriş yapın',
    'invalid input syntax': 'Geçersiz giriş formatı',
    'duplicate key': 'Bu kayıt zaten mevcut',
    'violates check constraint': 'Geçersiz değer — lütfen alanları kontrol edin',
    'violates foreign key': 'Bağlı kayıt bulunamadı',
    'permission denied': 'Bu işlem için yetkiniz yok',
    'new row violates': 'Girdiğiniz veri kurallara uymuyor',
    'Could not find the function': 'SQL fonksiyonu bulunamadı. SQL kurulumu gerekli.',
    'does not exist': 'Tablo bulunamadı. SQL kurulumu yapılmalı.',
    'not found in schema cache': 'Tablo/fonksiyon bulunamadı. SQL kurulumu yapılmalı.',
  };

  for (const [key, val] of Object.entries(translations)) {
    if (msg.includes(key)) return val;
  }

  return msg;
}


// ══════════════════════════════════════
//  TELEFON NUMARASI OTOMATİK FORMATLAMA
//  0555 555 55 55 formatında gösterir
// ══════════════════════════════════════
function setupPhoneFormatting() {
  document.querySelectorAll('input[type="tel"], input[id*="phone"]').forEach(input => {
    // Daha önce event eklenmiş mi kontrol et
    if (input.dataset.phoneFormatted) return;
    input.dataset.phoneFormatted = 'true';

    input.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, ''); // Sadece rakamlar

      // 0 ile başlamazsa ekle
      if (val.length > 0 && val[0] !== '0') {
        val = '0' + val;
      }

      // Maksimum 11 rakam (05XX XXX XX XX)
      if (val.length > 11) val = val.slice(0, 11);

      // Format: 0555 555 55 55
      let formatted = '';
      if (val.length > 0) formatted = val.slice(0, 4);
      if (val.length > 4) formatted += ' ' + val.slice(4, 7);
      if (val.length > 7) formatted += ' ' + val.slice(7, 9);
      if (val.length > 9) formatted += ' ' + val.slice(9, 11);

      // Cursor pozisyonunu koru
      const cursorPos = e.target.selectionStart;
      const oldLen = e.target.value.length;
      e.target.value = formatted;
      const newLen = formatted.length;
      const newPos = cursorPos + (newLen - oldLen);
      e.target.setSelectionRange(Math.max(0, newPos), Math.max(0, newPos));
    });

    // Placeholder güncelle
    if (!input.placeholder || input.placeholder.includes('05')) {
      input.placeholder = '0555 555 55 55';
    }
  });
}

// ── Sayfa yüklenince telefon formatlamayı başlat ──
document.addEventListener('DOMContentLoaded', () => {
  setupPhoneFormatting();

  // Dinamik eklenen inputlar için MutationObserver
  const observer = new MutationObserver(() => {
    setupPhoneFormatting();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

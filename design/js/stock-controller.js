/* ============================================
   GSM OFIS PRO - Stock Controller
   Stok sayfası fonksiyonları
   Autocomplete (modeller.json) + Müşteri tahmin
   ============================================ */

// ── Model verileri (modeller.json'dan yüklenir) ──
var modelData = [];
var brandList = [];
var autocompleteReady = false;

// ══════════════════════════════════════
//  MODEL VERİLERİNİ YÜKLE
// ══════════════════════════════════════
async function loadModelData() {
  try {
    // Electron ve normal browser uyumlu path
    const paths = ['./data/modeller.json', 'data/modeller.json', '../data/modeller.json'];
    let loaded = false;

    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          modelData = await res.json();
          loaded = true;
          break;
        }
      } catch (e) { /* sonraki path dene */ }
    }

    if (!loaded || !Array.isArray(modelData)) {
      console.warn('modeller.json yüklenemedi');
      modelData = [];
      return;
    }

    // Benzersiz marka listesi
    brandList = [...new Set(modelData.map(m => m.marka))].sort();
    console.log('modeller.json yüklendi:', modelData.length, 'model,', brandList.length, 'marka');
  } catch (e) {
    console.warn('modeller.json yüklenemedi:', e);
  }
}

// ══════════════════════════════════════
//  TÜM AUTOCOMPLETE'LERİ KURA
//  Stok sekmesi açılınca çağrılır
// ══════════════════════════════════════
function setupAllAutocomplete() {
  if (autocompleteReady) return;

  const brandInput = document.getElementById('add-brand');
  const modelInput = document.getElementById('add-model');
  const sellerNameInput = document.getElementById('add-seller-name');
  const sellerPhoneInput = document.getElementById('add-seller-phone');

  if (!brandInput || !modelInput) return;
  autocompleteReady = true;

  // ── Marka Autocomplete (modeller.json) ──
  createDropdown(brandInput, 'brand-dropdown');
  createDropdown(modelInput, 'model-dropdown');

  brandInput.addEventListener('input', () => {
    const val = brandInput.value.trim().toLowerCase();
    if (val.length < 1) { hideDropdown('brand-dropdown'); return; }
    const matches = brandList.filter(b => b.toLowerCase().includes(val)).slice(0, 10);
    showDropdown('brand-dropdown', matches, (selected) => {
      brandInput.value = selected;
      hideDropdown('brand-dropdown');
      modelInput.value = '';
      modelInput.focus();
      clearAutoFields();
    });
  });

  brandInput.addEventListener('focus', () => {
    if (brandInput.value.length >= 1) brandInput.dispatchEvent(new Event('input'));
  });

  // ── Model Autocomplete (markaya göre filtreleme) ──
  modelInput.addEventListener('input', () => {
    const brand = brandInput.value.trim();
    const val = modelInput.value.trim().toLowerCase();
    if (val.length < 1) { hideDropdown('model-dropdown'); return; }

    const models = modelData
      .filter(m => m.marka.toLowerCase() === brand.toLowerCase() && m.model.toLowerCase().includes(val))
      .slice(0, 15);

    showDropdown('model-dropdown', models.map(m => m.model), (selected) => {
      modelInput.value = selected;
      hideDropdown('model-dropdown');
      autoFillSpecs(brand, selected);
    });
  });

  modelInput.addEventListener('focus', () => {
    if (modelInput.value.length >= 1) modelInput.dispatchEvent(new Event('input'));
  });

  // ── Satıcı Adı Autocomplete (müşterilerden) ──
  if (sellerNameInput) {
    createDropdown(sellerNameInput, 'seller-name-dropdown');
    sellerNameInput.addEventListener('input', async () => {
      const val = sellerNameInput.value.trim();
      if (val.length < 2 || !db) { hideDropdown('seller-name-dropdown'); return; }

      const { data } = await db.from('customers').select('full_name, phone')
        .ilike('full_name', '%' + val + '%').limit(8);

      if (!data || data.length === 0) { hideDropdown('seller-name-dropdown'); return; }

      showDropdown('seller-name-dropdown', data.map(c => c.full_name + ' (' + c.phone + ')'), (selected) => {
        const match = data.find(c => selected.startsWith(c.full_name));
        if (match) {
          sellerNameInput.value = match.full_name;
          if (sellerPhoneInput) sellerPhoneInput.value = match.phone;
        }
        hideDropdown('seller-name-dropdown');
      });
    });
  }

  // ── Satıcı Telefon Autocomplete (müşterilerden) ──
  if (sellerPhoneInput) {
    createDropdown(sellerPhoneInput, 'seller-phone-dropdown');
    sellerPhoneInput.addEventListener('input', async () => {
      const val = sellerPhoneInput.value.trim();
      if (val.length < 3 || !db) { hideDropdown('seller-phone-dropdown'); return; }

      const { data } = await db.from('customers').select('full_name, phone')
        .ilike('phone', '%' + val + '%').limit(8);

      if (!data || data.length === 0) { hideDropdown('seller-phone-dropdown'); return; }

      showDropdown('seller-phone-dropdown', data.map(c => c.phone + ' - ' + c.full_name), (selected) => {
        const match = data.find(c => selected.startsWith(c.phone));
        if (match) {
          sellerPhoneInput.value = match.phone;
          if (sellerNameInput) sellerNameInput.value = match.full_name;
        }
        hideDropdown('seller-phone-dropdown');
      });
    });
  }

  // ── Dışarı tıklayınca kapat ──
  document.addEventListener('click', (e) => {
    const ids = ['brand-dropdown', 'model-dropdown', 'seller-name-dropdown', 'seller-phone-dropdown'];
    const inputs = ['add-brand', 'add-model', 'add-seller-name', 'add-seller-phone'];
    ids.forEach((ddId, i) => {
      if (!e.target.closest('#' + inputs[i]) && !e.target.closest('#' + ddId)) hideDropdown(ddId);
    });
  });
}

// ── Dropdown oluştur ──
function createDropdown(input, id) {
  if (document.getElementById(id)) return;
  const dd = document.createElement('div');
  dd.id = id;
  dd.className = 'autocomplete-dropdown';
  dd.style.display = 'none';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(dd);
}

// ── Dropdown göster ──
function showDropdown(id, items, onSelect) {
  const dd = document.getElementById(id);
  if (!dd || items.length === 0) { hideDropdown(id); return; }
  dd.innerHTML = items.map(item =>
    `<div class="autocomplete-item">${item}</div>`
  ).join('');
  dd.style.display = 'block';
  dd.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.addEventListener('click', () => onSelect(items[i]));
  });
}

// ── Dropdown gizle ──
function hideDropdown(id) {
  const dd = document.getElementById(id);
  if (dd) dd.style.display = 'none';
}

// ── Model seçilince specs otomatik doldur ──
function autoFillSpecs(brand, model) {
  const device = modelData.find(m =>
    m.marka.toLowerCase() === brand.toLowerCase() &&
    m.model.toLowerCase() === model.toLowerCase()
  );
  if (!device) return;

  // RAM - ilk değeri varsayılan olarak ata
  const ramInput = document.getElementById('add-ram');
  if (ramInput && device.ram && device.ram.length > 0) {
    ramInput.value = device.ram[device.ram.length - 1] + ' GB';
  }

  // Depolama - en büyük değeri varsayılan
  const storageInput = document.getElementById('add-storage');
  if (storageInput && device.depolama && device.depolama.length > 0) {
    const val = device.depolama[device.depolama.length - 1];
    storageInput.value = (parseInt(val) >= 1024 ? (parseInt(val)/1024) + ' TB' : val + ' GB');
  }

  // Ekran
  const screenInput = document.getElementById('add-screen');
  if (screenInput && device.ekran_inc) {
    screenInput.value = device.ekran_inc + '"';
  }
}

// ── Otomatik alanları temizle ──
function clearAutoFields() {
  const ids = ['add-ram', 'add-storage', 'add-screen'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ══════════════════════════════════════
//  STOK ALT SEKME GEÇİŞİ
// ══════════════════════════════════════
function switchStockSub(sub) {
  document.querySelectorAll('.stock-sub').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.stocksub === sub);
    if (btn.dataset.stocksub === sub) btn.classList.add('btn-primary');
    else btn.classList.remove('btn-primary');
  });

  document.querySelectorAll('.stock-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById('stock-' + sub);
  if (target) target.classList.add('active');

  const searchBar = document.getElementById('stock-search-bar');
  const filter = document.getElementById('stock-filter');
  if (searchBar) searchBar.style.display = sub === 'liste' ? 'flex' : 'none';
  if (filter) filter.style.display = sub === 'liste' ? 'block' : 'none';

  if (sub === 'ekle') {
    updateAutoDate();
    setupAllAutocomplete();
  }
  if (sub === 'liste') loadStockList();
}

// ══════════════════════════════════════
//  OTOMATİK TARİH
// ══════════════════════════════════════
function updateAutoDate() {
  const dateEl = document.getElementById('add-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}

// ══════════════════════════════════════
//  DOSYA ADI GÖSTERME
// ══════════════════════════════════════
function updateFileName(input, targetId) {
  const el = document.getElementById(targetId);
  if (input.files && input.files[0]) {
    el.textContent = input.files[0].name;
  } else {
    el.textContent = 'Dosya seçmek için tıklayın';
  }
}

// ══════════════════════════════════════
//  STOK KAYDET
//  RPC varsa kullan, yoksa direkt tablo
// ══════════════════════════════════════
async function handleStockSave(e) {
  e.preventDefault();
  clearAllErrors();

  // Form doğrulama (sadece UI — boş alan kontrolü)
  const isValid = validateForm([
    { id: 'add-brand', label: 'Marka' },
    { id: 'add-model', label: 'Model' },
    { id: 'add-purchase-price', label: 'Alış fiyatı' }
  ]);
  if (!isValid) return;

  if (!db) { showToast('Supabase bağlantısı yok!'); return; }

  const btn = document.getElementById('btn-stock-save');
  btn.disabled = true;
  btn.textContent = '⏳ Kaydediliyor...';

  const session = await getActiveSession();
  if (!session) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }

  const userProfile = await getUserLicenseId(session.user.id);
  if (!userProfile) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }

  // Telefondaki boşlukları temizle (format: 0555 555 55 55 → 05555555555)
  const sellerName = document.getElementById('add-seller-name').value.trim() || null;
  const sellerPhone = (document.getElementById('add-seller-phone').value || '').replace(/\s/g, '').trim() || null;

  // Satıcıyı otomatik müşteriye kaydet (varsa)
  if (sellerName || sellerPhone) {
    await autoSaveSeller(sellerName, sellerPhone, userProfile.license_id, session.user.id);
  }

  // Cihaz verisi
  const formData = {
    license_id: userProfile.license_id,
    created_by: session.user.id,
    device_type: document.getElementById('add-type').value,
    brand: document.getElementById('add-brand').value.trim(),
    model: document.getElementById('add-model').value.trim(),
    storage: document.getElementById('add-storage').value.trim() || null,
    ram: document.getElementById('add-ram').value.trim() || null,
    screen_size: document.getElementById('add-screen').value.trim() || null,
    color: document.getElementById('add-color').value.trim() || null,
    imei: document.getElementById('add-imei').value.trim() || null,
    imei2: document.getElementById('add-imei2').value.trim() || null,
    cosmetic: document.getElementById('add-cosmetic').value.trim() || null,
    issues: document.getElementById('add-issues').value.trim() || null,
    accessories: document.getElementById('add-accessories').value.trim() || null,
    seller_name: sellerName,
    seller_phone: sellerPhone,
    purchase_price: parseFloat(document.getElementById('add-purchase-price').value) || 0,
    sale_price: parseFloat(document.getElementById('add-sale-price').value) || null,
    notes: document.getElementById('add-notes').value.trim() || null,
    status: 'stokta'
  };

  const { data, error } = await db.from('phones').insert([formData]).select();

  btn.disabled = false;
  if (error) {
    console.error('Stock save error:', error);
    btn.textContent = '❌ Hata!';
    const stockFieldMap = {
      device_type: 'add-type', brand: 'add-brand', model: 'add-model',
      storage: 'add-storage', ram: 'add-ram', color: 'add-color',
      imei: 'add-imei', cosmetic: 'add-cosmetic',
      purchase_price: 'add-purchase-price', sale_price: 'add-sale-price',
      seller_name: 'add-seller-name', seller_phone: 'add-seller-phone'
    };
    handleSupabaseError(error, stockFieldMap);
    setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 2000);
    return;
  }

  btn.textContent = '✅ Kaydedildi!';
  btn.classList.add('btn-save-success');
  showToast('Cihaz stoğa eklendi', 'success');
  setTimeout(() => { btn.textContent = '💾 Kaydet'; btn.classList.remove('btn-save-success'); }, 2000);

  resetStockForm();
  switchStockSub('liste');
}

// ══════════════════════════════════════
//  SATICI → OTOMATİK MÜŞTERİ KAYDI
//  Telefon veya isim varsa → customers tablosunda ara, yoksa ekle
// ══════════════════════════════════════
async function autoSaveSeller(sellerName, sellerPhone, licenseId, userId) {
  if (!sellerName && !sellerPhone) return;
  if (!db) return;

  try {
    // Aynı telefon zaten var mı?
    if (sellerPhone) {
      const { data: existing } = await db.from('customers')
        .select('id').eq('phone', sellerPhone).maybeSingle();
      if (existing) return;
    }

    // Aynı isim zaten var mı?
    if (sellerName && !sellerPhone) {
      const { data: existing } = await db.from('customers')
        .select('id').eq('full_name', sellerName).maybeSingle();
      if (existing) return;
    }

    // Yeni müşteri olarak ekle
    await db.from('customers').insert([{
      license_id: licenseId,
      created_by: userId,
      type: 'satici',
      full_name: sellerName || 'Bilinmeyen',
      phone: sellerPhone || ''
    }]);
  } catch (e) {
    console.warn('Satıcı müşteriye kaydedilemedi:', e);
  }
}

// ══════════════════════════════════════
//  STOK LİSTESİ YÜKLE
// ══════════════════════════════════════
async function loadStockList() {
  if (!db) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;

  const tbody = document.getElementById('stock-tbody');
  const empty = document.getElementById('stock-empty');
  const table = document.getElementById('stock-table');

  const { data, error } = await db.from('phones').select('*').order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    if (table) table.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (table) table.style.display = 'table';
  if (empty) empty.style.display = 'none';

  const typeIcons = { 'telefon': '📱', 'tablet': '📱', 'bilgisayar': '🖥️', 'laptop': '💻', 'diger': '📦' };
  const statusLabels = {
    'stokta': '<span class="badge badge-info">Stokta</span>',
    'satildi': '<span class="badge badge-success">Satıldı</span>',
    'tamirde': '<span class="badge badge-warning">Tamirde</span>',
    'rezerve': '<span class="badge badge-danger">Rezerve</span>'
  };

  tbody.innerHTML = data.map(p => {
    const date = new Date(p.created_at).toLocaleDateString('tr-TR');
    return `<tr>
      <td><span class="device-type-badge">${typeIcons[p.device_type] || '📦'} ${p.device_type}</span></td>
      <td>${p.brand}</td><td>${p.model}</td><td>${p.storage || '-'}</td>
      <td style="font-family:var(--font-mono);font-size:11px">${p.imei || '-'}</td>
      <td>${p.cosmetic || '-'}</td>
      <td class="price-cell purchase">${p.purchase_price ? Number(p.purchase_price).toLocaleString('tr-TR') + ' ₺' : '-'}</td>
      <td class="price-cell sale">${p.sale_price ? Number(p.sale_price).toLocaleString('tr-TR') + ' ₺' : '-'}</td>
      <td>${statusLabels[p.status] || p.status}</td>
      <td>${date}</td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════
//  FORM TEMİZLE
// ══════════════════════════════════════
function resetStockForm() {
  const form = document.getElementById('stock-add-form');
  if (form) form.reset();
  const photoName = document.getElementById('id-photo-name');
  if (photoName) photoName.textContent = 'Dosya seçmek için tıklayın';
  updateAutoDate();
  clearAutoFields();
}

// ══════════════════════════════════════
//  OTURUM YARDIMCI FONKSİYONLARI
// ══════════════════════════════════════
async function getActiveSession() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      showToast('Oturum bulunamadı! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
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
      // Kayıt yok
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
//  SAYFA YÜKLENDIĞINDE
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  loadModelData();
  updateAutoDate();
  setInterval(updateAutoDate, 60000);

  // Oturum kontrolü
  if (db) {
    const session = await getActiveSession();
    if (session) {
      loadStockList();
    }
  }
});

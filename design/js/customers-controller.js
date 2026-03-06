/* ============================================
   GSM OFIS PRO - Customers Controller
   Müşteri / Tedarikçi yönetimi
   ============================================ */

var currentCustomerId = null;

// ══════════════════════════════════════
//  ALT SEKME GEÇİŞİ (Müşteriler)
// ══════════════════════════════════════
function switchCustSub(sub) {
  document.querySelectorAll('.cust-sub').forEach(btn => {
    const isActive = btn.dataset.custsub === sub;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.classList.add('btn-primary');
    else btn.classList.remove('btn-primary');
  });

  document.querySelectorAll('.cust-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById('cust-' + sub);
  if (target) target.classList.add('active');

  if (sub === 'liste') loadCustomerList();
}

// ══════════════════════════════════════
//  MÜŞTERİ DETAY SEKME GEÇİŞİ
// ══════════════════════════════════════
function switchDetailSub(sub) {
  document.querySelectorAll('.detail-sub').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.detailsub === sub);
  });
  document.querySelectorAll('.detail-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById('detail-' + sub);
  if (target) target.classList.add('active');
}

// ══════════════════════════════════════
//  MÜŞTERİ KAYDET
// ══════════════════════════════════════
async function handleCustSave(e) {
  e.preventDefault();
  clearAllErrors();

  const isValid = validateForm([
    { id: 'cust-name', label: 'Adı Soyadı' },
    { id: 'cust-phone', label: 'Telefon Numarası', minLength: 10 }
  ]);
  if (!isValid) return;

  if (!db) { showToast('Supabase bağlantısı yok!'); return; }

  const btn = document.getElementById('btn-cust-save');
  btn.disabled = true;
  btn.textContent = '⏳ Kaydediliyor...';

  const session = await getActiveSession();
  if (!session) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }

  const userProfile = await getUserLicenseId(session.user.id);
  if (!userProfile) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }

  // Telefon boşluklarını temizle
  const phone = (document.getElementById('cust-phone').value || '').replace(/\s/g, '').trim();

  const newCustomer = {
    license_id: userProfile.license_id,
    created_by: session.user.id,
    type: document.getElementById('cust-type').value,
    full_name: document.getElementById('cust-name').value.trim(),
    phone: phone,
    address: document.getElementById('cust-address').value.trim() || null,
    iban: document.getElementById('cust-iban').value.trim() || null,
    notes: document.getElementById('cust-notes').value.trim() || null
  };

  const { data, error } = await db.from('customers').insert([newCustomer]).select().single();

  btn.disabled = false;
  if (error) {
    console.error('Müşteri kayıt hatası:', error);
    btn.textContent = '❌ Hata!';
    const fieldMap = {
      type: 'cust-type', full_name: 'cust-name',
      phone: 'cust-phone', address: 'cust-address', iban: 'cust-iban'
    };
    handleSupabaseError(error, fieldMap);
    setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 2000);
    return;
  }

  btn.textContent = '✅ Kaydedildi!';
  showToast('Kişi başarıyla eklendi', 'success');
  setTimeout(() => {
    btn.textContent = '💾 Kaydet';
    document.getElementById('cust-add-form').reset();
    clearAllErrors();
    switchCustSub('liste');
  }, 1500);
}

// ══════════════════════════════════════
//  MÜŞTERİLERİ LİSTELE
// ══════════════════════════════════════
async function loadCustomerList() {
  const tbody = document.getElementById('cust-tbody');
  const emptyEl = document.getElementById('cust-empty');
  if (!tbody || !db) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Yükleniyor...</td></tr>';
  if (emptyEl) emptyEl.style.display = 'none';

  const searchVal = (document.getElementById('cust-search')?.value || '').trim();

  let query = db.from('customers')
    .select('id, type, full_name, phone, address, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (searchVal.length >= 2) {
    query = query.or(`full_name.ilike.%${searchVal}%,phone.ilike.%${searchVal}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Müşteri listesi hatası:', error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ef4444;">Veriler yüklenemedi!</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  const typeLabels = {
    genel: 'Genel', alici: 'Alıcı', satici: 'Satıcı',
    toptanci: 'Toptancı', bayi: 'Bayi'
  };

  tbody.innerHTML = data.map(c => {
    const date = new Date(c.created_at).toLocaleDateString('tr-TR');
    const typeBadge = `<span class="device-type-badge">${typeLabels[c.type] || c.type}</span>`;
    return `
      <tr style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">
        <td>${typeBadge}</td>
        <td><b>${c.full_name}</b></td>
        <td>${c.phone || '-'}</td>
        <td>0,00 ₺</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-sm" onclick="event.stopPropagation(); openCustomerDetail('${c.id}')">Detay</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════
//  MÜŞTERİ DETAYI AÇ
// ══════════════════════════════════════
async function openCustomerDetail(customerId) {
  currentCustomerId = customerId;
  switchCustSub('detay');

  const nameEl = document.getElementById('detail-name');
  const infoEl = document.getElementById('detail-info');

  if (nameEl) nameEl.textContent = '⏳ Yükleniyor...';
  if (infoEl) infoEl.innerHTML = '';

  const { data: c, error } = await db.from('customers').select('*').eq('id', customerId).single();

  if (error || !c) {
    showToast('Kişi bilgisi yüklenemedi');
    return;
  }

  if (nameEl) nameEl.textContent = '👤 ' + c.full_name;
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        <div><b>Tür:</b> ${c.type}</div>
        <div><b>Telefon:</b> ${c.phone || '-'}</div>
        <div><b>Adres:</b> ${c.address || '-'}</div>
        <div><b>IBAN:</b> ${c.iban || '-'}</div>
        <div><b>Not:</b> ${c.notes || '-'}</div>
      </div>
    `;
  }

  loadCustomerTransactions(customerId);
}

// ══════════════════════════════════════
//  İŞLEM GEÇMİŞİ YÜKLEv
// ══════════════════════════════════════
async function loadCustomerTransactions(customerId) {
  const tbody = document.getElementById('detail-transactions-tbody');
  const totalDebtEl = document.getElementById('detail-total-debt');
  if (!tbody || !db) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Yükleniyor...</td></tr>';

  const { data, error } = await db.from('cash_transactions')
    .select('id, type, category, description, amount, transaction_date')
    .eq('customer_id', customerId)
    .order('transaction_date', { ascending: false })
    .limit(50);

  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ef4444;">Veriler yüklenemedi!</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Henüz işlem yok</td></tr>';
    if (totalDebtEl) totalDebtEl.textContent = '0,00 ₺';
    return;
  }

  let totalDebt = 0;
  tbody.innerHTML = data.map(tx => {
    const isDebt = tx.type === 'gider'; // Müşteri borcu = gider için alacak
    if (tx.category === 'borc') totalDebt += tx.amount;
    if (tx.category === 'odeme') totalDebt -= tx.amount;
    const date = new Date(tx.transaction_date).toLocaleDateString('tr-TR');
    const color = tx.type === 'gelir' ? 'var(--color-success)' : 'var(--color-danger)';
    return `
      <tr>
        <td><input type="checkbox" class="tx-checkbox" data-id="${tx.id}"/></td>
        <td>${date}</td>
        <td><span class="device-type-badge">${tx.category}</span></td>
        <td>${tx.description || '-'}</td>
        <td style="font-weight:600;color:${color}">${tx.amount.toFixed(2)} ₺</td>
      </tr>
    `;
  }).join('');

  if (totalDebtEl) {
    totalDebtEl.textContent = totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    totalDebtEl.style.color = totalDebt > 0 ? 'var(--color-danger)' : 'var(--color-success)';
  }
}

// ══════════════════════════════════════
//  BORÇ / ÖDEME EKLE
// ══════════════════════════════════════
async function handleDebtAction(type) {
  // type: 'borc' veya 'odeme'
  clearAllErrors();

  const amountEl = document.getElementById('debt-amount');
  const descEl = document.getElementById('debt-description');
  if (!amountEl || !currentCustomerId) return;

  const amount = parseFloat(amountEl.value);
  if (!amount || amount <= 0) {
    showFieldError('debt-amount', 'Geçerli bir tutar giriniz');
    return;
  }

  if (!db) { showToast('Supabase bağlantısı yok!'); return; }

  const session = await getActiveSession();
  if (!session) return;

  const userProfile = await getUserLicenseId(session.user.id);
  if (!userProfile) return;

  const { error } = await db.from('cash_transactions').insert([{
    license_id: userProfile.license_id,
    created_by: session.user.id,
    customer_id: currentCustomerId,
    type: type === 'borc' ? 'gider' : 'gelir',
    category: type,
    amount: amount,
    description: descEl?.value.trim() || (type === 'borc' ? 'Borç girişi' : 'Ödeme alındı'),
    payment_method: 'nakit'
  }]);

  if (error) {
    const fieldMap = { amount: 'debt-amount', description: 'debt-description' };
    handleSupabaseError(error, fieldMap);
    return;
  }

  showToast(type === 'borc' ? 'Borç eklendi' : 'Ödeme alındı', 'success');
  if (amountEl) amountEl.value = '';
  if (descEl) descEl.value = '';
  loadCustomerTransactions(currentCustomerId);
}

// ══════════════════════════════════════
//  YARDIMCI FONKSİYONLAR
// ══════════════════════════════════════
function updateFileName(input, labelId) {
  const label = document.getElementById(labelId);
  if (label && input.files.length > 0) {
    label.textContent = input.files[0].name;
  }
}

function sendWhatsApp() {
  if (!currentCustomerId) return;
  const phone = document.getElementById('detail-name')?.dataset?.phone;
  if (phone) window.open('https://wa.me/90' + phone.replace(/\D/g, '').slice(1));
}
function exportPDF() { showToast('PDF özelliği yakında eklenecek', 'info'); }
function printPage() { window.print(); }
function sendSelectedWhatsApp() { showToast('Seçili WhatsApp özelliği yakında', 'info'); }
function printSelected() { window.print(); }

// ══════════════════════════════════════
//  MÜŞTERILER AÇILINCA
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Arama
  const searchInput = document.getElementById('cust-search');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadCustomerList(), 400);
    });
  }
});

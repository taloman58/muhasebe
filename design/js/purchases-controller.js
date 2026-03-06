/* ============================================
   GSM OFIS PRO - Alış Sayfası Controller
   Aksesuar ve Yedek Parça Alışları
   ============================================ */

let purchAutocompleteReady = false;

// ══════════════════════════════════════
//  Özel Tür Göster / Gizle
// ══════════════════════════════════════
function toggleCustomType() {
  const select = document.getElementById('purch-type');
  const group = document.getElementById('purch-custom-type-group');
  if (select.value === 'DİĞER') {
    group.style.display = 'flex';
    document.getElementById('purch-custom-type').required = true;
  } else {
    group.style.display = 'none';
    document.getElementById('purch-custom-type').required = false;
  }
}

// ══════════════════════════════════════
//  Sekme Geçişi
// ══════════════════════════════════════
function switchPurchSub(sub) {
  document.querySelectorAll('.purch-sub').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.purchsub === sub);
    if (btn.dataset.purchsub === sub) btn.classList.add('btn-primary');
    else btn.classList.remove('btn-primary');
  });

  document.querySelectorAll('.purch-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById('purch-' + sub);
  if (target) target.classList.add('active');

  const searchBar = document.getElementById('purch-search-bar');
  if (searchBar) searchBar.style.display = sub === 'liste' ? 'flex' : 'none';

  if (sub === 'ekle') {
    setupPurchAutocomplete();
  }
  if (sub === 'liste') {
    loadPurchList();
  }
}

// ══════════════════════════════════════
//  Tedarikçi Autocomplete
// ══════════════════════════════════════
function setupPurchAutocomplete() {
  const supplierNameInput = document.getElementById('purch-supplier-name');
  const supplierPhoneInput = document.getElementById('purch-supplier-phone');

  if (!supplierNameInput || !supplierPhoneInput) return;

  // Daha önce event zaten eklenmiş mi?
  if (supplierNameInput.dataset.purchAcReady) return;
  supplierNameInput.dataset.purchAcReady = 'true';

  // Dropdownları oluştur
  createDropdown(supplierNameInput, 'purch-supplier-name-dropdown');
  createDropdown(supplierPhoneInput, 'purch-supplier-phone-dropdown');

  // Adı Soyadı Autocomplete — TÜM müşterilerden ara (tip kısıtlaması yok)
  supplierNameInput.addEventListener('input', async () => {
    const val = supplierNameInput.value.trim();
    if (val.length < 2) { hideDropdown('purch-supplier-name-dropdown'); return; }
    if (!db) return;

    const { data } = await db.from('customers')
      .select('id, full_name, phone, type')
      .ilike('full_name', '%' + val + '%')
      .limit(8);

    if (!data || data.length === 0) { hideDropdown('purch-supplier-name-dropdown'); return; }

    showDropdown('purch-supplier-name-dropdown', data.map(c => c.full_name + ' (' + c.phone + ')'), (selected) => {
      const match = data.find(c => selected.startsWith(c.full_name));
      if (match) {
        supplierNameInput.value = match.full_name;
        supplierPhoneInput.value = match.phone;
        supplierNameInput.dataset.supplierId = match.id; // ID sakla
      }
      hideDropdown('purch-supplier-name-dropdown');
    });
  });

  // Telefon Autocomplete
  supplierPhoneInput.addEventListener('input', async () => {
    const val = supplierPhoneInput.value.replace(/\s/g, '').trim();
    if (val.length < 3) { hideDropdown('purch-supplier-phone-dropdown'); return; }
    if (!db) return;

    const { data } = await db.from('customers')
      .select('id, full_name, phone')
      .ilike('phone', '%' + val + '%')
      .limit(8);

    if (!data || data.length === 0) { hideDropdown('purch-supplier-phone-dropdown'); return; }

    showDropdown('purch-supplier-phone-dropdown', data.map(c => c.phone + ' — ' + c.full_name), (selected) => {
      const match = data.find(c => selected.startsWith(c.phone));
      if (match) {
        supplierPhoneInput.value = match.phone;
        supplierNameInput.value = match.full_name;
        supplierNameInput.dataset.supplierId = match.id;
      }
      hideDropdown('purch-supplier-phone-dropdown');
    });
  });

  // Dışarı tıklayınca kapat
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#purch-supplier-name') && !e.target.closest('#purch-supplier-name-dropdown')) {
      hideDropdown('purch-supplier-name-dropdown');
    }
    if (!e.target.closest('#purch-supplier-phone') && !e.target.closest('#purch-supplier-phone-dropdown')) {
      hideDropdown('purch-supplier-phone-dropdown');
    }
  });
}

// ══════════════════════════════════════
//  KAYDET (Tedarikçi Kaydı + Envanter + Alış)
// ══════════════════════════════════════
async function handlePurchSave(e) {
  e.preventDefault();
  clearAllErrors();

  const isValid = validateForm([
    { id: 'purch-qty', label: 'Adet' },
    { id: 'purch-price', label: 'Birim Alış Fiyatı' },
    { id: 'purch-sale-price', label: 'Satış Fiyatı' }
  ]);
  
  const typeSelect = document.getElementById('purch-type');
  if (!typeSelect.value) {
    showFieldError('purch-type', 'Tür seçimi zorunludur');
    return;
  }
  
  if (!isValid) return;
  if (!db) { showToast('Supabase bağlantısı yok!'); return; }

  const btn = document.getElementById('btn-purch-save');
  btn.disabled = true;
  btn.textContent = '⏳ Kaydediliyor...';

  const session = await getActiveSession();
  if (!session) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }
  
  const userProfile = await getUserLicenseId(session.user.id);
  if (!userProfile) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }
  
  const licenseId = userProfile.license_id;

  // Verileri topla
  const rawType = typeSelect.value;
  const itemType = rawType === 'DİĞER' ? document.getElementById('purch-custom-type').value.trim() : rawType;
  const qty = parseInt(document.getElementById('purch-qty').value) || 1;
  const purchasePrice = parseFloat(document.getElementById('purch-price').value) || 0;
  const salePrice = parseFloat(document.getElementById('purch-sale-price').value) || 0;
  
  const color = document.getElementById('purch-color').value.trim() || null;
  const quality = document.getElementById('purch-quality').value.trim() || null;
  
  const suppName = document.getElementById('purch-supplier-name').value.trim();
  const suppPhone = (document.getElementById('purch-supplier-phone').value || '').replace(/\s/g, '').trim();
  
  let supplierId = document.getElementById('purch-supplier-name').dataset.supplierId || null;

  try {
    // 1. TEDARİKÇİ KAYDI VEYA BULMA
    if ((suppName || suppPhone) && !supplierId) {
      let existQuery = db.from('customers').select('id');
      if (suppPhone) {
        existQuery = existQuery.eq('phone', suppPhone);
      } else {
        existQuery = existQuery.ilike('full_name', suppName);
      }
      const { data: extSupp } = await existQuery.maybeSingle();

      if (extSupp) {
        supplierId = extSupp.id;
      } else {
        const { data: newSupp } = await db.from('customers').insert([{
          license_id: licenseId,
          created_by: session.user.id,
          type: 'toptanci',
          full_name: suppName || 'Bilinmeyen Tedarikçi',
          phone: suppPhone || ''
        }]).select('id').single();
        if (newSupp) supplierId = newSupp.id;
      }
    }

    // 2. STOK/ENVANTERE EKLE
    const { data: newInv, error: invErr } = await db.from('inventory').insert([{
      license_id: licenseId,
      created_by: session.user.id,
      type: itemType,
      color: color,
      quality: quality,
      stock_quantity: qty,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      notes: document.getElementById('purch-notes').value.trim() || null
    }]).select('id').single();

    if (invErr) throw invErr;
    const inventoryId = newInv.id;

    // 3. ALIŞ KAYDI (purchases tablosu)
    const { error: purchErr } = await db.from('purchases').insert([{
      license_id: licenseId,
      created_by: session.user.id,
      supplier_id: supplierId,
      item_type: itemType,
      inventory_id: inventoryId,
      quantity: qty,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      color: color,
      quality: quality,
      payment_method: document.getElementById('purch-payment').value,
      notes: document.getElementById('purch-notes').value.trim()
    }]);

    if (purchErr) throw purchErr;

    // Başarılı
    btn.textContent = '✅ Kaydedildi!';
    btn.classList.add('btn-save-success');
    showToast('Alış kaydı başarıyla eklendi', 'success');
    
    // Yalnızca finansalsa Kasa'ya da eklenebilir. Geliştirilecek.
    
    setTimeout(() => { 
      btn.textContent = '💾 Kaydet'; 
      btn.classList.remove('btn-save-success'); 
      btn.disabled = false;
      resetPurchForm();
      switchPurchSub('liste');
    }, 1500);

  } catch (error) {
    btn.disabled = false;
    btn.textContent = '❌ Hata!';
    console.error('Alış hata:', error);
    
    // Hangi alanda hata varsa
    const fieldMap = {
      type: 'purch-type',
      quantity: 'purch-qty',
      purchase_price: 'purch-price',
      sale_price: 'purch-sale-price'
    };
    handleSupabaseError(error, fieldMap);
    
    setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 2000);
  }
}

// ══════════════════════════════════════
//  FORM TEMİZLE
// ══════════════════════════════════════
function resetPurchForm() {
  document.getElementById('purch-add-form').reset();
  document.getElementById('purch-custom-type-group').style.display = 'none';
  const nameInput = document.getElementById('purch-supplier-name');
  if (nameInput) {
    nameInput.dataset.supplierId = '';
    nameInput.dataset.purchAcReady = ''; // Autocomplete yeniden kurulabilsin
  }
  clearAllErrors();
}

// ══════════════════════════════════════
//  GEÇMİŞİ LİSTELE
// ══════════════════════════════════════
async function loadPurchList() {
  const tbody = document.getElementById('purch-tbody');
  const empty = document.getElementById('purch-empty');
  if (!tbody || !db) return;

  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">Yükleniyor...</td></tr>';
  if (empty) empty.style.display = 'none';

  try {
    // Temel kolonları çek — supplier join ayrı yapılıyor (eski tablo uyumu)
    const { data, error } = await db.from('purchases')
      .select('id, created_at, purchase_date, item_type, color, quality, quantity, purchase_price, sale_price, payment_method, supplier_id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }

    // Tedarikçi isimlerini ayrı sorguda çek (supplier_id varsa)
    const supplierIds = [...new Set(data.filter(p => p.supplier_id).map(p => p.supplier_id))];
    let supplierMap = {};
    if (supplierIds.length > 0) {
      const { data: supps } = await db.from('customers')
        .select('id, full_name').in('id', supplierIds);
      if (supps) supps.forEach(s => { supplierMap[s.id] = s.full_name; });
    }

    tbody.innerHTML = data.map(p => {
      const rawDate = p.purchase_date || p.created_at;
      const date = rawDate
        ? new Date(rawDate).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })
        : '-';

      const itemType = p.item_type || 'Bilinmiyor';
      const colorQual = [p.color, p.quality].filter(Boolean).join(' / ') || '-';
      const qty = p.quantity || 1;
      const purchPrice = parseFloat(p.purchase_price) || 0;
      const salePrice = parseFloat(p.sale_price) || 0;
      const totalCost = (purchPrice * qty).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
      const supplier = p.supplier_id
        ? (supplierMap[p.supplier_id] || '<span style="color:#94a3b8">Bilinmiyor</span>')
        : '<span style="color:#94a3b8">—</span>';
      const payMethod = (p.payment_method || 'nakit').toUpperCase();

      return `
        <tr>
          <td>${date}</td>
          <td><b>${itemType}</b></td>
          <td>${colorQual}</td>
          <td style="text-align:center;"><b>${qty}</b></td>
          <td class="price-cell purchase">${purchPrice.toFixed(2)} ₺<br><small style="color:#94a3b8">Top: ${totalCost}</small></td>
          <td class="price-cell sale">${salePrice > 0 ? salePrice.toFixed(2) + ' ₺' : '-'}</td>
          <td>${supplier}</td>
          <td><span class="device-type-badge">${payMethod}</span></td>
          <td><button class="btn btn-sm">Detay</button></td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Geçmiş liste hatası:', err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ef4444;padding:20px;">
      Veriler çekilemedi: ${err.message || 'Bilinmeyen hata'}</td></tr>`;
  }
}

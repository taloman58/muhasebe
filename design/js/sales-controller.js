/* ============================================
   GSM OFIS PRO - Sales Controller
   Satış + Kasa birleşik modülü
   ============================================ */

// ── State ──
let posSource = 'stok';   // 'stok' | 'alis' | 'tamir'
let posCart   = [];        // [{id, name, price, qty, source, refId}]
let posPaymentMethod = 'nakit';
let lastSaleData = null;

// ══════════════════════════════════════
//  ALT SEKME
// ══════════════════════════════════════
function switchSatisSub(sub) {
  document.querySelectorAll('.satis-sub').forEach(btn => {
    const active = btn.dataset.satissub === sub;
    btn.classList.toggle('active', active);
    btn.classList.toggle('btn-primary', active);
  });
  document.querySelectorAll('.satis-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('satis-' + sub);
  if (target) target.classList.add('active');

  if (sub === 'gecmis') loadSalesHistory();
  if (sub === 'kasa')   loadKasaSummary();
}

// ══════════════════════════════════════
//  KAYNAK SEÇİMİ (Stok / Alış / Tamir)
// ══════════════════════════════════════
function switchPosSource(src) {
  posSource = src;
  document.querySelectorAll('.pos-src').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.src === src);
  });
  const searchEl = document.getElementById('pos-search');
  if (searchEl) { searchEl.value = ''; }
  document.getElementById('pos-results').innerHTML =
    '<div style="text-align:center;padding:30px;color:var(--text-muted)">Aramak için yazmaya başlayın</div>';
}

// ══════════════════════════════════════
//  ÜRÜN ARAMA
// ══════════════════════════════════════
let posSearchTimer = null;
function posSearch(val) {
  clearTimeout(posSearchTimer);
  if (!val || val.trim().length < 1) {
    document.getElementById('pos-results').innerHTML =
      '<div style="text-align:center;padding:30px;color:var(--text-muted)">Aramak için yazmaya başlayın</div>';
    return;
  }
  posSearchTimer = setTimeout(() => _posSearch(val.trim()), 280);
}

async function _posSearch(val) {
  const resultsEl = document.getElementById('pos-results');
  if (!db || !resultsEl) return;
  resultsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Aranıyor...</div>';

  try {
    let items = [];

    if (posSource === 'stok') {
      let query = db.from('phones')
        .select('id, brand, model, storage, color, sale_price, status')
        .or(`brand.ilike.%${val}%,model.ilike.%${val}%,color.ilike.%${val}%`);
      const { data, error: qErr } = await query.limit(20);
      if (qErr) console.warn('Cihaz arama hatası:', qErr.message);
      items = (data || [])
        .filter(p => (p.status || '').toLowerCase() !== 'satildi')
        .map(p => ({
          id: p.id,
          source: 'stok',
          name: `${p.brand} ${p.model}`,
          sub: [p.storage, p.color].filter(Boolean).join(' · '),
          price: parseFloat(p.sale_price) || 0,
          badge: '📱 Cihazlarım',
          badgeClass: ''
        }));

    } else if (posSource === 'alis') {
      const { data, error: qErr2 } = await db.from('inventory')
        .select('id, type, color, quality, sale_price, stock_quantity')
        .or(`type.ilike.%${val}%,color.ilike.%${val}%,quality.ilike.%${val}%`)
        .limit(20);
      if (qErr2) console.warn('Stok arama hatısı:', qErr2);
      items = (data || [])
        .filter(p => (p.stock_quantity || 0) > 0)
        .map(p => ({
          id: p.id,
          source: 'alis',
          name: p.type,
          sub: [p.color, p.quality].filter(Boolean).join(' · ') + ` · Stok: ${p.stock_quantity}`,
          price: parseFloat(p.sale_price) || 0,
          badge: '📦 Stok',
          badgeClass: 'alis'
        }));

    } else if (posSource === 'tamir') {
      const { data } = await db.from('repairs').select('id, service_no, device_brand, device_model, customer_id, total_cost')
        .or(`service_no.ilike.%${val}%,device_brand.ilike.%${val}%,device_model.ilike.%${val}%`)
        .in('status', ['tamamlandi'])
        .limit(20);

      // Müşteri isimlerini al
      const custIds = [...new Set((data || []).filter(r => r.customer_id).map(r => r.customer_id))];
      let custMap = {};
      if (custIds.length > 0) {
        const { data: cs } = await db.from('customers').select('id, full_name').in('id', custIds);
        if (cs) cs.forEach(c => { custMap[c.id] = c.full_name; });
      }

      items = (data || []).map(r => ({
        id: r.id,
        source: 'tamir',
        name: `${r.device_brand} ${r.device_model}`,
        sub: `${r.service_no} · ${r.customer_id ? (custMap[r.customer_id] || '?') : 'Müşterisiz'}`,
        price: parseFloat(r.total_cost) || 0,
        badge: '🔧 Tamir',
        badgeClass: 'tamir',
        repairCustomerId: r.customer_id
      }));
    }

    if (items.length === 0) {
      resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Sonuç bulunamadı</div>';
      return;
    }

    resultsEl.innerHTML = items.map(item => `
      <div class="pos-item-card" onclick='addToCart(${JSON.stringify(item)})'>
        <div class="pos-item-info">
          <div class="pos-item-name">${item.name}</div>
          <div class="pos-item-sub">${item.sub}</div>
        </div>
        <span class="pos-item-badge ${item.badgeClass}">${item.badge}</span>
        <span class="pos-item-price">${item.price.toFixed(2)} ₺</span>
      </div>
    `).join('');

  } catch (err) {
    console.error('POS arama hatası:', err);
    resultsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--color-danger)">Hata: ${err.message}</div>`;
  }
}

// ══════════════════════════════════════
//  SEPET
// ══════════════════════════════════════
function addToCart(item) {
  // Tamir direkt tek adet — aynı tamir 2 kez eklenemez
  const existing = posCart.find(c => c.id === item.id && c.source === item.source);
  if (existing) {
    if (item.source === 'tamir') { showToast('Bu tamir kaydı zaten sepette', 'info'); return; }
    existing.qty += 1;
  } else {
    posCart.push({ ...item, qty: 1 });
  }

  // Tamir'den müşteri otomatik doldur
  if (item.source === 'tamir' && item.repairCustomerId) {
    autoFillRepairCustomer(item.repairCustomerId);
  }

  renderCart();
  showToast(item.name + ' sepete eklendi', 'success');
  updateBuyerPanel(); // Alıcı panelini güncelle
}

function removeFromCart(index) {
  posCart.splice(index, 1);
  renderCart();
}

function changeQty(index, delta) {
  posCart[index].qty = Math.max(1, posCart[index].qty + delta);
  renderCart();
}

function clearCart() {
  posCart = [];
  document.getElementById('pos-discount').value = '';
  renderCart();
}

function renderCart() {
  const container = document.getElementById('pos-cart-items');
  const emptyEl   = document.getElementById('pos-cart-empty');
  if (!container) return;

  if (posCart.length === 0) {
    container.innerHTML = '<div class="pos-cart-empty">Sepet boş</div>';
    updateCartTotals();
    return;
  }

  container.innerHTML = posCart.map((item, i) => `
    <div class="pos-cart-row">
      <div class="pos-cart-row-info">
        <div class="pos-cart-row-name">${item.name}</div>
        <div class="pos-cart-row-price">${item.price.toFixed(2)} ₺/adet</div>
      </div>
      <div class="pos-qty-ctrl">
        <button class="pos-qty-btn" onclick="changeQty(${i}, -1)">−</button>
        <span class="pos-qty-num">${item.qty}</span>
        <button class="pos-qty-btn" onclick="changeQty(${i}, +1)">+</button>
      </div>
      <span class="pos-cart-row-total">${(item.price * item.qty).toFixed(2)} ₺</span>
      <button class="pos-cart-remove" onclick="removeFromCart(${i})">✕</button>
    </div>
  `).join('');

  updateCartTotals();
}

function updateCartTotals() {
  const subtotal  = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount  = parseFloat(document.getElementById('pos-discount')?.value) || 0;
  const total     = Math.max(0, subtotal - discount);

  document.getElementById('pos-subtotal').textContent = fmtTL(subtotal);
  document.getElementById('pos-total').textContent    = fmtTL(total);
  const discRow = document.getElementById('pos-discount-row');
  if (discRow) discRow.style.display = discount > 0 ? 'flex' : 'none';
  const discVal = document.getElementById('pos-discount-val');
  if (discVal) discVal.textContent = '-' + fmtTL(discount);

  calcChange();
}

function calcChange() {
  const total   = getCartTotal();
  const given   = parseFloat(document.getElementById('pos-cash-given')?.value) || 0;
  const change  = Math.max(0, given - total);
  const el = document.getElementById('pos-change');
  if (el) el.textContent = fmtTL(change);
}

function getCartTotal() {
  const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = parseFloat(document.getElementById('pos-discount')?.value) || 0;
  return Math.max(0, subtotal - discount);
}

function fmtTL(val) {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

// Sepette stok cihazı veya tamir varsa alıcı panelini göster
function updateBuyerPanel() {
  const hasPhone  = posCart.some(i => i.source === 'stok');
  const hasTamir  = posCart.some(i => i.source === 'tamir');
  const panel = document.getElementById('pos-buyer-panel');
  if (panel) panel.style.display = (hasPhone || hasTamir || posPaymentMethod === 'veresiye') ? 'block' : 'none';
}

function selectPayment(method) {
  posPaymentMethod = method;
  document.querySelectorAll('.pos-pay-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pay === method);
  });
  document.getElementById('pos-nakit-panel').style.display = method === 'nakit' ? 'block' : 'none';
  updateBuyerPanel();
}

// ══════════════════════════════════════
//  VERESİYE MÜŞTERİ ARAMA
// ══════════════════════════════════════
let posCustDropCreated = false;
async function posCustSearch(val) {
  if (!val || val.length < 2 || !db) return;

  if (!posCustDropCreated) {
    const input = document.getElementById('pos-cust-name');
    if (input) { createDropdown(input, 'pos-cust-dropdown'); posCustDropCreated = true; }
  }

  const { data } = await db.from('customers').select('id, full_name, phone')
    .or(`full_name.ilike.%${val}%,phone.ilike.%${val}%`).limit(8);

  if (!data?.length) { hideDropdown('pos-cust-dropdown'); return; }
  showDropdown('pos-cust-dropdown', data.map(c => c.full_name + ' · ' + c.phone), (selected) => {
    const match = data.find(c => selected.startsWith(c.full_name));
    if (match) {
      document.getElementById('pos-cust-name').value = match.full_name;
      document.getElementById('pos-cust-id').value   = match.id;
    }
    hideDropdown('pos-cust-dropdown');
  });
}

async function autoFillRepairCustomer(custId) {
  if (!custId || !db) return;
  const { data } = await db.from('customers').select('id, full_name').eq('id', custId).single();
  if (data) {
    selectPayment('veresiye');
    document.getElementById('pos-cust-name').value = data.full_name;
    document.getElementById('pos-cust-id').value   = data.id;
    const infoEl = document.getElementById('pos-veresiye-info');
    if (infoEl) { infoEl.style.display = 'block'; infoEl.textContent = '⚠️ Tamir müşterisine veresiye otomatik seçildi'; }
    updateBuyerPanel();
  }
}

// ══════════════════════════════════════
//  SATIŞ TAMAMLA
// ══════════════════════════════════════
async function handleSaleSubmit() {
  if (posCart.length === 0) { showToast('Sepet boş!', 'error'); return; }
  if (!db) { showToast('Supabase bağlantısı yok!', 'error'); return; }

  const btn = document.getElementById('btn-pos-sell');
  btn.disabled = true; btn.textContent = '⏳ İşleniyor...';

  try {
    const session = await getActiveSession();
    if (!session) throw new Error('Oturum yok');
    const profile = await getUserLicenseId(session.user.id);
    if (!profile) throw new Error('Profil yok');
    const licenseId = profile.license_id;

    const total    = getCartTotal();
    const discount = parseFloat(document.getElementById('pos-discount')?.value) || 0;

    // Müşteri
    let customerId = document.getElementById('pos-cust-id')?.value || null;
    const custName = document.getElementById('pos-cust-name')?.value.trim();

    if (posPaymentMethod === 'veresiye' && !customerId && custName) {
      // Yeni müşteri oluştur
      const { data: newCust } = await db.from('customers').insert([{
        license_id: licenseId, created_by: session.user.id,
        type: 'alici', full_name: custName, phone: ''
      }]).select('id').single();
      if (newCust) customerId = newCust.id;
    }

    if (posPaymentMethod === 'veresiye' && !customerId) {
      throw new Error('Veresiye için müşteri seçin!');
    }

    // Toplam satış kaydı
    const { data: sale, error: saleErr } = await db.from('sales').insert([{
      license_id: licenseId,
      created_by: session.user.id,
      customer_id: customerId,
      total_amount: total,
      discount_amount: discount,
      payment_method: posPaymentMethod,
      items: posCart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, source: i.source }))
    }]).select().single();

    if (saleErr) throw saleErr;

    // Stok güncelle
    for (const item of posCart) {
      if (item.source === 'stok') {
        // Telefon satıldı + kime satıldı kaydet
        await db.from('phones').update({
          status: 'satildi',
          sold_to: customerId || null,
          sold_at: new Date().toISOString(),
          sold_price: item.price
        }).eq('id', item.id);
      } else if (item.source === 'alis') {
        // Stok miktarını düşür
        const { data: inv } = await db.from('inventory').select('stock_quantity').eq('id', item.id).single();
        if (inv) {
          await db.from('inventory').update({
            stock_quantity: Math.max(0, inv.stock_quantity - item.qty)
          }).eq('id', item.id);
        }
      } else if (item.source === 'tamir') {
        // Tamir otomatik teslim edildi
        await db.from('repairs').update({
          status: 'teslim',
          delivered_at: new Date().toISOString()
        }).eq('id', item.id);
      }
    }

    // Veresiye ise müşteri borcunu güncelle
    if (posPaymentMethod === 'veresiye' && customerId) {
      await db.from('cash_transactions').insert([{
        license_id: licenseId,
        created_by: session.user.id,
        customer_id: customerId,
        amount: total,
        type: 'borc',
        description: `Satış #${sale.id.slice(0,8)} — veresiye`
      }]);
    }

    // Kasa hareketi
    await db.from('cash_transactions').insert([{
      license_id: licenseId,
      created_by: session.user.id,
      amount: total,
      type: 'gelir',
      payment_method: posPaymentMethod,
      description: 'Satış: ' + posCart.map(i => i.name).join(', '),
      reference_id: sale.id
    }]);

    lastSaleData = { sale, cart: [...posCart], custName, total, payMethod: posPaymentMethod };
    clearCart();
    document.getElementById('pos-discount').value = '';
    btn.disabled = false; btn.textContent = '✅ Satışı Tamamla';

    showSaleModal(total, custName);
    loadTickerData?.(); // ticker yenile

  } catch (err) {
    console.error('Satış hatası:', err);
    showToast(err.message || 'Satış kaydedilemedi!', 'error');
    btn.disabled = false; btn.textContent = '✅ Satışı Tamamla';
  }
}

// ══════════════════════════════════════
//  BAŞARI MODALI
// ══════════════════════════════════════
function showSaleModal(total, custName) {
  const modal = document.getElementById('sale-success-modal');
  const info  = document.getElementById('sale-success-info');
  if (modal) {
    if (info) info.textContent = fmtTL(total) + (custName ? ' · ' + custName : '') + ' · ' + (posPaymentMethod === 'veresiye' ? '📒 Veresiye' : '');
    modal.style.display = 'flex';
  }
}

function closeSaleModal() {
  const modal = document.getElementById('sale-success-modal');
  if (modal) modal.style.display = 'none';
}

// ── Fiş Yazdır (Termal) ──
function salePrintThermal() {
  if (!lastSaleData) return;
  const { cart, custName, total, payMethod } = lastSaleData;
  const win = window.open('', '_blank', 'width=360,height=600');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}
  .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between}h2{font-size:14px;margin:4px 0}</style>
  </head><body>
  <div class="center"><h2>💰 SATIŞ FİŞİ</h2>
  <div>${new Date().toLocaleString('tr-TR')}</div>
  ${custName ? `<div class="bold">${custName}</div>` : ''}</div>
  <div class="line"></div>
  ${cart.map(i => `<div class="row"><span>${i.name} x${i.qty}</span><span>${(i.price*i.qty).toFixed(2)} ₺</span></div>`).join('')}
  <div class="line"></div>
  <div class="row bold"><span>TOPLAM</span><span>${total.toFixed(2)} ₺</span></div>
  <div class="row"><span>Ödeme</span><span>${payMethod.toUpperCase()}</span></div>
  <div class="line"></div>
  <div class="center">İyi günler!</div>
  <script>window.print();window.close();<\/script></body></html>`);
}

function salePrintA4() {
  if (!lastSaleData) return;
  const { cart, custName, total, payMethod } = lastSaleData;
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;padding:30px 40px;font-size:13px}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  td,th{padding:7px 10px;border:1px solid #ccc;font-size:13px}th{background:#f1f5f9;font-weight:600}
  .total{font-size:16px;font-weight:800}.footer{margin-top:30px;text-align:center;color:#666;font-size:11px}
  </style></head><body>
  <div class="header"><div><strong style="font-size:18px">💰 SATIŞ FATURASI</strong>
  ${custName ? `<div>${custName}</div>` : ''}</div>
  <div>${new Date().toLocaleString('tr-TR')}</div></div>
  <table><thead><tr><th>Ürün</th><th>Fiyat</th><th>Adet</th><th>Toplam</th></tr></thead>
  <tbody>${cart.map(i => `<tr><td>${i.name}</td><td>${i.price.toFixed(2)} ₺</td><td>${i.qty}</td><td>${(i.price*i.qty).toFixed(2)} ₺</td></tr>`).join('')}
  </tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">TOPLAM</td>
  <td class="total">${total.toFixed(2)} ₺</td></tr></tfoot></table>
  <div class="footer">Ödeme: ${payMethod.toUpperCase()} · GSM Ofis Pro</div>
  <script>window.print();window.close();<\/script></body></html>`);
}

function saleWhatsApp() {
  if (!lastSaleData) return;
  const { cart, custName, total, payMethod } = lastSaleData;
  const msg = encodeURIComponent(
    `💰 *Satış Makbuzu*\n\n` +
    cart.map(i => `• ${i.name} x${i.qty} = ${(i.price*i.qty).toFixed(2)} ₺`).join('\n') +
    `\n\n*Toplam:* ${total.toFixed(2)} ₺ (${payMethod})\n` +
    `Teşekkürler ${custName ? custName : ''}!`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ══════════════════════════════════════
//  SATIŞ GEÇMİŞİ
// ══════════════════════════════════════
async function loadSalesHistory() {
  const tbody = document.getElementById('sales-history-tbody');
  if (!tbody || !db) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">Yükleniyor...</td></tr>';

  try {
    const { data, error } = await db.from('sales')
      .select('id, created_at, total_amount, payment_method, customer_id, items, discount_amount')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;

    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">Henüz satış yok</td></tr>';
      return;
    }

    const custIds = [...new Set(data.filter(s => s.customer_id).map(s => s.customer_id))];
    let custMap = {};
    if (custIds.length) {
      const { data: cs } = await db.from('customers').select('id, full_name').in('id', custIds);
      if (cs) cs.forEach(c => { custMap[c.id] = c.full_name; });
    }

    const payLabel = { nakit:'💵 Nakit', kk:'💳 K.Kartı', havale:'🏦 Havale', veresiye:'📒 Veresiye' };

    tbody.innerHTML = data.map(s => `
      <tr>
        <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${Array.isArray(s.items) ? s.items.map(i => i.name).join(', ') : '—'}
        </td>
        <td>${s.customer_id ? (custMap[s.customer_id] || '?') : '—'}</td>
        <td style="font-weight:700">${parseFloat(s.total_amount).toFixed(2)} ₺</td>
        <td>${payLabel[s.payment_method] || s.payment_method}</td>
        <td><button class="btn btn-sm">Detay</button></td>
      </tr>`).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-danger);padding:20px">Yüklenemedi: ${err.message}</td></tr>`;
  }
}

// ══════════════════════════════════════
//  KASA ÖZETİ
// ══════════════════════════════════════
async function loadKasaSummary() {
  if (!db) return;
  try {
    const bugun = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const { data } = await db.from('sales')
      .select('total_amount, payment_method')
      .gte('created_at', bugun);

    const totals = { nakit: 0, kk: 0, havale: 0, veresiye: 0 };
    (data || []).forEach(s => {
      const pm = s.payment_method;
      if (totals[pm] !== undefined) totals[pm] += parseFloat(s.total_amount) || 0;
    });

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmtTL(val); };
    set('kasa-nakit',    totals.nakit);
    set('kasa-kk',       totals.kk);
    set('kasa-havale',   totals.havale);
    set('kasa-veresiye', totals.veresiye);
    set('kasa-toplam',   totals.nakit + totals.kk + totals.havale);

    // Kasa hareketleri tablosu
    const tbody = document.getElementById('kasa-tbody');
    if (tbody) {
      const { data: txs } = await db.from('cash_transactions')
        .select('created_at, description, type, payment_method, amount')
        .gte('created_at', bugun)
        .order('created_at', { ascending: false }).limit(50);

      if (!txs?.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Bugün işlem yok</td></tr>';
      } else {
        tbody.innerHTML = txs.map(t => `
          <tr>
            <td>${new Date(t.created_at).toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}</td>
            <td>${t.description || '—'}</td>
            <td><span class="device-type-badge">${t.type?.toUpperCase()}</span></td>
            <td style="font-weight:700;color:${t.type === 'borc' ? 'var(--color-warning)' : 'var(--color-success)'}">
              ${t.type === 'borc' ? '-' : '+'}${parseFloat(t.amount).toFixed(2)} ₺
            </td>
          </tr>`).join('');
      }
    }
  } catch (err) {
    console.error('Kasa özet hatası:', err);
  }
}

// Satış sekmesi açılınca
document.addEventListener('DOMContentLoaded', () => {});

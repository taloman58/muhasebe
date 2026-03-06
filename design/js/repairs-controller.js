/* ============================================
   GSM OFIS PRO - Repairs Controller
   Tamir / Servis sayfası
   ============================================ */

let currentRepairData = null; // Kayıtlanan son tamir (fiş için)
let patternDrawing = false;
let patternPath = []; // [{x,y}] — desen noktaları
let patternCtx = null;

// ══════════════════════════════════════
//  ALT SEKME GEÇİŞİ
// ══════════════════════════════════════
function switchTamirSub(sub) {
  document.querySelectorAll('.tamir-sub').forEach(btn => {
    const active = btn.dataset.tamirsub === sub;
    btn.classList.toggle('active', active);
    if (active) btn.classList.add('btn-primary');
    else btn.classList.remove('btn-primary');
  });
  document.querySelectorAll('.tamir-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('tamir-' + sub);
  if (target) target.classList.add('active');

  const searchBar = document.getElementById('tamir-search-bar');
  if (searchBar) searchBar.style.display = (sub !== 'ekle') ? 'flex' : 'none';

  if (sub === 'acik') loadRepairList('acik');
  if (sub === 'tamamlanan') loadRepairList('tamamlandi');
}

// ══════════════════════════════════════
//  SAYFA AÇILINCA
// ══════════════════════════════════════
function initRepairPage() {
  generateServiceNo();
  setRepairDateTime();
  setupRepairAutocomplete();
  initPatternCanvas();
}

// ── Servis No Üret ──
function generateServiceNo() {
  const el = document.getElementById('repair-service-no');
  if (!el) return;
  const now = new Date();
  const date = now.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.random().toString(36).toUpperCase().slice(2,5);
  el.value = 'S-' + date + '-' + rand;
}

// ── Tarihi otomatik doldur ──
function setRepairDateTime() {
  const el = document.getElementById('repair-date');
  if (!el) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  el.value = now.toISOString().slice(0,16);
}

// ── Servis no kopyala ──
function copyServiceNo() {
  const val = document.getElementById('repair-service-no')?.value;
  if (val) {
    navigator.clipboard.writeText(val).then(() => showToast('Servis no kopyalandı', 'success'));
  }
}

// ── Şifre göster/gizle ──
function toggleRepairPassword() {
  const input = document.getElementById('repair-password');
  const btn = document.getElementById('btn-toggle-pw');
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁️'; }
}

// ── Fotoğraf etiketi güncelle ──
function updateRepairPhotoLabel(input) {
  const label = document.getElementById('repair-photo-label');
  if (label) label.textContent = input.files.length > 0
    ? input.files.length + ' fotoğraf seçildi'
    : 'Fotoğraf seç (birden fazla olabilir)';
}

// ══════════════════════════════════════
//  DESEN ÇİZİCİ (3×3 Canvas)
// ══════════════════════════════════════
function initPatternCanvas() {
  const canvas = document.getElementById('pattern-canvas');
  if (!canvas || canvas.dataset.init) return;
  canvas.dataset.init = 'true';

  patternCtx = canvas.getContext('2d');
  const SIZE = 198;
  const DOTS = [[33, 33], [99, 33], [165, 33],
                [33, 99], [99, 99], [165, 99],
                [33, 165],[99, 165],[165, 165]];

  function drawDots() {
    patternCtx.clearRect(0, 0, SIZE, SIZE);
    // Arka plan
    patternCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-input').trim() || '#1e293b';
    patternCtx.fillRect(0, 0, SIZE, SIZE);

    // Çizgiler önce
    if (patternPath.length > 1) {
      patternCtx.beginPath();
      patternCtx.strokeStyle = '#3b82f6';
      patternCtx.lineWidth = 3;
      patternCtx.lineCap = 'round';
      patternCtx.lineJoin = 'round';
      const first = DOTS[patternPath[0]];
      patternCtx.moveTo(first[0], first[1]);
      patternPath.slice(1).forEach(i => {
        const d = DOTS[i];
        patternCtx.lineTo(d[0], d[1]);
      });
      patternCtx.stroke();
    }

    // Noktalar
    DOTS.forEach((d, i) => {
      const selected = patternPath.includes(i);
      patternCtx.beginPath();
      patternCtx.arc(d[0], d[1], selected ? 9 : 6, 0, Math.PI * 2);
      patternCtx.fillStyle = selected ? '#3b82f6' : '#475569';
      patternCtx.fill();
      if (selected) {
        patternCtx.beginPath();
        patternCtx.arc(d[0], d[1], 4, 0, Math.PI * 2);
        patternCtx.fillStyle = 'white';
        patternCtx.fill();
      }
    });
  }

  function getDotAt(x, y) {
    return DOTS.findIndex(d => Math.hypot(d[0] - x, d[1] - y) < 20);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const client = e.touches ? e.touches[0] : e;
    return { x: client.clientX - rect.left, y: client.clientY - rect.top };
  }

  function startDraw(e) {
    e.preventDefault();
    patternDrawing = true;
    const { x, y } = getPos(e);
    const dot = getDotAt(x, y);
    if (dot !== -1 && !patternPath.includes(dot)) {
      patternPath.push(dot);
      drawDots();
    }
  }

  function moveDraw(e) {
    if (!patternDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const dot = getDotAt(x, y);
    if (dot !== -1 && !patternPath.includes(dot)) {
      patternPath.push(dot);
      drawDots();
    }
  }

  function endDraw() {
    if (!patternDrawing) return;
    patternDrawing = false;
    // base64 kaydet
    document.getElementById('repair-pattern').value = patternPath.length > 1
      ? canvas.toDataURL('image/png')
      : '';
    drawDots();
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  drawDots();
}

function clearPattern() {
  patternPath = [];
  document.getElementById('repair-pattern').value = '';
  if (patternCtx) {
    const SIZE = 198;
    patternCtx.clearRect(0, 0, SIZE, SIZE);
    // Yeniden çiz (boş)
    initPatternCanvas();
    const canvas = document.getElementById('pattern-canvas');
    if (canvas) canvas.dataset.init = ''; // Sıfırla
    initPatternCanvas();
  }
}

// ══════════════════════════════════════
//  MÜŞTERİ AUTOCOMPLETE (Tamir)
// ══════════════════════════════════════
function setupRepairAutocomplete() {
  const nameInput = document.getElementById('repair-cust-name');
  const phoneInput = document.getElementById('repair-cust-phone');
  const brandInput = document.getElementById('repair-brand');
  const modelInput = document.getElementById('repair-model');

  if (!nameInput || nameInput.dataset.repairAcReady) return;
  nameInput.dataset.repairAcReady = 'true';

  // Marka autocomplete
  if (brandInput) {
    createDropdown(brandInput, 'repair-brand-dropdown');
    brandInput.addEventListener('input', () => {
      const val = brandInput.value.trim().toLowerCase();
      if (val.length < 1 || !brandList.length) { hideDropdown('repair-brand-dropdown'); return; }
      const matches = brandList.filter(b => b.toLowerCase().includes(val)).slice(0, 10);
      showDropdown('repair-brand-dropdown', matches, (selected) => {
        brandInput.value = selected;
        hideDropdown('repair-brand-dropdown');
        if (modelInput) { modelInput.value = ''; modelInput.focus(); }
      });
    });
  }

  // Model autocomplete
  if (modelInput) {
    createDropdown(modelInput, 'repair-model-dropdown');
    modelInput.addEventListener('input', () => {
      const brand = brandInput?.value.trim();
      const val = modelInput.value.trim().toLowerCase();
      if (val.length < 1 || !modelData.length) { hideDropdown('repair-model-dropdown'); return; }
      const models = modelData
        .filter(m => (!brand || m.marka.toLowerCase() === brand.toLowerCase()) && m.model.toLowerCase().includes(val))
        .slice(0, 12);
      showDropdown('repair-model-dropdown', models.map(m => m.model), (selected) => {
        modelInput.value = selected;
        hideDropdown('repair-model-dropdown');
      });
    });
  }

  // Müşteri adı autocomplete
  createDropdown(nameInput, 'repair-cust-name-dropdown');
  nameInput.addEventListener('input', async () => {
    const val = nameInput.value.trim();
    if (val.length < 2 || !db) { hideDropdown('repair-cust-name-dropdown'); return; }
    const { data } = await db.from('customers').select('id, full_name, phone').ilike('full_name', '%' + val + '%').limit(8);
    if (!data?.length) { hideDropdown('repair-cust-name-dropdown'); return; }
    showDropdown('repair-cust-name-dropdown', data.map(c => c.full_name + ' (' + c.phone + ')'), (selected) => {
      const match = data.find(c => selected.startsWith(c.full_name));
      if (match) {
        nameInput.value = match.full_name;
        if (phoneInput) phoneInput.value = match.phone;
        nameInput.dataset.custId = match.id;
      }
      hideDropdown('repair-cust-name-dropdown');
    });
  });

  // Müşteri telefon autocomplete
  if (phoneInput) {
    createDropdown(phoneInput, 'repair-cust-phone-dropdown');
    phoneInput.addEventListener('input', async () => {
      const val = phoneInput.value.replace(/\s/g,'').trim();
      if (val.length < 3 || !db) { hideDropdown('repair-cust-phone-dropdown'); return; }
      const { data } = await db.from('customers').select('id, full_name, phone').ilike('phone', '%' + val + '%').limit(8);
      if (!data?.length) { hideDropdown('repair-cust-phone-dropdown'); return; }
      showDropdown('repair-cust-phone-dropdown', data.map(c => c.phone + ' — ' + c.full_name), (selected) => {
        const match = data.find(c => selected.startsWith(c.phone));
        if (match) {
          phoneInput.value = match.phone;
          nameInput.value = match.full_name;
          nameInput.dataset.custId = match.id;
        }
        hideDropdown('repair-cust-phone-dropdown');
      });
    });
  }

  // Dışarı tıklayınca dropdown kapat
  document.addEventListener('click', (e) => {
    ['repair-brand-dropdown','repair-model-dropdown','repair-cust-name-dropdown','repair-cust-phone-dropdown'].forEach(id => {
      const inputId = id.replace('-dropdown','');
      if (!e.target.closest('#' + inputId) && !e.target.closest('#' + id)) hideDropdown(id);
    });
  });
}

// ══════════════════════════════════════
//  KAYDET
// ══════════════════════════════════════
async function handleRepairSave(e) {
  e.preventDefault();
  clearAllErrors();

  const isValid = validateForm([
    { id: 'repair-brand', label: 'Marka' },
    { id: 'repair-model', label: 'Model' },
    { id: 'repair-fault', label: 'Arıza açıklaması' }
  ]);
  if (!isValid) return;
  if (!db) { showToast('Supabase bağlantısı yok!'); return; }

  const btn = document.getElementById('btn-repair-save');
  btn.disabled = true;
  btn.textContent = '⏳ Kaydediliyor...';

  const session = await getActiveSession();
  if (!session) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }
  const userProfile = await getUserLicenseId(session.user.id);
  if (!userProfile) { btn.disabled = false; btn.textContent = '💾 Kaydet'; return; }
  const licenseId = userProfile.license_id;

  // Aksesuar listesi
  const accChecked = [...document.querySelectorAll('.acc-check:checked')].map(cb => cb.value);
  const accExtra = document.getElementById('repair-acc-extra')?.value.trim();
  if (accExtra) accChecked.push(accExtra);
  const accessories = accChecked.join(', ');

  // Müşteri
  const custNameInput = document.getElementById('repair-cust-name');
  const custName = custNameInput?.value.trim();
  const custPhone = (document.getElementById('repair-cust-phone')?.value || '').replace(/\s/g,'').trim();
  let customerId = custNameInput?.dataset.custId || null;

  try {
    // 1. Müşteri yoksa kaydet
    if ((custName || custPhone) && !customerId) {
      let existQuery = db.from('customers').select('id');
      if (custPhone) existQuery = existQuery.eq('phone', custPhone);
      else existQuery = existQuery.ilike('full_name', custName);
      const { data: ext } = await existQuery.maybeSingle();

      if (ext) {
        customerId = ext.id;
      } else {
        const { data: newCust } = await db.from('customers').insert([{
          license_id: licenseId,
          created_by: session.user.id,
          type: 'diger',
          full_name: custName || 'Bilinmiyor',
          phone: custPhone || ''
        }]).select('id').single();
        if (newCust) customerId = newCust.id;
      }
    }

    // 2. Desen base64
    const patternData = document.getElementById('repair-pattern')?.value || null;

    // 3. Repair kaydı
    const serviceNo = document.getElementById('repair-service-no').value;
    const repairDate = document.getElementById('repair-date').value;

    const { data: newRepair, error: repErr } = await db.from('repairs').insert([{
      license_id: licenseId,
      created_by: session.user.id,
      service_no: serviceNo,
      customer_id: customerId,
      device_brand: document.getElementById('repair-brand').value.trim(),
      device_model: document.getElementById('repair-model').value.trim(),
      imei: document.getElementById('repair-imei')?.value.trim() || null,
      screen_password: document.getElementById('repair-password')?.value || null,
      sim_pin: document.getElementById('repair-sim-pin')?.value.trim() || null,
      fault_description: document.getElementById('repair-fault').value.trim(),
      accessories: accessories || null,
      notes: document.getElementById('repair-notes')?.value.trim() || null,
      pattern_image: patternData,
      status: 'bekliyor',
      received_at: repairDate ? new Date(repairDate).toISOString() : new Date().toISOString(),
      images: []
    }]).select().single();

    if (repErr) throw repErr;

    btn.textContent = '✅ Kaydedildi!';
    currentRepairData = newRepair;

    // Fotoğraf kayıt — yerel (Electron ile)
    saveRepairPhotos(newRepair.id);

    // Başarı modalı göster
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 Kaydet';
      showRepairSuccessModal(serviceNo, custName, newRepair);
    }, 600);

  } catch (err) {
    btn.disabled = false;
    btn.textContent = '❌ Hata!';
    console.error('Tamir kayıt hatası:', err);
    const fieldMap = {
      service_no: 'repair-service-no',
      device_brand: 'repair-brand',
      device_model: 'repair-model',
      fault_description: 'repair-fault'
    };
    handleSupabaseError(err, fieldMap);
    setTimeout(() => { btn.textContent = '💾 Kaydet'; }, 2000);
  }
}

// ── Fotoğraf Yerel Kayıt ──
function saveRepairPhotos(repairId) {
  const files = document.getElementById('repair-photos')?.files;
  if (!files || files.length === 0) return;

  if (window.electronAPI?.saveRepairPhoto) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        window.electronAPI.saveRepairPhoto({
          repairId: repairId,
          name: file.name,
          data: ev.target.result
        });
      };
      reader.readAsDataURL(file);
    });
  }
  // Electron yoksa sessizce geç (web modunda)
}

// ══════════════════════════════════════
//  BAŞARI MODALI
// ══════════════════════════════════════
function showRepairSuccessModal(serviceNo, custName, repairData) {
  const modal = document.getElementById('repair-success-modal');
  const noEl = document.getElementById('repair-success-no');
  if (!modal) return;
  if (noEl) noEl.textContent = serviceNo + (custName ? ' · ' + custName : '');
  modal.style.display = 'flex';
  resetRepairForm();
}

function closeRepairModal() {
  const modal = document.getElementById('repair-success-modal');
  if (modal) modal.style.display = 'none';
  switchTamirSub('acik');
}

// ══════════════════════════════════════
//  FİŞ YAZDIR
// ══════════════════════════════════════
function repairPrintThermal() {
  if (!currentRepairData) return;
  const r = currentRepairData;
  const win = window.open('', '_blank', 'width=380,height=600');
  win.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <style>
      body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; }
      h2 { font-size: 15px; margin: 4px 0; }
    </style></head><body>
    <div class="center">
      <h2>🔧 SERVİS FİŞİ</h2>
      <div class="bold">${r.service_no}</div>
      <div>${new Date(r.received_at).toLocaleString('tr-TR')}</div>
    </div>
    <div class="line"></div>
    <div class="row"><span>Cihaz:</span><span>${r.device_brand} ${r.device_model}</span></div>
    ${r.imei ? `<div class="row"><span>IMEI:</span><span>${r.imei}</span></div>` : ''}
    <div class="line"></div>
    <div class="bold">Arıza:</div>
    <div>${r.fault_description}</div>
    ${r.accessories ? `<div class="line"></div><div class="bold">Yanında Gelenler:</div><div>${r.accessories}</div>` : ''}
    ${r.notes ? `<div class="line"></div><div class="bold">Not:</div><div>${r.notes}</div>` : ''}
    <div class="line"></div>
    <div class="center">Teşekkürler!</div>
    <script>window.print(); window.close();<\/script>
    </body></html>
  `);
}

function repairPrintA4() {
  if (!currentRepairData) return;
  const r = currentRepairData;
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; padding: 30px 40px; color: #000; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
      .title { font-size: 20px; font-weight: 800; }
      .service-no { font-size: 18px; font-weight: 700; color: #2563eb; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      td { padding: 6px 10px; border: 1px solid #ccc; font-size: 13px; }
      td:first-child { background: #f8fafc; font-weight: 600; width: 35%; }
      .section-title { font-weight: 700; margin-top: 18px; margin-bottom: 6px; padding: 4px 10px; background: #1e293b; color: white; border-radius: 4px; }
      .footer { margin-top: 30px; border-top: 1px dashed #666; padding-top: 12px; text-align: center; color: #666; font-size: 11px; }
      .sign-area { display: flex; justify-content: space-between; margin-top: 30px; }
      .sign-box { border-top: 1px solid #333; width: 180px; text-align: center; padding-top: 4px; font-size: 12px; }
    </style></head><body>
    <div class="header">
      <div>
        <div class="title">🔧 SERVİS KABUL FİŞİ</div>
        <div style="color:#666;font-size:12px;margin-top:4px">GSM Ofis Pro</div>
      </div>
      <div style="text-align:right">
        <div class="service-no">${r.service_no}</div>
        <div>${new Date(r.received_at).toLocaleString('tr-TR')}</div>
      </div>
    </div>

    <div class="section-title">📱 Cihaz Bilgileri</div>
    <table>
      <tr><td>Marka / Model</td><td>${r.device_brand} ${r.device_model}</td></tr>
      ${r.imei ? `<tr><td>IMEI</td><td>${r.imei}</td></tr>` : ''}
    </table>

    <div class="section-title">⚠️ Arıza</div>
    <table>
      <tr><td>Arıza Açıklaması</td><td>${r.fault_description}</td></tr>
      ${r.accessories ? `<tr><td>Yanında Gelenler</td><td>${r.accessories}</td></tr>` : ''}
      ${r.notes ? `<tr><td>Not</td><td>${r.notes}</td></tr>` : ''}
    </table>

    <div class="sign-area">
      <div class="sign-box">Müşteri İmzası</div>
      <div class="sign-box">Yetkili</div>
    </div>
    <div class="footer">Bu fiş servis kabulü için düzenlenmiştir. Cihazınızı teslim alırken ibraz ediniz.</div>
    <script>window.print(); window.close();<\/script>
    </body></html>
  `);
}

function repairWhatsApp() {
  if (!currentRepairData) return;
  const r = currentRepairData;
  const phone = document.getElementById('repair-cust-phone')?.value?.replace(/\s/g,'');
  const msg = encodeURIComponent(
    `🔧 *Servis Kaydınız Oluşturuldu*\n\n` +
    `📋 Servis No: *${r.service_no}*\n` +
    `📱 Cihaz: ${r.device_brand} ${r.device_model}\n` +
    `⚠️ Arıza: ${r.fault_description}\n\n` +
    `Cihazınız teslim alındı. Tamir tamamlandığında bilgilendireceğiz.`
  );
  const url = phone && phone.length >= 10
    ? `https://wa.me/90${phone.replace(/^0/, '')}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
  window.open(url, '_blank');
}

// ══════════════════════════════════════
//  LİSTE YÜKLEv (Açık / Tamamlanan)
// ══════════════════════════════════════
async function loadRepairList(statusFilter) {
  const tbodyId = statusFilter === 'tamamlandi' ? 'repair-done-tbody' : 'repair-open-tbody';
  const tbody = document.getElementById(tbodyId);
  if (!tbody || !db) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Yükleniyor...</td></tr>';

  try {
    let query = db.from('repairs')
      .select('id, service_no, received_at, device_brand, device_model, fault_description, status, customer_id')
      .order('received_at', { ascending: false })
      .limit(50);

    if (statusFilter === 'tamamlandi') {
      query = query.in('status', ['tamamlandi', 'teslim']);
    } else {
      query = query.in('status', ['bekliyor', 'tamirde']);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">Kayıt bulunamadı</td></tr>`;
      return;
    }

    // Müşteri isimlerini al
    const custIds = [...new Set(data.filter(r => r.customer_id).map(r => r.customer_id))];
    let custMap = {};
    if (custIds.length > 0) {
      const { data: custs } = await db.from('customers').select('id, full_name').in('id', custIds);
      if (custs) custs.forEach(c => { custMap[c.id] = c.full_name; });
    }

    const statusLabel = { bekliyor: '⏳ Bekliyor', tamirde: '🔧 Tamirde', tamamlandi: '✅ Tamamlandı', teslim: '📦 Teslim' };

    tbody.innerHTML = data.map(r => {
      const date = new Date(r.received_at).toLocaleDateString('tr-TR');
      const cust = r.customer_id ? (custMap[r.customer_id] || '—') : '—';
      const badge = `<span class="status-badge ${r.status}">${statusLabel[r.status] || r.status}</span>`;

      if (statusFilter === 'tamamlandi') {
        return `<tr>
          <td><b>${r.service_no}</b></td>
          <td>${date}</td>
          <td>${r.device_brand} ${r.device_model}</td>
          <td>${cust}</td>
          <td>—</td>
          <td><button class="btn btn-sm" onclick="openRepairDetail('${r.id}')">Detay</button></td>
        </tr>`;
      }
      return `<tr>
        <td><b>${r.service_no}</b></td>
        <td>${date}</td>
        <td>${r.device_brand} ${r.device_model}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.fault_description}</td>
        <td>${cust}</td>
        <td>${badge}</td>
        <td><button class="btn btn-sm" onclick="openRepairDetail('${r.id}')">Detay</button></td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Tamir liste hatası:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:20px;">Yüklenemedi: ${err.message}</td></tr>`;
  }
}

function openRepairDetail(repairId) {
  showToast('Detay sayfası yakında eklenecek', 'info');
}

// ══════════════════════════════════════
//  FORM SIFIRLA
// ══════════════════════════════════════
function resetRepairForm() {
  document.getElementById('repair-add-form')?.reset();
  clearAllErrors();
  generateServiceNo();
  setRepairDateTime();
  clearPattern();
  const nameInput = document.getElementById('repair-cust-name');
  if (nameInput) { nameInput.dataset.custId = ''; nameInput.dataset.repairAcReady = ''; }
  document.getElementById('repair-photo-label').textContent = 'Fotoğraf seç (birden fazla olabilir)';
  patternPath = [];
  setupRepairAutocomplete();
}

// ══════════════════════════════════════
//  TAMIR AÇILINCA
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // click.js'de tamir sekmesi açıldığında initRepairPage çağrılır
});

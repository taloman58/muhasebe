/* ============================================
   GSM OFIS PRO - Yazdırma & Paylaşım Araçları
   Tüm sayfalar bu modülü kullanır
   WhatsApp (emoji yok), PDF, Yazdır (A4/Termal/Etiket)
   ============================================ */

// ── Yazdırma Ayarları ──
const PRINT_MODES = {
  a4: { name: 'A4 Kağıt', width: '210mm', height: '297mm' },
  termal: { name: 'Termal Fiş', width: '80mm', height: 'auto' },
  etiket: { name: 'Etiket', width: '60mm', height: '40mm' }
};

var currentPrintMode = 'a4';

// ══════════════════════════════════════
//  WHATSAPP GÖNDER (emoji yok)
// ══════════════════════════════════════
function sendWhatsApp(phone, message) {
  // Telefon numarasını temizle
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '90' + cleanPhone.slice(1);
  if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone;

  // Mesajı encode et (emoji yok)
  const encoded = encodeURIComponent(message || '');
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
  window.open(url, '_blank');
}

// ── Seçili işlemleri WhatsApp'a gönder ──
function sendSelectedWhatsApp() {
  const checkboxes = document.querySelectorAll('#detail-transactions-tbody input[type="checkbox"]:checked');
  if (checkboxes.length === 0) { alert('Lütfen gönderilecek işlemleri seçin'); return; }

  let message = 'ISLEM GECMISI\n';
  message += '─────────────\n';
  checkboxes.forEach(cb => {
    const row = cb.closest('tr');
    const cells = row.querySelectorAll('td');
    if (cells.length >= 5) {
      message += `${cells[1].textContent} | ${cells[2].textContent} | ${cells[3].textContent} | ${cells[4].textContent}\n`;
    }
  });

  // Kişinin telefonunu bul
  const phoneEl = document.querySelector('#detail-info div[style*="padding"]');
  const phone = phoneEl ? phoneEl.textContent.trim() : '';

  sendWhatsApp(phone, message);
}

// ══════════════════════════════════════
//  PDF ÇIKAR
// ══════════════════════════════════════
function exportPDF() {
  // Basit print-to-PDF yaklaşımı
  window.print();
}

// ══════════════════════════════════════
//  YAZDIR (3 mod: A4, Termal, Etiket)
// ══════════════════════════════════════
function printPage(mode) {
  currentPrintMode = mode || currentPrintMode;
  const config = PRINT_MODES[currentPrintMode];

  // Yazdırma stili uygula
  let printStyle = document.getElementById('print-mode-style');
  if (!printStyle) {
    printStyle = document.createElement('style');
    printStyle.id = 'print-mode-style';
    document.head.appendChild(printStyle);
  }

  printStyle.textContent = `
    @media print {
      @page {
        size: ${config.width} ${config.height};
        margin: ${currentPrintMode === 'a4' ? '15mm' : '3mm'};
      }
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
    }
  `;

  window.print();
}

// ── Seçili işlemleri yazdır ──
function printSelected(mode) {
  const checkboxes = document.querySelectorAll('#detail-transactions-tbody input[type="checkbox"]:checked');
  if (checkboxes.length === 0) { alert('Lütfen yazdırılacak işlemleri seçin'); return; }
  printPage(mode);
}

// ══════════════════════════════════════
//  YAZDIR MOD SEÇİCİ (UI bileşeni)
// ══════════════════════════════════════
function showPrintOptions() {
  const modes = Object.entries(PRINT_MODES);
  const html = modes.map(([key, val]) =>
    `<button class="btn btn-sm ${currentPrintMode === key ? 'btn-primary' : ''}" onclick="printPage('${key}')">${val.name}</button>`
  ).join(' ');

  // Basit modal/popup
  alert('Yazdırma ayarları:\nA4 Kağıt, Termal Fiş, Etiket\n\nŞu anda: ' + PRINT_MODES[currentPrintMode].name);
}

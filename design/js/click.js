/* ============================================
   GSM OFIS PRO - Navigation Controller (click.js)
   Menüler arası geçiş, sekme yönetimi
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  const TAB_CONFIG = {
    dashboard:  { title: "Dashboard",           subTabs: [] },
    stok:       { title: "Cihazlarım",          subTabs: [] },
    alis:       { title: "Stok",                subTabs: [] },
    satis:      { title: "Satış / Kasa",        subTabs: [] },
    tamir:      { title: "Tamir / Servis",      subTabs: [] },
    musteriler: { title: "Müşteri / CRM",       subTabs: [] },
    raporlar:   { title: "Raporlar",            subTabs: [] },
    ayarlar:    { title: "Ayarlar",             subTabs: [] },
  };

  // ── DOM Referansları ──
  const mainTabsContainer = document.getElementById("main-tabs");
  const subTabsContainer = document.getElementById("sub-tabs");
  const pagesContainer = document.getElementById("pages");
  const contentTitle = document.getElementById("content-title");

  let activeTab = "dashboard";
  let activeSubTab = 0;

  // ══════════════════════════════════════
  //  ANA SEKME GEÇİŞİ
  // ══════════════════════════════════════
  function switchMainTab(tabId) {
    if (!TAB_CONFIG[tabId]) return;
    activeTab = tabId;
    activeSubTab = 0;

    // Tab butonlarını güncelle
    mainTabsContainer.querySelectorAll(".main-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });

    // Sayfaları güncelle
    pagesContainer.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `page-${tabId}`);
    });

    // Alt sekmeleri güncelle
    renderSubTabs(tabId);

    // Başlığı güncelle
    if (contentTitle) {
      contentTitle.textContent = TAB_CONFIG[tabId].title;
    }

    // Sol paneldeki özet bilgiyi güncelle
    updateLeftPanel(tabId);
    
    // Alış sekmesi açıldıysa otomatik 'ekle' alt sekmesi
    if (tabId === 'alis' && typeof switchPurchSub === 'function') {
      switchPurchSub('ekle');
    }
    
    // Tamir sekmesi açıldıysa form başlat
    if (tabId === 'tamir' && typeof initRepairPage === 'function') {
      initRepairPage();
    }
  }

  // ══════════════════════════════════════
  //  ALT SEKME GEÇİŞİ
  // ══════════════════════════════════════
  function switchSubTab(index) {
    activeSubTab = index;

    subTabsContainer.querySelectorAll(".sub-tab").forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
    });

    // Alt sekme içerik alanlarını güncelle
    const page = document.getElementById(`page-${activeTab}`);
    if (page) {
      page.querySelectorAll(".sub-content").forEach((content, i) => {
        content.classList.toggle("active", i === index);
      });
    }
  }

  // ══════════════════════════════════════
  //  ALT SEKMELERİ RENDER ET
  // ══════════════════════════════════════
  function renderSubTabs(tabId) {
    const config = TAB_CONFIG[tabId];
    if (!config || !config.subTabs.length) {
      subTabsContainer.innerHTML = "";
      return;
    }

    subTabsContainer.innerHTML = config.subTabs
      .map(
        (name, i) =>
          `<button class="sub-tab${i === 0 ? " active" : ""}" data-index="${i}">${name}</button>`,
      )
      .join("");

    // Alt sekme click eventleri
    subTabsContainer.querySelectorAll(".sub-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        switchSubTab(parseInt(tab.dataset.index));
      });
    });
  }

  // ══════════════════════════════════════
  //  SOL PANEL GÜNCELLEMESİ (Supabase RPC)
  //  Tüm istatistikler sunucuda hesaplanır
  // ══════════════════════════════════════
  async function updateLeftPanel(tabId) {
    const panelContent = document.getElementById("panel-left-content");
    if (!panelContent) return;

    // Önce loading göster
    const loadingItems = [{ label: "Yükleniyor...", value: "...", cls: "" }];
    renderPanel(panelContent, loadingItems);

    // Supabase'den istatistikleri çek
    let s = {};
    if (db) {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (session) {
          const { data } = await db.rpc('get_dashboard_stats', { p_user_id: session.user.id });
          if (data) s = data;
        }
      } catch (e) { console.warn('Panel stats error:', e); }
    }

    const fmt = (v) => Number(v || 0).toLocaleString('tr-TR');
    const fmtTl = (v) => '₺' + fmt(v);

    // Sekmeye göre gösterilecek bilgiler (değerler sunucudan)
    const panelData = {
      dashboard: [
        { label: "Toplam Stok", value: fmt(s.toplam_stok), cls: "accent" },
        { label: "Bugün Satış", value: fmt(s.bugun_satis), cls: "" },
        { label: "Bugün Alış", value: fmt(s.bugun_alis), cls: "" },
        { label: "Açık Tamir", value: fmt(s.acik_tamir), cls: "danger" },
        { label: "Günlük Gelir", value: fmtTl(s.gunluk_gelir), cls: "success" },
        { label: "Günlük Gider", value: fmtTl(s.gunluk_gider), cls: "danger" },
      ],
      stok: [
        { label: "Toplam Stok", value: fmt(s.toplam_stok), cls: "accent" },
        { label: "Satışa Hazır", value: fmt(s.satisa_hazir), cls: "success" },
        { label: "Tamirde", value: fmt(s.tamirde), cls: "" },
        { label: "Rezerve", value: fmt(s.rezerve), cls: "" },
        { label: "Stok Değeri", value: fmtTl(s.stok_degeri), cls: "accent" },
      ],
      alis: [
        { label: "Bu Ay Alış", value: fmt(s.bu_ay_alis), cls: "accent" },
        { label: "Bu Ay Tutar", value: fmtTl(s.bu_ay_alis_tutar), cls: "" },
        { label: "Bugün Alış", value: fmt(s.bugun_alis), cls: "" },
      ],
      satis: [
        { label: "Bu Ay Satış", value: fmt(s.bu_ay_satis), cls: "accent" },
        { label: "Bu Ay Gelir", value: fmtTl(s.bu_ay_gelir), cls: "success" },
        { label: "Bugün Satış", value: fmt(s.bugun_satis), cls: "" },
      ],
      tamir: [
        { label: "Açık Servis", value: fmt(s.acik_tamir), cls: "danger" },
      ],
      kasa: [
        { label: "Kasa Bakiye", value: fmtTl(s.kasa_bakiye), cls: "accent" },
        { label: "Bugün Gelir", value: fmtTl(s.gunluk_gelir), cls: "success" },
        { label: "Bugün Gider", value: fmtTl(s.gunluk_gider), cls: "danger" },
      ],
      musteriler: [
        { label: "Toplam Kişi", value: fmt(s.toplam_musteri), cls: "accent" },
      ],
      raporlar: [{ label: "Son Rapor", value: "-", cls: "" }],
      ayarlar: [
        { label: "Lisans Durumu", value: "Aktif", cls: "success" },
        { label: "Versiyon", value: "v1.0.0", cls: "" },
      ],
    };

    renderPanel(panelContent, panelData[tabId] || []);
  }

  function renderPanel(container, items) {
    container.innerHTML = items
      .map(
        (item) =>
          `<div class="info-item">
        <span class="info-label">${item.label}</span>
        <span class="info-value ${item.cls}">${item.value}</span>
      </div>`,
      )
      .join("");
  }

  // ══════════════════════════════════════
  //  ANA SEKME CLICK EVENT'LERİ
  // ══════════════════════════════════════
  mainTabsContainer.querySelectorAll(".main-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchMainTab(tab.dataset.tab);
    });
  });

  // ══════════════════════════════════════
  //  MENÜ BAR CLICK (placeholder)
  // ══════════════════════════════════════
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", () => {
      // İleride dropdown menüler eklenecek
      console.log("Menü tıklandı:", item.textContent);
    });
  });

  // ══════════════════════════════════════
  //  WINDOW CONTROLS (titlebar butonları)
  // ══════════════════════════════════════
  document.getElementById("btn-minimize")?.addEventListener("click", () => {
    if (window.electronAPI) window.electronAPI.minimize();
  });

  document.getElementById("btn-maximize")?.addEventListener("click", () => {
    if (window.electronAPI) window.electronAPI.maximize();
  });

  document.getElementById("btn-close")?.addEventListener("click", () => {
    if (window.electronAPI) window.electronAPI.close();
  });

  // ══════════════════════════════════════
  //  KLAVYE KISAYOLLARI
  // ══════════════════════════════════════
  document.addEventListener("keydown", (e) => {
    const tabs = Object.keys(TAB_CONFIG);

    // Ctrl + 1-9 → Sekme geçişi
    if (e.ctrlKey && e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (tabs[index]) {
        switchMainTab(tabs[index]);
      }
    }

    // Ctrl + Tab → Sonraki sekme
    if (e.ctrlKey && e.key === "Tab") {
      e.preventDefault();
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : (currentIndex + 1) % tabs.length;
      switchMainTab(tabs[nextIndex]);
    }
  });

  // ══════════════════════════════════════
  //  BAŞLANGIÇ: Dashboard aç
  // ══════════════════════════════════════
  switchMainTab("dashboard");

  // Saat güncelle
  function updateClock() {
    const clockEl = document.getElementById("status-clock");
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  updateClock();
  setInterval(updateClock, 60000);

  // ══════════════════════════════════════
  //  TICKER BAR — Canlı Veri Akışı
  // ══════════════════════════════════════
  async function loadTickerData() {
    // db henüz hazır değilse bekle
    if (!db) {
      setTimeout(loadTickerData, 1500);
      return;
    }
    // Auth kontrolü
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) return; // giriş yapılmamış, çalışmaya gerek yok
    } catch(_) { return; }

    try {
      const saat = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const [stockRes, repairOpenRes, repairDoneRes] = await Promise.allSettled([
        db.from('phones').select('id', { count: 'exact', head: true }),
        db.from('repairs').select('id', { count: 'exact', head: true }).in('status', ['bekliyor', 'tamirde']),
        db.from('repairs').select('id', { count: 'exact', head: true }).eq('status', 'tamamlandi')
      ]);

      const stokAdet  = stockRes.status      === 'fulfilled' ? (stockRes.value?.count      ?? 0) : '—';
      const acikTamir = repairOpenRes.status === 'fulfilled' ? (repairOpenRes.value?.count ?? 0) : '—';
      const tammTamir = repairDoneRes.status === 'fulfilled' ? (repairDoneRes.value?.count ?? 0) : '—';

      const items = [
        { icon: '📱', label: 'Cihazlarım',          val: stokAdet,   birim: 'adet' },
        { icon: '🔧', label: 'Açık Servis',         val: acikTamir,  birim: 'adet' },
        { icon: '✅', label: 'Tamamlanan Tamir',    val: tammTamir,  birim: 'adet' },
        { icon: '🕐', label: 'Son Güncelleme',      val: saat,       birim: '' },
      ];

      const html = items.map(item =>
        `<span class="ticker-item highlight">
          ${item.icon} ${item.label}: <span class="ticker-val">${item.val}</span>${item.birim ? ' ' + item.birim : ''}
        </span>`
      ).join('');

      const track = document.getElementById('ticker-track');
      if (track) {
        track.innerHTML = html + html;
        const totalWidth = track.scrollWidth / 2;
        const speed = Math.max(45, totalWidth / 5);
        track.style.animationDuration = Math.round(speed) + 's';
      }

    } catch (e) {
      console.warn('Ticker veri hatası:', e.message);
    }
  }

  // Auth hazır olunca ticker'ı başlat
  // (auth.js initSupabase() çağrısından sonra db set edilir, biz biraz bekleriz)
  setTimeout(() => {
    loadTickerData();
    setInterval(loadTickerData, 90000);
  }, 3000);

});


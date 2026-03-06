# GSM OFIS PRO - Geliştirme Kuralları

> Bu kurallar tüm geliştirme süreçlerinde geçerlidir.

---

## 🔒 Kilitli Dosyalar (Dokunulmayacak)

| Dosya                    | Neden                                       |
| ------------------------ | ------------------------------------------- |
| `js/auth.js`             | Auth tamamlandı, tüm kontroller Supabase'de |
| `login.html`             | Login UI tamamlandı                         |
| `js/login-controller.js` | Login akışı tamamlandı                      |

---

## 🏛️ 1. Mimari Kurallar

### 1.1 SPA (Single Page Application)

- **TEK HTML sayfası:** `index.html` tüm modülleri içerir
- **Yeni sayfa oluşturma YASAK** (login.html hariç)
- Modüller `<div class="page" id="page-XXX">` ile ayrılır
- Geçiş `click.js` ile yapılır

### 1.2 Modüler Dosya Yapısı

```
js/        → Her modülün kendi JS dosyası
styles/    → Her modülün kendi CSS dosyası
data/      → Statik veri dosyaları (modeller.json)
sql/       → Veritabanı yapı dosyaları (henüz çalıştırma)
```

### 1.3 Yeni Modül Ekleme Adımları

1. `js/modul-controller.js` oluştur
2. `styles/` altına CSS ekle (gerekirse)
3. `index.html`'e `<div class="page">` ekle
4. `index.html`'e `<script>` ve `<link>` bağla
5. `click.js` TAB_CONFIG'e sekme ekle

### 1.4 Alış Sayfası Kuralları (Yeni Alış)

- **Türü (Zorunlu):** EKRAN, KASA, ŞARJ, KIRILMAZCAM, KILIF, KULAKLIK, POWERBANK, NANOCAM, HAYALET, KABLO, SARJ BAŞLIK, DİĞER (ve elle tür ekle)
- **Temel Alanlar:** Adet (Zorunlu), Alış Fiyat (Zorunlu), Satış Fiyat (Zorunlu)
- **Opsiyonel Detaylar:** Renk, Kalite
- **Tedarikçi (Opsiyonel):** Adı Soyadı, Numarası
  - Eklenen kişi **doğrudan müşterilere ("tedarikçi" tipinde) kaydedilir**.
  - Yazarken müşteriler/tedarikçiler listesinden **tahmin (autocomplete)** ile otomatik doldurma yapılır.

---

## 🚫 2. Client vs Backend Kuralları

### 2.1 Client'ta YAPILMAYACAKLAR (YASAKLAR)

```
❌ Fiyat hesaplama (toplam, vergi, kar/zarar)
❌ Borç hesaplama (toplam borç, kalan borç)
❌ İstatistik hesaplama (aylık satış, stok değeri)
❌ Kullanıcı yetki kontrolü
❌ Lisans kontrolü
❌ Bayi izolasyonu (license_id filtreleme)
❌ Veri doğrulama (unique check, foreign key)
```

### 2.2 Client'ta YAPILACAKLAR

```
✅ Form validasyon (boş alan, format kontrolü)
✅ UI toggle / sekme geçişi
✅ Autocomplete filtreleme (yerel JSON)
✅ Tarih/saat formatlama (gösterim)
✅ Dosya seçme (file input)
✅ Yazdırma / PDF / WhatsApp
✅ Electron pencere kontrolleri
```

### 2.3 Supabase'de YAPILACAKLAR

```
✅ RPC fonksiyonları ile tüm iş mantığı
✅ RLS ile bayi izolasyonu (license_id)
✅ Trigger ile otomatik güncelleme (updated_at)
✅ View ile hazır raporlar
✅ SECURITY DEFINER fonksiyonları ile cross-table sorgular
```

---

## 🎨 3. CSS Kuralları

### 3.1 Değişken Kullanımı Zorunlu

```css
/* ✅ DOĞRU */
color: var(--text-primary);
background: var(--bg-panel);

/* ❌ YANLIŞ */
color: #1e293b;
background: #ffffff;
```

### 3.2 Dosya Organizasyonu

- `variables.css` → Değişkenler (renk, font, spacing, radius)
- `global.css` → Reset, body, genel kurallar
- `layout.css` → Sayfa düzeni (titlebar, sidebar, panel)
- `components.css` → Tekrar kullanılan bileşenler
- `stock.css` → Modüle özel stiller + ortak gizle/göster

---

## 📝 4. JavaScript Kuralları

### 4.1 Global Değişkenler

```javascript
var db = null; // Supabase client (auth.js)
var modelData = []; // Model verileri (stock-controller.js)
var currentCustomerId; // Aktif müşteri (customers-controller.js)
```

### 4.2 Fonksiyon Adlandırma

```
handleXxx(event)  → Form submit handler
loadXxxList()     → Supabase'den liste çekme
switchXxxSub()    → Alt sekme geçişi
openXxxDetail()   → Detay görünümü açma
```

### 4.3 Hata Yönetimi

- `alert()` KULLANMA → `showToast(mesaj, tip)` kullan
- Form hataları → `showFieldError(id, mesaj)` kullan
- Supabase hataları → `translateError(error)` kullan
- Form doğrulama → `validateForm([{id, label}])` kullan

### 4.4 Supabase Sorgu Şablonu

```javascript
async function loadXxx() {
  if (!db) return;
  const session = await getActiveSession();
  if (!session) return;

  const { data, error } = await db
    .from("tablo")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast(translateError(error));
    return;
  }
  // UI güncelle...
}
```

---

## 🖨️ 5. Yazdırma / Paylaşım Kuralları

### 5.1 Ortak Modül

- Tüm sayfalar `print-utils.js` kullanır
- Her sayfa kendi "Yazdır" butonunu ekler, aynı fonksiyonları çağırır

### 5.2 Yazdırma Modları

| Mod    | Boyut         | Kullanım      |
| ------ | ------------- | ------------- |
| A4     | 210mm × 297mm | Fatura, rapor |
| Termal | 80mm × auto   | Fiş, makbuz   |
| Etiket | 60mm × 40mm   | Ürün etiketi  |

### 5.3 WhatsApp

- Emoji gönderme YOK
- Düz metin formatı
- wa.me API kullanılır
- Telefon numarası otomatik 90 ön eki

---

## 🗄️ 6. SQL Kuralları

### 6.1 Geçici Klasör Stratejisi

- SQL dosyaları `sql/` klasöründe saklanır
- Sistem hazır olana kadar Supabase'de çalıştırılMAZ
- `_master_setup.sql` oluşturulacak → tek seferde tüm tabloları kuracak

### 6.2 Her Tabloda Zorunlu Alanlar

```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY
license_id UUID NOT NULL REFERENCES licenses(id)  -- Bayi izolasyonu
created_by UUID REFERENCES auth.users(id)          -- Kim oluşturdu
created_at TIMESTAMPTZ DEFAULT now()               -- Ne zaman
updated_at TIMESTAMPTZ DEFAULT now()               -- Son güncelleme
```

### 6.3 RLS (Row Level Security)

- Her tablo için RLS **ZORUNLU**
- SELECT: `license_id = (SELECT license_id FROM user_profiles WHERE id = auth.uid())`
- INSERT: Aynı kural + `created_by = auth.uid()`
- Admin: `role = 'admin'` → tüm lisansları görebilir

---

## 📦 7. Resim/Dosya Kuralları

### 7.1 Yerelde Saklama

- Resimler veritabanına **YÜKLENMEZ**
- Yerel dosya sistemi: `C:\GSMOfis\images\{license_id}\{record_id}\`
- DB'de sadece dosya adı saklanır (VARCHAR)

### 7.2 Kimlik Fotokopisi

- Özel klasör: `C:\GSMOfis\kimlik\{license_id}\`
- Maks 5MB, JPG/PNG/PDF

---

## 🔐 8. Güvenlik Kuralları

- Supabase ANON key client-safe (RLS korur)
- Hassas işlemler SECURITY DEFINER fonksiyonları ile
- JWT süresi dolunca otomatik login'e yönlendirme
- Bir bayi diğerinin verilerini **ASLA** göremez
- Admin tüm bayileri audit edebilir

---

## ✅ 9. Çalıştırma

```bash
# Geliştirme
cd d:\Muhasebe\design
npm start

# Pencere ayarları
# Boyut: 1200x750 (DFT boyut), tam ekran açılmaz
# Frame: yok (kendi titlebar)
# Min boyut: 900x600
```

# GSM OFIS PRO - Proje Bağlamı (Context)

> Son güncelleme: 2026-03-05 13:59

---

## 📋 Proje Özeti

GSM bayileri için masaüstü muhasebe ve stok yönetim uygulaması.

- **Mimari:** SPA (Single Page Application) - Electron desktop
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Frontend:** Vanilla HTML/CSS/JS (framework yok)
- **Masaüstü:** Electron (frameless, 1200x750)

---

## 📁 Dosya Yapısı

```
d:\Muhasebe\
├── design/                          ← Ana uygulama klasörü
│   ├── index.html                   ← SPA ana sayfa (tüm modüller burada)
│   ├── login.html                   ← Giriş / Kayıt / Şifremi Unuttum
│   ├── main.js                      ← Electron ana process
│   ├── preload.js                   ← Electron IPC köprüsü
│   ├── package.json                 ← Electron + npm config
│   │
│   ├── js/                          ← JavaScript modülleri
│   │   ├── auth.js              🔒  ← Supabase Auth (giriş/kayıt/oturum) - KİLİTLİ
│   │   ├── click.js                 ← Navigasyon, sekme geçişi, pencere kontrolleri
│   │   ├── login-controller.js      ← Login sayfası UI kontrolleri
│   │   ├── stock-controller.js      ← Stok CRUD, autocomplete (modeller.json)
│   │   ├── customers-controller.js  ← Kişi yönetimi, borç/ödeme
│   │   ├── error.js                 ← Global hata yönetimi, toast, form validasyon
│   │   └── print-utils.js          ← WhatsApp / PDF / Yazdır (A4/Termal/Etiket)
│   │
│   ├── styles/                      ← CSS modülleri
│   │   ├── variables.css            ← Renk, font, spacing değişkenleri
│   │   ├── global.css               ← Reset, body, genel kurallar
│   │   ├── layout.css               ← Titlebar, sidebar, panel layout
│   │   ├── components.css           ← Buton, input, tablo, badge bileşenleri
│   │   ├── login.css                ← Login sayfası stilleri
│   │   └── stock.css                ← Stok + Müşteri form/tablo + hata stilleri
│   │
│   └── data/
│       └── modeller.json            ← 12.7K satır marka/model/ram/depolama verisi
│
├── sql/                             ← Veritabanı yapısı (henüz çalıştırılmadı)
│   ├── 01_tables.sql                ← 10 tablo tanımı
│   └── README.md                    ← SQL açıklaması
│
├── modeller.json                    ← Orijinal model verisi
├── supabase-setup.sql               ← İlk kurulum (licenses + user_profiles + RPC)
├── admin-setup.sql                  ← Admin SQL'leri
└── Rules.md                         ← Proje kuralları (eski)
```

---

## 🗄️ Veritabanı Tabloları (Supabase)

### Çalışan (Supabase'de mevcut)

| Tablo           | Durum    | Açıklama             |
| --------------- | -------- | -------------------- |
| `licenses`      | ✅ Aktif | Lisans yönetimi      |
| `user_profiles` | ✅ Aktif | Kullanıcı profilleri |

### Bekleyen (01_tables.sql'de tanımlı, henüz çalıştırılmadı)

| Tablo               | Açıklama                                   |
| ------------------- | ------------------------------------------ |
| `phones`            | Stok (telefon/tablet/laptop/bilgisayar)    |
| `customers`         | Kişiler (toptancı/satıcı/alıcı/bayi/genel) |
| `purchases`         | Alış işlemleri                             |
| `sales`             | Satış işlemleri                            |
| `installments`      | Taksit planları                            |
| `repairs`           | Tamir/servis kayıtları                     |
| `cash_transactions` | Kasa hareketleri                           |
| `audit_log`         | Admin izleme logu                          |

### Supabase RPC Fonksiyonları (Aktif)

- `validate_and_assign_license` → Kayıt sırasında lisans doğrulama
- `check_user_login` → Giriş sırasında lisans + profil kontrolü
- `get_email_by_username` → Kullanıcı adından e-posta bulma

---

## 🔌 JS Modülleri - Sorumluluk Haritası

### `auth.js` 🔒 KİLİTLİ

- Supabase client başlatma (`initSupabase`)
- Login (email veya username)
- Register (lisans doğrulama RPC ile)
- Şifre sıfırlama
- Oturum kontrolü
- Çıkış
- **Durum:** Tamamlanmış, dokunulmayacak

### `click.js`

- 9 ana sekme geçişi (dashboard, stok, alış, satış, tamir, kasa, müşteriler, raporlar, ayarlar)
- Alt sekme render
- Sol panel bilgi güncelleme
- Pencere kontrolleri (Electron IPC)
- Klavye kısayolları (Ctrl+1-9, Ctrl+Tab)
- Saat güncelleme

### `stock-controller.js`

- modeller.json yükleme ve marka/model autocomplete
- Model seçilince RAM/depolama/ekran otomatik doldurma
- Stok kaydetme (Supabase'e)
- Satıcı bilgisi → otomatik müşteri kaydı (tip: satıcı)
- Stok listesi yükleme
- Oturum yardımcı fonksiyonları (`getActiveSession`, `getUserLicenseId`)
- Form doğrulama (error.js kullanarak)

### `customers-controller.js`

- Kişi listesi yükleme
- Yeni kişi ekleme
- Kişi detay görüntüleme
- İşlem geçmişi
- Borç ekleme / Ödeme alma

### `error.js`

- Alan bazlı hata gösterimi (kırmızı kenarlık + \* + açıklama)
- Form doğrulama
- Global toast mesajları
- Supabase hata çevirisi (Türkçe)

### `print-utils.js`

- WhatsApp gönderme (emoji yok)
- PDF çıkarma
- Yazdırma (A4 / Termal / Etiket)
- Seçili işlem gönderme/yazdırma

---

## ⚠️ Client'ta Yapılmaması Gereken İşlemler (Backend'e Taşınacak)

### 🔴 Kritik - Hemen Taşınmalı

| #   | Dosya                     | Satır   | Sorun                                                            | Çözüm                                                 |
| --- | ------------------------- | ------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `stock-controller.js`     | 203-237 | `autoSaveSeller()` SELECT+INSERT ayrı yapılıyor → race condition | Supabase RPC `upsert_seller()` fonksiyonu             |
| 2   | `customers-controller.js` | 128     | Toplam borç "-" hardcoded                                        | Supabase VIEW veya RPC ile hesaplanmalı               |
| 3   | `customers-controller.js` | 170-187 | İşlem geçmişi customer_id ile filtrelenmiyor                     | `cash_transactions` tablosuna `customer_id` eklenmeli |
| 4   | `click.js`                | 134-184 | Sol panel tüm değerler "0" hardcoded                             | Supabase RPC `get_dashboard_stats()` fonksiyonu       |

### 🟡 Orta - İleri Aşamada

| #   | Dosya                     | Satır   | Sorun                                                     | Çözüm                                                              |
| --- | ------------------------- | ------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| 5   | `customers-controller.js` | 47-88   | `handleCustSave` - direkt tablo sorgusu, alert kullanıyor | `getActiveSession` + `getUserLicenseId` kullan, `showToast` kullan |
| 6   | `customers-controller.js` | 192-221 | `handleDebtAction` - validasyon yok, alert kullanıyor     | `validateForm` + `showToast` kullan                                |
| 7   | `stock-controller.js`     | 289     | `parseFloat` ile fiyat dönüşümü                           | Supabase'de DECIMAL olarak zaten saklanıyor, kabul edilebilir      |

### 🟢 UI Only - Client'ta Kalması Uygun

| İşlem                                 | Neden                        |
| ------------------------------------- | ---------------------------- |
| Autocomplete filtreleme               | Yerel JSON, ağ isteği yok    |
| Form validasyon (boş alan)            | UX için anında yanıt gerekli |
| Sekme geçişi / UI toggle              | Pure UI işlemi               |
| Tarih formatlama (toLocaleDateString) | Gösterim amaçlı              |
| Pencere kontrolleri (Electron)        | Desktop API                  |

---

## 🏗️ Sayfalar Durumu

| Sayfa      | HTML       | CSS | JS           | Supabase     | Durum             |
| ---------- | ---------- | --- | ------------ | ------------ | ----------------- |
| Login      | ✅         | ✅  | ✅           | ✅ RPC       | 🔒 Tamamlandı     |
| Dashboard  | ✅ iskelet | ✅  | ⚠️ hardcoded | ❌ RPC yok   | 🔨 Yapılacak      |
| Stok       | ✅         | ✅  | ✅           | ⚠️ tablo yok | 🔨 SQL gerekli    |
| Müşteriler | ✅         | ✅  | ⚠️ eksik     | ⚠️ tablo yok | 🔨 SQL + düzeltme |
| Alış       | ✅ iskelet | -   | ❌           | ❌           | 📋 Planlandı      |
| Satış      | ✅ iskelet | -   | ❌           | ❌           | 📋 Planlandı      |
| Tamir      | ✅ iskelet | -   | ❌           | ❌           | 📋 Planlandı      |
| Kasa       | ✅ iskelet | -   | ❌           | ❌           | 📋 Planlandı      |
| Raporlar   | ✅ iskelet | -   | ❌           | ❌           | 📋 Planlandı      |
| Ayarlar    | ✅ iskelet | -   | ❌           | ❌           | 📋 Planlandı      |

---

## 🔑 Supabase Bilgileri

- **URL:** `https://cjwszktbrkoegbajanwp.supabase.co`
- **Proje:** GSMOFISPRO
- **Auth:** Email + Username destekli
- **RLS:** Aktif (license_id bazlı bayi izolasyonu)
- **Demo Key:** `GSM-2025-DEMO-KEY01` (max_users: 1)

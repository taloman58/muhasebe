# GSM OFIS PRO - SQL Dosyaları

Bu klasörde tüm Supabase tablo yapıları toplanır.
Sistem hazır olduğunda `_master_setup.sql` ile tek seferde kurulur.

## Dosya Sırası

1. `01_tables.sql` → Tüm tablolar
2. `02_rls_policies.sql` → Row Level Security kuralları
3. `03_functions.sql` → RPC fonksiyonları
4. `04_seed_data.sql` → İlk veriler (admin, lisans)
5. `_master_setup.sql` → Hepsini birleştiren ana dosya

## Kurallar

- Tek tek çalıştırmayın, sadece geliştirme sırasında referans
- Sistem tamamlandığında `_master_setup.sql` oluşturulacak
- O dosya ile tek seferde tüm yapı kurulacak

## Multi-Tenant Mantığı

- Her tablo `license_id` sütunu içerir (bayi izolasyonu)
- RLS ile her bayi sadece kendi verisini görür
- Admin tüm verileri görür ve audit eder

## Resim Saklama

- Resimler veritabanına YÜKLENMEZ
- Yerelde saklanır: `C:\GSMOfis\data\{license_id}\images\...`
- DB'de sadece dosya adı/yolu tutulur

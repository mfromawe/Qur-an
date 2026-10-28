# KUR'AN-I KERÎM İLİM, MUCİZELER & HADİS PLATFORMU
## YÜKSEK PERFORMANSLI HİBRİT MİMARİ MASTERPLANI (C++ / PYTHON / NEXT.JS)

---

## 1. MEVCUT MİMARİ ANALİZİ VE SİSTEM TEŞHİSİ

### 1.1 Mevcut Durum (As-Is Architecture)
Platform şu anda Python tabanlı bir HTTP sunucusu (`app.py`), yerel bir SQLite veritabanı (`quran.db`, ~31.5 MB) ve istemci tarafında Vanilla JS (`app.js`, `math_processor.js`, `language_model.js`) ve CSS (`styles.css`) ile çalışan monolitik bir Single-Page Application (SPA) olarak çalışmaktadır.

| Katman | Mevcut Dosya | Boyut / Satır | Görevi & Durumu |
| :--- | :--- | :--- | :--- |
| **Backend & API** | `app.py` | 91.5 KB / ~1.730 satır | Monolitik HTTP yönlendirici, SQLite sorguları, Hadis API, Delail analizi, Ebced hesaplama. |
| **Veritabanı** | `quran.db` | 31.5 MB | 114 Sure, 6.236 Ayet, 77.430 Kelime Meali, 1.248 Kök, 10 Hadis Külliyatı, Delâilü'l-Hayrât. |
| **Frontend UI** | `web/app.js` | 286 KB / ~7.250 satır | Mushaf okuyucu, Müfettiş çekmecesi, Hadis gezgini, Mucize grafikleri, Dil motoru tek dosyada. |
| **Arayüz İskeleti** | `web/index.html` | 134 KB / ~2.450 satır | Tüm sekmeler, paneller ve modalların statik DOM ağacı. |
| **Stil Sistemi** | `web/styles.css` | 206 KB / ~9.300 satır | Müze kalitesinde parşömen, antika altın vurgular ve koyu mod CSS kuralları. |

### 1.2 Kritik Darboğazlar ve İyileştirme Alanları
1. **İşlem Gücü ve CPU Yükü**:
   - 77.430 kelimenin her biri için harf ayrıştırma (breakout), tashkeel (hareke) temizleme, Ebced-i Kebir, Ebced-i Sagir ve Bast hesapları Python ve JavaScript döngüleriyle yapıldığında yüksek CPU döngüsü tüketir.
2. **Durum Yönetimi (State Machine) Çatışmaları**:
   - 7.250 satırlık `app.js` dosyasında okuma pozisyonu, seçili kelime, kilitli (pinned) müfettiş modu ve modallar arasındaki durumlar gevşek bağlıdır (Örn: kelimeye tıklandıktan sonra farenin başka harfe kaymasıyla odağın bozulması riski).
3. **SEO ve AI Arama Motoru İndeksleme (AEO / GEO)**:
   - Mevcut sistem istemci taraflı (CSR) çalıştığı için GPTBot, PerplexityBot ve Google crawler'lar 6.236 ayetin kelime meallerini ve hadis çapraz referanslarını indekslerken zorlanır.

---

## 2. C++ ÇEKİRDEK (NATIVE CORE): NERELER C++ OLMALI?

### 2.1 C++'a Devredilen Ağır Matematiksel ve Metinsel Noktalar
C++ dili; donanıma yakın bellek yönetimi, sıfır maliyetli soyutlama (zero-cost abstractions), L1/L2 işlemci önbellek yerelliği (cache locality) ve SIMD (AVX2/NEON) vektörel paralelleştirme gücü nedeniyle aşağıdaki kritik görevleri üstlenir:

```
+--------------------------------------------------------------------------+
|                  C++ NATIVE COMPUTE CORE (libquran_core)                 |
+--------------------------------------------------------------------------+
| 1. High-Speed UTF-8 Tashkeel Stripper & Arabic Normalizer                |
| 2. Vectorized Classical Abjad Engine (Kebir, Sagir mod 9, Bast)          |
| 3. Arbitrary-Precision BigInt Modulo & Symmetry Verifier (19 & 7 Codes)  |
| 4. Deterministic 64-bit Miller-Rabin Primality Test                      |
| 5. Zero-Copy Batch Word Tokenizer (Processes whole Surah in L1 Cache)    |
+--------------------------------------------------------------------------+
```

#### Neden C++?
1. **Ebced & Harf Ayrıştırma**:
   - Python'da her harf için hash map (`dict`) araması yapılır.
   - C++'ta Arapça Unicode aralığı (`0x0600 - 0x06FF`) doğrudan bellek dizisi (array index) üzerinden `O(1)` sürede 1 saat çevriminde nanosaniyeler içinde okunur.
2. **19 ve 7 Kodu (Büyük Sayı Aritmetiği)**:
   - Sure ve ayet numaralarının yan yana dizilmesiyle oluşan 50-200 basamaklı sayıların 19 ve 7'ye bölünebilirliği C++'ta bellek tahsisi yapmadan (allocation-free streaming modulo) mikro saniyeler içinde hesaplanır.
3. **Asallık ve Çarpan Testi**:
   - 64-bit Miller-Rabin deterministik asal testi C++ ile donanım düzeyinde 128-bit tamsayı çarpımı (`__uint128_t`) kullanılarak anında çözülür.

### 2.2 Çift Yönlü Entegrasyon Stratejisi
- **Backend için**: `clang++ -O3 -shared -fPIC` ile derlenen `native/libquran_core.dylib` (.so), Python tarafında `ctypes` üzerinden `native_bridge.py` ile bağlanır.
- **Frontend / Next.js için**: Aynı C++ kaynak kodu Emscripten (`emcc`) ile WebAssembly (`.wasm`) olarak derlenerek tarayıcı Web Worker'ına gömülür; istemci sıfır gecikmeyle çevrimdışı çalışır.

---

## 3. PYTHON KATMANI: SABİT, SAĞLAM ORKESTRASYON VE VERİ MUHAFIZI

*"PYTHON BÖLÜMLER SABİT"* kuralı gereğince, Python projenin ana omurgası, veri bekçisi ve servis orkestratörü olarak kalır:

```
                                [ HTTP / Web Clients ]
                                          |
                                          v
+----------------------------------------------------------------------------------+
|                            PYTHON ORCHESTRATOR LAYER                             |
+----------------------------------------------------------------------------------+
|  1. SQLite Data Custodian (quran.db 31.5MB connection pool, safe read/write)     |
|  2. External API Integration (Sunnah.com Official REST API & CDN Fallback Mirror)|
|  3. Morphological & Lexical Root Index (1,248 roots, triliteral derivation)      |
|  4. C++ Native FFI Bridge (native_bridge.py with pure Python fallback)           |
|  5. Standardized JSON-RPC / REST API Endpoints with Schema Validation            |
+----------------------------------------------------------------------------------+
```

### Python Modüler Blueprint Yapısı (Refactoring Hedefi):
Monolitik `app.py` yerine endüstri standardı modüler mimariye ayrıştırma:
- `backend/`
  - `core/` -> `native_bridge.py` (C++ bağlayıcı), `db_pool.py`
  - `services/`
    - `surah_service.py` (Sure, ayet ve kelime mealleri)
    - `hadith_service.py` (Sunnah.com ve Kütüb-i Sitte entegrasyonu)
    - `miracles_service.py` (Canlı simetri ve mucize hesaplayıcı)
    - `delail_service.py` (Delâilü'l-Hayrât ve Salavat tahlilleri)
    - `semantic_engine.py` (Anlamsal arama ve kavram ağacı)
  - `routes/` (Flask / FastAPI / Python standard HTTP Blueprint'leri)
  - `main.py` (Temiz, okunabilir başlatıcı)

---

## 4. NEXT.JS YAPISI (MODERN FULLSTACK SSR & BİLEŞEN TABANLI ARAYÜZ)

### 4.1 Next.js 14/15 App Router Neden Gereklidir?
1. **GEO / AEO (Generative Engine Optimization & LLM Crawlers)**:
   - GPTBot, Perplexity, ClaudeBot ve Googlebot gibi yapay zeka ve arama motorları için 6.236 ayetin tamamı Server-Side Rendering (SSR) veya Incremental Static Regeneration (ISR) ile önceden HTML olarak üretilir.
2. **Bileşen Tabanlı İzolasyon (Component Isolation)**:
   - 7.250 satırlık `app.js` spaghetti kodunu önler. Her görsel birim kendi bağımsız durumuna (state) ve yaşam döngüsüne (lifecycle) sahip olur.
3. **Tip Güvenliği (TypeScript Interfaces)**:
   - Ayet, kelime, hadis ve ebced veri yapıları TypeScript tipleriyle garanti altına alınır; çalışma zamanı hataları engellenir.

### 4.2 Önerilen Next.js Dizin Mimarisi
```text
quran-nextjs/
├── app/
│   ├── layout.tsx                     # Kök Layout, SEO meta etiketleri, fontlar
│   ├── page.tsx                       # Karşılama ve Ana Çalışma Alanı
│   ├── surah/
│   │   ├── [surahId]/
│   │   │   ├── page.tsx               # SSR: Sure ve Kelime Meali Okuyucu
│   │   │   └── verse/[verseId]/
│   │   │       └── page.tsx           # Statik derin link (Canonical SEO URL)
│   ├── hadith/
│   │   ├── [collection]/
│   │   │   └── page.tsx               # Sunnah.com & Kütüb-i Sitte Gezgini
│   ├── miracles/
│   │   └── page.tsx                   # Simetri ve 19/7 Analiz Panosu
│   └── delail/
│       └── page.tsx                   # Delâilü'l-Hayrât Evrad ve Salavat Modülü
├── components/
│   ├── reader/
│   │   ├── MushafGrid.tsx             # Ayet ve kelime kartları
│   │   ├── WordPill.tsx               # Harekeli, kök ve mealli kelime rozeti
│   │   └── ReadingControls.tsx        # Yazı boyutu, mealler ve sayfa gezintisi
│   ├── inspector/
│   │   ├── InspectorDrawer.tsx        # Sabitlenebilir / Otomatik gizlenen Müfettiş
│   │   ├── AbjadBreakdown.tsx         # Harf harf ayrıştırma ve ebced tablosu
│   │   └── RootDossierModal.tsx       # 1.248 Kök sözlüğü ve 9 bâb çekim matrisi
│   ├── hadith/
│   │   ├── HadithCard.tsx             # Metin, senet, tahric ve kelime tahlil butonu
│   │   └── SunnahApiModal.tsx         # X-API-KEY yönetimi ve Canlı CDN Çekici
│   └── shared/
│       ├── Header.tsx                 # Dil seçici, tema, arama
│       └── AudioPlayer.tsx            # Ayet ve kelime tilavet çaları
├── store/
│   └── useQuranStore.ts               # Zustand: Kilitli kelime, aktif ayet, müfettiş durumu
└── lib/
    ├── native-wasm.ts                 # C++ WebAssembly çekirdeği yükleyicisi
    └── api-client.ts                  # Python backend API istemcisi
```

---

## 5. CODE İÇİNDE TÜM BÖLÜMLERİN KONTROL VE UYUM HALİNDE ÇALIŞMASI (STATE MACHINE & ORCHESTRATION)

Modüller arasındaki karmaşayı ve çatışmaları sıfırlamak için **Tek Yönlü Veri Akışı (Unidirectional Data Flow)** ve **Sonlu Durum Makinesi (Finite State Machine - FSM)** uygulanır:

### 5.1 Sistem Durum Makinesi (Unified App State Machine)
```
               [ READER_IDLE ] (Kullanıcı Mushaf okuyor)
                      |
           +----------+----------+
           |                     |
     (Kelimeye tıklandı)   (Kök tıklandı)
           v                     v
   [ WORD_INSPECTED ]    [ ROOT_DOSSIER_OPEN ]
   (Müfettiş kilitlendi)  (Okunan ayet hafızada saklanır)
           |                     |
     (Hadis tıklandı)      (Çarpı / Dön tuşu)
           v                     v
   [ HADITH_LINKED ]     [ RETURN_TO_READER ]
   (Sunnah API / CDN)    (Tam kalınan ayete pürüzsüz dönüş)
```

### 5.2 Kontrol Prensipleri
1. **Hover vs. Click İzolasyonu**:
   - Kullanıcı bir kelimeye tıkladığında sistem `LOCKED_WORD` durumuna geçer.
   - Fare başka bir kelimenin veya harfin üzerinden geçse dahi kilitli kelimenin verileri müfettişten **asla kaybolmaz**.
2. **Bağlamsal Bellek (Navigation Context Retention)**:
   - Kök analizi, mucize veya hadis sekmesine geçildiğinde son okunan `surah_number`, `verse_number` ve `scroll_offset` hafızada tutulur.
   - Modal kapatıldığında veya "Okuduğum Yere Dön" butonuna basıldığında okuyucu doğrudan o ayete odaklanır ve hafif bir altın ışıma ile ayeti vurgular (`highlight-pulse`).
3. **Standart Veri Zarfı (Standard Response Envelope)**:
   Tüm backend servisleri aynı JSON protokolüyle konuşur:
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": {
       "engine": "C++ Native Core (AVX2/NEON)",
       "compute_ms": 0.35,
       "cached": true
     },
     "error": null
   }
   ```

---

## 6. UYGULAMA VE GEÇİŞ YOL HARİTASI (ROADMAP)

- [x] **Aşama 1: C++ Native Çekirdeği İnşası**: `native/quran_core.cpp`, `quran_core.hpp` ve Makefile oluşturuldu. `libquran_core.dylib` derlendi.
- [x] **Aşama 2: Python FFI Köprüsü ve Hız Kıyaslaması**: `native_bridge.py` yazıldı; 50.000 döngülük testte **3.83x hızlanma** doğrulandı.
- [x] **Aşama 3: Kelime Meali & Hadis API Tamamlama**: 6.236 ayetin kelime meali %100 tamamlandı; Sunnah.com API ve CDN entegrasyonu sağlandı.
- [ ] **Aşama 4: Python Backend Modüler Ayrıştırma**: `app.py`'nin `services/` ve `routes/` modüllerine refactor edilmesi.
- [ ] **Aşama 5: C++ WebAssembly (WASM) İhracı**: Aynı C++ motorunun tarayıcı içi offline çalışan `.wasm` çıktısının alınması.
- [ ] **Aşama 6: Next.js 14 App Router Geçişi**: SSR ile 6.236 ayetin tam GEO/AEO uyumlu indekslenebilir hale getirilmesi ve Zustand durum makinesine bağlanması.

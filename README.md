# Kur'an-ı Kerim Python Kütüphanesi & Veri Seti

Bu proje; Kur'an-ı Kerim'in Arapça orijinal metinlerini (Resm-i Osmânî ve Yalın/Harekesiz metin), Türkçe meallerini (Diyanet, Elmalılı Hamdi Yazır, Edip Yüksel), İngilizce mealini (Sahih International), Türkçe okunuşunu ve iniş/sure/ayet metaverilerini tek bir çatı altında toplayarak Python ortamında kolayca analiz etmenizi sağlar.

Özellikle **Kur'an mucizeleri, kelime ve harf istatistikleri, ebced (cifir) hesaplamaları ve metin madenciliği** için optimize edilmiştir.

---

## 📁 Oluşturulan Dosyalar

| Dosya | Açıklama | Boyut |
|---|---|---|
| **`app.py`** | Web sunucusu ve REST API motoru (`http://127.0.0.1:8000`) | Web Server |
| **`web/`** | Modern, duyarlı ve lüks İslami koyu tema web arayüzü (HTML/CSS/JS) | Frontend UI |
| **`quran.json`** | 114 Sure, 6236 Ayet, tüm edisyonlar ve metaveriler (JSON formatı) | ~11.3 MB |
| **`quran.db`** | SQLite veritabanı (İndeksli tablolar ve **FTS5** tam metin arama) | ~20.2 MB |
| **`quran.py`** | Python kütüphanesi (`Quran`, `Surah`, `Verse` sınıfları, Ebced & Kelime sayıcı) | Python Modülü |
| **`download_quran.py`** | Verileri sıfırdan indiren ve veritabanını güncelleyen script | Script |
| **`demo.py`** | Örnek kullanım senaryolarını çalıştıran demo scripti | Script |

---

## 🌐 Web Arayüzünü Başlatma (Web UI)

Uygulamayı tarayıcınızda açmak için terminalde tek komut yeterlidir:

```bash
python3 app.py
```

Ardından tarayıcınızdan **`http://127.0.0.1:8000`** adresine gidin.

### Web Arayüzü Özellikleri:
1. **Mushaf & Mealler Okuyucu:** 114 Sure, 30 Cüz ve 604 Sayfa seçici, Amiri Quran Arapça hat, Diyanet ve Elmalılı Hamdi Yazır mealleri, her ayet için anlık Ebced değeri ve kelime/harf istatistikleri.
2. **Kesintisiz Sesli Tilavet:** Mişârî Râşid el-Afâsî kıraati ile her ayeti tek tıkla dinleme, animasyonlu ses dalgası ve ayet bittiğinde otomatik sonraki ayete geçiş.
3. **Akıllı Kelime ve Kök Tarayıcı:** Hem Arapça (harekeli/harekesiz, ön ekli/yalın) hem Türkçe kelime desteğiyle (örn. `gün`, `deniz`, `melek`, `nur`, `yevm`, `bahr`) kökleri, ön ekleri ve mealleri tarayan eksiksiz kelime motoru.
4. **Sayısal Örüntüler & Simetri Laboratuvarı (Yeni):**
   - **Harf Harf Sure Analizi:** 114 surenin her birinde 28 Arapça harfin tek tek frekansları, yüzdeleri, asal sayı durumları ve Hurûf-ı Mukatta'a (şifreli harfler) dökümü.
   - **114 Sure Simetri Matrisi (57/57):** Toplamı çift olan 57 sure (toplamları: 6236 = Kur'an toplam ayet sayısı), toplamı tek olan 57 sure (toplamları: 6555 = 1..114 toplamı), 30 asal numaralı sure ve homojen/heterojen parite filtreleri.
   - **Merkez & Baş/Orta/Son Simetrileri:**
     - *Kur'an Bütününde:* Başlangıç (Fâtiha 1:1), Bitiş (Nâs 114:6), Tam Orta Kelime (Kehf 19 `وَلْيَتَلَطَّفْ`), Orta Ayetler (26:186-187), Orta Sure (57. Hadîd / Demir).
     - *Sure Düzeyinde:* Surenin başı, ortası ve sonu. (Örn: 286 ayetli Bakara'nın tam ortasındaki 143. ayette *"Sizi vasat (ORTA) bir ümmet yaptık"* buyrulması).
     - *Ayet Düzeyinde:* Ayetin ilk kelimesi/harfi, orta kelimesi/harfi, son kelimesi/harfi ve asallık analizleri.
5. **Gelişmiş Ebced & Cifir Hesaplayıcı:** Anlık metin girişi, sanal Arapça klavye, hazır şablonlar, Ebced-i Kebîr & Sagîr KPI'ları ve harf döküm tablosu.
6. **Detaylı Arama Hub'ı:** Türkçe meallerde ve Arapça metinde anlık, vurgulamalı hızlı arama.

---

---

## 🚀 Hızlı Başlangıç

### 1. Kütüphaneyi Dahil Etme
```python
from quran import Quran

# Kuran verisini yükle (JSON veya SQLite üzerinden)
q = Quran()
print(q)
# <Quran: 114 Sure, 6236 Ayet, Kaynak: Tanzil/Al-Quran Cloud>
```

---

## 📖 Kullanım Örnekleri

### 1. Ayet Getirme
Sure numarası veya sure adıyla ayet getirebilirsiniz:

```python
# Fatiha Suresi 1. Ayet (Besmele)
v = q.get_verse("Fâtiha", 1)  # veya q.get_verse(1, 1)

print(v.text_uthmani)       # بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ (Harekeli / Mushaf)
print(v.text_clean)         # بسم الله الرحمن الرحيم (Yalın Arapça)
print(v.transliteration)    # bismi-llâhi-rraḥmâni-rraḥîm.
print(v.diyanet)            # Rahman ve Rahim olan Allah'ın adıyla:
print(v.yazir)              # Rahmân ve Rahîm olan Allah'ın ismiyle.
print(v.yuksel)             # Rahman ve Rahim ALLAH'ın ismiyle.
print(v.en)                 # In the name of Allah, the Entirely Merciful, the Especially Merciful.
print(v.juz, v.page)        # Cüz ve Sayfa numaraları

# Ayet istatistikleri
print("Kelime sayısı:", v.word_count())     # 4
print("Harf sayısı:", v.letter_count())     # 19
print("Ebced değeri:", v.abjad_value())     # 786
```

---

### 2. Sure Bilgisi ve İstatistikleri

```python
sure = q.get_surah("İhlâs")  # veya q.get_surah(112)

print(sure.name_tr)          # İhlâs
print(sure.name_ar)          # سُورَةُ الإِخۡلَاصِ
print(sure.verse_count)      # 4
print(sure.city_tr)          # Mekke
print(sure.revelation_order) # 22 (İniş Sırası)

# Suredeki toplam kelime ve harfler
print("Toplam kelime:", sure.total_words())
print("Toplam harf:", sure.total_letters())
print("Sure Ebced toplamı:", sure.abjad_value())

# Surenin ayetlerinde döngü
for ayet in sure:
    print(f"{ayet.key}: {ayet.text_clean} -> {ayet.diyanet}")
```

---

### 3. Türkçe Meallerde Arama Yapma

```python
# Diyanet mealinde 'merhamet' arama
sonuclar = q.search("merhamet", translation="diyanet")
print(f"Toplam {len(sonuclar)} ayette bulundu.")

for v in sonuclar[:3]:
    print(f"[{v.key}] {v.diyanet}")
```

Desteklenen mealler: `'diyanet'`, `'yazir'`, `'yuksel'`, `'en'`, `'transliteration'`, `'all'`.

---

### 4. Arapça Kelime Arama & Sayma

```python
# Yalın metinde 'يوم' (gün) kelimesini tam eşleşmeyle say
yevm_sayisi = q.count_word("يوم", text_type="clean", exact=True)
print(f"Yevm sayısı: {yevm_sayisi}")

# Ayetleri bulma
ayetler = q.search_arabic("يوم", exact_word=True)
print(f"{len(ayetler)} farklı ayette geçiyor.")
```

---

### 5. Ebced (Cifir / Gematria) Hesaplama

Büyük Ebced (Maşrık / Kebir) sistemine göre sayısal değer hesaplar:

```python
print(Quran.abjad("بسم الله الرحمن الرحيم")) # 786
print(Quran.abjad("الله"))                   # 66
print(Quran.abjad("محمد"))                   # 92
print(Quran.abjad("سلام"))                   # 131
```

---

### 6. Harf Frekans Analizi

```python
# İhlâs suresindeki en sık geçen harfler
freq = q.letter_frequencies(surah=112)
for harf, adet in freq.most_common(5):
    print(f"{harf}: {adet} defa")
```

---

### 7. SQLite & SQL Sorguları

`quran.db` veritabanı dosyasını doğrudan SQLite ile veya `q.sql()` metodu ile sorgulayabilirsiniz:

```python
# En çok ayeti olan 5 Medine suresi
query = """
SELECT number, name_tr, verse_count 
FROM surahs 
WHERE city_tr = 'Medine' 
ORDER BY verse_count DESC 
LIMIT 5;
"""
rows = q.sql(query)
for r in rows:
    print(r)
```

FTS5 Tam Metin Arama:
```sql
SELECT verse_id, translation_diyanet 
FROM verses_fts 
WHERE translation_diyanet MATCH 'kalp OR gönül';
```

---

### 8. Pandas ile Veri Analizi

Eğer `pandas` kuruluysa tek satırda DataFrame'e dönüştürebilirsiniz:

```python
df = q.to_dataframe()
print(df.head())
print(df.describe())
```

---

## 🔄 Verileri Tekrar İndirmek / Güncellemek İsterseniz

```bash
python3 download_quran.py
```
Bu komut Al-Quran Cloud / Tanzil kaynaklarından en güncel verileri çekip `quran.json` ve `quran.db` dosyalarını sıfırdan oluşturur.

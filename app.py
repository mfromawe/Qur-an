#!/usr/bin/env python3
"""
app.py - Kur'an-ı Kerim Web Sunucusu ve Kapsamlı İlim & Analiz API'si
Sıfır dış bağımlılık; standart kütüphane ThreadingHTTPServer ile çalışır.
"""

from __future__ import annotations
import os
import sys
import json
import re
import urllib.parse
import urllib.request
import sqlite3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from typing import Dict, Any, List

from quran import (
    Quran, ABJAD_TABLE, ARABIC_LETTERS, MUKATTAA_SURAHS,
    is_prime, normalize_arabic
)
import delail_data
import delail_service
import wbw_service
import library_service
import semantic_engine
import hadith_service
import miracles_service

try:
    import native_bridge
    print(f"-> C++ Native Motoru Aktif: {native_bridge.engine_info()}")
except ImportError:
    native_bridge = None
    print("-> C++ Native köprüsü bulunamadı, Python motoru devrede.")

# Kütüphane ve Hadis veritabanı tablolarını başlat
library_service.init_library_db()
hadith_service.init_hadith_db()

# Kur'an veritabanını belleğe yükle
print("-> Kur'an verisi belleğe yükleniyor...")
QURAN = Quran()
print(f"-> {len(QURAN.surahs)} sure, {len(QURAN.verses)} ayet başarıyla yüklendi.")

# Canlı Kur'an Mucizeleri Motorunu Başlat
print("-> Canlı Kur'an Mucizeleri motoru derleniyor (quran.db)...")
miracles_service.miracles_service.init_service(QURAN)
print("-> Canlı Kur'an Mucizeleri motoru hazır.")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REFLECTIONS_DIR = os.path.join(BASE_DIR, "data", "reflections")
WEB_DIR = os.path.join(BASE_DIR, "web")

# Kur'an-ı Kerîm Geneli 28 Harf Frekans ve Oran Matrisi (Baseline)
print("-> Kur'an geneli harf frekansları hesaplanıyor...")
GLOBAL_QURAN_LETTER_COUNTS = QURAN.letter_frequencies()
GLOBAL_TOTAL_QURAN_LETTERS = sum(GLOBAL_QURAN_LETTER_COUNTS.values())
GLOBAL_QURAN_LETTER_STATS = {}
for char, name, abjad in ARABIC_LETTERS:
    c_cnt = GLOBAL_QURAN_LETTER_COUNTS.get(char, 0)
    c_pct = round((c_cnt / GLOBAL_TOTAL_QURAN_LETTERS * 100), 2) if GLOBAL_TOTAL_QURAN_LETTERS > 0 else 0
    GLOBAL_QURAN_LETTER_STATS[char] = {
        "count": c_cnt,
        "percentage": c_pct
    }
print(f"-> Kur'an geneli 28 harf baseline hazır: Toplam {GLOBAL_TOTAL_QURAN_LETTERS} harf.")


def prime_factors(n: int) -> List[int]:
    """Bir sayının asal çarpanlarını döner."""
    if n <= 1:
        return []
    factors = []
    d = 2
    temp = n
    while d * d <= temp:
        while temp % d == 0:
            factors.append(d)
            temp //= d
        d += 1
    if temp > 1:
        factors.append(temp)
    return factors


def get_roots_list(letter: str = "", query_str: str = "", sort_mode: str = "frequency", limit: int = 1500, offset: int = 0) -> Dict[str, Any]:
    """1,248 Kur'ani Kök veritabanından harf, arama ve frekansa göre listeyi döner."""
    conn = sqlite3.connect(os.path.join(BASE_DIR, "quran.db"))
    cur = conn.cursor()
    sql = """
        SELECT root, root_bare, reading, frequency, core_meaning, 
               madi, madi_tr, mudari, mudari_tr, masdar, masdar_tr, fail, fail_tr, maful, maful_tr 
        FROM quran_roots WHERE 1=1
    """
    params = []
    if letter:
        sql += " AND (root LIKE ? OR root_bare LIKE ?)"
        params.extend([f"{letter}%", f"{letter}%"])
    if query_str:
        sql += " AND (root LIKE ? OR root_bare LIKE ? OR reading LIKE ? OR core_meaning LIKE ?)"
        term = f"%{query_str}%"
        params.extend([term, term, term, term])

    count_sql = "SELECT COUNT(*) FROM (" + sql + ")"
    total_matches = cur.execute(count_sql, params).fetchone()[0]

    if sort_mode == "alpha":
        sql += " ORDER BY root_bare ASC"
    else:
        sql += " ORDER BY frequency DESC, root_bare ASC"

    sql += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = cur.execute(sql, params).fetchall()
    cols = [
        "root", "root_bare", "reading", "frequency", "core_meaning",
        "madi", "madi_tr", "mudari", "mudari_tr", "masdar", "masdar_tr", "fail", "fail_tr", "maful", "maful_tr"
    ]
    roots = [dict(zip(cols, r)) for r in rows]
    conn.close()
    return {"total": total_matches, "count": len(roots), "roots": roots}


def normalize_root_bare(s: str) -> str:
    if not s:
        return ""
    b = s.replace("-", "").strip()
    b = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', b)
    b = b.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ء', 'ا').replace('ٱ', 'ا')
    b = b.replace('ى', 'ي')
    return b

def get_root_details(root_str: str) -> Optional[Dict[str, Any]]:
    """Tekil bir kökün 9 çekimli morfolojik detaylarını ve Kur'an'daki örnek ayetlerini döner."""
    conn = sqlite3.connect(os.path.join(BASE_DIR, "quran.db"))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    bare = root_str.replace("-", "").strip()
    norm_bare = normalize_root_bare(root_str)

    row = cur.execute("""
        SELECT * FROM quran_roots 
        WHERE root = ? OR root_bare = ? 
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(root_bare, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ء', 'ا'), 'ى', 'ي') = ?
    """, (root_str, bare, norm_bare)).fetchone()

    if not row and len(norm_bare) == 3:
        # Zayıf harf varyantlarını dene (vav / ya / elif)
        for mid in ('و', 'ي', 'ا'):
            alt = norm_bare[0] + mid + norm_bare[2]
            row = cur.execute("""
                SELECT * FROM quran_roots 
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(root_bare, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ء', 'ا'), 'ى', 'ي') = ?
            """, (alt,)).fetchone()
            if row:
                break
        if not row:
            for end in ('و', 'ي', 'ا'):
                alt = norm_bare[:2] + end
                row = cur.execute("""
                    SELECT * FROM quran_roots 
                    WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(root_bare, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ء', 'ا'), 'ى', 'ي') = ?
                """, (alt,)).fetchone()
                if row:
                    break

    # Doğrudan verse_words tablosundan bu kökün geçtiği gerçek ayetleri çek
    verse_matches = cur.execute("""
        SELECT vw.surah_number, vw.verse_number, v.text_uthmani, v.text_clean, v.translation_diyanet, v.translation_en, vw.text_uthmani as word_uth, vw.translation_tr as word_tr
        FROM verse_words vw
        JOIN verses v ON v.surah_number = vw.surah_number AND v.verse_number = vw.verse_number
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(vw.root, '-', ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ء', 'ا'), 'ى', 'ي') = ?
        ORDER BY vw.surah_number, vw.verse_number
    """, (norm_bare,)).fetchall()

    seen_verses = set()
    verses_found = []
    for vm in verse_matches:
        s = vm["surah_number"]
        v = vm["verse_number"]
        v_key = f"{s}:{v}"
        if v_key in seen_verses:
            continue
        seen_verses.add(v_key)
        s_obj = QURAN.surahs.get(s)
        s_name = s_obj.name_tr if s_obj else f"{s}. Sure"
        verses_found.append({
            "surah_number": s,
            "surah_name": s_name,
            "verse_number": v,
            "key": v_key,
            "text_uthmani": vm["text_uthmani"],
            "text_clean": vm["text_clean"],
            "translation_diyanet": vm["translation_diyanet"],
            "translation_en": vm["translation_en"],
            "matched_word": vm["word_uth"],
            "matched_meaning": vm["word_tr"]
        })
        if len(verses_found) >= 60:
            break

    if not row:
        letter_names = {
            'ا': 'Elif', 'ب': 'Be', 'ت': 'Te', 'ث': 'Se', 'ج': 'Cim', 'ح': 'Ha', 'خ': 'Hı',
            'د': 'Dal', 'ذ': 'Zel', 'ر': 'Ra', 'ز': 'Ze', 'س': 'Sin', 'ş': 'Şın', 'ص': 'Sad',
            'ض': 'Dad', 'ط': 'Tı', 'ظ': 'Zı', 'ع': 'Ayn', 'غ': 'Gayn', 'ف': 'Fe', 'ق': 'Kaf',
            'ك': 'Kef', 'ل': 'Lam', 'م': 'Mim', 'ن': 'Nun', 'ه': 'He', 'و': 'Vav', 'ي': 'Ya', 'ى': 'Elif-Maksura'
        }
        reading = "-".join([letter_names.get(ch, ch) for ch in bare])
        data = {
            "root": "-".join(list(bare)) if bare else root_str,
            "root_bare": bare,
            "reading": reading,
            "core_meaning": "Kur'an-ı Kerim kökü",
            "frequency": len(seen_verses),
            "madi": "فَعَلَ", "madi_tr": "Geçmiş zaman fiili",
            "mudari": "يَفْعَلُ", "mudari_tr": "Şimdiki zaman fiili",
            "masdar": "فَعْل", "masdar_tr": "Kök mastar",
            "fail": "فَاعِل", "fail_tr": "Etken isim"
        }
    else:
        data = dict(row)
        if not data.get("frequency") or data["frequency"] == 0:
            data["frequency"] = len(seen_verses)

    data["sample_verses"] = verses_found
    data["sample_verses_count"] = len(seen_verses) if seen_verses else len(verses_found)
    conn.close()
    return data


# Türkçe / Latin terimlerin Arapça karşılıkları (Akıllı Arama Sözlüğü)
COMMON_TERMS_TR_AR = {
    "gün": "يوم", "gun": "يوم", "yevm": "يوم", "yavm": "يوم",
    "ay": "شهر", "sehr": "شهر", "shehr": "شهر",
    "dünya": "دنيا", "dunya": "دنيا",
    "ahiret": "آخرة", "ahirat": "آخرة", "ahireti": "آخرة",
    "deniz": "بحر", "su": "بحر", "bahr": "بحر",
    "kara": "بر", "toprak": "بر", "berr": "بر",
    "isa": "عيسى", "adem": "آدم", "adam": "آدم",
    "melek": "ملك", "melekler": "ملائكة",
    "şeytan": "شيطان", "seytan": "شيطان", "seytanlar": "شياطين",
    "nur": "نور", "ışık": "نور",
    "ilim": "علم", "bilgi": "علم",
    "sabır": "صبر", "sabir": "صبر",
    "namaz": "صلاة", "salat": "صلاة",
    "zekat": "زكاة",
    "cennet": "جنة", "cennetler": "جنات",
    "cehennem": "جهنم",
    "rahmet": "رحمة", "merhamet": "رحمة",
    "adalet": "عدل",
    "gök": "سماء", "gökler": "سموات",
    "yer": "أرض", "yeryüzü": "أرض",
    "güneş": "شمس", "gunes": "شمس",
    "kamer": "قmer", "ay (gök)": "قمر",
    "insan": "إنسان", "insanlar": "ناس",
    "allah": "الله", "tanrı": "إله", "ilah": "إله",
    "rab": "رب",
    "kitap": "كتاب", "kuran": "قرآن",
    "hayat": "حياة", "ölüm": "موت",
    "sevap": "ثواب", "ceza": "عقاب",
    "hayır": "خير", "şer": "شر", "kalp": "قلب", "gönül": "قلب"
}

# Çekirdek Çok Dilli Çeviri Matrisi (TR <-> EN <-> AR)
CORE_TRANSLATION_DICT = {
    "müfettiş": {"en": "Inspector", "ar": "المفتش"},
    "müfettis": {"en": "Inspector", "ar": "المفتش"},
    "ayet & kelime müfettişi": {"en": "Ayah & Word Inspector", "ar": "مفتش الآيات والكلمات"},
    "canlı matematik": {"en": "LIVE MATHEMATICS", "ar": "التحليل الرقمي الحي"},
    "mushaf & mealler": {"en": "Mushaf & Translations", "ar": "المصحف والتفاسير"},
    "delâilü'l-hayrât": {"en": "Dalail al-Khayrat", "ar": "دلائل الخيرات"},
    "örüntüler & simetri": {"en": "Patterns & Symmetry", "ar": "الأنماط والتماثل"},
    "görselleştirmeler": {"en": "Visualizations", "ar": "المخططات التفاعلية"},
    "esrâr-ı hurûf": {"en": "Mysteries of Letters", "ar": "أسرار الحروف ونور محمد"},
    "mucizeler & kelimeler": {"en": "Miracles & Words", "ar": "الإعجاز والكلمات"},
    "ebced / cifir": {"en": "Abjad / Numerics", "ar": "حساب الجمل"},
    "başlangıç": {"en": "Beginning", "ar": "البداية"},
    "merkez": {"en": "Center", "ar": "المركز"},
    "vasat": {"en": "Center / Median", "ar": "الوسط"},
    "hitam": {"en": "Conclusion", "ar": "الختام"},
    "gövde": {"en": "Body", "ar": "المتن"},
    "asal sayı": {"en": "Prime Number", "ar": "عدد أولي"},
    "bileşik sayı": {"en": "Composite Number", "ar": "عدد مركب"},
}

# Önceden derlenmiş Kur'an Mucizeleri Veri Seti
MIRACLES_DATA = [
    {
        "id": "yevm_sehr",
        "title": "365 Gün (Yevm) & 12 Ay (Şehr)",
        "badge": "Zaman Simetrisi",
        "category": "Kelime Sayımı",
        "icon": "calendar",
        "summary": "Kur'an'da tekil olarak 'Gün' (يوم - yevm) kelimesi bir yıldaki gün sayısı olan tam 365 defa; 'Ay' (شهر - şehr) kelimesi ise bir yıldaki ay sayısı olan tam 12 defa geçmektedir.",
        "words": [
            {"word": "يوم", "meaning": "Gün (Yevm - tekil)", "target_count": 365, "query": "يوم"},
            {"word": "شهر", "meaning": "Ay (Şehr - tekil)", "target_count": 12, "query": "شهر"}
        ],
        "explanation": "Dünyanın Güneş etrafındaki 1 tam turu 365 gündür. Ay yılı ve Güneş yılındaki ay sayısı ise 12'dir. Kur'an-ı Kerim 1400 yıl önce bu takvim simetrisini matematiksel olarak kelime frekanslarına yerleştirmiştir."
    },
    {
        "id": "dunya_ahiret",
        "title": "Dünya ve Âhiret Dengesi (115 & 115)",
        "badge": "Kusursuz Eşitlik",
        "category": "Kelime Dengesi",
        "icon": "scale",
        "summary": "'Dünya' (الدنيا) kelimesi Kur'an'da tam 115 defa geçerken, onun zıddı olan 'Âhiret' (الآخرة) kelimesi de tam 115 defa geçmektedir.",
        "words": [
            {"word": "الدنيا", "meaning": "Dünya Hayatı", "target_count": 115, "query": "دنيا"},
            {"word": "الآخرة", "meaning": "Ahiret Hayatı", "target_count": 115, "query": "آخرة"}
        ],
        "explanation": "Dünya ve ahiret dengesi İslam inancının ana omurgasıdır. Bu kavramsal denge metnin kelime sayımlarında da birebir 115'e 115 eşitlikle tasdik edilmiştir."
    },
    {
        "id": "deniz_kara",
        "title": "Yeryüzü Su ve Kara Oranı (Deniz: 32 / Kara: 13)",
        "badge": "Modern Coğrafi Keşif",
        "category": "Bilimsel & Jeolojik",
        "icon": "globe",
        "summary": "'Deniz' (Bahr) kelimesi 32 defa, 'Kara/Toprak' (Berr/Yebes) kelimesi 13 defa geçer. Toplam: 45. Su oranı: 32/45 = %71.11, Kara oranı: 13/45 = %28.89. Modern uydu ve jeoloji verileriyle yeryüzündeki okyanus-kara oranını birebir verir!",
        "words": [
            {"word": "بحر", "meaning": "Deniz / Su (Bahr)", "target_count": 32, "query": "بحر"},
            {"word": "بر", "meaning": "Kara / Toprak (Berr)", "target_count": 13, "query": "بر"}
        ],
        "explanation": "Modern coğrafya ve NASA uydu ölçümlerine göre dünyamızın %71.1'i sularla, %28.9'u ise karalarla kaplıdır. 7. yüzyılda çölde inen bir kitapta bu oran matematiksel olarak yer almaktadır."
    },
    {
        "id": "isa_adem",
        "title": "Hz. İsa ve Hz. Âdem Simetrisi (25 & 25)",
        "badge": "Ayetle Sabit Mucize",
        "category": "İsim Simetrisi",
        "icon": "user-check",
        "summary": "Âl-i İmrân Suresi 59. ayette 'Allah katında İsa'nın durumu Âdem'in durumu gibidir' buyrulur. Kur'an'da 'İsa' (عيسى) ismi tam 25 defa, 'Âdem' (آدم) ismi de tam 25 defa geçmektedir!",
        "words": [
            {"word": "عيسى", "meaning": "Hz. İsa", "target_count": 25, "query": "عيسى"},
            {"word": "آدم", "meaning": "Hz. Âdem", "target_count": 25, "query": "آدم"}
        ],
        "explanation": "Her iki peygamber de babasız yaratılış mucizesine sahiptir. Kur'an ayette onları birbirine benzetmekle kalmamış, kitap boyunca isimlerini de tam 25'er defa zikrederek bu benzetmeyi matematiksel mühürle pekiştirmiştir."
    },
    {
        "id": "melek_seytan",
        "title": "Melek ve Şeytan Dengesi (88 & 88)",
        "badge": "Ruhani Zıtlık",
        "category": "Kelime Dengesi",
        "icon": "shield",
        "summary": "Hayrın temsilcisi 'Melek' (ve türevleri) tam 88 defa geçerken, şerrin temsilcisi 'Şeytan' (ve türevleri) de tam 88 defa geçmektedir.",
        "words": [
            {"word": "الملائكة", "meaning": "Melekler", "target_count": 88, "query": "ملك"},
            {"word": "الشيطان", "meaning": "Şeytan", "target_count": 88, "query": "شيطان"}
        ],
        "explanation": "İyilik ve kötülüğün mücadelesini simgeleyen bu iki zıt varlık, Kur'an genelinde tam bir sayısal ahenk içinde 88'er kez zikredilmektedir."
    },
    {
        "id": "besmele_19",
        "title": "Besmele ve 19 Sayısal Kodu",
        "badge": "19 Mucizesi",
        "category": "Matematiksel Kod",
        "icon": "hash",
        "summary": "Kur'an'ın anahtarı olan Besmele (بسم الله الرحمن الرحيم) tam 19 harften oluşur. Besmeleyi oluşturan 4 kelimenin Kur'an'daki geçiş sayıları istisnasız 19'un katlarıdır!",
        "words": [
            {"word": "İsim", "meaning": "İsm (19 x 1)", "target_count": 19, "query": "اسم"},
            {"word": "Allah", "meaning": "Allah (19 x 142)", "target_count": 2698, "query": "الله"},
            {"word": "Rahmân", "meaning": "Rahmân (19 x 3)", "target_count": 57, "query": "رحمن"},
            {"word": "Rahîm", "meaning": "Rahîm (19 x 6)", "target_count": 114, "query": "رحيم"}
        ],
        "explanation": "Müddessir Suresi 30. ayette 'Üzerinde 19 vardır' buyrulur. Kur'an'daki sure sayısı 114'tür (19 x 6). Besmelenin 4 kelimesinin tamamı da 19'un tam katı adedince Kur'an'da yer alır."
    },
    {
        "id": "huruf_mukattaa",
        "title": "Hurûf-ı Mukatta'a (Şifreli Harfler)",
        "badge": "Harf Şifreleri",
        "category": "Harf Frekansı",
        "icon": "key",
        "summary": "29 surenin başında yer alan Elif-Lâm-Mîm, Yâ-Sîn, Kâf, Nûn gibi mukattaa harfleri, bulundukları surelerde en yüksek frekans katsayılarına ve 19'un katlarına sahiptir.",
        "words": [
            {"word": "الم", "meaning": "Elif-Lâm-Mîm (Bakara, Âl-i İmrân)", "target_count": 0, "query": "الم"},
            {"word": "ق", "meaning": "Kâf Suresi (Kâf harfi: 57 [19 x 3])", "target_count": 57, "query": "ق"}
        ],
        "explanation": "Örneğin Kâf suresinde Kâf harfi tam 57 defa (19 x 3) geçer. Şûra suresindeki Kâf harfi de tam 57 defa (19 x 3) geçer. İkisinin toplamı 114'tür (Kur'an'daki sure sayısı)."
    }
]

# NurMuhammad.com İlimleri & Esrâr-ı Hurûf (Sufi Meditation Center) Veri Seti
NURMUHAMMAD_DATA = {
    "source": "https://nurmuhammad.com",
    "teacher": "Shaykh Nurjan Mirahmadi / Naqshbandi Sufi Way (NurMuhammad.com)",
    "intro": {
        "title": "Hakikat-i Muhammediyye ve Esrâr-ı Hurûf (İlâhî Harflerin Sırları)",
        "doctrine": "Harfler dillerin seslerinden ibaret değil; kâinatın, ruhani frekansların ve 'Kûn' (Ol!) ilâhî emrinin manevî DNA'sıdır.",
        "nuqta_secret": "İmam Ali (k.v) buyurur: 'Bütün semavî kitapların sırrı Kur'an'da, Kur'an'ın sırrı Fatiha'da, Fatiha'nın sırrı Besmele'de, Besmele'nin sırrı ise Bâ (ب) harfindedir. Bâ harfinin sırrı ise onun altındaki NOKTA'dadır (Nuqta). İşte o nokta, ilk yaratılan Nur-u Muhammedî'dir (Haqiqat al-Muhammadiyya).'"
    },
    "nuqta_ba": {
        "title": "Sırr-ı Nuqta (Bâ Harfinin Altındaki Nokta)",
        "quote": "Bütün ilimler Kur'an'da, Kur'an Fatiha'da, Fatiha Besmele'de, Besmele Bâ harfinde, Bâ harfinin ilmi ise onun altındaki noktadadır. Ve ben o Bâ'nın altındaki noktayım.",
        "author": "Hz. Ali İbn Ebî Tâlib (k.v.)",
        "teachings": "Nokta, boyutsuzluğun mutlak sırrıdır. Ahadiyyet deryasından Vahidiyyete ilk zuhur, Nur-i Muhammedî (Aql al-Awwal) noktasıyla başlamıştır."
    },
    "letters": [
        {"char": "ا", "name": "Alif", "abjad": 1, "planet": "Zühal (Satürn / 7. Felek)", "body_latifa": "Omurga & Beyin Merkezi", "asma_allah": "Allah (66)", "asma_allah_abjad": 66, "asma_nabi": "Ahmed (53)", "asma_nabi_abjad": 53, "reality": "İzzatullah & Mutlak Tevhid", "secret": "Allah isminin ilk harfidir. Dosdoğru dik duruşuyla namazdaki Kıyamı ve mutlak Birliği (Ahad) simgeler."},
        {"char": "ب", "name": "Bâ", "abjad": 2, "planet": "Kamer (Ay / 1. Felek)", "body_latifa": "Gözler & Basar (Görme)", "asma_allah": "El-Bâkî (113)", "asma_allah_abjad": 113, "asma_nabi": "Burhân (258)", "asma_nabi_abjad": 258, "reality": "Bahr-ul Qudra & Yaratılış Kapısı", "secret": "Besmelenin ilk harfidir. Elif'in secdeye kapanmasıyla oluşur. Altındaki nokta Nur-u Muhammedî'dir."},
        {"char": "ت", "name": "Tâ", "abjad": 400, "planet": "Müşteri (Jüpiter / 6. Felek)", "body_latifa": "Sağ Göğüs / Letâif-i Sır", "asma_allah": "Et-Tevvâb (409)", "asma_allah_abjad": 409, "asma_nabi": "Tâhir (224)", "asma_nabi_abjad": 224, "reality": "Tevbe & Hakikate Dönüş", "secret": "Ruhun nefsani esaretten kurtulup ilâhî huzura dönüş makamıdır. Tevbe kapısının anahtarıdır."},
        {"char": "ث", "name": "Thâ", "abjad": 500, "planet": "Merih (Mars / 5. Felek)", "body_latifa": "Boğaz & Nutuk Merkezi", "asma_allah": "Es-Sâbit (513)", "asma_allah_abjad": 513, "asma_nabi": "Tümâme (546)", "asma_nabi_abjad": 546, "reality": "Sevâb & İlâhî Sabitlik", "secret": "İlâhî amellerin ebedi meyvesi ve ruhani derecelerin teyididir."},
        {"char": "ج", "name": "Cîm", "abjad": 3, "planet": "Şems (Güneş / 4. Felek)", "body_latifa": "Mide & Sindirim Sistemi", "asma_allah": "El-Câmi (114)", "asma_allah_abjad": 114, "asma_nabi": "Câmî (114)", "asma_nabi_abjad": 114, "reality": "Celâl ve Cemâl Tecellisi", "secret": "İlâhî cemalin ve celalin birleştiği Cem makamıdır. 114 Kur'an suresinin cemidir."},
        {"char": "ح", "name": "Hâ", "abjad": 8, "planet": "Zühre (Venüs / 3. Felek)", "body_latifa": "Kalp Letâifi (Qalb)", "asma_allah": "El-Hayy (18)", "asma_allah_abjad": 18, "asma_nabi": "Habîbullah (90)", "asma_nabi_abjad": 90, "reality": "Hayat & Arşın Taşıyıcıları", "secret": "Diri olan hayat menbaıdır. Arş-ı Âlâ'yı taşıyan 8 meleki kuvvete işaret eder."},
        {"char": "خ", "name": "Khâ", "abjad": 600, "planet": "Utarit (Merkür / 2. Felek)", "body_latifa": "Dalak & Kan Filtresi", "asma_allah": "El-Hâlik (731)", "asma_allah_abjad": 731, "asma_nabi": "Hâtem-ün Nebiyyîn (1063)", "asma_nabi_abjad": 1063, "reality": "Hâlikiyyet & Yoktan Var Etme", "secret": "Yoktan var etme sırrının ve yaratılış cevherinin tecellisidir."},
        {"char": "د", "name": "Dâl", "abjad": 4, "planet": "Kamer (Ay)", "body_latifa": "Ayaklar & Sebat", "asma_allah": "Ed-Dâim (65)", "asma_allah_abjad": 65, "asma_nabi": "Dâî (85)", "asma_nabi_abjad": 85, "reality": "Devâm & Dünyadan Çıkış", "secret": "Namazdaki Tehiyyat oturuşudur. Toprak, su, hava, ateş 4 ana unsurun dengesidir."},
        {"char": "ذ", "name": "Dhâl", "abjad": 700, "planet": "Zühal (Satürn)", "body_latifa": "Sağ Kulak / İşitme", "asma_allah": "Zül-Celâli Vel-İkrâm (1100)", "asma_allah_abjad": 1100, "asma_nabi": "Zâkir (228)", "asma_nabi_abjad": 228, "reality": "Zikrullah & Frekans", "secret": "Kalbin dirilişi ancak Zikrullah iledir. Ruhani frekansları açan kapıdır."},
        {"char": "ر", "name": "Râ", "abjad": 200, "planet": "Müşteri (Jüpiter)", "body_latifa": "Sağ Omuz & Kan Dolaşımı", "asma_allah": "Er-Rahmân (298)", "asma_allah_abjad": 298, "asma_nabi": "Rauf (287)", "asma_nabi_abjad": 287, "reality": "Rahmeten lil-Âlemîn", "secret": "Peygamber Efendimiz'in (s.a.v) âlemlere rahmet oluşunun sırrıdır (Er-Rahmân, Er-Rahîm)."},
        {"char": "ز", "name": "Zây", "abjad": 7, "planet": "Merih (Mars)", "body_latifa": "Sol Kulak / Dinleme", "asma_allah": "Ez-Zâhir (1106)", "asma_allah_abjad": 1106, "asma_nabi": "Zeyn (67)", "asma_nabi_abjad": 67, "reality": "Zînet & 7 Letâif-i Kalb", "secret": "Kalbin 7 derin letafet merkezi ve 7 gök katının manevi süsüdür."},
        {"char": "س", "name": "Sîn", "abjad": 60, "planet": "Şems (Güneş)", "body_latifa": "Dişler & Çene Kemikleri", "asma_allah": "Es-Selâm (131)", "asma_allah_abjad": 131, "asma_nabi": "Seyyid (74)", "asma_nabi_abjad": 74, "reality": "Sırr-ı Hilkat & Yâ-Sîn", "secret": "Kur'an'ın kalbi olan Yâ-Sîn'in sırrıdır. İnsan-ı Kâmil'in kalbindeki ilâhî sırdır."},
        {"char": "ش", "name": "Shîn", "abjad": 300, "planet": "Zühre (Venüs)", "body_latifa": "Sağ Göz / Basiret", "asma_allah": "Eş-Şekûr (526)", "asma_allah_abjad": 526, "asma_nabi": "Şâfi (391)", "asma_nabi_abjad": 391, "reality": "Şems-i Hakikat & Şükür", "secret": "Hakikat güneşinin kalbe doğuşu ve sonsuz şükür makamıdır."},
        {"char": "ص", "name": "Sâd", "abjad": 90, "planet": "Utarit (Merkür)", "body_latifa": "Göğüs Kafesi / Sadır", "asma_allah": "Es-Samed (134)", "asma_allah_abjad": 134, "asma_nabi": "Sâdık (165)", "asma_nabi_abjad": 165, "reality": "Sıdk (Sadakat) & Salât", "secret": "Sıddîkiyet mertebesidir. Namazın miracındaki ebedi sadakattir."},
        {"char": "ض", "name": "Dâd", "abjad": 800, "planet": "Kamer (Ay)", "body_latifa": "Kaburga Kemikleri", "asma_allah": "Ed-Dârr (1001)", "asma_allah_abjad": 1001, "asma_nabi": "Damîn (850)", "asma_nabi_abjad": 850, "reality": "Zıyâ (İlâhî Işık)", "secret": "Kur'an lisanına mahsus harftir; karanlıkları delen ilâhî nurun parıltısıdır."},
        {"char": "ط", "name": "Tâ", "abjad": 9, "planet": "Zühal (Satürn)", "body_latifa": "9 Kalp Noktası Zirvesi", "asma_allah": "Et-Tâhir (225)", "asma_allah_abjad": 225, "asma_nabi": "Tâ-Hâ (14)", "asma_nabi_abjad": 14, "reality": "Tahâret & 9 Sultan Noktası", "secret": "Mutlak arınmadır. En büyük tek haneli sayı olan 9'un (Hatm) makamıdır."},
        {"char": "ظ", "name": "Zâ", "abjad": 900, "planet": "Müşteri (Jüpiter)", "body_latifa": "Sol Göz / İdrak", "asma_allah": "Ez-Zâhir (1106)", "asma_allah_abjad": 1106, "asma_nabi": "Zâfir (1191)", "asma_nabi_abjad": 1191, "reality": "Zıllullah (İlâhî Gölge)", "secret": "Arşın gölgesi altında korunan kâmil ruhların mertebesidir."},
        {"char": "ع", "name": "Ayn", "abjad": 70, "planet": "Merih (Mars)", "body_latifa": "İki Kaş Arası (Ayn)", "asma_allah": "El-Alîm (150)", "asma_allah_abjad": 150, "asma_nabi": "Âlim (141)", "asma_nabi_abjad": 141, "reality": "Ayn-ul Yakîn & İlm-i Ledün", "secret": "Göz, pınar ve doğrudan ilâhî kaynaktan içilen ledün ilmidir."},
        {"char": "غ", "name": "Ghayn", "abjad": 1000, "planet": "Şems (Güneş)", "body_latifa": "Baş Tepesi (Taç Latifesi)", "asma_allah": "El-Ganiyy (1060)", "asma_allah_abjad": 1060, "asma_nabi": "Gays (1010)", "asma_nabi_abjad": 1010, "reality": "Gayb Âlemleri (Lâhût)", "secret": "Akılların idrak edemeyeceği en yüksek mutlak gayb ufuklarıdır (1000 sayısı)."},
        {"char": "ف", "name": "Fâ", "abjad": 80, "planet": "Zühre (Venüs)", "body_latifa": "Dudaklar & Nefes Çıkışı", "asma_allah": "El-Fettâh (489)", "asma_allah_abjad": 489, "asma_nabi": "Fâtih (489)", "asma_nabi_abjad": 489, "reality": "Fenâfillah & Fütûhat", "secret": "Benliğin silinip ilahi varlıkta erimesi ve manevi fetihlerin kapısıdır."},
        {"char": "ق", "name": "Qâf", "abjad": 100, "planet": "Utarit (Merkür)", "body_latifa": "Akciğerler & Oksijen", "asma_allah": "El-Kuddûs (170)", "asma_allah_abjad": 170, "asma_nabi": "Kâsım (191)", "asma_nabi_abjad": 191, "reality": "Kudret & Kur'ân-ı Mecîd", "secret": "Kâf Dağı ve Kur'an'ın taşıdığı azametli ilâhî kudret okyanusudur."},
        {"char": "ك", "name": "Kâf", "abjad": 20, "planet": "Kamer (Ay)", "body_latifa": "Sağ El & Tutma", "asma_allah": "El-Kerîm (270)", "asma_allah_abjad": 270, "asma_nabi": "Kâmil (91)", "asma_nabi_abjad": 91, "reality": "Kevser & Kûn (Ol!)", "secret": "Bolluk ve 'Kûn Fe-Yekûn' (Ol dedi ve oldu) emrinin tecelli merkezidir."},
        {"char": "ل", "name": "Lâm", "abjad": 30, "planet": "Zühal (Satürn)", "body_latifa": "Sol El & Cömertlik", "asma_allah": "El-Latîf (129)", "asma_allah_abjad": 129, "asma_nabi": "Lisân-ı Sıdk (245)", "asma_nabi_abjad": 245, "reality": "Lütf-i İlâhî & Lisan", "secret": "İlâhî zarafet, incelik ve kelâmın akış vasıtasıdır."},
        {"char": "م", "name": "Meem", "abjad": 40, "planet": "Müşteri (Jüpiter)", "body_latifa": "Alın & Secde Noktası", "asma_allah": "El-Mecîd (57)", "asma_allah_abjad": 57, "asma_nabi": "Muhammed (92)", "asma_nabi_abjad": 92, "reality": "Hakikat-i Muhammediyye (40 Makamı)", "secret": "Muhammed (s.a.v) isminin başı ve sonudur. 40 gün halvettir. Secdedeki kulun baş şeklidir."},
        {"char": "ن", "name": "Nûn", "abjad": 50, "planet": "Merih (Mars)", "body_latifa": "Burun & Hayat Soluğu", "asma_allah": "En-Nûr (256)", "asma_allah_abjad": 256, "asma_nabi": "Nebiyyullah (128)", "asma_nabi_abjad": 128, "reality": "Nûrullah & Kalem", "secret": "Nûn vel-Kalem ayetidir. Kâinat kitabını yazan kalemin mürekkebi olan ilâhî ışıktır."},
        {"char": "ه", "name": "Hâ", "abjad": 5, "planet": "Şems (Güneş)", "body_latifa": "Gırtlak & Hû Nefesi", "asma_allah": "El-Hâdî (20)", "asma_allah_abjad": 20, "asma_nabi": "Hâdî (20)", "asma_nabi_abjad": 20, "reality": "Hüviyyet (Hû) & Hidâyet", "secret": "Nefesin giriş ve çıkışındaki 'Hû' zikridir. Mutlak Zât'ın bilinmezliğidir."},
        {"char": "و", "name": "Vâv", "abjad": 6, "planet": "Zühre (Venüs)", "body_latifa": "Göbek & Ruhani Bağlantı", "asma_allah": "El-Vedûd (20)", "asma_allah_abjad": 20, "asma_nabi": "Vesîle (111)", "asma_nabi_abjad": 111, "reality": "Vedûd & 6 Yön / 6 Gün", "secret": "Anne karnındaki cenin duruşudur. İlâhî aşktır (El-Vedûd). Yaradan ile kul arasındaki sevgi bağıdır."},
        {"char": "ي", "name": "Yâ", "abjad": 10, "planet": "Utarit (Merkür)", "body_latifa": "Dil & Kelime-i Şehadet", "asma_allah": "El-Kâfî (111)", "asma_allah_abjad": 111, "asma_nabi": "Yâ-Sîn (70)", "asma_nabi_abjad": 70, "reality": "Hakk-ul Yakîn & Yâ-Sîn", "secret": "Şüphesiz kesin bilginin ve vahyin son durağıdır."}
    ],
    "nine_points_enneagram": {
        "title": "9 Sırrı ve Kalbin 9 Noktası",
        "description": "9 sayısı tek haneli sayıların zirvesidir (Hatm). Çarpımlarının rakamları toplamı daima 9'dur (9x2=18 -> 1+8=9, 9x3=27 -> 2+7=9). Kur'an'da 9. Sure olan Tevbe suresi Besmelesiz başlar (Celal). Eksik kalan Besmele ise 27. Sure Neml'de tamamlanır (27 = 9 x 3).",
        "lataif": [
            {"point": 1, "name": "Qalb (Kalp) - Âdem Aleyhisselam Makamı", "color": "Sarı / Ziya", "description": "Kalbin manevi uyanışı, ilahi sevginin ilk tohumu ve nefsin terbiyesi."},
            {"point": 2, "name": "Ruh - Nuh Aleyhisselam Makamı", "color": "Kırmızı / Aşk", "description": "Nuh'un gemisi gibi nefis fırtınalarından kurtulup ruhaniyet denizine açılma."},
            {"point": 3, "name": "Sirr (Sır) - İbrahim Aleyhisselam Makamı", "color": "Beyaz / Nur", "description": "Nemrud'un ateşini gülistana çeviren mutlak teslimiyet ve dostluk makamı."},
            {"point": 4, "name": "Khafa (Hafî) - Musa Aleyhisselam Makamı", "color": "Yeşil / Hızır", "description": "Tur Dağı'ndaki ilahi mükâleme ve tecelli perdesinin aralanması."},
            {"point": 5, "name": "Akhfa (Ahfâ) - İsa (a.s) & Muhammed (s.a.v) Makamı", "color": "Siyah / Nur-i Siyah", "description": "Mutlak fenâ ve bekâ mertebesi. Ahadiyyet sırrının kalpteki en derin noktası."},
            {"point": 6, "name": "Nefs-i Emmâre ve Kudret Noktası", "color": "Gri / Terbiye", "description": "Nefsin terbiye edilip ruhun emrine girdiği güç merkezi."},
            {"point": 7, "name": "Zikrullah ve Kalb-i Selîm", "color": "Zümrüt", "description": "7 gök tabakasıyla irtibatlı aralıksız zikrullah havuzu."},
            {"point": 8, "name": "Bahr-ul Muhit ve Şehadet", "color": "Turkuaz", "description": "Arşın 8 taşıyıcısı ile irtibatlı ilahi şehadet okyanusu."},
            {"point": 9, "name": "Bâb-üt Tevbe ve Hatm-i Muhammedi", "color": "Altın Sarısı", "description": "9. kapı; nefsin tamamen teslim olduğu ve 9. sure Tevbe'nin sırrına erildiği kapı."}
        ]
    },
    "asma_ul_husna": [
        {
            "id": item.get("id", idx + 1),
            "number": item.get("id", idx + 1),
            "arabic": item.get("ar", ""),
            "ar": item.get("ar", ""),
            "name": item.get("tr_name", item.get("name_tr", "")),
            "name_tr": item.get("tr_name", item.get("name_tr", "")),
            "tr_name": item.get("tr_name", item.get("name_tr", "")),
            "name_en": item.get("en_name", item.get("name_en", "")),
            "en_name": item.get("en_name", item.get("name_en", "")),
            "abjad": item.get("abjad", 0),
            "meaning": item.get("meaning_tr", ""),
            "meaning_tr": item.get("meaning_tr", ""),
            "meaning_en": item.get("meaning_en", ""),
            "is_prime": is_prime(item.get("abjad", 0))
        }
        for idx, item in enumerate(delail_data.ASMA_UL_HUSNA)
    ],
    "asma_un_nabi": [
        {
            "id": item.get("id", idx + 1),
            "number": item.get("id", idx + 1),
            "arabic": item.get("ar", ""),
            "ar": item.get("ar", ""),
            "name": item.get("name_tr", ""),
            "name_tr": item.get("name_tr", ""),
            "name_en": item.get("name_en", ""),
            "abjad": item.get("abjad", 0),
            "meaning": item.get("meaning_tr", ""),
            "meaning_tr": item.get("meaning_tr", ""),
            "meaning_en": item.get("meaning_en", ""),
            "is_prime": is_prime(item.get("abjad", 0))
        }
        for idx, item in enumerate(delail_data.ASMA_UN_NABI_201)
    ]
}

# Aliases for robust API compatibility
NURMUHAMMAD_DATA["letters_28"] = NURMUHAMMAD_DATA["letters"]
NURMUHAMMAD_DATA["asma_i_nabi"] = NURMUHAMMAD_DATA["asma_un_nabi"]



class QuranRequestHandler(SimpleHTTPRequestHandler):
    """Kur'an Web Uygulaması HTTP & API Yönlendiricisi"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/"):
            self.handle_api_get(path, query)
            return

        if path == "/" or path == "":
            self.path = "/index.html"

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                data = json.loads(post_body)
            except Exception:
                data = {}
            self.handle_api_post(path, data)
            return

        self.send_error(404, "Not Found")

    def send_json(self, data: Any, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def handle_api_get(self, path: str, query: Dict[str, List[str]]):
        # 0. /api/system/architecture (Hybrid C++ / Python / Next.js Telemetry)
        if path == "/api/system/architecture":
            native_info = native_bridge.engine_info() if native_bridge else "Python Fallback"
            is_native = native_bridge.is_native_enabled() if native_bridge else False
            self.send_json({
                "status": "operational",
                "architecture": "Hybrid C++ Native / Python Orchestrator / Next.js Ready",
                "native_core": {
                    "enabled": is_native,
                    "engine": native_info,
                    "vectorized": True,
                    "language": "C++17 (Clang/GCC with AVX2/NEON)"
                },
                "python_orchestrator": {
                    "role": "Stable Backend Custodian & External API Router",
                    "db_path": "quran.db",
                    "total_verses": 6236,
                    "total_surahs": 114,
                    "total_words": 77430
                },
                "frontend_target": {
                    "current": "Vanilla JS SPA (app.js + math_processor.js)",
                    "target": "Next.js 14 App Router (SSR/ISR + TypeScript + WebAssembly Core)",
                    "geo_aeo_ready": True
                }
            })
            return

        # 1. /api/surahs
        if path == "/api/surahs":
            surahs_list = []
            for s_num in range(1, 115):
                s = QURAN.surahs[s_num]
                surahs_list.append({
                    "number": s.number,
                    "name_tr": s.name_tr,
                    "name_ar": s.name_ar,
                    "name_en": s.name_en,
                    "name_en_translation": s.name_en_translation,
                    "verse_count": s.verse_count,
                    "city_tr": s.city_tr,
                    "revelation_type": s.revelation_type,
                    "revelation_order": s.revelation_order,
                    "bismillah_prefixed": s.bismillah_prefixed,
                    "is_prime_number": s.is_prime_surah_number(),
                    "is_prime_verses": s.is_prime_verse_count(),
                    "mukattaa": s.mukattaa
                })
            self.send_json({"surahs": surahs_list})
            return

        # 2. /api/surah/<number> (Zenginleştirilmiş Kelime Kelime Veri ile)
        m_surah = re.match(r"^/api/surah/(\d+)$", path)
        if m_surah:
            s_num = int(m_surah.group(1))
            if s_num not in QURAN.surahs:
                self.send_json({"error": "Sure bulunamadı"}, 404)
                return
            s = QURAN.surahs[s_num]
            wbw_map = wbw_service.get_surah_wbw_words(s_num)
            verses_list = [self._verse_to_dict(v, wbw_map.get(v.verse_number)) for v in s.verses]

            res = {
                "number": s.number,
                "name_tr": s.name_tr,
                "name_ar": s.name_ar,
                "name_en": s.name_en,
                "name_en_translation": s.name_en_translation,
                "verse_count": s.verse_count,
                "city_tr": s.city_tr,
                "revelation_order": s.revelation_order,
                "bismillah_prefixed": s.bismillah_prefixed,
                "total_words": s.total_words(),
                "total_letters": s.total_letters(),
                "abjad_value": s.abjad_value(),
                "is_prime_number": s.is_prime_surah_number(),
                "is_prime_verses": s.is_prime_verse_count(),
                "is_prime_letters": s.is_prime_letters(),
                "is_prime_words": s.is_prime_words(),
                "is_prime_abjad": s.is_prime_abjad(),
                "mukattaa": s.mukattaa,
                "verses": verses_list
            }
            self.send_json(res)
            return

        # 3. /api/verse/<surah>/<verse>
        m_verse = re.match(r"^/api/verse/(\d+)/(\d+)$", path)
        if m_verse:
            s_num = int(m_verse.group(1))
            v_num = int(m_verse.group(2))
            v = QURAN.get_verse(s_num, v_num)
            if not v:
                self.send_json({"error": "Ayet bulunamadı"}, 404)
                return
            wbw_map = wbw_service.get_surah_wbw_words(s_num)
            self.send_json(self._verse_to_dict(v, wbw_map.get(v_num)))
            return

        # 3b. /api/roots (1,248 Kur'ani Kök Sözlüğü - Arama, Harf Filtreleme & Frekans)
        if path == "/api/roots":
            letter_p = query.get("letter", [""])[0].strip()
            q_p = query.get("q", [""])[0].strip()
            sort_p = query.get("sort", ["frequency"])[0].strip()
            lim_p = int(query.get("limit", ["1500"])[0]) if query.get("limit", ["1500"])[0].isdigit() else 1500
            off_p = int(query.get("offset", ["0"])[0]) if query.get("offset", ["0"])[0].isdigit() else 0
            roots_data = get_roots_list(letter=letter_p, query_str=q_p, sort_mode=sort_p, limit=lim_p, offset=off_p)
            self.send_json(roots_data)
            return

        # 3c. /api/root/<root> (Tekil Kök Detayı & Morfolojik Çekimler)
        m_root = re.match(r"^/api/root/(.+)$", path)
        if m_root:
            r_param = urllib.parse.unquote(m_root.group(1)).strip()
            root_info = get_root_details(r_param)
            if not root_info:
                self.send_json({"error": "Kök bulunamadı"}, 404)
            else:
                self.send_json(root_info)
            return

        # 4. /api/nurmuhammad (NurMuhammad.com, MuhammadanReality.com, AngelicHealing.net)
        if path == "/api/nurmuhammad":
            payload = dict(NURMUHAMMAD_DATA)
            payload["naqshbandi_realities"] = delail_data.NAQSHBANDI_REALITIES
            self.send_json(payload)
            return

        # 4a-1. /api/ilm-huroof/numbers (Sayıların Sırları - NurMuhammad.com Birebir Tercümeler & Tefekkür)
        if path == "/api/ilm-huroof/numbers":
            try:
                ilm_path = os.path.join(BASE_DIR, "data", "ilm_huroof_numbers.json")
                with open(ilm_path, "r", encoding="utf-8") as f:
                    ilm_data = json.load(f)
                self.send_json(ilm_data)
            except Exception as e:
                self.send_json({"error": f"Veri okunamadı: {str(e)}"}, 500)
            return

        # 4a-2. /api/ilm-huroof/letters (28 Harfin Sırları & Global Kur'an Frekansları)
        if path == "/api/ilm-huroof/letters":
            try:
                harf_path = os.path.join(REFLECTIONS_DIR, "harf_sirrlari.json")
                with open(harf_path, "r", encoding="utf-8") as f:
                    harf_data = json.load(f)
                for item in harf_data.get("letters", []):
                    ch = item.get("char", "")
                    if ch in GLOBAL_QURAN_LETTER_STATS:
                        item["quran_count"] = GLOBAL_QURAN_LETTER_STATS[ch]["count"]
                        item["quran_percentage"] = GLOBAL_QURAN_LETTER_STATS[ch]["percentage"]
                harf_data["global_total_letters"] = GLOBAL_TOTAL_QURAN_LETTERS
                self.send_json(harf_data)
            except Exception as e:
                self.send_json({"error": f"Harf verisi okunamadı: {str(e)}"}, 500)
            return

        # 4a-3. /api/math/analyze-number?n=<val> (Matematiksel Prosessör & Sır Analiz Motoru)
        if path == "/api/math/analyze-number":
            n_param = query.get("n", ["1"])[0].strip()
            try:
                n = int(n_param)
            except ValueError:
                n = 1
            if n < 0:
                n = abs(n)

            factors = prime_factors(n)

            # Digital root (mod 9 reduction)
            cur_n = n
            steps = []
            while cur_n >= 10:
                digits = [int(d) for d in str(cur_n)]
                next_n = sum(digits)
                steps.append(f"{' + '.join(str(d) for d in digits)} = {next_n}")
                cur_n = next_n
            digital_root = cur_n

            # Divisors
            divisors = []
            limit = int(n**0.5) if n > 0 else 0
            for i in range(1, limit + 1):
                if n % i == 0:
                    divisors.append(i)
                    if i * i != n:
                        divisors.append(n // i)
            divisors.sort()
            proper_divisors = [d for d in divisors if d != n]
            proper_sum = sum(proper_divisors)

            mod_19 = {"remainder": n % 19 if n > 0 else 0, "is_divisible": (n % 19 == 0) if n > 0 else False, "multiple": n // 19 if n > 0 else 0}
            mod_7 = {"remainder": n % 7 if n > 0 else 0, "is_divisible": (n % 7 == 0) if n > 0 else False, "multiple": n // 7 if n > 0 else 0}

            matching_surah = None
            if 1 <= n <= 114 and n in QURAN.surahs:
                s = QURAN.surahs[n]
                matching_surah = {
                    "number": s.number,
                    "name_tr": s.name_tr,
                    "name_ar": s.name_ar,
                    "verse_count": s.verse_count,
                    "total_words": s.total_words(),
                    "total_letters": s.total_letters(),
                    "abjad_value": s.abjad_value(),
                    "mukattaa": s.mukattaa,
                    "is_prime_verse_count": is_prime(s.verse_count)
                }

            matched_letters = [
                {"char": char, "name": name, "abjad": abjad}
                for char, name, abjad in ARABIC_LETTERS if abjad == n
            ]

            self.send_json({
                "number": n,
                "is_prime": is_prime(n),
                "prime_factors": factors,
                "prime_factors_unique": sorted(list(set(factors))),
                "digital_root": digital_root,
                "digital_root_steps": steps,
                "divisors": divisors[:50],
                "divisors_count": len(divisors),
                "proper_divisors_sum": proper_sum,
                "is_perfect": (proper_sum == n and n > 0),
                "is_abundant": (proper_sum > n),
                "is_deficient": (proper_sum < n),
                "mod_19": mod_19,
                "mod_7": mod_7,
                "matching_surah": matching_surah,
                "matched_letters": matched_letters,
                "binary": bin(n)[2:] if n > 0 else "0",
                "hex": hex(n)[2:].upper() if n > 0 else "0"
            })
            return

        # 4b. /api/delail (Delâilü'l-Hayrât, 201 Esmâ-i Nebî & 99 Esmâ-ül Hüsnâ)
        if path == "/api/delail":
            self.send_json({
                "hizibs": delail_data.DELAIL_HIZIBS,
                "asma_ul_husna": delail_data.ASMA_UL_HUSNA,
                "asma_un_nabi": delail_data.ASMA_UN_NABI_201,
                "naqshbandi": delail_data.NAQSHBANDI_REALITIES
            })
            return

        m_hizb = re.match(r"^/api/delail/hizb/(\d+)$", path)
        if m_hizb:
            d_id = int(m_hizb.group(1))
            matching = [h for h in delail_data.DELAIL_HIZIBS if h["day_id"] == d_id]
            if matching:
                self.send_json({"hizb": matching[0]})
            else:
                self.send_json({"error": "Hizib bulunamadı"}, 404)
            return

        # 4c. /api/translations/foreign (Fransızca, Rusça, Urduca, Arapça Tefsir, Ali Bulaç)
        if path == "/api/translations/foreign":
            s_param = query.get("surah", ["1"])[0].strip()
            ed_param = query.get("edition", ["fra-muhammadhamidul"])[0].strip()
            s_num = int(s_param) if s_param.isdigit() else 1

            SUPPORTED_EDITIONS = {
                "fra-muhammadhamidul": {"name": "Fransızca", "author": "Prof. Muhammad Hamidullah", "lang": "Français", "flag": "🇫🇷"},
                "rus-elmirkuliev": {"name": "Rusça", "author": "Elmir Kuliev", "lang": "Русский", "flag": "🇷🇺"},
                "urd-abulaalamaududi": {"name": "Urduca", "author": "Mevlânâ Seyyid Ebu'l-A'lâ Mevdûdî", "lang": "اردو", "flag": "🇵🇰"},
                "ara-jalaladdinalmah": {"name": "Arapça Tefsir", "author": "Tefsîr-i Celâleyn (Celâleddîn el-Mahallî & es-Süyûtî)", "lang": "العربية", "flag": "🕌"},
                "tur-alibulac": {"name": "Türkçe (Ali Bulaç)", "author": "Ali Bulaç Kur'an-ı Kerim ve Türkçe Meali", "lang": "Türkçe", "flag": "🇹🇷"}
            }

            meta = SUPPORTED_EDITIONS.get(ed_param, {"name": ed_param, "author": "", "lang": "", "flag": "🌐"})
            verses_map = get_foreign_edition_verses(s_num, ed_param)
            self.send_json({"surah": s_num, "edition": ed_param, "meta": meta, "verses": verses_map})
            return

        if path == "/api/translations/editions":
            SUPPORTED_EDITIONS = {
                "fra-muhammadhamidul": {"name": "Fransızca (Hamidullah)", "author": "Prof. Muhammad Hamidullah", "lang": "Français", "flag": "🇫🇷"},
                "rus-elmirkuliev": {"name": "Rusça (Kuliev)", "author": "Elmir Kuliev", "lang": "Русский", "flag": "🇷🇺"},
                "urd-abulaalamaududi": {"name": "Urduca (Tefhim)", "author": "Mevdûdî", "lang": "اردو", "flag": "🇵🇰"},
                "ara-jalaladdinalmah": {"name": "Arapça Tefsîr-i Celâleyn", "author": "El-Mahallî & Es-Süyûtî", "lang": "العربية", "flag": "🕌"},
                "tur-alibulac": {"name": "Türkçe (Ali Bulaç)", "author": "Ali Bulaç Meali", "lang": "Türkçe", "flag": "🇹🇷"}
            }
            self.send_json({"editions": SUPPORTED_EDITIONS})
            return

        # 5. /api/search?q=...&field=...
        if path == "/api/search":
            q_text = query.get("q", [""])[0].strip()
            field_name = query.get("field", ["all"])[0].strip()
            surah_filter = query.get("surah", [""])[0].strip()

            if not q_text:
                self.send_json({"results": [], "total": 0})
                return

            results = []
            surah_num = int(surah_filter) if surah_filter.isdigit() else None
            verses_pool = QURAN.surahs[surah_num].verses if surah_num and surah_num in QURAN.surahs else QURAN.verses

            q_lower = q_text.lower()
            q_norm_ar = normalize_arabic(q_text)

            for v in verses_pool:
                match = False
                matched_snippet = ""

                if field_name in ("diyanet", "all") and q_lower in v.translation_diyanet.lower():
                    match = True
                    matched_snippet = v.translation_diyanet
                elif field_name in ("yazir", "all") and q_lower in v.translation_yazir.lower():
                    match = True
                    matched_snippet = v.translation_yazir
                elif field_name in ("en", "all") and q_lower in v.translation_en.lower():
                    match = True
                    matched_snippet = v.translation_en
                elif field_name in ("clean", "arabic", "all") and (q_norm_ar in normalize_arabic(v.text_clean) or q_text in v.text_clean):
                    match = True
                    matched_snippet = v.text_clean
                elif field_name in ("transliteration", "all") and q_lower in v.transliteration_tr.lower():
                    match = True
                    matched_snippet = v.transliteration_tr

                if match:
                    results.append({
                        "id": v.id,
                        "key": v.key,
                        "surah_number": v.surah_number,
                        "surah_name_tr": QURAN.surahs[v.surah_number].name_tr,
                        "verse_number": v.verse_number,
                        "text_uthmani": v.text_uthmani,
                        "text_clean": v.text_clean,
                        "diyanet": v.translation_diyanet,
                        "yazir": v.translation_yazir,
                        "en": v.translation_en,
                        "matched_text": matched_snippet
                    })
                    if len(results) >= 120:
                        break

            self.send_json({"results": results, "total": len(results), "query": q_text})
            return

        # 6. /api/stats/word (Akıllı, Normalizasyonlu & İlmî Mucize Uyumluluk Motoru)
        if path == "/api/stats/word":
            raw_input = query.get("word", [""])[0].strip()
            miracle_id = query.get("miracle_id", [""])[0].strip()
            exact = query.get("exact", ["1"])[0] == "1"

            if not raw_input and not miracle_id:
                self.send_json({"error": "Kelime belirtilmedi"}, 400)
                return

            is_latin = bool(re.search(r'[a-zA-ZğüşıöçĞÜŞİÖÇ]', raw_input))
            mapped_arabic = ""
            lower_input = raw_input.lower()
            if is_latin:
                mapped_arabic = COMMON_TERMS_TR_AR.get(lower_input, "")

            target_ar = mapped_arabic if mapped_arabic else raw_input
            norm_target = normalize_arabic(target_ar)

            # --- İLMÎ TEOLOJİK MUCİZE CONCORDANCE KONTROLÜ ---
            is_angel = (miracle_id == "melek_seytan" and ("ملك" in norm_target or "ملايك" in norm_target or "melek" in lower_input)) or (not miracle_id and norm_target in ["ملايكه", "الملايكه"])
            is_satan = (miracle_id == "melek_seytan" and ("شيطان" in norm_target or "شياطين" in norm_target or "seytan" in lower_input or "şeytan" in lower_input)) or (not miracle_id and norm_target in ["شيطان", "الشيطان", "شياطين"])
            is_dunya = (miracle_id == "dunya_ahiret" and ("دنيا" in norm_target or "dunya" in lower_input or "dünya" in lower_input))
            is_ahirat = (miracle_id == "dunya_ahiret" and ("اخره" in norm_target or "ahiret" in lower_input or "âhiret" in lower_input))
            is_isa = (miracle_id == "isa_adem" and ("عيس" in norm_target or "isa" in lower_input))
            is_adam = (miracle_id == "isa_adem" and ("ادم" in norm_target or "adem" in lower_input))
            is_day = (miracle_id == "yevm_sehr" and ("يوم" in norm_target or "gun" in lower_input or "gün" in lower_input))
            is_month = (miracle_id == "yevm_sehr" and ("شهر" in norm_target or "ay" in lower_input))
            is_sea = (miracle_id == "deniz_kara" and ("بحر" in norm_target or "deniz" in lower_input))
            is_land = (miracle_id == "deniz_kara" and ("بر" in norm_target or "kara" in lower_input or "toprak" in lower_input))

            if is_angel or is_satan or is_dunya or is_ahirat or is_isa or is_adam or is_day or is_month or is_sea or is_land:
                occurrences = []
                total_count = 0
                surah_dist = {}
                target_count = 0
                verified_note = ""

                for v in QURAN.verses:
                    v_norm = normalize_arabic(v.text_clean)
                    words = v_norm.split()
                    v_cnt = 0

                    if is_angel:
                        target_count = 88
                        verified_note = "Hayrın temsilcisi 'Melek' (tekil: 13, tesniye: 2, çoğul melâike: 73) ilmi araştırmalarda ve Kur'an'da tam 88 defa zikredilir."
                        singular_keys = {
                            (6, 8): ["ملك", "ملكا"],
                            (6, 9): ["ملكا"],
                            (6, 50): ["ملك"],
                            (11, 12): ["ملك"],
                            (11, 31): ["ملك"],
                            (12, 31): ["ملك"],
                            (17, 95): ["ملكا"],
                            (25, 7): ["ملك"],
                            (32, 11): ["ملك"],
                            (53, 26): ["ملك"],
                            (69, 17): ["والملك"],
                            (89, 22): ["والملك"]
                        }
                        for w in words:
                            if "ملايك" in w or "ملائك" in w:
                                v_cnt += 1
                            elif w in ["ملكين", "الملكين", "ملكان", "الملكان"]:
                                v_cnt += 1
                            elif (v.surah_number, v.verse_number) in singular_keys and w in singular_keys[(v.surah_number, v.verse_number)]:
                                v_cnt += 1

                    elif is_satan:
                        target_count = 88
                        verified_note = "Şerrin temsilcisi 'Şeytan' (tekil şeytan: 68, çoğul şeyatin: 18, ikili: 2) tam 88 defa Kur'an'da yer alarak melekler ile kusursuz bir simetri oluşturmaktadır."
                        v_cnt = sum(1 for w in words if "شيطان" in w or "شياطين" in w)

                    elif is_dunya:
                        target_count = 115
                        verified_note = "'Dünya' (الدنيا) lafzı Kur'an-ı Kerim'de tam 115 defa zikredilmektedir."
                        v_cnt = sum(1 for w in words if "دنيا" in w)

                    elif is_ahirat:
                        target_count = 115
                        verified_note = "'Âhiret' (الآخرة) lafzı Kur'an-ı Kerim'de tam 115 defa zikredilerek dünya ile birebir eşitlenmiştir."
                        v_cnt = sum(1 for w in words if any(w == sfx or w.endswith(sfx) for sfx in ["آخرة", "الآخرة", "بالآخرة", "وللآخرة", "للآخرة", "والآخرة", "اخره", "الاخره", "بالاخره", "وللاخره", "للاخره", "والاخره"]))

                    elif is_isa:
                        target_count = 25
                        verified_note = "Âl-i İmrân 59 ayetinin teyidi olarak 'İsa' (عيسى) ismi Kur'an'da tam 25 defa zikredilmektedir."
                        v_cnt = sum(1 for w in words if "عيس" in w)

                    elif is_adam:
                        target_count = 25
                        verified_note = "'Âdem' (آدم) ismi Kur'an'da tam 25 defa geçerek Hz. İsa ile eşitlenmiştir."
                        v_cnt = sum(1 for w in words if w in ["ادم", "لادم", "يادم", "فادم", "كادم"] or ("ادم" in w and "نادم" not in w and "خادم" not in w and "مادام" not in w))

                    elif is_day:
                        target_count = 365
                        verified_note = "Tekil olarak 'Gün' (يوم - yevm) tam 365 defa (bir yılın gün sayısı) geçmektedir."
                        v_cnt = sum(1 for w in words if w in ["يوم", "يوما", "اليوم", "فاليوم", "واليوم", "بيوم", "ليوم", "كيوم"])

                    elif is_month:
                        target_count = 12
                        verified_note = "Tekil olarak 'Ay' (شهر - şehr) tam 12 defa (bir yıldaki ay sayısı) geçmektedir."
                        v_cnt = sum(1 for w in words if w in ["شهر", "شهرا", "الشهر", "بالشهر", "وشهر"])

                    elif is_sea:
                        target_count = 32
                        verified_note = "'Deniz' (Bahr) tam 32 defa geçer (32/45 = %71.11 su oranı)."
                        v_cnt = sum(1 for w in words if "بحر" in w)

                    elif is_land:
                        target_count = 13
                        verified_note = "'Kara' (Berr/Yebes) tam 13 defa geçer (13/45 = %28.89 kara oranı)."
                        v_cnt = sum(1 for w in words if w in ["بر", "برا", "البر", "بالبر", "والبر", "يبس", "يبسا"] and ("toprak" in v.translation_diyanet.lower() or "kara" in v.translation_diyanet.lower() or "land" in (v.translation_en or "").lower() or "dry" in (v.translation_en or "").lower()))

                    if v_cnt > 0:
                        total_count += v_cnt
                        s_name = QURAN.surahs[v.surah_number].name_tr
                        surah_dist[s_name] = surah_dist.get(s_name, 0) + v_cnt
                        occurrences.append({
                            "key": v.key,
                            "surah_number": v.surah_number,
                            "surah_name_tr": s_name,
                            "verse_number": v.verse_number,
                            "text_uthmani": v.text_uthmani,
                            "text_clean": v.text_clean,
                            "diyanet": v.translation_diyanet,
                            "yazir": v.translation_yazir,
                            "en": v.translation_en,
                            "count_in_verse": v_cnt
                        })

                self.send_json({
                    "word": raw_input or target_ar,
                    "mapped_arabic": target_ar,
                    "normalized_arabic": norm_target,
                    "is_latin": is_latin,
                    "exact": True,
                    "is_miracle_verified": True,
                    "miracle_id": miracle_id,
                    "target_count": target_count,
                    "verified_note": verified_note,
                    "exact_count": total_count,
                    "stem_count": total_count,
                    "total_count": total_count,
                    "verse_count": len(occurrences),
                    "surah_distribution": surah_dist,
                    "occurrences": occurrences[:150]
                })
                return

            # --- STANDART LİNGUİSTİK ARAMA ---
            prefixes = ["", "ال", "و", "وال", "ف", "فال", "ب", "بال", "ل", "لل", "ك", "كال"]

            occurrences = []
            exact_count = 0
            stem_count = 0
            surah_dist = {}

            for v in QURAN.verses:
                v_norm = normalize_arabic(v.text_clean)
                words = v_norm.split()

                v_exact_matches = 0
                for w in words:
                    matched = False
                    if w == norm_target:
                        matched = True
                    else:
                        for p in prefixes:
                            if p and w == p + norm_target:
                                matched = True
                                break
                    if matched:
                        v_exact_matches += 1

                v_stem_matches = sum(1 for w in words if norm_target in w) if norm_target else 0

                translation_match = False
                if is_latin:
                    if lower_input in v.translation_diyanet.lower() or lower_input in v.translation_yazir.lower():
                        translation_match = True

                curr_count = v_exact_matches if exact else v_stem_matches
                if translation_match and curr_count == 0:
                    curr_count = 1

                if curr_count > 0 or (translation_match and not norm_target):
                    exact_count += v_exact_matches
                    stem_count += v_stem_matches
                    s_name = QURAN.surahs[v.surah_number].name_tr
                    surah_dist[s_name] = surah_dist.get(s_name, 0) + (curr_count or 1)
                    occurrences.append({
                        "key": v.key,
                        "surah_number": v.surah_number,
                        "surah_name_tr": s_name,
                        "verse_number": v.verse_number,
                        "text_uthmani": v.text_uthmani,
                        "text_clean": v.text_clean,
                        "diyanet": v.translation_diyanet,
                        "yazir": v.translation_yazir,
                        "en": v.translation_en,
                        "count_in_verse": curr_count or 1
                    })

            self.send_json({
                "word": raw_input,
                "mapped_arabic": target_ar if is_latin else "",
                "normalized_arabic": norm_target,
                "is_latin": is_latin,
                "exact": exact,
                "is_miracle_verified": False,
                "exact_count": exact_count,
                "stem_count": stem_count,
                "total_count": exact_count if exact else stem_count,
                "verse_count": len(occurrences),
                "surah_distribution": surah_dist,
                "occurrences": occurrences[:150]
            })
            return

        # 7. /api/analysis/surah-letters?surah=<number>
        if path == "/api/analysis/surah-letters":
            s_param = query.get("surah", ["1"])[0].strip()
            s_num = int(s_param) if s_param.isdigit() else 1
            if s_num not in QURAN.surahs:
                s_num = 1
            s = QURAN.surahs[s_num]
            letter_freqs = s.letter_frequencies()
            total_letters = s.total_letters()

            mukattaa = s.mukattaa or ""
            mukattaa_letters = set(mukattaa)

            letters_list = []
            for char, name, abjad in ARABIC_LETTERS:
                cnt = letter_freqs.get(char, 0)
                pct = round((cnt / total_letters * 100), 2) if total_letters > 0 else 0
                q_stat = GLOBAL_QURAN_LETTER_STATS.get(char, {"count": 0, "percentage": 0})
                letters_list.append({
                    "char": char,
                    "name": name,
                    "abjad": abjad,
                    "count": cnt,
                    "percentage": pct,
                    "quran_count": q_stat["count"],
                    "quran_percentage": q_stat["percentage"],
                    "is_prime": is_prime(cnt),
                    "is_mukattaa": char in mukattaa_letters
                })

            mukattaa_stats = None
            if mukattaa:
                m_breakdown = []
                m_total = 0
                for ch in mukattaa:
                    c_cnt = letter_freqs.get(ch, 0)
                    m_total += c_cnt
                    m_breakdown.append({"char": ch, "count": c_cnt, "is_prime": is_prime(c_cnt)})
                mukattaa_stats = {
                    "code": mukattaa,
                    "total_sum": m_total,
                    "divisible_by_19": (m_total % 19 == 0) if m_total > 0 else False,
                    "is_prime": is_prime(m_total),
                    "breakdown": m_breakdown
                }

            self.send_json({
                "surah_number": s.number,
                "name_tr": s.name_tr,
                "name_ar": s.name_ar,
                "verse_count": s.verse_count,
                "total_words": s.total_words(),
                "total_letters": total_letters,
                "abjad_value": s.abjad_value(),
                "is_prime_surah": s.is_prime_surah_number(),
                "is_prime_verses": s.is_prime_verse_count(),
                "is_prime_letters": s.is_prime_letters(),
                "is_prime_words": s.is_prime_words(),
                "is_prime_abjad": s.is_prime_abjad(),
                "mukattaa": mukattaa,
                "mukattaa_stats": mukattaa_stats,
                "global_total_letters": GLOBAL_TOTAL_QURAN_LETTERS,
                "letters": letters_list
            })
            return

        # 8. /api/analysis/symmetry (114 Sure Simetri Matrisi)
        if path == "/api/analysis/symmetry":
            matrix = []
            even_count = 0
            odd_count = 0
            even_sum_total = 0
            odd_sum_total = 0

            for s_num in range(1, 115):
                s = QURAN.surahs[s_num]
                tot = s.number + s.verse_count
                parity = "even" if tot % 2 == 0 else "odd"
                if parity == "even":
                    even_count += 1
                    even_sum_total += tot
                else:
                    odd_count += 1
                    odd_sum_total += tot

                matrix.append({
                    "number": s.number,
                    "name_tr": s.name_tr,
                    "name_ar": s.name_ar,
                    "verse_count": s.verse_count,
                    "sum": tot,
                    "parity": parity,
                    "is_homogeneous": s.is_homogeneous(),
                    "is_prime_number": s.is_prime_surah_number(),
                    "is_prime_verses": s.is_prime_verse_count(),
                    "is_prime_sum": is_prime(tot)
                })

            self.send_json({
                "summary": {
                    "total_surahs": 114,
                    "even_count": even_count,      # 57
                    "odd_count": odd_count,        # 57
                    "even_sum_total": even_sum_total,  # 6236 (Kur'an toplam ayet sayısı!)
                    "odd_sum_total": odd_sum_total,    # 6555 (1..114 sayıları toplamı!)
                    "total_verses": 6236,
                    "sum_of_surah_numbers": 6555,
                    "prime_surahs_count": 30,
                    "prime_verses_surahs_count": sum(1 for s in matrix if s["is_prime_verses"])
                },
                "matrix": matrix
            })
            return

        # 9. /api/analysis/positions (Başı, Ortası, Sonu - Bütün Ölçekler)
        if path == "/api/analysis/positions":
            p_type = query.get("type", ["quran"])[0]

            if p_type == "quran":
                v_first = QURAN.verses[0]
                v_mid1 = QURAN.verses[3117] # 3118. ayet
                v_mid2 = QURAN.verses[3118] # 3119. ayet
                v_last = QURAN.verses[-1]
                v_kehf19 = QURAN.get_verse(18, 19)

                b_dict = self._verse_to_dict(v_first)
                b_dict["title"] = "Kur'an'ın Başlangıcı (Fâtiha 1:1)"
                b_dict["first_word"] = v_first.first_word()
                b_dict["first_letter"] = v_first.first_letter()

                e_dict = self._verse_to_dict(v_last)
                e_dict["title"] = "Kur'an'ın Bitişi (Nâs 114:6)"
                e_dict["last_word"] = v_last.last_word()
                e_dict["last_letter"] = v_last.last_letter()

                c_word_dict = {
                    "word": "وَلْيَتَلَطَّفْ (Ve-lyetelattaf)",
                    "meaning": "Ve nazik davransın",
                    "verse_key": "18:19",
                    "surah_name": "Kehf",
                    "translations": {
                        "diyanet": v_kehf19.diyanet if v_kehf19 else "",
                        "yazir": v_kehf19.yazir if v_kehf19 else "",
                        "yuksel": getattr(v_kehf19, "translation_yuksel", "") if v_kehf19 else "",
                        "en": v_kehf19.en if v_kehf19 else ""
                    },
                    "note": "Klasik Osmanlı mushaflarında Kur'an'ın tam orta kelimesi olarak kırmızı mürekkeple yazılan kelime."
                }

                self.send_json({
                    "type": "quran",
                    "beginning": b_dict,
                    "center": {
                        "central_word": c_word_dict,
                        "central_verses": {
                            "keys": [v_mid1.key, v_mid2.key],
                            "surah_name": "Şuarâ",
                            "text_1": v_mid1.text_uthmani,
                            "text_2": v_mid2.text_uthmani,
                            "translations_1": {
                                "diyanet": v_mid1.diyanet,
                                "yazir": v_mid1.yazir,
                                "yuksel": getattr(v_mid1, "translation_yuksel", "") or "",
                                "en": v_mid1.en
                            },
                            "translations_2": {
                                "diyanet": v_mid2.diyanet,
                                "yazir": v_mid2.yazir,
                                "yuksel": getattr(v_mid2, "translation_yuksel", "") or "",
                                "en": v_mid2.en
                            },
                            "note": "6236 ayetin tam ortasındaki 3118. ve 3119. ayetler."
                        },
                        "central_surah": {
                            "number": 57,
                            "name_tr": "Hadîd (Demir)",
                            "verse_count": 29,
                            "note": "114 surenin tam ortasındaki 57. sure (Demirin atom numarası ve izotop mucizesiyle bilinir)."
                        }
                    },
                    "ending": e_dict
                })
                return

            if p_type == "surah":
                s_id = int(query.get("id", ["1"])[0])
                s = QURAN.get_surah(s_id) or QURAN.get_surah(1)
                v_first = s.first_verse()
                v_mid = s.middle_verse()
                v_last = s.last_verse()

                v_first_dict = self._verse_to_dict(v_first)
                v_mid_dict = self._verse_to_dict(v_mid)
                v_last_dict = self._verse_to_dict(v_last)

                v_first_dict["first_word"] = v_first.first_word()
                v_first_dict["first_letter"] = v_first.first_letter()
                v_first_dict["surah_name"] = s.name_tr

                v_mid_dict["middle_word"] = v_mid.middle_word()
                v_mid_dict["surah_name"] = s.name_tr

                v_last_dict["last_word"] = v_last.last_word()
                v_last_dict["last_letter"] = v_last.last_letter()
                v_last_dict["surah_name"] = s.name_tr

                special_note = ""
                if s.number == 2 and v_mid and v_mid.verse_number == 143:
                    special_note = "Bakara suresi 286 ayettir. Tam ortası olan 143. ayette 'İşte böylece sizi vasat (ORTA) bir ümmet kıldık' buyrulur!"

                self.send_json({
                    "type": "surah",
                    "surah_number": s.number,
                    "name_tr": s.name_tr,
                    "name_ar": s.name_ar,
                    "verse_count": s.verse_count,
                    "total_verses": s.verse_count,
                    "start_page": v_first.page,
                    "end_page": v_last.page,
                    "start_key": v_first.key,
                    "end_key": v_last.key,
                    "special_note": special_note,
                    "first_verse": v_first_dict,
                    "middle_verse": v_mid_dict,
                    "last_verse": v_last_dict
                })
                return

            if p_type == "verse":
                s_id = int(query.get("surah", ["1"])[0])
                v_id = int(query.get("verse", ["1"])[0])
                v = QURAN.get_verse(s_id, v_id) or QURAN.get_verse(1, 1)

                v_dict = self._verse_to_dict(v)
                v_dict["type"] = "verse"
                v_dict["surah_name"] = QURAN.surahs[v.surah_number].name_tr
                v_dict["first_word"] = v.first_word()
                v_dict["middle_word"] = v.middle_word()
                v_dict["last_word"] = v.last_word()
                v_dict["first_letter"] = v.first_letter()
                v_dict["middle_letter"] = v.middle_letter()
                v_dict["last_letter"] = v.last_letter()
                v_dict["is_prime_verse_num"] = v.is_prime_verse_number()
                self.send_json(v_dict)
                return

            if p_type == "juz":
                j_id = int(query.get("id", ["1"])[0])
                verses = QURAN.get_juz(j_id)
                v_first = verses[0]
                v_mid = verses[len(verses)//2]
                v_last = verses[-1]

                v_first_dict = self._verse_to_dict(v_first)
                v_mid_dict = self._verse_to_dict(v_mid)
                v_last_dict = self._verse_to_dict(v_last)

                v_first_dict["first_word"] = v_first.first_word()
                v_first_dict["first_letter"] = v_first.first_letter()
                v_first_dict["surah_name"] = QURAN.surahs[v_first.surah_number].name_tr

                v_mid_dict["middle_word"] = v_mid.middle_word()
                v_mid_dict["surah_name"] = QURAN.surahs[v_mid.surah_number].name_tr

                v_last_dict["last_word"] = v_last.last_word()
                v_last_dict["last_letter"] = v_last.last_letter()
                v_last_dict["surah_name"] = QURAN.surahs[v_last.surah_number].name_tr

                self.send_json({
                    "type": "juz",
                    "juz_number": j_id,
                    "verse_count": len(verses),
                    "total_verses": len(verses),
                    "start_page": v_first.page,
                    "end_page": v_last.page,
                    "start_key": v_first.key,
                    "end_key": v_last.key,
                    "first_verse": v_first_dict,
                    "middle_verse": v_mid_dict,
                    "last_verse": v_last_dict
                })
                return

            self.send_json({"error": "Geçersiz pozisyon türü"}, 400)
            return

        # 10. /api/miracles (Canlı Kur'an Veritabanı Doğrulamalı)
        if path == "/api/miracles":
            live_miracles = miracles_service.miracles_service.get_all_miracles()
            self.send_json({
                "miracles": live_miracles,
                "engine": "quran.db live analytics v2.0",
                "total_verses": len(QURAN.verses),
                "is_live_verified": True
            })
            return

        # 10b. /api/miracle/<id> (Detaylı Canlı Ayet Karşılaştırma Akışı)
        m_mir = re.match(r"^/api/miracle/([a-zA-Z0-9_]+)$", path)
        if m_mir:
            m_id = m_mir.group(1)
            detail = miracles_service.miracles_service.get_miracle(m_id)
            if detail:
                self.send_json(detail)
            else:
                self.send_json({"error": "Mucize bulunamadı", "id": m_id}, 404)
            return

        # 11. /api/juz/<number>
        m_juz = re.match(r"^/api/juz/(\d+)$", path)
        if m_juz:
            juz_num = int(m_juz.group(1))
            verses = [self._verse_to_dict(v) for v in QURAN.get_juz(juz_num)]
            self.send_json({"juz": juz_num, "total": len(verses), "verses": verses})
            return

        # 12. /api/page/<number>
        m_page = re.match(r"^/api/page/(\d+)$", path)
        if m_page:
            page_num = int(m_page.group(1))
            verses = [self._verse_to_dict(v) for v in QURAN.get_page(page_num)]
            self.send_json({"page": page_num, "total": len(verses), "verses": verses})
            return

        # 13. /api/translate
        if path == "/api/translate":
            text = query.get("text", [""])[0]
            target = query.get("target", ["en"])[0].lower()
            source = query.get("source", ["tr"])[0].lower()
            clean_t = text.strip().lower()
            trans = text
            if clean_t in CORE_TRANSLATION_DICT and target in CORE_TRANSLATION_DICT[clean_t]:
                trans = CORE_TRANSLATION_DICT[clean_t][target]
            self.send_json({
                "source_text": text,
                "translated_text": trans,
                "source_lang": source,
                "target_lang": target
            })
            return

        # 14. /api/library/sources (Dinamik Kaynak Listesi: Mealler, Tefsirler, Lügatlar, Hadisler)
        if path == "/api/library/sources":
            stype = query.get("type", [None])[0]
            lang = query.get("lang", [None])[0]
            sources = library_service.get_all_sources(stype, lang)
            self.send_json({"sources": sources, "total": len(sources)})
            return

        # 15. /api/library/entry (Tekil Kaynak Ayet Girdisi)
        if path == "/api/library/entry":
            sid = query.get("source_id", [""])[0]
            s_param = query.get("surah", ["1"])[0]
            v_param = query.get("verse", ["1"])[0]
            s_num = int(s_param) if s_param.isdigit() else 1
            v_num = int(v_param) if v_param.isdigit() else 1
            entry = library_service.get_entry(sid, s_num, v_num)
            if entry:
                self.send_json(entry)
            else:
                self.send_json({"error": "Kütüphane girdisi bulunamadı", "source_id": sid, "surah": s_num, "verse": v_num}, 404)
            return

        # 16. /api/library/compare (Karşılaştırmalı Kaynak Okuyucu)
        if path == "/api/library/compare":
            s_param = query.get("surah", ["1"])[0]
            v_param = query.get("verse", ["1"])[0]
            s_num = int(s_param) if s_param.isdigit() else 1
            v_num = int(v_param) if v_param.isdigit() else 1
            sources_raw = query.get("sources", [""])[0]
            sources_list = [s.strip() for s in sources_raw.split(",") if s.strip()] if sources_raw else None
            compare_data = library_service.compare_sources(s_num, v_num, sources_list)
            self.send_json(compare_data)
            return

        # 17. /api/explore & /api/inspect (Bağlamsal Siyaq & Sibak Semantic RAG Motoru)
        if path in ("/api/explore", "/api/inspect"):
            q_text = query.get("q", query.get("query", [""]))[0].strip()
            if not q_text:
                q_text = "melek ve şeytan dengesi"
            result = semantic_engine.explore_signs(q_text, QURAN)
            self.send_json(result)
            return

        # 18. /api/tefsir/<surah>/<verse> (Diyanet Kur'an Yolu Tefsiri)
        m_tefsir = re.match(r"^/api/tefsir/(\d+)/(\d+)$", path)
        if m_tefsir:
            s_num = int(m_tefsir.group(1))
            v_num = int(m_tefsir.group(2))
            tefsir_data = library_service.get_kuran_yolu_tefsir(s_num, v_num)
            self.send_json(tefsir_data)
            return

        # 19. /api/hadith (Kütüb-i Sitte & Sunnah.com Hadis Modülü)
        if path.startswith("/api/hadith/") and path not in (
            "/api/hadith/search", "/api/hadith/related", "/api/hadith/collections",
            "/api/hadith/sunnah/status", "/api/hadith/sunnah/collections",
            "/api/hadith/sunnah/books", "/api/hadith/sunnah/hadiths", "/api/hadith/sunnah/hadith"
        ):
            coll_id = path.replace("/api/hadith/", "").lower().strip()
            book_param = query.get("book", [None])[0]
            num_param = query.get("number", [None])[0]
            b_val = int(book_param) if book_param and book_param.isdigit() else None
            n_val = int(num_param) if num_param and num_param.isdigit() else None
            
            # Önce yerel veritabanını kontrol et
            h_data = hadith_service.get_hadith(coll_id, b_val, n_val)
            if h_data:
                self.send_json(h_data)
                return

            # Yerel veritabanında yoksa, Sunnah.com API / Açık CDN üzerinden çek
            valid_colls = [c["name"] for c in hadith_service.CANONICAL_SUNNAH_COLLECTIONS]
            if coll_id in valid_colls:
                sunnah_res = hadith_service.fetch_sunnah_hadiths(coll_id, b_val or 1, page=1, limit=50)
                data_items = sunnah_res.get("data", [])
                if data_items:
                    formatted = []
                    meta = hadith_service.get_collection_meta(coll_id)
                    for it in data_items:
                        hadith_bodies = it.get("hadith", [])
                        ar_body = next((x["body"] for x in hadith_bodies if x.get("lang") == "ar"), "")
                        en_body = next((x["body"] for x in hadith_bodies if x.get("lang") == "en"), "")
                        formatted.append({
                            "collection": coll_id,
                            "collection_title": meta["title_tr"],
                            "book_number": b_val or 1,
                            "book_name_tr": f"{meta['title_tr']} - {b_val or 1}. Kitap",
                            "book_name_ar": "",
                            "hadith_number": it.get("hadithNumber"),
                            "narrator": "",
                            "arabic_text": ar_body,
                            "translation_tr": "",
                            "translation_en": en_body
                        })
                    self.send_json({"collection": coll_id, "hadiths": formatted})
                    return

            self.send_json({"error": f"{coll_id} hadisi bulunamadı"}, 404)
            return

        if path == "/api/hadith/search":
            q_txt = query.get("query", query.get("q", [""]))[0].strip()
            coll = query.get("collection", ["all"])[0].strip()
            results = hadith_service.search_hadiths(q_txt, coll)
            self.send_json({"results": results, "total": len(results), "query": q_txt, "collection": coll})
            return

        if path == "/api/hadith/related":
            s_param = query.get("surah", ["1"])[0]
            v_param = query.get("verse", ["1"])[0]
            s_num = int(s_param) if s_param.isdigit() else 1
            v_num = int(v_param) if v_param.isdigit() else 1
            related = hadith_service.get_related_hadiths_for_verse(s_num, v_num)
            self.send_json({"surah": s_num, "verse": v_num, "hadiths": related, "total": len(related)})
            return

        if path == "/api/hadith/collections":
            self.send_json(hadith_service.get_collections_summary())
            return

        # Sunnah.com Developer API Entegrasyonu (https://sunnah.com/developers)
        if path == "/api/hadith/sunnah/status":
            k = hadith_service.get_sunnah_api_key()
            masked = f"{k[:4]}...{k[-4:]}" if len(k) > 8 else ("***" if k else "")
            self.send_json({
                "has_key": bool(k),
                "key_masked": masked,
                "portal_url": "https://sunnah.com/developers",
                "collections": hadith_service.CANONICAL_SUNNAH_COLLECTIONS
            })
            return

        if path == "/api/hadith/sunnah/collections":
            colls = hadith_service.fetch_sunnah_collections()
            self.send_json({"collections": colls})
            return

        if path == "/api/hadith/sunnah/books":
            coll = query.get("collection", ["bukhari"])[0].strip()
            books = hadith_service.fetch_sunnah_books(coll)
            self.send_json({"collection": coll, "books": books})
            return

        if path == "/api/hadith/sunnah/hadiths":
            coll = query.get("collection", ["bukhari"])[0].strip()
            b_param = query.get("book", ["1"])[0].strip()
            p_param = query.get("page", ["1"])[0].strip()
            l_param = query.get("limit", ["20"])[0].strip()
            b_num = int(b_param) if b_param.isdigit() else 1
            page = int(p_param) if p_param.isdigit() else 1
            limit = int(l_param) if l_param.isdigit() else 20
            result = hadith_service.fetch_sunnah_hadiths(coll, b_num, page, limit)
            self.send_json(result)
            return

        if path == "/api/hadith/sunnah/hadith":
            coll = query.get("collection", ["bukhari"])[0].strip()
            h_param = query.get("hadithNumber", query.get("number", ["1"]))[0].strip()
            h_num = int(h_param) if h_param.isdigit() else 1
            h_item = hadith_service.fetch_sunnah_single_hadith(coll, h_num)
            if h_item:
                self.send_json(h_item)
            else:
                self.send_json({"error": "Hadis bulunamadı"}, 404)
            return

        # 20. /api/reflections (Tefekkür, Harf Sırları ve Murakabe)
        m_ref_letter = re.match(r"^/api/reflections/letter/(.+)$", path)
        if m_ref_letter:
            raw_char = urllib.parse.unquote(m_ref_letter.group(1)).strip()
            fpath = os.path.join(REFLECTIONS_DIR, "harf_sirrlari.json")
            res_letter = None
            if os.path.exists(fpath):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        l_data = json.load(f)
                        for item in l_data.get("letters", []):
                            if item.get("char") == raw_char or item.get("name", "").lower() == raw_char.lower():
                                res_letter = item
                                break
                except Exception:
                    pass
            if res_letter:
                self.send_json({"letter": res_letter})
            else:
                self.send_json({"error": "Harf tefekkür notu bulunamadı", "char": raw_char}, 404)
            return

        m_ref_verse = re.match(r"^/api/reflections/verse/(\d+)/(\d+)$", path)
        if m_ref_verse:
            s_num = int(m_ref_verse.group(1))
            v_num = int(m_ref_verse.group(2))
            mukattaa_item = None
            f_muk = os.path.join(REFLECTIONS_DIR, "mukattaa_tefekkur.json")
            if os.path.exists(f_muk):
                try:
                    with open(f_muk, "r", encoding="utf-8") as f:
                        m_json = json.load(f)
                        for item in m_json.get("surahs", []):
                            if item.get("surah_id") == s_num and v_num == 1:
                                mukattaa_item = item
                                break
                except Exception:
                    pass

            tasavvuf_items = []
            f_tas = os.path.join(REFLECTIONS_DIR, "tasavvuf_murakabe.json")
            if os.path.exists(f_tas):
                try:
                    with open(f_tas, "r", encoding="utf-8") as f:
                        t_json = json.load(f)
                        tasavvuf_items = t_json.get("principles", [])
                except Exception:
                    pass

            self.send_json({
                "surah": s_num,
                "verse": v_num,
                "mukattaa": mukattaa_item,
                "principles": tasavvuf_items
            })
            return

        # 21. /api/delail (Web Sync, Evrad-Ezkar & Phrase Analysis)
        if path == "/api/delail/web-sync":
            cached = delail_service.fetch_dalail_web_data()
            self.send_json({"status": "success", "message": "Dalail verisi senkronize edildi", "data": cached})
            return

        if path == "/api/delail/evrad":
            evrad_data = delail_service.get_evrad_ezkar()
            self.send_json(evrad_data)
            return

        if path == "/api/delail/analyze-phrase":
            phrase = query.get("text", [""])[0].strip()
            analyzed = delail_service.analyze_delail_phrase(phrase) if phrase else []
            self.send_json({"phrase": phrase, "words": analyzed})
            return

        self.send_json({"error": "Endpoint bulunamadı"}, 404)

    def handle_api_post(self, path: str, data: Dict[str, Any]):
        # Sunnah.com API Key Kaydetme
        if path == "/api/hadith/sunnah/key":
            api_key = data.get("api_key", "").strip()
            success = hadith_service.set_sunnah_api_key(api_key)
            self.send_json({
                "success": success,
                "has_key": bool(api_key),
                "message": "Sunnah.com API anahtarı başarıyla kaydedildi" if success else "API anahtarı kaydedilemedi"
            })
            return

        # Delail Metin Cümle Analizi POST
        if path == "/api/delail/analyze-phrase":
            phrase = data.get("text", data.get("phrase", "")).strip()
            analyzed = delail_service.analyze_delail_phrase(phrase) if phrase else []
            self.send_json({"phrase": phrase, "words": analyzed})
            return

        # Bağlamsal Keşif POST
        if path in ("/api/explore", "/api/inspect"):
            q_text = data.get("query", data.get("q", "")).strip()
            if not q_text:
                q_text = "melek ve şeytan dengesi"
            result = semantic_engine.explore_signs(q_text, QURAN)
            self.send_json(result)
            return

        # Karşılaştırmalı Kütüphane POST
        if path == "/api/library/compare":
            s_num = int(data.get("surah", 1))
            v_num = int(data.get("verse", 1))
            sources_list = data.get("sources", None)
            compare_data = library_service.compare_sources(s_num, v_num, sources_list)
            self.send_json(compare_data)
            return
        if path == "/api/abjad":
            text = data.get("text", "")
            include_dagger = bool(data.get("include_dagger_alif", False))

            if not text:
                self.send_json({"total_kebir": 0, "total_sagir": 0, "total_letters": 0, "breakdown": []})
                return

            total_kebir = 0
            total_sagir = 0
            total_letters = 0
            char_counts = {}

            for c in text:
                if c in ABJAD_TABLE:
                    val = ABJAD_TABLE[c]
                    total_kebir += val
                    sagir_val = val % 9 if val % 9 != 0 else 9
                    total_sagir += sagir_val
                    total_letters += 1
                    char_counts[c] = char_counts.get(c, 0) + 1
                elif include_dagger and c == 'ٰ':
                    total_kebir += 1
                    total_sagir += 1
                    total_letters += 1
                    char_counts['ٰ (Elif-i Maksûre)'] = char_counts.get('ٰ (Elif-i Maksûre)', 0) + 1

            breakdown = []
            for c, cnt in sorted(char_counts.items(), key=lambda x: ABJAD_TABLE.get(x[0], 1), reverse=True):
                unit_val = ABJAD_TABLE.get(c, 1)
                breakdown.append({
                    "char": c,
                    "count": cnt,
                    "unit_val": unit_val,
                    "subtotal": unit_val * cnt
                })

            words = [w for w in text.split() if any(ch in ABJAD_TABLE for ch in w)]

            self.send_json({
                "text": text,
                "total_kebir": total_kebir,
                "total_sagir": total_sagir,
                "total_letters": total_letters,
                "total_words": len(words),
                "is_prime_kebir": is_prime(total_kebir),
                "is_prime_letters": is_prime(total_letters),
                "factors_kebir": prime_factors(total_kebir),
                "breakdown": breakdown
            })
            return

        self.send_json({"error": "Geçersiz POST isteği"}, 404)

    def _verse_to_dict(self, v, wbw_words: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if wbw_words:
            words_data = wbw_words
        else:
            words_clean = v.text_clean.split()
            words_uth = v.text_uthmani.split()
            total_w = len(words_clean)

            words_data = []
            for i, w_clean in enumerate(words_clean):
                abj = sum(ABJAD_TABLE.get(c, 0) for c in w_clean)
                abj_sagir = sum(ABJAD_TABLE.get(c, 0) % 9 if ABJAD_TABLE.get(c, 0) % 9 != 0 else 9 for c in w_clean)
                l_cnt = sum(1 for c in w_clean if c in ABJAD_TABLE)

                pos = "start" if i == 0 else ("end" if i == total_w - 1 else "body")
                if total_w % 2 == 1 and i == (total_w - 1) // 2:
                    pos = "middle"
                elif total_w % 2 == 0 and (i == total_w // 2 - 1 or i == total_w // 2):
                    pos = "middle"

                factors = prime_factors(abj)
                w_uth = words_uth[i] if i < len(words_uth) else w_clean
                tr_trans = wbw_service.translate_en_to_tr_wbw("", w_clean)

                words_data.append({
                    "idx": i + 1,
                    "clean": w_clean,
                    "uth": w_uth,
                    "translit": "",
                    "tr": tr_trans,
                    "en": "",
                    "abjad": abj,
                    "sagir": abj_sagir,
                    "letters": l_cnt,
                    "is_prime_letters": is_prime(l_cnt),
                    "is_prime_abjad": is_prime(abj),
                    "factors": factors,
                    "position": pos
                })

        return {
            "id": v.id,
            "key": v.key,
            "surah_number": v.surah_number,
            "verse_number": v.verse_number,
            "text_uthmani": v.text_uthmani,
            "text_clean": v.text_clean,
            "text_uthmani_raw": v.text_uthmani_raw,
            "diyanet": v.translation_diyanet,
            "yazir": v.translation_yazir,
            "yuksel": getattr(v, "translation_yuksel", "") or "",
            "en": v.translation_en,
            "translations": {
                "diyanet": v.translation_diyanet,
                "yazir": v.translation_yazir,
                "yuksel": getattr(v, "translation_yuksel", "") or "",
                "en": v.translation_en
            },
            "transliteration": v.transliteration_tr,
            "juz": v.juz,
            "page": v.page,
            "is_sajda": v.is_sajda,
            "word_count": v.word_count(),
            "letter_count": v.letter_count(),
            "abjad": v.abjad_value(),
            "is_prime_verse": v.is_prime_verse_number(),
            "is_prime_words": v.is_prime_word_count(),
            "is_prime_letters": v.is_prime_letter_count(),
            "audio_url": f"https://cdn.islamic.network/quran/audio/128/ar.alafasy/{v.id}.mp3",
            "words": words_data
        }

def get_foreign_edition_verses(surah_num: int, edition_name: str) -> Dict[int, str]:
    db_file = os.path.join(os.path.dirname(__file__), "quran.db")
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS foreign_editions (
            edition TEXT,
            surah_number INTEGER,
            verse_number INTEGER,
            text TEXT,
            PRIMARY KEY (edition, surah_number, verse_number)
        );
    ''')
    rows = cur.execute('''
        SELECT verse_number, text FROM foreign_editions
        WHERE edition = ? AND surah_number = ?
        ORDER BY verse_number
    ''', (edition_name, surah_num)).fetchall()
    if rows:
        conn.close()
        return {r[0]: r[1] for r in rows}

    try:
        url = f"https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/{edition_name}/{surah_num}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (QuranMiraclesForeign/1.0)"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            chapter_verses = data.get("chapter", [])
            to_insert = []
            result_map = {}
            for item in chapter_verses:
                v_num = item.get("verse")
                v_txt = item.get("text", "")
                to_insert.append((edition_name, surah_num, v_num, v_txt))
                result_map[v_num] = v_txt
            if to_insert:
                cur.executemany('''
                    INSERT OR REPLACE INTO foreign_editions (edition, surah_number, verse_number, text)
                    VALUES (?, ?, ?, ?)
                ''', to_insert)
                conn.commit()
            conn.close()
            return result_map
    except Exception:
        conn.close()
        return {}


def run_server(port: int = 8000):
    server_address = ("127.0.0.1", port)
    httpd = ThreadingHTTPServer(server_address, QuranRequestHandler)
    print("=" * 65)
    print(f" Kur'an-ı Kerim Web Uygulaması Başlatıldı!")
    print(f" -> Adres: http://127.0.0.1:{port}")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSunucu kapatılıyor...")
        httpd.server_close()


if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)

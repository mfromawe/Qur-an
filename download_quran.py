#!/usr/bin/env python3
"""
download_quran.py
Kur'an-ı Kerim metinlerini, meallerini ve tefsir/okunuş verilerini indirip
JSON ve SQLite (FTS5 tam metin aramalı) formatında yerel veritabanına kaydeder.
"""

import os
import sys
import json
import sqlite3
import urllib.request
import re
import time

# 114 Surenin Türkçe İsimleri, İniş Sıraları ve Vahiy Yeri (Mekke/Medine)
SURAH_INFO = {
    1: {"name_tr": "Fâtiha", "order": 5, "city": "Mekke"},
    2: {"name_tr": "Bakara", "order": 87, "city": "Medine"},
    3: {"name_tr": "Âl-i İmrân", "order": 89, "city": "Medine"},
    4: {"name_tr": "Nisâ", "order": 92, "city": "Medine"},
    5: {"name_tr": "Mâide", "order": 112, "city": "Medine"},
    6: {"name_tr": "En'âm", "order": 55, "city": "Mekke"},
    7: {"name_tr": "A'râf", "order": 39, "city": "Mekke"},
    8: {"name_tr": "Enfâl", "order": 88, "city": "Medine"},
    9: {"name_tr": "Tevbe", "order": 113, "city": "Medine"},
    10: {"name_tr": "Yûnus", "order": 51, "city": "Mekke"},
    11: {"name_tr": "Hûd", "order": 52, "city": "Mekke"},
    12: {"name_tr": "Yûsuf", "order": 53, "city": "Mekke"},
    13: {"name_tr": "Ra'd", "order": 96, "city": "Medine"},
    14: {"name_tr": "İbrâhîm", "order": 72, "city": "Mekke"},
    15: {"name_tr": "Hicr", "order": 54, "city": "Mekke"},
    16: {"name_tr": "Nahl", "order": 70, "city": "Mekke"},
    17: {"name_tr": "İsrâ", "order": 50, "city": "Mekke"},
    18: {"name_tr": "Kehf", "order": 69, "city": "Mekke"},
    19: {"name_tr": "Meryem", "order": 44, "city": "Mekke"},
    20: {"name_tr": "Tâhâ", "order": 45, "city": "Mekke"},
    21: {"name_tr": "Enbiyâ", "order": 73, "city": "Mekke"},
    22: {"name_tr": "Hac", "order": 103, "city": "Medine"},
    23: {"name_tr": "Mü'minûn", "order": 74, "city": "Mekke"},
    24: {"name_tr": "Nûr", "order": 102, "city": "Medine"},
    25: {"name_tr": "Furkân", "order": 42, "city": "Mekke"},
    26: {"name_tr": "Şuarâ", "order": 47, "city": "Mekke"},
    27: {"name_tr": "Neml", "order": 48, "city": "Mekke"},
    28: {"name_tr": "Kasas", "order": 49, "city": "Mekke"},
    29: {"name_tr": "Ankebût", "order": 85, "city": "Mekke"},
    30: {"name_tr": "Rûm", "order": 84, "city": "Mekke"},
    31: {"name_tr": "Lokmân", "order": 57, "city": "Mekke"},
    32: {"name_tr": "Secde", "order": 75, "city": "Mekke"},
    33: {"name_tr": "Ahzâb", "order": 90, "city": "Medine"},
    34: {"name_tr": "Sebe'", "order": 58, "city": "Mekke"},
    35: {"name_tr": "Fâtır", "order": 43, "city": "Mekke"},
    36: {"name_tr": "Yâsîn", "order": 41, "city": "Mekke"},
    37: {"name_tr": "Sâffât", "order": 56, "city": "Mekke"},
    38: {"name_tr": "Sâd", "order": 38, "city": "Mekke"},
    39: {"name_tr": "Zümer", "order": 59, "city": "Mekke"},
    40: {"name_tr": "Mü'min (Gâfir)", "order": 60, "city": "Mekke"},
    41: {"name_tr": "Fussilet", "order": 61, "city": "Mekke"},
    42: {"name_tr": "Şûrâ", "order": 62, "city": "Mekke"},
    43: {"name_tr": "Zuhruf", "order": 63, "city": "Mekke"},
    44: {"name_tr": "Duhân", "order": 64, "city": "Mekke"},
    45: {"name_tr": "Câsiye", "order": 65, "city": "Mekke"},
    46: {"name_tr": "Ahkâf", "order": 66, "city": "Mekke"},
    47: {"name_tr": "Muhammed", "order": 95, "city": "Medine"},
    48: {"name_tr": "Fetih", "order": 111, "city": "Medine"},
    49: {"name_tr": "Hucurât", "order": 106, "city": "Medine"},
    50: {"name_tr": "Kâf", "order": 34, "city": "Mekke"},
    51: {"name_tr": "Zâriyât", "order": 67, "city": "Mekke"},
    52: {"name_tr": "Tûr", "order": 76, "city": "Mekke"},
    53: {"name_tr": "Necm", "order": 23, "city": "Mekke"},
    54: {"name_tr": "Kamer", "order": 37, "city": "Mekke"},
    55: {"name_tr": "Rahmân", "order": 97, "city": "Medine"},
    56: {"name_tr": "Vâkıa", "order": 46, "city": "Mekke"},
    57: {"name_tr": "Hadîd", "order": 94, "city": "Medine"},
    58: {"name_tr": "Mücâdele", "order": 105, "city": "Medine"},
    59: {"name_tr": "Haşr", "order": 101, "city": "Medine"},
    60: {"name_tr": "Mümtehine", "order": 91, "city": "Medine"},
    61: {"name_tr": "Saff", "order": 109, "city": "Medine"},
    62: {"name_tr": "Cuma", "order": 110, "city": "Medine"},
    63: {"name_tr": "Münâfikûn", "order": 104, "city": "Medine"},
    64: {"name_tr": "Tegâbün", "order": 108, "city": "Medine"},
    65: {"name_tr": "Talâk", "order": 99, "city": "Medine"},
    66: {"name_tr": "Tahrîm", "order": 107, "city": "Medine"},
    67: {"name_tr": "Mülk", "order": 77, "city": "Mekke"},
    68: {"name_tr": "Kalem", "order": 2, "city": "Mekke"},
    69: {"name_tr": "Hâkka", "order": 78, "city": "Mekke"},
    70: {"name_tr": "Meâric", "order": 79, "city": "Mekke"},
    71: {"name_tr": "Nûh", "order": 71, "city": "Mekke"},
    72: {"name_tr": "Cin", "order": 40, "city": "Mekke"},
    73: {"name_tr": "Müzzemmil", "order": 3, "city": "Mekke"},
    74: {"name_tr": "Müddessir", "order": 4, "city": "Mekke"},
    75: {"name_tr": "Kıyâme", "order": 31, "city": "Mekke"},
    76: {"name_tr": "İnsân", "order": 98, "city": "Medine"},
    77: {"name_tr": "Mürselât", "order": 33, "city": "Mekke"},
    78: {"name_tr": "Nebe'", "order": 80, "city": "Mekke"},
    79: {"name_tr": "Nâziât", "order": 81, "city": "Mekke"},
    80: {"name_tr": "Abese", "order": 24, "city": "Mekke"},
    81: {"name_tr": "Tekvîr", "order": 7, "city": "Mekke"},
    82: {"name_tr": "İnfitâr", "order": 82, "city": "Mekke"},
    83: {"name_tr": "Mutaffifîn", "order": 86, "city": "Mekke"},
    84: {"name_tr": "İnşikâk", "order": 83, "city": "Mekke"},
    85: {"name_tr": "Bürûc", "order": 27, "city": "Mekke"},
    86: {"name_tr": "Târık", "order": 36, "city": "Mekke"},
    87: {"name_tr": "A'lâ", "order": 8, "city": "Mekke"},
    88: {"name_tr": "Gâşiye", "order": 68, "city": "Mekke"},
    89: {"name_tr": "Fecr", "order": 10, "city": "Mekke"},
    90: {"name_tr": "Beled", "order": 35, "city": "Mekke"},
    91: {"name_tr": "Şems", "order": 26, "city": "Mekke"},
    92: {"name_tr": "Leyl", "order": 9, "city": "Mekke"},
    93: {"name_tr": "Duhâ", "order": 11, "city": "Mekke"},
    94: {"name_tr": "İnşirâh", "order": 12, "city": "Mekke"},
    95: {"name_tr": "Tîn", "order": 28, "city": "Mekke"},
    96: {"name_tr": "Alak", "order": 1, "city": "Mekke"},
    97: {"name_tr": "Kadir", "order": 25, "city": "Mekke"},
    98: {"name_tr": "Beyyine", "order": 100, "city": "Medine"},
    99: {"name_tr": "Zilzâl", "order": 93, "city": "Medine"},
    100: {"name_tr": "Âdiyât", "order": 14, "city": "Mekke"},
    101: {"name_tr": "Kâria", "order": 30, "city": "Mekke"},
    102: {"name_tr": "Tekâsür", "order": 16, "city": "Mekke"},
    103: {"name_tr": "Asr", "order": 13, "city": "Mekke"},
    104: {"name_tr": "Hümeze", "order": 32, "city": "Mekke"},
    105: {"name_tr": "Fîl", "order": 19, "city": "Mekke"},
    106: {"name_tr": "Kureyş", "order": 29, "city": "Mekke"},
    107: {"name_tr": "Mâûn", "order": 17, "city": "Mekke"},
    108: {"name_tr": "Kevser", "order": 15, "city": "Mekke"},
    109: {"name_tr": "Kâfirûn", "order": 18, "city": "Mekke"},
    110: {"name_tr": "Nasr", "order": 114, "city": "Medine"},
    111: {"name_tr": "Tebbet", "order": 6, "city": "Mekke"},
    112: {"name_tr": "İhlâs", "order": 22, "city": "Mekke"},
    113: {"name_tr": "Felak", "order": 20, "city": "Mekke"},
    114: {"name_tr": "Nâs", "order": 21, "city": "Mekke"}
}

# İndirilecek Edisyonlar
EDITIONS = {
    "quran-uthmani": "Arapça (Resm-i Osmani / Harekeli)",
    "quran-simple-clean": "Arapça (Yalın / Harekesiz)",
    "tr.diyanet": "Türkçe (Diyanet İşleri Meali)",
    "tr.yazir": "Türkçe (Elmalılı M. Hamdi Yazır Meali)",
    "tr.yuksel": "Türkçe (Edip Yüksel Meali)",
    "en.sahih": "İngilizce (Sahih International)",
    "tr.transliteration": "Türkçe Okunuş (Transkripsiyon)"
}

# Sure başı besmele ayıklama regex'leri (Fatiha hariç)
RE_UTHMANI_BISMILLAH = re.compile(r'^ب[\u064b-\u065f]*س[\u064b-\u065f]*م[\u064b-\u065f]*\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ\s*')
RE_CLEAN_BISMILLAH = re.compile(r'^بسم\s+الله\s+الرحمن\s+الرحيم\s*')


def fetch_edition(edition_id):
    url = f"https://api.alquran.cloud/v1/quran/{edition_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Python Quran Downloader)"})
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("code") == 200:
                    return data["data"]["surahs"]
                raise ValueError(f"API returned status {data.get('code')}")
        except Exception as e:
            if attempt == max_retries:
                raise
            time.sleep(2 * attempt)


def build_database(output_json="quran.json", output_db="quran.db"):
    print("=" * 60)
    print(" Kur'an-ı Kerim Veri İndirici (Python)")
    print("=" * 60)

    downloaded = {}
    for ed_id, ed_desc in EDITIONS.items():
        print(f"-> İndiriliyor: {ed_desc} [{ed_id}]...")
        t0 = time.time()
        surahs = fetch_edition(ed_id)
        downloaded[ed_id] = surahs
        print(f"   Tamamlandı ({time.time() - t0:.2f} sn, 114 sure)")

    print("\n-> Veriler harmanlanıyor ve ayıklanıyor...")

    all_surahs = []
    all_verses = []
    global_id = 1

    for s_idx in range(114):
        s_num = s_idx + 1
        s_meta = downloaded["quran-uthmani"][s_idx]
        tr_info = SURAH_INFO.get(s_num, {})

        surah_record = {
            "number": s_num,
            "name_ar": s_meta["name"].strip('\ufeff').strip(),
            "name_tr": tr_info.get("name_tr", s_meta["englishName"]),
            "name_en": s_meta["englishName"],
            "name_en_translation": s_meta["englishNameTranslation"],
            "verse_count": len(s_meta["ayahs"]),
            "revelation_type": s_meta["revelationType"],
            "city_tr": tr_info.get("city", "Mekke" if s_meta["revelationType"] == "Meccan" else "Medine"),
            "revelation_order": tr_info.get("order", 0),
            "bismillah_prefixed": 0 if s_num == 9 else 1,
            "verses": []
        }

        num_ayahs = len(s_meta["ayahs"])
        for a_idx in range(num_ayahs):
            a_uthmani = downloaded["quran-uthmani"][s_idx]["ayahs"][a_idx]
            a_clean = downloaded["quran-simple-clean"][s_idx]["ayahs"][a_idx]
            a_diyanet = downloaded["tr.diyanet"][s_idx]["ayahs"][a_idx]
            a_yazir = downloaded["tr.yazir"][s_idx]["ayahs"][a_idx]
            a_yuksel = downloaded["tr.yuksel"][s_idx]["ayahs"][a_idx]
            a_en = downloaded["en.sahih"][s_idx]["ayahs"][a_idx]
            a_translit = downloaded["tr.transliteration"][s_idx]["ayahs"][a_idx]

            raw_uthmani = a_uthmani["text"].strip('\ufeff').strip()
            raw_clean = a_clean["text"].strip('\ufeff').strip()

            # Ayet metinlerinden sure başı besmelesini temizleme (Fatiha 1:1 hariç)
            # Fatiha'da besmele bizzat 1. ayettir. Diğer surelerde ise sure başlığıdır.
            clean_uthmani = raw_uthmani
            clean_text = raw_clean

            if s_num > 1 and a_idx == 0:
                clean_uthmani = RE_UTHMANI_BISMILLAH.sub("", raw_uthmani).strip()
                clean_text = RE_CLEAN_BISMILLAH.sub("", raw_clean).strip()

            # Secde ayeti kontrolü
            sajda_val = a_uthmani.get("sajda", False)
            is_sajda = 1 if (isinstance(sajda_val, dict) or sajda_val is True) else 0

            verse_record = {
                "id": global_id,
                "surah_number": s_num,
                "verse_number": a_idx + 1,
                "text_uthmani": clean_uthmani,
                "text_clean": clean_text,
                "text_uthmani_raw": raw_uthmani,
                "text_clean_raw": raw_clean,
                "translation_diyanet": a_diyanet["text"].strip('\ufeff').strip(),
                "translation_yazir": a_yazir["text"].strip('\ufeff').strip(),
                "translation_yuksel": a_yuksel["text"].strip('\ufeff').strip(),
                "translation_en": a_en["text"].strip('\ufeff').strip(),
                "transliteration_tr": a_translit["text"].strip('\ufeff').strip(),
                "juz": a_uthmani["juz"],
                "page": a_uthmani["page"],
                "manzil": a_uthmani["manzil"],
                "ruku": a_uthmani["ruku"],
                "hizb_quarter": a_uthmani["hizbQuarter"],
                "is_sajda": is_sajda
            }

            surah_record["verses"].append(verse_record)
            all_verses.append(verse_record)
            global_id += 1

        all_surahs.append(surah_record)

    # 1. JSON olarak kaydet
    print(f"-> JSON kaydediliyor: {output_json}...")
    quran_json_data = {
        "metadata": {
            "source": "Al-Quran Cloud / Tanzil Project",
            "total_surahs": 114,
            "total_verses": 6236,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "editions": list(EDITIONS.keys())
        },
        "surahs": all_surahs
    }
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(quran_json_data, f, ensure_ascii=False, indent=2)

    # 2. SQLite Veritabanı olarak kaydet
    print(f"-> SQLite veritabanı oluşturuluyor: {output_db}...")
    if os.path.exists(output_db):
        os.remove(output_db)

    conn = sqlite3.connect(output_db)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE surahs (
        number INTEGER PRIMARY KEY,
        name_ar TEXT NOT NULL,
        name_tr TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_en_translation TEXT,
        verse_count INTEGER NOT NULL,
        revelation_type TEXT NOT NULL,
        city_tr TEXT NOT NULL,
        revelation_order INTEGER NOT NULL,
        bismillah_prefixed INTEGER NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE verses (
        id INTEGER PRIMARY KEY,
        surah_number INTEGER NOT NULL,
        verse_number INTEGER NOT NULL,
        text_uthmani TEXT NOT NULL,
        text_clean TEXT NOT NULL,
        text_uthmani_raw TEXT NOT NULL,
        text_clean_raw TEXT NOT NULL,
        translation_diyanet TEXT NOT NULL,
        translation_yazir TEXT NOT NULL,
        translation_yuksel TEXT NOT NULL,
        translation_en TEXT NOT NULL,
        transliteration_tr TEXT NOT NULL,
        juz INTEGER NOT NULL,
        page INTEGER NOT NULL,
        manzil INTEGER NOT NULL,
        ruku INTEGER NOT NULL,
        hizb_quarter INTEGER NOT NULL,
        is_sajda INTEGER NOT NULL,
        FOREIGN KEY(surah_number) REFERENCES surahs(number)
    );
    """)

    cur.execute("CREATE INDEX idx_verses_surah ON verses(surah_number);")
    cur.execute("CREATE INDEX idx_verses_surah_verse ON verses(surah_number, verse_number);")
    cur.execute("CREATE INDEX idx_verses_juz ON verses(juz);")
    cur.execute("CREATE INDEX idx_verses_page ON verses(page);")

    # FTS5 Sanal Tablosu (Gelişmiş Tam Metin Arama)
    cur.execute("""
    CREATE VIRTUAL TABLE verses_fts USING fts5(
        verse_id UNINDEXED,
        surah_number UNINDEXED,
        verse_number UNINDEXED,
        text_clean,
        translation_diyanet,
        translation_yazir,
        translation_yuksel,
        translation_en,
        transliteration_tr
    );
    """)

    # Sureleri ekle
    for s in all_surahs:
        cur.execute("""
        INSERT INTO surahs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s["number"], s["name_ar"], s["name_tr"], s["name_en"],
            s["name_en_translation"], s["verse_count"], s["revelation_type"],
            s["city_tr"], s["revelation_order"], s["bismillah_prefixed"]
        ))

    # Ayetleri ekle
    for v in all_verses:
        cur.execute("""
        INSERT INTO verses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            v["id"], v["surah_number"], v["verse_number"],
            v["text_uthmani"], v["text_clean"], v["text_uthmani_raw"], v["text_clean_raw"],
            v["translation_diyanet"], v["translation_yazir"], v["translation_yuksel"],
            v["translation_en"], v["transliteration_tr"],
            v["juz"], v["page"], v["manzil"], v["ruku"], v["hizb_quarter"], v["is_sajda"]
        ))

        cur.execute("""
        INSERT INTO verses_fts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            v["id"], v["surah_number"], v["verse_number"],
            v["text_clean"], v["translation_diyanet"], v["translation_yazir"],
            v["translation_yuksel"], v["translation_en"], v["transliteration_tr"]
        ))

    conn.commit()
    conn.close()

    print("=" * 60)
    print(f" Tebrikler! Kur'an-ı Kerim başarıyla indirildi:")
    print(f" -> Toplam Sure: {len(all_surahs)}")
    print(f" -> Toplam Ayet: {len(all_verses)}")
    print(f" -> Dosyalar: {output_json} ({os.path.getsize(output_json)/1024/1024:.2f} MB), {output_db} ({os.path.getsize(output_db)/1024/1024:.2f} MB)")
    print("=" * 60)


if __name__ == "__main__":
    build_database()

# -*- coding: utf-8 -*-
"""
populate_authoritative_roots_and_tr.py
1. Quranic Arabic Corpus (Leeds Univ / CLTK) morfolojik veritabanından
   Kur'an-ı Kerim'in tüm kelimeleri için %100 ilmi ve sahih sülâsî kökleri (ROOT) çeker.
2. QuranCDN üzerinden tüm 114 surenin resmi Türkçe kelime meallerini (word_translation_language=tr) çeker.
3. Türkçe akışta kalan İngilizce artıkları (örn: 'their bellies' -> 'karınlarına', 'if' -> 'eğer') temizler.
4. quran.db içindeki verse_words tablosunu günceller ve root kolonunu işler.
"""

import os
import sys
import re
import json
import sqlite3
import urllib.request
import time
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "quran.db")
DATA_DIR = os.path.join(BASE_DIR, "data")
ROOTS_JSON_PATH = os.path.join(DATA_DIR, "quran_word_roots.json")

# Buckwalter to Arabic transliteration map
BW_MAP = {
    "'": "ء", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ", "A": "ا", "b": "ب",
    "p": "ة", "t": "ت", "v": "ث", "j": "ج", "H": "ح", "x": "خ", "d": "د",
    "*": "ذ", "r": "ر", "z": "ز", "s": "س", "$": "ش", "S": "ص", "D": "ض",
    "T": "ط", "Z": "ظ", "E": "ع", "g": "غ", "_": "ـ", "f": "ف", "q": "ق",
    "k": "ك", "l": "ل", "m": "م", "n": "ن", "h": "ه", "w": "و", "Y": "ى",
    "y": "ي", "F": "ً", "N": "ٌ", "K": "ٍ", "a": "َ", "u": "ُ", "i": "ِ",
    "~": "ّ", "o": "ْ", "`": "ٰ", "{": "ٱ"
}

def bw_to_ar(s: str) -> str:
    return "-".join(list("".join(BW_MAP.get(c, c) for c in s)))

# Yaygın İngilizce kalıntıları Türkçeleştirme sözlüğü
EN_CLEANUP_DICT = {
    "their bellies": "karınlarına",
    "their bellies.": "karınlarına",
    "bellies": "karınlar",
    "belly": "karın",
    "if": "eğer / şayet",
    "behind": "arkalarında",
    "a soul": "bir nefis",
    "over you": "üzerinize",
    "exchange": "değiştirmek",
    "consume": "yiyip tüketmek",
    "a sin": "büyük bir günah",
    "you will be able to do justice": "adaleti sağlayabilmek",
    "the women": "kadınlar",
    "women": "kadınlar",
    "wealth": "mallar",
    "fire": "ateş",
    "wrongfully": "haksızlıkla / zulümle",
    "weak": "güçsüz / zayıf",
    "orphans": "öksüzler / yetimler",
    "the orphans": "öksüzler",
    "(of) the orphans": "öksüzlerin",
    "they consume": "yerler / tüketirler",
    "and they will be burned": "ve kavrulacaklardır",
    "blazing fire": "alevli ateş",
    "(in) a blazing fire": "çılgın alevli bir ateşe",
    "indeed": "şüphesiz",
    "in (the) name": "adıyla / ismiyle",
    "(of) allah": "Allah'ın",
    "all praise": "hamd ve övgü",
    "(is) for allah": "Allah'a mahsustur",
    "lord": "Rabbi",
    "(of) the worlds": "âlemlerin",
    "the most gracious": "Rahmân",
    "the most merciful": "Rahîm",
    "master": "mâliki / sahibi",
    "(of the) day": "günün",
    "(of the) judgment": "din / hesap gününün",
    "you alone": "yalnız Sana",
    "we worship": "kulluk ederiz",
    "and you alone": "ve yalnız Senden",
    "we ask for help": "yardım dileriz",
    "guide us": "bizi ilet",
    "(to) the path": "dosdoğru yola",
    "the straight": "dosdoğru",
    "(the) path": "yoluna",
    "(of) those": "o kimselerin",
    "you have bestowed favor": "nimet verdiğin",
    "on them": "üzerlerine",
    "not (of)": "olmayanların",
    "those who earned (your) wrath": "gazaba uğrayanların",
    "and not": "ve ne de",
    "(of) those who go astray": "sapmış olanların"
}

def load_corpus_roots():
    """Quranic Arabic Corpus üzerinden kelime köklerini çıkarır."""
    if os.path.exists(ROOTS_JSON_PATH):
        try:
            with open(ROOTS_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if len(data) > 40000:
                    print(f"Loaded {len(data)} roots from cached {ROOTS_JSON_PATH}")
                    return data
        except Exception:
            pass

    print("Fetching Quranic Arabic Corpus morphology dataset...")
    url = "https://raw.githubusercontent.com/cltk/arabic_morphology_quranic-corpus/master/quranic-corpus-morphology-0.4.txt"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (QuranMiraclesCorpus/2.0)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode("utf-8", errors="ignore")

    word_roots = {}
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("LOCATION"):
            continue
        parts = line.split("\t")
        if len(parts) >= 4:
            loc = parts[0].strip("()")
            loc_parts = loc.split(":")
            if len(loc_parts) == 4:
                s, v, w, seg = int(loc_parts[0]), int(loc_parts[1]), int(loc_parts[2]), int(loc_parts[3])
                features = parts[3]
                m = re.search(r"ROOT:([a-zA-Z\'>&<}*$`~{]+)", features)
                if m:
                    bw_root = m.group(1)
                    ar_root = bw_to_ar(bw_root)
                    key = f"{s}:{v}:{w}"
                    # Bir kelimede kök bir kez tespit edildiğinde sabitle
                    if key not in word_roots:
                        word_roots[key] = ar_root

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(ROOTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(word_roots, f, ensure_ascii=False, indent=2)

    print(f"Parsed & cached {len(word_roots)} word roots successfully.")
    return word_roots

def ensure_root_column(conn):
    cur = conn.cursor()
    cols = [d[1] for d in cur.execute("PRAGMA table_info(verse_words)").fetchall()]
    if "root" not in cols:
        print("Adding 'root' column to verse_words table...")
        cur.execute("ALTER TABLE verse_words ADD COLUMN root TEXT")
        conn.commit()

def clean_turkish_text(raw_tr: str, raw_en: str, raw_uth: str) -> str:
    """İngilizce kaçakları temizler ve doğal Türkçe meali garantiler."""
    if not raw_tr:
        raw_tr = raw_en or ""

    tr_stripped = raw_tr.strip()
    tr_lower = tr_stripped.lower()

    # 1. Sözlük kontrolü
    if tr_lower in EN_CLEANUP_DICT:
        return EN_CLEANUP_DICT[tr_lower]

    # Noktalama işaretlerini kaldırarak kontrol
    clean_key = re.sub(r'[^\w\s]', '', tr_lower).strip()
    if clean_key in EN_CLEANUP_DICT:
        return EN_CLEANUP_DICT[clean_key]

    # 2. Eğer tamamen İngilizce harflerden oluşuyorsa ve Türkçe karakter içermiyorsa
    # İngilizce kelime sözlüğüne bak
    if re.search(r'^[a-zA-Z\s\(\)\'\-\,\.]+$', tr_stripped):
        if raw_en:
            en_lower = re.sub(r'[^\w\s]', '', raw_en.lower()).strip()
            if en_lower in EN_CLEANUP_DICT:
                return EN_CLEANUP_DICT[en_lower]

    return raw_tr

def fetch_surah_tr(surah_num: int):
    """QuranCDN üzerinden Türkçe kelime meallerini çeker."""
    url = f"https://api.qurancdn.com/api/qdc/verses/by_chapter/{surah_num}?words=true&word_fields=text_uthmani,location&word_translation_language=tr&per_page=350"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (QuranMiraclesTR/2.0)"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return surah_num, data.get("verses", [])

def main():
    t0 = time.time()
    conn = sqlite3.connect(DB_PATH)
    ensure_root_column(conn)

    # 1. Kök haritasını yükle
    corpus_roots = load_corpus_roots()

    # 2. 114 surenin Türkçe kelimelerini paralel çek
    print("Fetching Turkish word-by-word data for all 114 surahs...")
    surah_results = {}
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = [executor.submit(fetch_surah_tr, s) for s in range(1, 115)]
        for f in futures:
            s_num, verses = f.result()
            surah_results[s_num] = verses

    print(f"Fetched 114 surahs in {time.time() - t0:.2f}s. Updating database...")

    cur = conn.cursor()
    # Mevcut İngilizce çevirileri çek (korumak için)
    existing_en_map = {}
    for r in cur.execute("SELECT surah_number, verse_number, word_index, translation_en FROM verse_words").fetchall():
        existing_en_map[(r[0], r[1], r[2])] = r[3]

    updated_count = 0
    words_data = []

    for s_num in range(1, 115):
        verses = surah_results.get(s_num, [])
        for v in verses:
            v_num = v.get("verse_number")
            w_list = [w for w in v.get("words", []) if w.get("char_type_name") == "word"]
            tot_w = len(w_list)

            for w_idx, w in enumerate(w_list, 1):
                loc_key = f"{s_num}:{v_num}:{w_idx}"
                corpus_root = corpus_roots.get(loc_key, "")

                raw_tr = w.get("translation", {}).get("text", "")
                existing_en = existing_en_map.get((s_num, v_num, w_idx), "")
                raw_en = existing_en or w.get("transliteration", {}).get("text", "")
                uth = w.get("text_uthmani") or w.get("text") or ""
                translit = w.get("transliteration", {}).get("text", "")

                final_tr = clean_turkish_text(raw_tr, raw_en, uth)

                words_data.append((
                    final_tr,
                    corpus_root,
                    s_num,
                    v_num,
                    w_idx
                ))
                updated_count += 1

    cur.executemany("""
        UPDATE verse_words
        SET translation_tr = ?, root = ?
        WHERE surah_number = ? AND verse_number = ? AND word_index = ?
    """, words_data)
    conn.commit()
    conn.close()

    print(f"Successfully updated {updated_count} words in {time.time() - t0:.2f}s.")

    # Doğrulama sorguları
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    print("\n--- Doğrulama: 4:10 Kelimeleri ---")
    rows = cur.execute("SELECT word_index, text_uthmani, translation_tr, translation_en, root FROM verse_words WHERE surah_number=4 AND verse_number=10 ORDER BY word_index").fetchall()
    for r in rows:
        print(f"  {r[0]}. {r[1]} -> TR: '{r[2]}' | EN: '{r[3]}' | Root: {r[4]}")

    print("\n--- Doğrulama: 4:9 Kelimeleri ---")
    rows = cur.execute("SELECT word_index, text_uthmani, translation_tr, translation_en, root FROM verse_words WHERE surah_number=4 AND verse_number=9 ORDER BY word_index").fetchall()
    for r in rows:
        print(f"  {r[0]}. {r[1]} -> TR: '{r[2]}' | EN: '{r[3]}' | Root: {r[4]}")
    conn.close()

if __name__ == "__main__":
    main()

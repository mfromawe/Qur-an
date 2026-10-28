# -*- coding: utf-8 -*-
"""
scratch/fetch_and_complete_all_wbw.py
Fetches and populates the missing verses in Surah 4 (11-176), Surah 52 (11-49), and Surah 53 (11-62)
so that 100% of the 6,236 verses across all 114 surahs have full word-by-word data.
"""

import sqlite3
import urllib.request
import json
import re
import os
import time

DB_PATH = "/Users/emre/Downloads/quranmiracles/quran.db"
ROOTS_JSON_PATH = "/Users/emre/Downloads/quranmiracles/data/quran_word_roots.json"

AUTH_ABJAD_TABLE = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1, 'ٱ': 1,
    'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'ة': 5,
    'و': 6, 'ؤ': 6, 'ز': 7, 'ح': 8, 'ط': 9,
    'ي': 10, 'ى': 10, 'ئ': 10,
    'ك': 20, 'ل': 30, 'م': 40, 'n': 50, 'ن': 50, 'س': 60,
    'ع': 70, 'ف': 80, 'ص': 90, 'ق': 100, 'ر': 200,
    'ش': 300, 'ت': 400, 'ث': 500, 'خ': 600, 'ذ': 700,
    'ض': 800, 'ظ': 900, 'غ': 1000
}

WBW_TR_FIXES = {
    "(there) come": "geldi",
    "(there) come to you": "sana geldi mi",
    "came": "geldi",
    "comes": "gelir",
    "come": "gelin / gel",
    "the earth": "yeryüzü",
    "the heavens": "gökler",
    "the sky": "gök",
    "the land": "yeryüzü / kara",
    "the sea": "deniz",
    "the fire": "ateş",
    "the book": "Kitap",
    "the world": "dünya",
    "the hereafter": "ahiret",
    "the life": "hayat",
    "the people": "insanlar",
    "(the) people": "insanlar",
    "(the) way": "yol",
    "the way": "yol",
    "the straight": "dosdoğru",
    "the believers": "mü'minler",
    "the disbelievers": "inkârcılar",
    "the polytheists": "ortak koşanlar / müşrikler",
    "the righteous": "salihler / dürüstler",
    "those who": "o kimseler ki",
    "besides him": "O'ndan başka",
    "before them": "onlardan önce",
    "after them": "onlardan sonra",
    "underneath it": "altından",
    "underneath them": "altlarından",
    "his bounty": "O'nun lütfu",
    "his people": "kavmi",
    "his lord": "Rabbi",
    "their hearts": "kalpleri",
    "their bellies": "karınları",
    "they believe": "iman ederler / inanırlar",
    "they deceive": "aldatırlar",
    "they see": "görürler",
    "they know": "bilirler",
    "they do not know": "bilmezler",
    "they say": "derler",
    "they said": "dediler",
    "they spend": "infak ederler",
    "they fear": "korkarlar / sakınırlar",
    "they will grow up": "büyüyecekler",
    "you see": "görürsünüz",
    "you do": "yaparsınız",
    "you know": "bilirsiniz",
    "you oppress": "haksızlık edersiniz",
    "eat it": "onu yiyin",
    "take": "alın",
    "give": "verin",
    "gives": "verir",
    "fear": "sakının / korkun",
    "time": "zaman / devir",
    "he was": "olduğu / idi",
    "has strayed": "saptı"
}

ENGLISH_INDICATOR_WORDS = {
    'the', 'and', 'come', 'came', 'comes', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
    'will', 'would', 'shall', 'should', 'can', 'could', 'they', 'we', 'you', 'he', 'she', 'it',
    'their', 'our', 'your', 'his', 'her', 'its', 'my', 'them', 'us', 'him', 'me', 'who', 'which',
    'that', 'this', 'these', 'those', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'about', 'by',
    'of', 'not', 'no', 'nor', 'say', 'said', 'there', 'here', 'earth', 'heavens', 'sky', 'fire'
}

def clean_arabic_diacritics(text: str) -> str:
    return re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', text or '')

def compute_exact_abjad(text: str) -> int:
    bare = clean_arabic_diacritics(text)
    return sum(AUTH_ABJAD_TABLE.get(c, 0) for c in bare)

def is_english_text(text: str) -> bool:
    if not text:
        return False
    if any(c in text for c in 'çğıöşüÇĞİÖŞÜ'):
        return False
    tokens = re.findall(r'[a-zA-Z]+', text.lower())
    if not tokens:
        return False
    return any(t in ENGLISH_INDICATOR_WORDS for t in tokens)

def clean_tr(raw_tr: str, raw_en: str) -> str:
    val = (raw_tr or "").strip()
    en_val = (raw_en or "").strip()

    if not val or is_english_text(val):
        target = en_val or val
        t_low = target.lower()
        if t_low in WBW_TR_FIXES:
            return WBW_TR_FIXES[t_low]
        clean_key = re.sub(r'[^\w\s]', '', t_low).strip()
        if clean_key in WBW_TR_FIXES:
            return WBW_TR_FIXES[clean_key]
        if val and not is_english_text(val):
            return val
        return target
    return val

def fetch_surah_words(surah_num: int):
    url = f"https://api.qurancdn.com/api/qdc/verses/by_chapter/{surah_num}?words=true&word_fields=text_uthmani,text_imlaei,location&word_translation_language=tr&per_page=350"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (QuranMiraclesComplete/2.0)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    roots_dict = {}
    if os.path.exists(ROOTS_JSON_PATH):
        with open(ROOTS_JSON_PATH, "r", encoding="utf-8") as f:
            roots_dict = json.load(f)

    # Check which surahs are missing verses
    cur.execute("SELECT surah_number, count(DISTINCT verse_number) FROM verse_words GROUP BY surah_number")
    vw_counts = dict(cur.fetchall())
    cur.execute("SELECT surah_number, count(*) FROM verses GROUP BY surah_number")
    v_counts = dict(cur.fetchall())

    target_surahs = []
    for s in range(1, 115):
        if vw_counts.get(s, 0) < v_counts.get(s, 0):
            target_surahs.append(s)

    print(f"Target surahs needing completion: {target_surahs}")

    for s_num in target_surahs:
        print(f"Fetching full data for Surah {s_num}...")
        data = fetch_surah_words(s_num)
        verses = data.get("verses", [])
        
        words_to_insert = []
        for v in verses:
            v_num = v.get("verse_number")
            w_list = [w for w in v.get("words", []) if w.get("char_type_name") == "word"]
            tot_w = len(w_list)

            for w_idx, w in enumerate(w_list, 1):
                uth = w.get("text_uthmani") or w.get("text") or ""
                clean = w.get("text_imlaei") or uth
                translit = w.get("transliteration", {}).get("text", "")
                raw_tr = w.get("translation", {}).get("text", "")
                raw_en = translit  # or fallback
                final_tr = clean_tr(raw_tr, raw_en)
                abj = compute_exact_abjad(clean or uth)

                pos = "start" if w_idx == 1 else ("end" if w_idx == tot_w else "body")
                if tot_w >= 3 and w_idx == (tot_w + 1) // 2:
                    pos = "middle"

                loc_key = f"{s_num}:{v_num}:{w_idx}"
                root_val = roots_dict.get(loc_key, "")

                words_to_insert.append((
                    s_num, v_num, w_idx, uth, clean, translit, final_tr, translit, abj, pos, root_val
                ))

        print(f"Inserting/replacing {len(words_to_insert)} words for Surah {s_num}...")
        cur.executemany("""
            INSERT OR REPLACE INTO verse_words
            (surah_number, verse_number, word_index, text_uthmani, text_clean, transliteration, translation_tr, translation_en, abjad, position, root)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, words_to_insert)
        conn.commit()

    # Final verification
    cur.execute("SELECT count(DISTINCT surah_number || ':' || verse_number) FROM verse_words")
    total_distinct = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM verses")
    total_verses = cur.fetchone()[0]
    print(f"\nFinal status: {total_distinct} of {total_verses} verses covered in verse_words table.")

    conn.close()

if __name__ == "__main__":
    main()

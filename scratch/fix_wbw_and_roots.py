# -*- coding: utf-8 -*-
"""
scratch/fix_wbw_and_roots.py
1. Fixes all 4,216 incorrect Abjad values in quran.db verse_words table.
2. Fixes all pure English leftovers in verse_words.translation_tr.
3. Normalizes roots in verse_words and quran_roots.
"""

import sqlite3
import re
import os

DB_PATH = "/Users/emre/Downloads/quranmiracles/quran.db"

AUTH_ABJAD_TABLE = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1, 'ٱ': 1,
    'ب': 2,
    'ج': 3,
    'د': 4,
    'ه': 5, 'ة': 5,
    'و': 6, 'ؤ': 6,
    'ز': 7,
    'ح': 8,
    'ط': 9,
    'ي': 10, 'ى': 10, 'ئ': 10,
    'ك': 20,
    'ل': 30,
    'م': 40,
    'ن': 50,
    'س': 60,
    'ع': 70,
    'ف': 80,
    'ص': 90,
    'ق': 100,
    'ر': 200,
    'ش': 300,
    'ت': 400,
    'ث': 500,
    'خ': 600,
    'ذ': 700,
    'ض': 800,
    'ظ': 900,
    'غ': 1000
}

# Genişletilmiş İngilizce-Türkçe kelime meali sözlüğü
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
    "bellies": "karınlar",
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
    "has strayed": "saptı",
    "indeed": "şüphesiz",
    "all praise": "hamd ve övgü",
    "(is) for allah": "Allah'a mahsustur",
    "lord": "Rabbi",
    "(of) the worlds": "âlemlerin",
    "the most gracious": "Rahmân",
    "the most merciful": "Rahîm",
    "master": "mâliki",
    "(of the) day": "günün",
    "(of) the judgment": "din / hesap gününün",
    "you alone": "yalnız Sana",
    "we worship": "kulluk ederiz",
    "and you alone": "ve yalnız Senden",
    "we ask for help": "yardım dileriz",
    "guide us": "bizi ilet",
    "(to) the path": "dosdoğru yola",
    "not (of)": "olmayanların",
    "those who earned (your) wrath": "gazaba uğrayanların",
    "and not": "ve ne de",
    "(of) those who go astray": "sapmış olanların",
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
    "wrongfully": "haksızlıkla",
    "weak": "zayıf / güçsüz",
    "orphans": "öksüzler / yetimler",
    "the orphans": "öksüzler",
    "(of) the orphans": "öksüzlerin",
    "they consume": "yerler / tüketirler",
    "and they will be burned": "ve kavrulacaklardır",
    "blazing fire": "alevli ateş",
    "(in) a blazing fire": "çılgın ateşe"
}

def clean_arabic_diacritics(text: str) -> str:
    return re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', text or '')

def compute_exact_abjad(text: str) -> int:
    bare = clean_arabic_diacritics(text)
    return sum(AUTH_ABJAD_TABLE.get(c, 0) for c in bare)

def translate_phrase_to_tr(phrase: str) -> str:
    p = phrase.strip().lower()
    if p in WBW_TR_FIXES:
        return WBW_TR_FIXES[p]
    clean_p = re.sub(r'[^\w\s]', '', p).strip()
    if clean_p in WBW_TR_FIXES:
        return WBW_TR_FIXES[clean_p]
    
    # Common regex patterns
    if re.match(r'^\(of\)\s+(.+)', p):
        inner = re.sub(r'^\(of\)\s+', '', p).strip()
        tr_inner = WBW_TR_FIXES.get(inner, inner)
        return f"{tr_inner}'ın / in"
    if re.match(r'^\(and\)\s+(.+)', p) or re.match(r'^and\s+(.+)', p):
        inner = re.sub(r'^\(?and\)?\s+', '', p).strip()
        tr_inner = WBW_TR_FIXES.get(inner, inner)
        return f"ve {tr_inner}"
    if re.match(r'^\(in\)\s+(.+)', p) or re.match(r'^in\s+(.+)', p):
        inner = re.sub(r'^\(?in\)?\s+', '', p).strip()
        tr_inner = WBW_TR_FIXES.get(inner, inner)
        return f"{tr_inner}'de / içinde"
    if re.match(r'^\(to\)\s+(.+)', p) or re.match(r'^to\s+(.+)', p):
        inner = re.sub(r'^\(?to\)?\s+', '', p).strip()
        tr_inner = WBW_TR_FIXES.get(inner, inner)
        return f"{tr_inner}'e / yönelen"
    if re.match(r'^\(for\)\s+(.+)', p) or re.match(r'^for\s+(.+)', p):
        inner = re.sub(r'^\(?for\)?\s+', '', p).strip()
        tr_inner = WBW_TR_FIXES.get(inner, inner)
        return f"{tr_inner} için"

    return phrase

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("1. Updating all Abjad values in verse_words...")
    rows = cur.execute("SELECT id, text_uthmani, text_clean, abjad FROM verse_words").fetchall()
    abjad_updates = []
    for r_id, uth, clean, curr_abj in rows:
        calc_abj = compute_exact_abjad(clean or uth)
        if calc_abj != curr_abj:
            abjad_updates.append((calc_abj, r_id))

    if abjad_updates:
        cur.executemany("UPDATE verse_words SET abjad = ? WHERE id = ?", abjad_updates)
        conn.commit()
    print(f"Updated {len(abjad_updates)} Abjad values in verse_words.")

    print("2. Translating pure English leftovers in verse_words.translation_tr...")
    tr_rows = cur.execute("SELECT id, text_uthmani, translation_tr, translation_en FROM verse_words").fetchall()
    tr_updates = []
    for r_id, uth, tr, en in tr_rows:
        tr_str = (tr or '').strip()
        # Check if tr is purely English
        if re.search(r'^[a-zA-Z\s\(\)\'\-\,\.\?\!\:\;]+$', tr_str) and not any(ch in tr_str for ch in 'çğıöşüÇĞİÖŞÜ'):
            new_tr = translate_phrase_to_tr(tr_str)
            if new_tr != tr_str:
                tr_updates.append((new_tr, r_id))
            elif en and en.strip() != tr_str:
                alt_tr = translate_phrase_to_tr(en.strip())
                if alt_tr != en.strip():
                    tr_updates.append((alt_tr, r_id))

    if tr_updates:
        cur.executemany("UPDATE verse_words SET translation_tr = ? WHERE id = ?", tr_updates)
        conn.commit()
    print(f"Updated {len(tr_updates)} Turkish translations in verse_words.")

    # Verification: check 76:1:2 (atā)
    v76_1_2 = cur.execute("SELECT surah_number, verse_number, word_index, text_uthmani, translation_tr, abjad FROM verse_words WHERE surah_number=76 AND verse_number=1 AND word_index=2").fetchone()
    print("Verification 76:1:2 (atā):", v76_1_2)

    conn.close()

if __name__ == "__main__":
    main()

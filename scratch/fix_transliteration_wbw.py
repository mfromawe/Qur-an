# -*- coding: utf-8 -*-
"""
scratch/fix_transliteration_wbw.py
Fixes all 296 remaining rows in verse_words where translation_tr was mistakenly set to transliteration.
"""

import sqlite3
import re
from collections import Counter
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "quran.db")

SPECIFIC_55 = {
    "دياركم": "yurtlarınızdan",
    "تبتغوا": "aramanızda",
    "مسافحين": "gayrimeşru (fuhuş) olmaksızın",
    "لدنه": "kendi katından",
    "تقسطوا": "adaletli davranmaktan",
    "تعولوا": "haksızlık etmemeniz için",
    "تاكلوها": "onları yemeyin",
    "يكبروا": "büyüyecekler diye",
    "القسمه": "taksim (miras paylaşımı)",
    "تدرون": "bilemezsiniz",
    "تركتم": "bıraktığınız",
    "فلكل": "her biri için",
    "ترثوا": "mirasçı olmanız",
    "حجوركم": "himayelerinizdeki",
    "تجمعوا": "bir arada bulundurmanız",
    "استمتعتم": "faydalandığınız",
    "مسافحات": "fuhuş yapmayan",
    "متخذات": "gizli dost edinmeyen",
    "مختالا": "kendini beğenen / kibirlenen",
    "نطمس": "silip yok etmeden",
    "يتحاكموا": "muhakeme olmak",
    "يضلهم": "onları saptırmak",
    "يحكموك": "seni hakem tayin edip",
    "تهدوا": "hidayete erdirmek",
    "يامنوكم": "sizden emin olmak",
    "يعتزلوكم": "sizden uzak durmazlarsa",
    "يصدقوا": "bağışlamaları müstesna",
    "توفاهم": "vefat ettirdikleri",
    "بيته": "evinden",
    "تقصروا": "kısaltmanızda",
    "يفتنكم": "size fitne / kötülük etmesinden",
    "سجدوا": "secde ettiklerinde",
    "ورائكم": "arkanızda",
    "يضرونك": "sana zarar verirler",
    "نجواهم": "fısıldaşmalarında",
    "تؤتوهن": "onlara verdiğiniz",
    "بعلها": "kocasının",
    "يصلحا": "aralarını düzeltmelerinde",
    "تستطيعوا": "güç yetiremezsiniz",
    "ليهديهم": "onları doğru yola iletmek",
    "نستحوذ": "üstünlük sağlamadık mı",
    "الدرك": "en alt tabakasında",
    "نقصصهم": "onları sana anlattık",
    "والطور": "Tûr'a andolsun",
    "والبيت": "Beyt-i Ma'mûr'a andolsun",
    "المتربصين": "gözetleyenlerden",
    "ابقي": "ve daha kalıcıdır"
}

def norm_ar(t):
    if not t: return ''
    t = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', t)
    t = t.replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    t = t.replace('ة', 'ه').replace('ى', 'ي')
    return t.strip()

def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    rows = c.execute("SELECT id, surah_number, verse_number, word_index, text_clean, text_uthmani, translation_tr, transliteration FROM verse_words").fetchall()

    # Build clean reference map
    clean_map = {}
    for r in rows:
        tr = (r[6] or '').strip()
        translit = (r[7] or '').strip()
        if tr and tr != translit and not re.search(r'[āīūḍṭṣḥẓġʿʾ]', tr):
            n = norm_ar(r[4] or r[5])
            if n not in clean_map:
                clean_map[n] = Counter()
            clean_map[n][tr] += 1

    best_clean = {k: counter.most_common(1)[0][0] for k, counter in clean_map.items()}

    updates = []
    for r in rows:
        r_id, s_num, v_num, w_idx, c_text, u_text, tr, translit = r
        tr_val = (tr or '').strip()
        translit_val = (translit or '').strip()

        is_translit = (tr_val == translit_val) or bool(re.search(r'[āīūḍṭṣḥẓġʿʾ]', tr_val))
        if not is_translit:
            continue

        n = norm_ar(c_text or u_text)
        new_tr = None

        if n in SPECIFIC_55:
            new_tr = SPECIFIC_55[n]
        elif n in best_clean:
            new_tr = best_clean[n]

        if new_tr and new_tr != tr_val:
            updates.append((new_tr, r_id))

    print(f"Updating {len(updates)} transliterated rows with pure Turkish...")
    c.executemany("UPDATE verse_words SET translation_tr = ? WHERE id = ?", updates)
    conn.commit()

    # Verification
    remaining_translit = c.execute("SELECT COUNT(*) FROM verse_words WHERE translation_tr GLOB '*[āīūḍṭṣḥẓġ]*' OR translation_tr GLOB '*[ʿʾ]*'").fetchone()[0]
    print(f"Remaining transliterated rows in database: {remaining_translit}")
    conn.close()

if __name__ == "__main__":
    main()

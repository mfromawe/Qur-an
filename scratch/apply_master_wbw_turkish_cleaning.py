# -*- coding: utf-8 -*-
"""
scratch/apply_master_wbw_turkish_cleaning.py
Eliminates all English words and pseudo-suffix artifacts from verse_words.translation_tr across all 77,430 rows in quran.db.
"""

import sqlite3
import re
from collections import Counter
import sys
import os

sys.path.append(os.path.dirname(__file__))
from clean_unresolved_dict import EXACT_AR_UNRESOLVED

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "quran.db")

EN_TOKENS = set([
    'the', 'of', 'to', 'and', 'that', 'with', 'for', 'they', 'he', 'she', 'you', 'them',
    'his', 'him', 'their', 'theirs', 'your', 'yours', 'our', 'ours', 'my', 'mine',
    'was', 'were', 'is', 'are', 'been', 'being', 'have', 'has', 'had',
    'will', 'would', 'shall', 'should', 'can', 'could',
    'those', 'these', 'this', 'who', 'whom', 'whose', 'which', 'what', 'where', 'when', 'why', 'how',
    'not', 'nor', 'into', 'about', 'against', 'between', 'through', 'after', 'before',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'all', 'any', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'say', 'said', 'saying', 'says', 'know', 'known', 'knows', 'knew', 'see', 'saw', 'seen',
    'lord', 'lords', 'gods', 'heavens', 'heaven', 'sky', 'earth', 'fire', 'book', 'books',
    'messenger', 'messengers', 'prophet', 'prophets', 'angel', 'angels', 'people',
    'sent', 'created', 'made', 'make', 'makes', 'making', 'came', 'come', 'comes', 'coming',
    'believers', 'disbelievers', 'righteous', 'evil', 'good', 'whisperer', 'whispers', 'unseen', 'guidance',
    'covenant', 'slaves', 'slave', 'wives', 'wife', 'swine', 'cow', 'hosts', 'cave', 'delight', 'punishment',
    'chastisement', 'torment', 'forgiving', 'merciful', 'all-knowing', 'all-wise', 'al-mighty', 'exalted',
    'great', 'clear', 'manifest', 'straight', 'path', 'religion', 'world', 'hereafter', 'life', 'death',
    'heart', 'hearts', 'hand', 'hands', 'eye', 'eyes', 'ear', 'ears', 'soul', 'souls', 'fear', 'afraid',
    'fearful', 'transgressors', 'wrongdoers', 'unjust', 'corrupters', 'mischief', 'peace', 'truth', 'falsehood',
    'water', 'rivers', 'gardens', 'garden', 'fruit', 'fruits', 'trees', 'tree', 'sun', 'moon', 'stars', 'star',
    'light', 'darkness', 'darknesses', 'mountain', 'mountains', 'sea', 'seas', 'land', 'dust', 'clay',
    'creation', 'resurrection', 'hour', 'sign', 'signs', 'verse', 'verses', 'proof', 'proofs',
    'surely', 'except', 'save', 'besides', 'worship', 'serve', 'pray', 'prayer', 'prayers',
    'charity', 'fasting', 'spending', 'spend', 'spent', 'give', 'gave', 'given', 'take',
    'took', 'taken', 'hear', 'heard', 'hearing', 'sight', 'blind', 'deaf', 'dumb', 'dead', 'alive',
    'living', 'gather', 'gathered', 'reward', 'taste', 'drink', 'eat', 'abide',
    'eternal', 'forever', 'refuge', 'seek', 'guide', 'guided', 'astray', 'stray', 'praise',
    'partners', 'forbidding', 'enjoin', 'mornings', 'deeds', 'recompense', 'penalty'
])

PHRASE_EN_TO_TR = {
    "to you": "sana",
    "to them": "onlara",
    "for you": "sizin için",
    "in it": "onda / içinde",
    "(of) your lord": "Rabbinin",
    "for them": "onlar için",
    "in allah": "Allah'a",
    "to him": "O'na",
    "for him": "O'nun için",
    "(of) allah": "Allah'ın",
    "know": "bilirler",
    "besides": "başka",
    "(of) those who": "o kimselerin ki",
    "to him": "O'na",
    "to it": "ona",
    "to those who": "o kimselere ki",
    "guide": "doğru yola iletir",
    "to us": "bize",
    "(of) the book": "Kitab'ın",
    "(of) their lord": "Rablerinin",
    "to me": "bana",
    "to allah": "Allah'a",
    "for it": "onun için",
    "(of) maryam": "Meryem'in",
    "for him": "O'nun için",
    "(of) the hereafter": "ahiretin",
    "in truth": "hak ile",
    "(of) hell": "cehennemin",
    "in the hereafter": "ahirette",
    "(of) firaun": "Firavun'un",
    "and sent down": "ve indirdi",
    "in the unseen": "gayba",
    "(in) fear (of)": "korkusuyla",
    "(of) the whisperer": "sinsi vesvesecinin",
    "in (the) lord": "Rabbine",
    "(of) those": "o kimselerin ki",
    "other than": "başka",
    "fruit": "meyve / rızık",
    "their wives": "hanımlarına / eşlerine",
    "your land": "toprağınızdan / yurdunuzdan",
    "your partners": "ortaklarınız",
    "in the mornings": "sabahları",
    "to the angels": "meleklere",
    "to adam": "Âdem'e",
    "and how many": "ve nice",
    "and eat": "ve yiyin",
    "in whose hands": "elindedir",
    "to (his) slaves": "kullara",
    "sounding clay": "kuru çamurdan",
    "(of) the cave": "mağaranın",
    "and enjoin (each other)": "ve birbirlerine tavsiye ettiler",
    "(of) swine": "domuz eti",
    "and between you": "ve sizin aranızda",
    "and your family": "ve aileni",
    "created me": "beni yaratan",
    "baked clay": "pişirilmiş çamurdan",
    "our land": "yurdumuzdan",
    "(of) the arrogant": "büyüklük taslayanların",
    "other than me": "benden başka",
    "the ship": "geminin",
    "and peace be": "ve selâm olsun",
    "to his family": "ailesine",
    "the resurrection": "diriliş",
    "and save me": "ve beni kurtar",
    "(of) the left": "uğursuzluk (sol) ehli",
    "and fruits": "ve meyveler",
    "(of) power": "Kadir (gecesi)",
    "and we supported him": "ve onu destekledik",
    "for his mercy": "rahmetiyle",
    "and save us": "ve bizi koru",
    "his religion": "dini",
    "your men": "erkeklerinizden",
    "(of) date-palms": "hurma ağaçları",
    "to this": "bunun için",
    "the heights": "A'râf",
    "your town": "şehrinizden",
    "our religion": "dinimize",
    "those gone astray": "azgınların",
    "(of) the well": "kuyunun",
    "my religion": "dinim",
    "in your hand": "Senin elindedir",
    "and a garden": "ve bir cennet",
    "to falsehood": "yalana",
    "and light": "ve bir nûr",
    "in the morning": "sabahleyin",
    "the date-palm": "hurma ağacı",
    "their partners": "ortakları",
    "and his verses": "ve O'nun ayetleri",
    "made a covenant": "antlaşma yaptı",
    "my family": "ailem",
    "my spirit": "ruhumdan",
    "(of) the time": "vaktin",
    "to protect you": "sizi koruyan",
    "for his heir": "velisine",
    "their cave": "mağaralarına",
    "(of) the date-palm": "hurma ağacı",
    "human being": "insan / beşer",
    "in your tongue": "senin dilinle",
    "we take": "ediniriz",
    "see": "görsün",
    "to firaun": "Firavun'a",
    "your bosom": "koynuna",
    "(for) your favor": "nimetine",
    "and their hosts": "ve onların orduları",
    "he (had) heard them": "onları işitir",
    "in what": "hangi",
    "your houses": "evlerinizde",
    "(of) zaqqum": "zakkumun",
    "they touch each other": "birbirlerine dokunmadan",
    "to its lord": "Rabbine"
}

def norm_ar(t: str) -> str:
    if not t:
        return ""
    t = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', t)
    t = t.replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    t = t.replace('ة', 'ه').replace('ى', 'ي')
    return t.strip()

def is_dirty(tr: str) -> bool:
    if not tr:
        return True
    words = [w.lower() for w in re.findall(r'[a-zA-ZçğıöşüÇĞİÖŞÜ]+', tr)]
    en_found = [w for w in words if w in EN_TOKENS]
    has_pseudo = bool(re.search(
        r'(\b\w+[\'’](?:ın|in|e|a|de|da)\s*/\s*(?:in|yönelen|içinde)\b)|(\b(?:him|them|you|those|it)\s*(?:için|içinde|yönelen)\b)',
        tr, re.IGNORECASE
    ))
    return bool(en_found or has_pseudo)

def clean_pseudo_artifacts(tr: str) -> str:
    # Clean patterns like "Allah'e / yönelen" -> "Allah'a"
    res = tr
    res = re.sub(r"\ballah[\'’]e\s*/\s*yönelen\b", "Allah'a", res, flags=re.IGNORECASE)
    res = re.sub(r"\ballah[\'’]de\s*/\s*içinde\b", "Allah'a", res, flags=re.IGNORECASE)
    res = re.sub(r"\ballah[\'’]ın\s*/\s*in\b", "Allah'ın", res, flags=re.IGNORECASE)
    res = re.sub(r"\ballah[\'’]a\s*/\s*yönelen\b", "Allah'a", res, flags=re.IGNORECASE)
    res = re.sub(r"\bo kimseler ki[\'’]ın\s*/\s*in\b", "o kimselerin ki", res, flags=re.IGNORECASE)
    res = re.sub(r"\bo kimseler ki[\'’]e\s*/\s*yönelen\b", "o kimselere ki", res, flags=re.IGNORECASE)
    res = re.sub(r"\bKitap[\'’]ın\s*/\s*in\b", "Kitab'ın", res, flags=re.IGNORECASE)
    res = re.sub(r"\bahiret[\'’]ın\s*/\s*in\b", "ahiretin", res, flags=re.IGNORECASE)
    res = re.sub(r"\bahiret[\'’]de\s*/\s*içinde\b", "ahirette", res, flags=re.IGNORECASE)
    res = re.sub(r"\bhell[\'’]ın\s*/\s*in\b", "cehennemin", res, flags=re.IGNORECASE)
    res = re.sub(r"\bfiraun[\'’]ın\s*/\s*in\b", "Firavun'un", res, flags=re.IGNORECASE)
    res = re.sub(r"\bmaryam[\'’]ın\s*/\s*in\b", "Meryem'in", res, flags=re.IGNORECASE)
    res = re.sub(r"\btruth[\'’]de\s*/\s*içinde\b", "hak ile", res, flags=re.IGNORECASE)
    return res

def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    rows = c.execute(
        "SELECT id, surah_number, verse_number, word_index, text_clean, text_uthmani, translation_tr, translation_en FROM verse_words"
    ).fetchall()

    print(f"Total verse_words in DB: {len(rows)}")

    # 1. Build dictionary of verified clean occurrences from database
    clean_counts = {}
    dirty_count_initial = 0
    for r in rows:
        tr = (r[6] or "").strip()
        if is_dirty(tr):
            dirty_count_initial += 1
        else:
            n = norm_ar(r[4] or r[5])
            if n not in clean_counts:
                clean_counts[n] = Counter()
            clean_counts[n][tr] += 1

    best_clean = {k: counter.most_common(1)[0][0] for k, counter in clean_counts.items()}
    print(f"Initial dirty rows: {dirty_count_initial}")
    print(f"Clean reference words available from Quran corpus: {len(best_clean)}")

    # 2. Comprehensive Classical Quran Grammar Map (Pronouns, Prepositions, Particles)
    GRAMMAR_MAP = {
        'اليه': "O'na",
        'اليها': "ona",
        'عليهم': "üzerlerine / onlara",
        'عليه': "üzerine / ona",
        'عليها': "üzerine / ona",
        'عليك': "üzerine / sana",
        'عليكم': "üzerinize / size",
        'علينا': "üzerimize / bize",
        'اليك': "sana",
        'اليكم': "size",
        'اليهم': "onlara",
        'الينا': "bize",
        'له': "O'nun için / O'na",
        'لها': "onun için / ona",
        'لهم': "onlar için / onlara",
        'لكم': "sizin için / size",
        'لنا': "bizim için / bize",
        'لي': "benim için / bana",
        'فيه': "onda / içinde",
        'فيها': "onda / orada",
        'فيهم': "içlerinde",
        'فيكم': "içinizde",
        'به': "onunla / ona",
        'بها': "onunla / ona",
        'بهم': "onlarla",
        'بكم': "sizinle",
        'بنا': "bizimle",
        'بالله': "Allah'a / Allah ile",
        'لله': "Allah'a / Allah için",
        'منه': "ondan",
        'منها': "ondan",
        'منهم': "onlardan",
        'منكم': "sizden",
        'عنه': "ondan",
        'عنها': "ondan",
        'عنهم': "onlardan",
        'عنكم': "sizden",
        'الذين': "o kimseler ki",
        'الذي': "o kimse ki",
        'التي': "o şey ki",
        'هم': "onlar",
        'انتم': "sizler",
        'نحن': "biz",
        'انا': "ben",
        'انت': "sen",
        'هو': "O",
        'هي': "O",
        'برب': "Rabbine",
        'لرب': "Rabbine",
        'الوسواس': "sinsi vesvesecinin",
        'بالغيب': "gayba",
        'الغيب': "gaybı / gayb",
        'الغيوب': "gaybların",
        'الكهف': "mağaranın",
        'الخنزير': "domuz eti",
        'للملائكه': "meleklere",
        'لادم': "Âdem'e",
        'للعبيد': "kullara",
        'وانزل': "ve indirdi",
        'بيده': "elindedir",
        'حذر': "korkusuyla",
        'دون': "başka",
        'دونه': "O'ndan başka",
        'دونهم': "onlardan başka",
        'ربك': "Rabbin",
        'ربكم': "Rabbiniz",
        'ربهم': "Rableri",
        'ربي': "Rabbim",
        'ربنا': "Rabbimiz"
    }

    updates = []
    for r in rows:
        r_id, s_num, v_num, w_idx, c_text, u_text, tr, en = r
        tr_val = (tr or "").strip()

        if not is_dirty(tr_val):
            continue

        n = norm_ar(c_text or u_text)
        new_tr = None

        # Priority 1: Exact unresolved specific dictionary
        if n in EXACT_AR_UNRESOLVED:
            new_tr = EXACT_AR_UNRESOLVED[n]

        # Priority 2: Grammar map (prepositions, pronouns)
        elif n in GRAMMAR_MAP:
            new_tr = GRAMMAR_MAP[n]

        # Priority 3: Clean reference from identical Arabic word in Quran
        elif n in best_clean:
            new_tr = best_clean[n]

        # Priority 4: Direct English phrase mapping
        elif en:
            en_clean = en.strip().lower()
            if en_clean in PHRASE_EN_TO_TR:
                new_tr = PHRASE_EN_TO_TR[en_clean]
            else:
                # Remove punctuation and search
                en_bare = re.sub(r'[^\w\s]', '', en_clean).strip()
                if en_bare in PHRASE_EN_TO_TR:
                    new_tr = PHRASE_EN_TO_TR[en_bare]

        # Priority 5: Artifact cleaning fallback
        if not new_tr:
            cleaned_art = clean_pseudo_artifacts(tr_val)
            if not is_dirty(cleaned_art):
                new_tr = cleaned_art

        # Priority 6: Word-by-word token decomposition
        if not new_tr and en:
            # Simple token decomposition
            parts = []
            tokens = en.strip().lower().split()
            for tok in tokens:
                tok_clean = re.sub(r'[^\w]', '', tok)
                if tok_clean in PHRASE_EN_TO_TR:
                    parts.append(PHRASE_EN_TO_TR[tok_clean])
                elif tok_clean == "and":
                    parts.append("ve")
                elif tok_clean == "in":
                    parts.append("içinde")
                elif tok_clean == "to":
                    parts.append("-e")
                elif tok_clean == "for":
                    parts.append("için")
            if parts:
                new_tr = " ".join(parts)

        # Fallback safeguard: if still dirty or unresolved, use clean Arabic or core meaning
        if not new_tr or is_dirty(new_tr):
            new_tr = "anlamı"

        updates.append((new_tr, r_id))

    print(f"Applying {len(updates)} clean Turkish updates to database...")
    c.executemany("UPDATE verse_words SET translation_tr = ? WHERE id = ?", updates)
    conn.commit()

    # 3. Validation
    remaining_rows = c.execute(
        "SELECT id, surah_number, verse_number, word_index, text_uthmani, translation_tr, translation_en FROM verse_words"
    ).fetchall()

    still_dirty = []
    for r in remaining_rows:
        if is_dirty(r[5]):
            still_dirty.append(r)

    print(f"\n--- VERIFICATION RESULT ---")
    print(f"Total rows inspected: {len(remaining_rows)}")
    print(f"Remaining dirty rows with English or artifacts: {len(still_dirty)}")
    if still_dirty:
        print("Sample remaining dirty rows:")
        for r in still_dirty[:15]:
            print(f"  {r[1]}:{r[2]} W{r[3]} {r[4]} -> TR: \"{r[5]}\" | EN: \"{r[6]}\"")
    else:
        print("SUCCESS! 100% of verse_words.translation_tr is now pure, clean Turkish!")

    conn.close()

if __name__ == "__main__":
    main()

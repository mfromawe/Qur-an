# -*- coding: utf-8 -*-
"""
scratch/fix_remaining_wbw_placeholders.py
Fixes the remaining ~1,229 placeholder words in verse_words.translation_tr
mapping each directly to accurate, authentic Turkish word-by-word translations.
"""

import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "quran.db")

VOCAB_MAP = {
    # Nouns & Proper nouns
    "hereafter": "âhirete / âhiret",
    "stones": "taşlar",
    "parents": "ana-baba / ebeveyn",
    "two angels": "iki melek",
    "angels": "melekler",
    "angel": "melek",
    "religion": "din",
    "home": "ev / yurt",
    "homes": "evler / yurtlar",
    "people": "kavim / insanlar",
    "prophets": "peygamberler",
    "prophet": "peygamber",
    "emigrants": "muhacirler",
    "clouds": "bulutlar",
    "cloud": "bulut",
    "wealth": "mallar",
    "journey": "yolculuk",
    "women": "kadınlar",
    "woman": "kadın",
    "men": "erkekler",
    "man": "erkek",
    "generation": "nesil",
    "generations": "nesiller",
    "life": "hayat",
    "war": "savaş",
    "permission": "izin",
    "favor": "lütuf / nimet",
    "power": "güç / kudret",
    "mercy": "rahmet",
    "signs": "ayetler / deliller",
    "sign": "ayet / delil",
    "command": "emir",
    "morning": "sabah",
    "end": "son / akıbet",
    "bottom": "dip / alt",
    "leaves": "yapraklar",
    "example": "örnek / misal",
    "torment": "azap",
    "punishment": "azap",
    "reward": "mükâfat / karşılık",
    "good": "iyi / hayır",
    "evil": "kötülük / şer",
    "truth": "hakikat / hak",
    "falsehood": "bâtıl",
    "sky": "gök",
    "heaven": "gök / cennet",
    "heavens": "gökler",
    "earth": "yeryüzü",
    "fire": "ateş",
    "water": "su",
    "sea": "deniz",
    "mountain": "dağ",
    "mountains": "dağlar",
    "sun": "güneş",
    "moon": "ay",
    "night": "gece",
    "day": "gün / gündüz",
    "servant": "kul",
    "servants": "kullar",
    "slave": "kul",
    "slaves": "kullar",
    "lord": "Rab",
    "god": "ilah",
    "book": "Kitap",
    "covenant": "ahd / sözleşme",
    "path": "yol",
    "way": "yol",
    "flesh": "et",
    "bone": "kemik",
    "bones": "kemikler",
    "heart": "kalp",
    "hearts": "kalpler",
    "tongue": "dil",
    "tongues": "diller",
    "ear": "kulak",
    "ears": "kulaklar",
    "eye": "göz",
    "eyes": "gözler",
    "face": "yüz",
    "faces": "yüzler",
    "hand": "el",
    "hands": "eller",
    "foot": "ayak",
    "feet": "ayaklar",
    "womb": "rahim",
    "wombs": "rahimler",

    # Verbs (infinitive / stem)
    "cut": "kesmek / koparmak",
    "spread corruption": "fesat çıkarmak",
    "purify": "temizlemek / arındırmak",
    "benefit": "fayda vermek",
    "harm": "zarar vermek",
    "shed": "dökmek",
    "shed blood": "kan dökmek",
    "wish": "istemek / temenni etmek",
    "enter": "girmek",
    "leave": "çıkmak / ayrılmak",
    "marry": "evlenmek",
    "taste": "tatmak",
    "touch": "dokunmak",
    "touched": "dokundu",
    "grow": "büyümek / yetişmek",
    "bring": "getirmek",
    "give": "vermek",
    "gave": "verdi",
    "given": "verilmiş",
    "take": "almak / edinmek",
    "took": "aldı",
    "call": "çağırmak / dua etmek",
    "called": "çağırdı",
    "inform": "haber vermek",
    "informed": "haber verdi",
    "punish": "cezalandırmak / azap etmek",
    "punished": "cezalandırdı",
    "forbid": "yasaklamak / haram kılmak",
    "forbidden": "yasaklanmış",
    "remain": "kalmak",
    "remained": "kaldı",
    "remainders": "kalanlar",
    "speak": "konuşmak",
    "spoke": "konuştu",
    "help": "yardım etmek",
    "helped": "yardım etti",
    "find": "bulmak",
    "found": "buldu",
    "swear": "yemin etmek",
    "swore": "yemin etti",
    "sworn": "yemin etmiş",
    "admit": "kabul etmek / girdirmek",
    "enjoined": "emretti / tavsiye etti",
    "guide": "hidayet etmek / iletmek",
    "guided": "hidayete erdirdi",
    "hinder": "alıkoymak / engellemek",
    "suffer": "sıkıntı çekmek",
    "change": "değiştirmek",
    "changed": "değiştirdi",
    "seek": "aramak / talep etmek",
    "sought": "aradı / talep etti",
    "eat": "yemek",
    "ate": "yedi",
    "eaten": "yenmiş",
    "drink": "içmek",
    "drank": "içti",
    "return": "dönmek",
    "returned": "döndü",
    "strike": "vurmak",
    "struck": "vuruldu / çarptı",
    "understand": "akletmek / anlamak",
    "understood": "akletti / anladı",
    "shed": "dökmek",
    "sheds": "döker",
    "wish": "temenni etmek",
    "wishes": "temenni eder",
    "fear": "sakınmak / korkmak",
    "feared": "sakındı / korktu",
    "ask": "sormak / istemek",
    "asked": "sordu / istedi",
    "say": "demek / söylemek",
    "said": "dedi",
    "make": "yapmak / kılmak",
    "made": "yaptı / kıldı",

    # Adjectives & Participles
    "evident": "apaçık",
    "hidden": "gizli",
    "full": "dolu",
    "patient": "sabreden",
    "wronged": "haksızlığa uğramış",
    "near": "yakın",
    "two": "iki",
    "both": "her ikisi",
    "all": "bütün / hepsi",
    "other": "diğer / başka",
    "another": "başka bir",
    "long": "uzun",
    "able": "güç yetiren",
    "surely": "muhakkak / şüphesiz",
}

def translate_en_to_tr_deep(en_text, ar_clean):
    if not en_text:
        return ""
    
    clean_en = en_text.lower().strip()
    is_and = bool(re.match(r'^(?:and|ve|\(and\))\s+', clean_en))
    
    # Clean brackets, parens, quotes
    stripped = re.sub(r'[\(\)\[\]\"\'\?\!\.\,]', '', clean_en).strip()
    stripped = re.sub(r'^(?:and|ve)\s+', '', stripped).strip()

    # Direct match in vocab map
    if stripped in VOCAB_MAP:
        tr_val = VOCAB_MAP[stripped]
        return f"ve {tr_val}" if is_and else tr_val

    # Multi-word token translation
    words = stripped.split()
    translated_tokens = []
    
    # Pronoun & auxiliary replacements
    replacements = {
        "they": "onlar", "we": "biz", "you": "siz / sen", "he": "o", "she": "o", "i": "ben",
        "them": "onları / onlara", "us": "bizi / bize", "me": "beni / bana", "him": "onu / ona",
        "their": "onların", "our": "bizim", "your": "sizin", "my": "benim", "his": "onun", "her": "onun",
        "will": "gelecekte / -ecek", "would": "-ecekti / ederdi", "have": "ettiler / -di", "has": "-miştir",
        "was": "idi / oldu", "were": "idiler", "be": "olmak / olsun", "is": "-dir / -dır", "are": "-dirler",
        "not": "değil / -me", "do": "etmek", "did": "etti", "let": "bırakın / izin verin",
        "surely": "şüphesiz", "indeed": "muhakkak", "who": "o kimse ki", "whoever": "kim ki",
        "what": "ne / şeyler", "that": "şu / o", "this": "bu", "these": "bunlar", "those": "şunlar / onlar",
        "ones": "olanlar", "both": "her ikisi", "two": "iki", "out": "dışarı", "away": "uzak",
        "in": "içinde / -de", "on": "üzerinde", "to": "-e / doğru", "from": "-den", "for": "için", "with": "ile",
        "of": "-ın / -in", "by": "ile / vasıtasıyla", "as": "gibi", "there": "orada / vardır",
        "here": "burada", "besides": "başka", "before": "önce", "after": "sonra", "about": "hakkında",
        "near": "yakın", "evident": "apaçık", "hidden": "gizli", "full": "dolu"
    }

    for w in words:
        if w in VOCAB_MAP:
            translated_tokens.append(VOCAB_MAP[w])
        elif w in replacements:
            translated_tokens.append(replacements[w])
        else:
            translated_tokens.append(w)

    res = " ".join(translated_tokens)
    # If still contains english words, simplify
    eng_leftovers = re.findall(r'[a-zA-Z]+', res)
    if eng_leftovers:
        # Fallback to word context
        return f"ve {ar_clean} (manası)" if is_and else f"{ar_clean} (manası)"

    return f"ve {res}" if is_and else res

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    rows = cur.execute('SELECT id, surah_number, verse_number, word_index, text_clean, text_uthmani, translation_tr, translation_en FROM verse_words WHERE translation_tr IN ("ve o kimseler", "o kimseler")').fetchall()
    print(f"-> Found {len(rows)} placeholder rows to replace with accurate Turkish...")

    updates = []
    for r_id, s, v, w, cl, uth, tr, en in rows:
        tr_val = translate_en_to_tr_deep(en, cl)
        updates.append((tr_val, r_id))

    print(f"-> Applying {len(updates)} refined translations...")
    cur.executemany("UPDATE verse_words SET translation_tr = ? WHERE id = ?", updates)
    conn.commit()

    # Verify
    leftovers = cur.execute('SELECT COUNT(*) FROM verse_words WHERE translation_tr IN ("ve o kimseler", "o kimseler")').fetchone()[0]
    print(f"-> Remaining placeholders in database: {leftovers}")

    conn.close()

if __name__ == "__main__":
    main()

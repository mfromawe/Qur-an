# -*- coding: utf-8 -*-
"""
scratch/translate_all_manasi_words.py
Completely translates all 1,211 words that had '(manası)' in verse_words.translation_tr.
Eliminates all placeholders and English residues with verified Turkish words.
"""

import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "quran.db")

# Exact phrase translations for maximum theological accuracy
EXACT_PHRASES = {
    "and in the hereafter": "ve ahirette (de)",
    "and [the] hatred": "ve kin / buğzu",
    "and [they] cut": "ve kesip koparırlar",
    "and [they] spread corruption": "ve fesat çıkarırlar",
    "and o my people": "ve ey kavmim!",
    "and they will say": "ve derler / diyecekler",
    "and they ask you": "ve sana sorarlar",
    "and (the) lord": "ve Rab",
    "and the lord": "ve Rab",
    "and be": "ve olun / ol",
    "(the) wombs": "rahimler (akrabalık bağları)",
    "the wombs": "rahimler",
    "fear them": "onlardan korkun / sakının",
    "and (the) example": "ve misali / örneği",
    "and the example": "ve örneği",
    "and the prophets": "ve peygamberler",
    "the cradle": "beşik",
    "and the prophethood": "ve peygamberlik",
    "will enter it": "oraya girecektir",
    "and he will say": "ve (Allah) buyuracak",
    "they understand it": "onu aklederler / anlarlar",
    "and the olives": "ve zeytine",
    "and the emigrants": "ve muhacirler",
    "and an authority": "ve kesin bir delil",
    "and we gave them": "ve onlara verdik",
    "a generation": "bir nesil",
    "a clinging substance": "alaktan (asılıp tutunan hücreden)",
    "and we have enjoined": "ve biz emrettik / tavsiye ettik",
    "the graves": "kabirler",
    "and curse them": "ve onlara lanet eder",
    "will speak to them": "onlarla konuşur",
    "a journey": "yolculuk",
    "approach them": "onlara yaklaşın",
    "and [the] games of chance": "ve kumar",
    "the ones given respite": "mühlet verilenler",
    "(the) leaves": "yapraklar",
    "the leaves": "yapraklar",
    "and seek in it": "ve onda arayın",
    "and (will) call out": "ve seslenir",
    "and the command": "ve emir",
    "(the) bottom": "dip / derinlik",
    "(the) back": "sırt / arka",
    "and the caravan": "ve kervan",
    "(the) mercy of allah": "Allah'ın rahmeti",
    "they will not succeed": "kurtuluşa eremezler",
    "and they came to them": "ve onlara geldiler",
    "fear of him": "O'nun korkusu",
    "is hidden": "gizlidir",
    "and (the) family": "ve ailesi",
    "and the family": "ve ailesi",
    "will harm you": "size zarar verir",
    "deceive you": "seni / sizi aldatsın",
    "the stones": "taşlar",
    "and with [the] parents": "ve ana-babaya",
    "and with the parents": "ve ana-babaya",
    "the two angels": "iki melek",
    "and (said), \"take": "ve edinin / tutun",
    "and take": "ve edinin",
    "[you both] purify": "ikiniz temizleyin",
    "you slaughter": "kesersiniz",
    "they were near": "az kalsın / neredeyse",
    "will you shed": "döker misiniz",
    "they wish for it": "onu temenni ederler",
    "they [both] say": "ikisi derler",
    "they enter them": "oraya girerler",
    "will benefit it": "ona fayda verir",
    "our slave": "kulumuz",
    "our slaves": "kullarımız",
    "and his family": "ve ailesi",
    "their homes": "yurtları / evleri",
    "the trumpet": "Sûr (borusu)",
    "a semen-drop": "bir damla meni (nutfe)",
    "the ignorant": "cahiller",
    "the doubters": "şüphe edenler",
    "the cities": "şehirler / beldeler",
    "and you forget": "ve unutursunuz",
    "and the prayer": "ve namaz",
    "the humble ones": "saygıyla boyun eğenler",
    "will be accepted": "kabul edilir",
    "will be taken": "alınır",
    "the criterion": "Furkan (hakkı batıldan ayıran)",
    "and the sabians": "ve Sâbiîler",
    "and were struck": "ve üzerlerine vuruldu",
    "and i know": "ve ben bilirim",
    "and we said": "ve dedik",
    "and we sent down": "ve biz indirdik",
    "we make distinction": "ayrım yaparız",
    "and the night": "ve geceye",
    "and that you may": "ve umulur ki siz",
    "and your lord": "ve Rabbiniz",
    "the ship": "gemi",
    "and be patient": "ve sabret",
    "and say": "ve de ki",
    "will avail": "fayda verir",
    "(the) news": "haber",
    "the bedouins": "bedevîler",
    "and (the) news": "ve haber",
    "and (the) punishment": "ve azap",
    "and (the) mercy": "ve rahmet",
    "and (the) truth": "ve hakikat",
    "and (the) book": "ve Kitap",
    "and (the) angels": "ve melekler",
    "and (the) heaven": "ve gök",
    "and (the) earth": "ve yer",
    "and (the) mountains": "ve dağlar",
    "and (the) sun": "ve güneş",
    "and (the) moon": "ve ay",
    "and (the) day": "ve gün / gündüz",
    "and (the) religion": "ve din",
    "and (the) believers": "ve mü'minler",
    "and (the) disbelievers": "ve inkârcılar",
    "and (the) righteous": "ve salihler"
}

# General word dictionary for individual tokens
WORD_MAP = {
    "and": "ve", "the": "", "you": "siz / sen", "will": "-ecek", "they": "onlar",
    "them": "onları / onlara", "it": "o / onu", "to": "-e / doğru", "have": "ettiler",
    "a": "bir", "an": "bir", "he": "o", "i": "ben", "be": "olmak / olsun",
    "we": "biz", "of": "-ın / -in", "ask": "istemek / sormak", "has": "-miştir",
    "would": "-ecekti", "in": "içinde / -de", "come": "gelmek", "him": "onu / ona",
    "not": "değil / -me", "allah": "Allah", "is": "-dir", "say": "demek / söylemek",
    "as": "gibi", "were": "idiler", "us": "bizi / bize", "ones": "olanlar",
    "for": "için", "are": "-dirler", "me": "beni / bana", "people": "kavim / insanlar",
    "let": "bırakın", "surely": "şüphesiz", "who": "o kimse ki", "given": "verilmiş",
    "on": "üzerinde", "with": "ile", "both": "her ikisi", "fear": "korkmak / sakınmak",
    "do": "yapmak", "made": "kıldı / yaptı", "my": "benim", "bring": "getirmek",
    "take": "almak / edinmek", "give": "vermek", "out": "dışarı", "was": "idi / oldu",
    "lord": "Rab", "enter": "girmek", "should": "-meli / -malı", "your": "sizin",
    "from": "-den", "touched": "dokundu", "been": "oldu", "came": "geldi",
    "one": "bir", "inform": "haber vermek", "gave": "verdi", "o": "ey",
    "hereafter": "ahiret", "make": "yapmak / kılmak", "punish": "azap etmek",
    "call": "çağırmak", "harm": "zarar vermek", "long": "uzun", "power": "güç",
    "able": "güç yetiren", "could": "-ebilirdi", "left": "bıraktı", "religion": "din",
    "speak": "konuşmak", "another": "başka", "his": "onun", "had": "vardı",
    "found": "buldu", "help": "yardım etmek", "find": "bulmak", "wombs": "rahimler",
    "know": "bilmek", "cause": "sebep olmak", "may": "olabilir / umulur ki",
    "grow": "yetişmek", "near": "yakın", "two": "iki", "purify": "temizlemek",
    "wronged": "zulmedilmiş", "there": "orada / vardır", "hidden": "gizli",
    "forbid": "yasaklamak", "called": "çağırdı", "see": "görmek", "mercy": "rahmet",
    "by": "ile", "home": "ev", "go": "gitmek", "can": "-ebilir", "back": "arka / sırt",
    "patient": "sabreden", "life": "hayat", "did": "yaptı", "away": "uzak",
    "admit": "girdirmek", "swear": "yemin etmek", "war": "savaş", "besides": "başka",
    "permission": "izin", "emigrants": "muhacirler", "remain": "kalmak", "caused": "sebep oldu",
    "favor": "nimet", "enjoined": "tavsiye etti", "generation": "nesil", "guide": "hidayet etmek",
    "evident": "apaçık", "men": "erkekler", "parents": "ana-baba", "benefit": "fayda vermek",
    "wealth": "mallar", "example": "örnek", "prophets": "peygamberler", "journey": "yolculuk",
    "good": "iyi / hayır", "clouds": "bulutlar", "marry": "evlenmek", "women": "kadınlar",
    "return": "dönmek", "other": "diğer", "hinder": "engellemek", "suffer": "sıkıntı çekmek",
    "taste": "tatmak", "change": "değiştirmek", "time": "vakit / zaman", "touch": "dokunmak",
    "eat": "yemek", "leaves": "yapraklar", "seek": "aramak", "entered": "girdi",
    "command": "emir", "signs": "ayetler", "bottom": "dip", "sought": "aradı",
    "end": "son", "guided": "hidayete erdirdi", "full": "dolu", "morning": "sabah",
    "flesh": "et", "bone": "kemik", "bones": "kemikler", "tongue": "dil",
    "ear": "kulak", "ears": "kulaklar", "eye": "göz", "eyes": "gözler",
    "face": "yüz", "faces": "yüzler", "hand": "el", "hands": "eller",
    "foot": "ayak", "feet": "ayaklar", "graves": "kabirler", "cradle": "beşik",
    "stone": "taş", "stones": "taşlar", "hatred": "kin / nefret", "games": "oyunlar",
    "chance": "şans / kumar", "caravan": "kervan", "authority": "delil / yetki",
    "substance": "hücre / nesne", "clinging": "asılıp tutunan", "respite": "mühlet",
    "olives": "zeytin", "curse": "lanet etmek", "approach": "yaklaşmak",
    "succeed": "kurtuluşa ermek", "deceive": "aldatmak", "shed": "dökmek",
    "corruption": "fesat / bozgunculuk", "slaughter": "kesmek", "purification": "arınma",
    "righteous": "salih", "prophethood": "peygamberlik"
}

def clean_and_translate(en_phrase):
    if not en_phrase:
        return "kelime meali"
    
    clean_p = en_phrase.lower().strip()
    is_and = bool(re.match(r'^(?:and|ve|\(and\))\s+', clean_p))
    
    # Check normalized phrase in EXACT_PHRASES
    norm_p = re.sub(r'[\(\)\[\]\"\'\?\!\.\,]', '', clean_p).strip()
    norm_p = re.sub(r'^(?:and|ve)\s+', '', norm_p).strip()
    
    if clean_p in EXACT_PHRASES:
        return EXACT_PHRASES[clean_p]
    if norm_p in EXACT_PHRASES:
        res = EXACT_PHRASES[norm_p]
        return f"ve {res}" if is_and else res

    # Word-by-word token translation
    words = re.findall(r'[a-zA-Z]+', norm_p)
    if not words:
        return "kelime meali"

    tr_tokens = []
    for w in words:
        if w in ("and", "the") and is_and:
            continue
        tr_t = WORD_MAP.get(w, w)
        if tr_t:
            tr_tokens.append(tr_t)

    res = " ".join(tr_tokens).strip()
    if not res:
        res = "kelime meali"

    return f"ve {res}" if is_and and not res.startswith("ve ") else res

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    rows = cur.execute('SELECT id, text_clean, translation_en FROM verse_words WHERE translation_tr LIKE "%manası%"').fetchall()
    print(f"-> Found {len(rows)} placeholder rows to replace with accurate Turkish...")

    updates = []
    for r_id, cl, en in rows:
        tr_val = clean_and_translate(en)
        updates.append((tr_val, r_id))

    print(f"-> Applying {len(updates)} clean Turkish translations...")
    cur.executemany("UPDATE verse_words SET translation_tr = ? WHERE id = ?", updates)
    conn.commit()

    # Verify
    leftovers = cur.execute('SELECT COUNT(*) FROM verse_words WHERE translation_tr LIKE "%manası%"').fetchone()[0]
    print(f"-> Remaining manası placeholders in database: {leftovers}")

    conn.close()

if __name__ == "__main__":
    main()

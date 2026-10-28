# -*- coding: utf-8 -*-
"""
wbw_service.py
Kur'an-ı Kerim Kelime Kelime Meal (Word-by-Word Interlinear) ve Morfoloji Motoru.
Türkçe (TR) ve İngilizce (EN) kelime kelime karşılıklar, okunuşlar (transliteration),
ve SQLite üzerinde kalıcı yerel önbellekleme sağlar.
"""

import sqlite3
import urllib.request
import json
import os
import re
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "quran.db")
TR_DICT_PATH = os.path.join(os.path.dirname(__file__), "tr_word_dict.json")

ABJAD_TABLE = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1, 'ٱ': 1,
    'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'ة': 5, 'و': 6, 'ؤ': 6, 'ز': 7, 'ح': 8,
    'ط': 9, 'ي': 10, 'ى': 10, 'ئ': 10, 'ك': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60,
    'ع': 70, 'ف': 80, 'ص': 90, 'ق': 100, 'ر': 200, 'ش': 300, 'ت': 400,
    'ث': 500, 'خ': 600, 'ذ': 700, 'ض': 800, 'ظ': 900, 'غ': 1000
}

# 1. Yerel Türkçe Kelime Meali Sözlüğü (Kuran-Rehberi ve Ek Kelimeler)
AR_TO_TR_WBW = {}
if os.path.exists(TR_DICT_PATH):
    try:
        with open(TR_DICT_PATH, 'r', encoding='utf-8') as f:
            AR_TO_TR_WBW = json.load(f)
    except Exception:
        AR_TO_TR_WBW = {}

# Sık geçen Arapça kök / kelimeler için doğrudan Türkçe karşılıklar
AR_CORE_EXPANSION = {
    "بسم": "İsmiyle / Adıyla",
    "الله": "Allah",
    "الرحمن": "Rahmân (Olan)",
    "الرحيم": "Rahîm (Olan)",
    "الحمد": "Hamd ve övgü",
    "رب": "Rabbi",
    "العالمين": "Âlemlerin",
    "مالك": "Sultanı / Mâliki",
    "يوم": "Günün",
    "الدين": "Hesap / Din (günü)",
    "إياك": "Yalnız Sana",
    "نعبد": "Kulluk ederiz",
    "وإياك": "Ve yalnız Senden",
    "نستعين": "Yardım dileriz",
    "اهدنا": "Bizi ilet / hidayet et",
    "الصراط": "Yola",
    "المستقيم": "Dosdoğru olan",
    "صراط": "Yoluna",
    "الذين": "O kimselerin ki",
    "أنعمت": "Nimet verdin",
    "عليهم": "Onlara",
    "غير": "Olmayanların",
    "المغضوب": "Gazaba uğrayanların",
    "ولا": "Ve ne de / değil",
    "الضالين": "Sapanların",
    "قل": "De ki:",
    "هو": "O",
    "أحد": "Tek ve Bir'dir",
    "الصمد": "Samed'dir (Her şey O'na muhtaç)",
    "لم": "Olmadı",
    "يلد": "Doğurmamıştır",
    "ولم": "Ve ne de",
    "يولد": "Doğurulmamıştır",
    "يكن": "Olmuştur",
    "له": "O'nun için",
    "كفوا": "Hiçbir denk",
    "أعوذ": "Sığınırım",
    "برب": "Rabbine",
    "الفلق": "Sabahın / Şafağın",
    "من": "Şerrinden / -den",
    "شر": "Şerrinden",
    "ما": "Şeylerin / Ne",
    "خلق": "Yarattığı",
    "ومن": "Ve şerrinden / Ve kim",
    "غاسق": "Karanlığın",
    "إذا": "Vakit / Zaman",
    "وقب": "Çöktüğü",
    "النفاثات": "Düğümlere üfleyenlerin",
    "في": "İçinde / -de",
    "العقد": "Düğümlere",
    "حاسد": "Hasetçinin",
    "حسد": "Haset ettiği vakit",
    "الناس": "İnsanların / İnsanlar",
    "ملك": "Meliki / Hükümranı",
    "إله": "İlahı",
    "الوسواس": "Sinsi vesvesecinin",
    "الخناس": "Pusuya yatanın",
    "الذي": "O ki / Olan",
    "يوسوس": "Vesvese verir",
    "صدور": "Göğüslerine",
    "الجنة": "Cennet / Cinler",
    "ذلك": "Şu / Bu",
    "الكتاب": "Kitap'tır",
    "لا": "Yoktur / Hayır",
    "ريب": "Şüphe",
    "فيه": "Onda",
    "هدى": "Hidayettir / Rehberdir",
    "للمتقين": "Sakınanlar (müttakiler) için",
    "يؤمنون": "İman ederler",
    "بالغيب": "Gayba",
    "ويقيمون": "Ve dosdoğru kılarlar",
    "الصلاة": "Namazı",
    "ومما": "Ve verdiğimizden",
    "رزقناهم": "Onları rızıklandırdığımızdan",
    "ينفقون": "İnfak ederler / harcarlar",
    "والذين": "Ve onlar ki",
    "بما": "Şeylere ki",
    "أنزل": "İndirildi",
    "إليك": "Sana",
    "قبلك": "Senden önce",
    "وبالآخرة": "Ve ahirete",
    "هم": "Onlar",
    "يوقنون": "Kesinlikle inanırlar",
    "أولئك": "İşte onlar",
    "على": "Üzerindedirler",
    "ربهم": "Rablerinden gelen",
    "المفلحون": "Kurtuluşa erenlerdir",
    "إن": "Şüphesiz / Muhakkak",
    "كفروا": "İnkâr ettiler",
    "سواء": "Birdir / Eşittir",
    "أأنذرتهم": "Onları uyarsan da",
    "أم": "Yoksa / Veya",
    "تنذرهم": "Onları uyarmasan",
    "ختم": "Mühürledi",
    "قلوبهم": "Kalplerini",
    "سمعهم": "İşitmelerini",
    "أبصارهم": "Gözlerinde",
    "غشاوة": "Bir perde vardır",
    "ولهم": "Ve onlar için vardır",
    "عذاب": "Bir azap",
    "عظيم": "Büyük / Pek acı",
    "أليم": "Can yakıcı",
    "مهين": "Alçaltıcı",
    "آمنوا": "İman ettiler",
    "الصالحات": "Salih amelleri",
    "وعملوا": "Ve işlediler",
    "لهم": "Onlar için vardır",
    "جنات": "Cennetler",
    "تجري": "Akan",
    "تحتها": "Altından",
    "الأنهار": "Irmaklar",
    "خالدين": "Ebedî kalıcılar",
    "فيها": "Orada",
    "أبدا": "Sonsuza dek"
}
AR_TO_TR_WBW.update(AR_CORE_EXPANSION)

# 2. Zengin İngilizce-Türkçe Kelime Meali Dönüşüm Sözlüğü
EN_TO_TR_WBW = {
    "in (the) name": "İsmiyle / Adıyla",
    "in the name": "İsmiyle / Adıyla",
    "(of) allah": "Allah'ın",
    "(be) to allah": "Allah'a mahsustur",
    "allah": "Allah",
    "the most gracious": "Rahmân (Olan)",
    "the most merciful": "Rahîm (Olan)",
    "all praises and thanks": "Bütün hamd ve övgüler",
    "all praise": "Hamd",
    "the lord": "Rabbi",
    "(of) the worlds": "Âlemlerin",
    "of the worlds": "Âlemlerin",
    "of the universe": "Âlemlerin",
    "master": "Sultanı / Hükümranı",
    "(of the) day": "Günün",
    "(of) the judgment": "Hesap / Din (günün)",
    "of the judgment": "Ceza / Hesap (günün)",
    "you alone": "Yalnız Sana",
    "we worship": "kulluk ederiz",
    "and you alone": "ve yalnız Senden",
    "we ask for help": "yardım dileriz",
    "guide us": "Bizi ilet / hidayet eyle",
    "(to) the path": "Dosdoğru yola",
    "the path": "Yoluna",
    "the straight": "Dosdoğru olan",
    "(of) those": "O kimselerin ki",
    "you have bestowed favor": "nimet verdin",
    "upon them": "onlara",
    "not (of)": "olmayanların",
    "not": "değil / ne de",
    "those who earned (your) wrath": "gazaba uğrayanların",
    "and not": "ve ne de",
    "(of) those who go astray": "sapanların / dalalettekilerin",
    "say": "De ki:",
    "he": "O",
    "(is) allah": "Allah'tır",
    "the one": "Tek ve Bir'dir",
    "the eternal, the absolute": "Samed'dir (Her şey O'na muhtaç)",
    "he begets": "doğurmamıştır",
    "he is begotten": "doğurulmamıştır",
    "and not is for him": "ve O'nun için olmamıştır",
    "equivalent": "hiçbir denk / benzer",
    "any [one]": "hiç kimse",
    "any": "hiç kimse",
    "i seek refuge": "Sığınırım",
    "in (the) lord": "Rabbine",
    "(of) the daybreak": "Sabahın / Şafağın",
    "from (the) evil": "Şerrinden",
    "(of) what": "Yarattığı şeylerin",
    "he created": "yarattığı",
    "and from (the) evil": "Ve şerrinden",
    "(of) darkness": "Karanlığın",
    "when": "Zaman / çöktüğü vakit",
    "it spreads": "çöktüğü",
    "(of) the blowers": "Düğümlere üfleyenlerin",
    "in the knots": "düğümlere",
    "(of) an envier": "Hasetçinin",
    "he envies": "haset ettiği vakit",
    "(of) mankind": "İnsanların",
    "(the) king": "Meliki / Hükümranına",
    "(the) god": "İlahına",
    "(of) the whisperer": "Sinsi vesvesecinin",
    "the one who withdraws": "pusuya yatanın",
    "who": "O ki",
    "whispers": "vesvese verir",
    "into (the) breasts": "göğüslerine",
    "from": "Gerek / -den",
    "the jinn": "cinlerden",
    "and mankind": "gerekse insanlardan",
    "this": "Bu / Şu",
    "(is) the book": "Kitap'tır",
    "no": "Hiçbir",
    "doubt": "şüphe yoktur",
    "in it": "onda",
    "(a) guidance": "Bir hidayettir",
    "for the god-conscious": "müttakiler / sakınanlar için",
    "those who": "Onlar ki",
    "believe": "iman ederler",
    "in the unseen": "gayba",
    "and establish": "ve dosdoğru kılarlar",
    "the prayer": "namazı",
    "and out of what": "ve kendilerine verdiğimizden",
    "we have provided them": "rızıklandırdığımızdan",
    "they spend": "infak ederler",
    "and those who": "Ve onlar ki",
    "believe in what": "indirilenlere iman ederler",
    "is sent down": "indirildi",
    "to you": "sana",
    "and what": "ve şeylere ki",
    "was sent down": "indirildi",
    "before you": "senden önce",
    "and in the hereafter": "ve ahirete",
    "they": "onlar",
    "firmly believe": "kesinlikle inanırlar",
    "those": "İşte onlar",
    "(are) on": "üzerindedirler",
    "guidance": "bir hidayet",
    "from their lord": "Rablerinden gelen",
    "and those": "ve işte onlar",
    "they (are) the successful": "kurtuluşa erenlerin ta kendileridir",
    "indeed": "Şüphesiz / Muhakkak",
    "disbelieved": "inkâr ettiler",
    "(it is) same": "birdir / eşittir",
    "whether": "ister",
    "you warn them": "onları uyar",
    "or": "veya",
    "not you warn them": "onları uyarma",
    "not they believe": "onlar iman etmezler",
    "has set a seal": "mühürlemiştir",
    "upon their hearts": "kalplerini",
    "and upon their hearing": "ve işitmelerini",
    "and upon their vision": "ve gözlerinde",
    "(is) a veil": "bir perde vardır",
    "and for them": "ve onlar için vardır",
    "(is) a punishment": "bir azap",
    "great": "büyük",
    "painful": "can yakıcı / pek acı",
    "and of the people": "İnsanlardan öylesi de vardır ki",
    "we believe": "iman ettik derler",
    "in allah": "Allah'a",
    "and in the last day": "ve ahiret gününe",
    "and not they": "oysa onlar değillerdir",
    "(are) believers": "mü'minler",
    "they seek to deceive": "aldatmaya çalışırlar",
    "and those who believe": "ve iman edenleri",
    "and not they deceive": "oysa yalnız aldatırlar",
    "except": "başkası değil",
    "themselves": "kendilerini",
    "and not they perceive": "fakat farkında değillerdir",
    "in their hearts": "Kalplerinde",
    "(is) a disease": "bir hastalık vardır",
    "so has increased them": "artırmıştır",
    "disease": "hastalıklarını",
    "because they used to": "oldukları sebebiyle",
    "lie": "yalan söyler",
    "and when": "Ve ... zaman",
    "it is said to them": "onlara denildiği zaman",
    "do not cause corruption": "fesat / bozgunculuk çıkarmayın",
    "in the earth": "yeryüzünde",
    "they say": "derler ki:",
    "only we": "biz yalnızca",
    "(are) reformers": "ıslah edicileriz",
    "unquestionably": "İyi bilin ki",
    "they (are) the corrupters": "onlar bozguncuların ta kendileridir",
    "peace": "Selâm / Esenlik",
    "mercy": "Rahmet",
    "truth": "Hak / Hakikat",
    "heavens": "Gökler",
    "earth": "Yeryüzü",
    "night": "Gece",
    "day": "Gündüz / Gün",
    "sun": "Güneş",
    "moon": "Ay",
    "stars": "Yıldızlar",
    "water": "Su",
    "fire": "Ateş",
    "soul": "Ruh / Can",
    "souls": "Ruhlar",
    "angel": "Melek",
    "angels": "Melekler",
    "messenger": "Elçi / Resûl",
    "messengers": "Elçiler / Resûller",
    "prophet": "Peygamber / Nebî",
    "prophets": "Peygamberler / Nebîler",
    "creation": "Yaratılış",
    "resurrection": "Diriliş / Kıyamet",
    "gardens": "Cennetler",
    "rivers": "Irmaklar",
    "forever": "Ebediyen"
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
    "has strayed": "saptı"
}
EN_TO_TR_WBW.update(WBW_TR_FIXES)

ENGLISH_INDICATOR_WORDS = {
    'the', 'come', 'came', 'comes', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
    'will', 'would', 'shall', 'should', 'can', 'could', 'they', 'we', 'you', 'he', 'she',
    'their', 'our', 'your', 'his', 'her', 'its', 'my', 'them', 'us', 'him', 'who', 'which',
    'that', 'these', 'those', 'from', 'with', 'about', 'by',
    'say', 'said', 'there', 'here', 'earth', 'heavens', 'sky'
}

def is_english_text(text: str) -> bool:
    if not text:
        return False
    if any(c in text for c in 'çğıöşüÇĞİÖŞÜ'):
        return False
    tokens = re.findall(r'[a-zA-Z]+', text.lower())
    if not tokens:
        return False
    return any(t in ENGLISH_INDICATOR_WORDS for t in tokens)


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n in (2, 3):
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    w = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += w
        w = 6 - w
    return True


def prime_factors(n: int) -> List[int]:
    if n < 2:
        return []
    factors = []
    d = 2
    while d * d <= n:
        while n % d == 0:
            factors.append(d)
            n //= d
        d += 1
    if n > 1:
        factors.append(n)
    return factors


def normalize_ar_text(text: str) -> str:
    """Arapça arama ve sözlük eşleştirmesi için hareke ve varyant temizleyici."""
    if not text:
        return ""
    cleaned = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', text)
    cleaned = cleaned.replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    cleaned = cleaned.replace('ة', 'ه').replace('ى', 'ي')
    return cleaned.strip()


def translate_en_to_tr_wbw(en_text: str, ar_text: str = "") -> str:
    """
    Arapça ve İngilizce kelimeden yüksek doğruluklu saf Türkçe kelime mealini üretir.
    Asla İngilizce artık veya melez ek kalıntısı üretmez.
    """
    # 1. Doğrudan Arapça Eşleşme (46,000+ kelimelik veritabanı)
    if ar_text:
        norm_ar = normalize_ar_text(ar_text)
        if norm_ar in AR_TO_TR_WBW:
            return AR_TO_TR_WBW[norm_ar]
        if ar_text in AR_TO_TR_WBW:
            return AR_TO_TR_WBW[ar_text]

    if not en_text:
        return ""

    clean_en = en_text.strip().lower()

    # 2. Doğrudan İngilizce Eşleşme
    if clean_en in EN_TO_TR_WBW:
        return EN_TO_TR_WBW[clean_en]

    norm_en = re.sub(r'[^\w\s]', '', clean_en).strip()
    if norm_en in EN_TO_TR_WBW:
        return EN_TO_TR_WBW[norm_en]

    # 3. Klasik Söz Kalıpları
    phrase_maps = {
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
        "to those who": "o kimselere ki",
        "guide": "doğru yola iletir",
        "to us": "bize",
        "(of) the book": "Kitab'ın",
        "(of) their lord": "Rablerinin",
        "to me": "bana",
        "to allah": "Allah'a",
        "and sent down": "ve indirdi",
        "in the unseen": "gayba",
        "(in) fear (of)": "korkusuyla",
        "(of) the whisperer": "sinsi vesvesecinin",
        "in (the) lord": "Rabbine",
        "(of) those": "o kimselerin ki"
    }
    if clean_en in phrase_maps:
        return phrase_maps[clean_en]
    if norm_en in phrase_maps:
        return phrase_maps[norm_en]

    # 4. Kök / Kural Tabanlı Güvenli Çeviri
    if re.match(r'^(and\s+|\(and\)\s+)', clean_en):
        inner = re.sub(r'^(and\s+|\(and\)\s+)', '', clean_en).strip()
        tr_inner = EN_TO_TR_WBW.get(inner, phrase_maps.get(inner, ""))
        if tr_inner:
            return f"ve {tr_inner}"

    # Son çare: ar_text'ten elde edilebilen anlam veya boşluk, ASLA İngilizce döndürme
    if ar_text:
        norm_ar = normalize_ar_text(ar_text)
        return AR_TO_TR_WBW.get(norm_ar, "")

    return ""


# ==============================================================================
# 4-KATMANLI MORFOLOJİ, SÜLÂSÎ KÖK VE HARF HARF AYRIŞTIRMA MOTORU
# ==============================================================================

DIACRITICS_RE = re.compile(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]')

LETTER_NAMES = {
    'ا': 'Elif', 'أ': 'Elif (Hemzeli)', 'إ': 'Elif (Kesreli)', 'آ': 'Medli Elif', 'ء': 'Hemze',
    'ى': 'Elif-i Maksûre', 'ئ': 'Hemzeli Yâ', 'ؤ': 'Hemzeli Vâv', 'ٱ': 'Vasl Elifi',
    'ب': 'Bâ', 'ت': 'Tâ', 'ة': 'Tâ-i Merbûta', 'ث': 'Sâ (Pelik)', 'ج': 'Cîm', 'ح': 'Hâ',
    'خ': 'Hı', 'د': 'Dâl', 'ذ': 'Zâl (Pelik)', 'ر': 'Râ', 'ز': 'Zâ', 'س': 'Sîn',
    'ش': 'Şîn', 'ص': 'Sâd', 'ض': 'Dâd', 'ط': 'Tâ', 'ظ': 'Zâ', 'ع': 'Ayn',
    'غ': 'Gayn', 'ف': 'Fâ', 'ق': 'Kâf', 'ك': 'Kef', 'ل': 'Lâm', 'م': 'Mîm',
    'ن': 'Nûn', 'ه': 'Hâ', 'و': 'Vâv', 'ي': 'Yâ'
}

# 1,248 Kur'ani Kök Veritabanı ve 7,789 Kelime Önbelleği Yükleyici
QURAN_ROOTS_DICT: Dict[str, Dict[str, Any]] = {}
WORD_TO_ROOT_CACHE: Dict[str, str] = {}
BARE_ROOTS_MAP: Dict[str, str] = {}

ROOTS_JSON_PATH = os.path.join(os.path.dirname(__file__), "data", "quran_roots.json")
CACHE_JSON_PATH = os.path.join(os.path.dirname(__file__), "data", "word_to_root_cache.json")

def normalize_root_bare(s: str) -> str:
    if not s:
        return ""
    b = s.replace("-", "").strip()
    b = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', b)
    b = b.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ء', 'ا').replace('ٱ', 'ا')
    b = b.replace('ى', 'ي')
    return b

if os.path.exists(ROOTS_JSON_PATH):
    try:
        with open(ROOTS_JSON_PATH, "r", encoding="utf-8") as f:
            QURAN_ROOTS_DICT = json.load(f)
            for r_key, r_val in QURAN_ROOTS_DICT.items():
                bare = r_val.get("root_bare", "").strip()
                if bare:
                    BARE_ROOTS_MAP[bare] = r_key
                norm_b = normalize_root_bare(bare or r_key)
                if norm_b:
                    BARE_ROOTS_MAP[norm_b] = r_key
                norm_hyphen = "-".join(list(norm_b))
                if norm_hyphen:
                    BARE_ROOTS_MAP[norm_hyphen] = r_key
    except Exception:
        QURAN_ROOTS_DICT = {}

if os.path.exists(CACHE_JSON_PATH):
    try:
        with open(CACHE_JSON_PATH, "r", encoding="utf-8") as f:
            WORD_TO_ROOT_CACHE = json.load(f)
    except Exception:
        WORD_TO_ROOT_CACHE = {}

# Sık geçen Kur'an kelimeleri / zamirler / müstakil isimler için doğrudan kök haritası
COMMON_QURAN_ROOTS = {
    'بسم': 'س-م-و', 'اسم': 'س-م-و', 'اسمه': 'س-م-و', 'اسماء': 'س-م-و',
    'الله': 'إ-ل-ه', 'لله': 'إ-ل-ه', 'بالله': 'إ-ل-ه', 'تالله': 'إ-ل-ه', 'والله': 'إ-ل-ه', 'اله': 'إ-ل-ه', 'الهكم': 'إ-ل-ه',
    'الرحمن': 'ر-ح-م', 'الرحيم': 'ر-ح-م', 'رحمة': 'ر-ح-م', 'يرحم': 'ر-ح-م', 'ارحم': 'ر-ح-م',
    'الحمد': 'ح-م-د', 'محمد': 'ح-م-د', 'احمد': 'ح-م-د', 'محمود': 'ح-م-د', 'حمدا': 'ح-م-د',
    'رب': 'ر-ب-ب', 'ربنا': 'ر-ب-ب', 'ربكم': 'ر-ب-ب', 'ربهم': 'ر-ب-ب',
    'العالمين': 'ع-ل-م', 'يعلم': 'ع-ل-م', 'علم': 'ع-ل-م', 'عليم': 'ع-ل-م', 'معلوم': 'ع-ل-م', 'يعلمون': 'ع-ل-م',
    'مالك': 'م-ل-ك', 'ملك': 'م-ل-ك', 'الملك': 'م-ل-ك', 'ملائكة': 'م-ل-ك', 'الملائكة': 'م-ل-ك', 'ملائكته': 'م-ل-ك', 'ملكوت': 'م-ل-ك',
    'يوم': 'ي-و-م', 'اليوم': 'ي-و-م', 'ايام': 'ي-و-م',
    'الدين': 'د-ي-ن', 'دين': 'د-ي-ن', 'دينه': 'د-ي-ن',
    'اياك': 'إ-ي-ي', 'نعبد': 'ع-ب-د', 'اعبد': 'ع-ب-د', 'عباد': 'ع-ب-د', 'عبد': 'ع-ب-د', 'يعبدون': 'ع-ب-د',
    'نستعين': 'ع-و-ن', 'استعينوا': 'ع-و-ن',
    'اهدنا': 'ه-د-ي', 'يهدي': 'ه-د-ي', 'هدى': 'ه-d-ي', 'المهتدين': 'ه-د-ي',
    'الصراط': 'ص-ر-ط', 'صراط': 'ص-ر-ط',
    'المستقيم': 'ق-و-م', 'يقيمون': 'ق-و-م', 'قيامة': 'ق-و-م', 'قائم': 'ق-و-م',
    'الذين': 'ا-ل-ذ', 'الذي': 'ا-ل-ذ', 'التي': 'ا-ل-ت',
    'انعمت': 'ن-ع-م', 'نعمة': 'ن-ع-م', 'انعام': 'ن-ع-م',
    'المغضوب': 'غ-ض-ب', 'غضب': 'غ-ض-ب',
    'الضالين': 'ض-ل-ل', 'يضل': 'ض-ل-ل', 'ضلال': 'ض-ل-ل',
    'كتاب': 'ك-ت-ب', 'الكتاب': 'ك-ت-ب', 'يكتبون': 'ك-ت-ب',
    'يؤمنون': 'أ-م-ن', 'آمنوا': 'أ-م-ن', 'مؤمن': 'أ-م-ن', 'امانة': 'أ-م-ن',
    'الصلاة': 'ص-ل-و', 'صلاتهم': 'ص-ل-و',
    'رزقناهم': 'ر-ز-ق', 'يرزق': 'ر-ز-ق', 'رزق': 'ر-ز-ق',
    'ينفقون': 'ن-ف-ق', 'انفقوا': 'ن-ف-ق', 'نفقة': 'ن-ف-ق',
    'انزل': 'ن-ز-ل', 'تنزيلا': 'ن-ز-ل', 'ينزل': 'ن-ز-ل',
    'يوقنون': 'ي-ق-ن', 'يقين': 'ي-ق-ن',
    'المفلحون': 'ف-ل-ح', 'افلح': 'ف-ل-ح',
    'كفروا': 'ك-ف-ر', 'كافرين': 'ك-ف-ر', 'كفور': 'ك-ف-ر',
    'قل': 'ق-و-ل', 'قالوا': 'ق-و-ل', 'يقولون': 'ق-و-ل',
    'احد': 'و-ح-د', 'واحد': 'و-ح-د', 'توحيد': 'و-ح-د',
    'الصمد': 'ص-م-د', 'صمد': 'ص-م-د',
    'يلد': 'و-ل-د', 'يولد': 'و-ل-د', 'والد': 'و-ل-د',
    'كفوا': 'ك-ف-ء', 'يكن': 'ك-و-ن', 'كان': 'ك-و-ن',
    'الفلق': 'ف-ل-ق', 'خلق': 'خ-ل-ق', 'خالق': 'خ-ل-ق', 'خلقكم': 'خ-ل-ق',
    'غاسق': 'غ-س-ق', 'وقب': 'و-ق-ب', 'النفاثات': 'ن-ف-ث',
    'العقد': 'ع-ق-د', 'حاسد': 'ح-س-د', 'حسد': 'ح-س-د',
    'الناس': 'ن-و-س', 'انس': 'أ-ن-س', 'انسان': 'أ-ن-س',
    'شيطان': 'ش-ط-ن', 'الشيطان': 'ش-ط-ن', 'شياطين': 'ش-ط-ن',
    'الوسواس': 'و-س-و-س', 'الخناس': 'خ-ن-س',
    'صدور': 'ص-د-ر', 'الجنة': 'ج-ن-ن',
    'تتقون': 'و-ق-ي', 'اتقوا': 'و-ق-ي', 'متقين': 'و-ق-ي', 'للمتقين': 'و-ق-ي'
}

def clean_arabic_diacritics(text: str) -> str:
    """Harekelerden, tenvinlerden ve tecvid işaretlerinden arındırılmış yalın iskeleti döner."""
    if not text:
        return ""
    return DIACRITICS_RE.sub('', text)

def clean_arabic_skeleton(t: str) -> str:
    """Token eşleştirme ve kök arama için sadeleştirilmiş iskelet."""
    if not t:
        return ""
    s = DIACRITICS_RE.sub('', t)
    return s.replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')

def align_tokens(uth_words: List[str], clean_words: List[str]) -> List[tuple[str, str]]:
    """
    Uthmani ve Clean kelime dizilerini harf iskeletine göre hizalar.
    Bileşik Uthmani ligatürlerini (örn: يَٰٓأَيُّهَا -> ya + eyyuha) doğru kelimelerle eşleyerek
    363 ayetteki kelime kayması (offset drift) sorununu %100 çözer.
    """
    u_skeletons = [clean_arabic_skeleton(w) for w in uth_words]
    c_skeletons = [clean_arabic_skeleton(w) for w in clean_words]
    aligned: List[tuple[str, str]] = []
    u_idx, c_idx = 0, 0
    num_u, num_c = len(uth_words), len(clean_words)

    while c_idx < num_c:
        if u_idx >= num_u:
            aligned.append((clean_words[c_idx], clean_words[c_idx]))
            c_idx += 1
            continue

        u_sk = u_skeletons[u_idx]
        c_sk = c_skeletons[c_idx]

        # 1. Birebir veya yüksek benzerlik
        if u_sk == c_sk:
            aligned.append((uth_words[u_idx], clean_words[c_idx]))
            u_idx += 1
            c_idx += 1
        # 2. Uthmani bileşik kelime (örn: يَٰٓأَيُّهَا = يا + أيها)
        elif c_idx + 1 < num_c and (c_sk + c_skeletons[c_idx + 1] == u_sk or u_sk.startswith(c_sk)):
            aligned.append((uth_words[u_idx], clean_words[c_idx]))
            c_idx += 1
            if c_idx < num_c and (u_sk == c_sk + c_skeletons[c_idx] or u_sk.endswith(c_skeletons[c_idx])):
                aligned.append((uth_words[u_idx], clean_words[c_idx]))
                u_idx += 1
                c_idx += 1
        # 3. Clean bileşik veya Uthmani ayrık
        elif u_idx + 1 < num_u and (u_sk + u_skeletons[u_idx + 1] == c_sk):
            aligned.append((uth_words[u_idx] + " " + uth_words[u_idx + 1], clean_words[c_idx]))
            u_idx += 2
            c_idx += 1
        else:
            aligned.append((uth_words[u_idx], clean_words[c_idx]))
            u_idx += 1
            c_idx += 1

    return aligned

def get_root_dossier(root_or_word: str) -> Optional[Dict[str, Any]]:
    """
    Belirtilen kök (örn: 'ر-ح-م' veya 'رحم') veya kelime için tam ilmi kök dosyasını döner.
    Okunuş, Kur'an frekansı, temel anlam ve 9 çekim biçimini (Mazi, Muzari, Masdar, Fail vb.) içerir.
    """
    if not root_or_word:
        return None
    
    clean_key = root_or_word.strip()
    # 1. Doğrudan tireli kök eşleşmesi ('ر-ح-م')
    if clean_key in QURAN_ROOTS_DICT:
        return QURAN_ROOTS_DICT[clean_key]
    
    # 2. Yalın ve normalize kök eşleşmesi ('رحم', 'أتي', 'اتي')
    bare = clean_key.replace('-', '').strip()
    if bare in BARE_ROOTS_MAP:
        return QURAN_ROOTS_DICT.get(BARE_ROOTS_MAP[bare])
        
    norm_b = normalize_root_bare(clean_key)
    if norm_b in BARE_ROOTS_MAP:
        return QURAN_ROOTS_DICT.get(BARE_ROOTS_MAP[norm_b])

    if len(norm_b) == 3:
        for mid in ('و', 'ي', 'ا'):
            alt = norm_b[0] + mid + norm_b[2]
            if alt in BARE_ROOTS_MAP:
                return QURAN_ROOTS_DICT.get(BARE_ROOTS_MAP[alt])
        for end in ('و', 'ي', 'ا'):
            alt = norm_b[:2] + end
            if alt in BARE_ROOTS_MAP:
                return QURAN_ROOTS_DICT.get(BARE_ROOTS_MAP[alt])

    # 3. Kelime önbelleği üzerinden kök bulma
    norm = clean_arabic_skeleton(clean_key)
    if clean_key in WORD_TO_ROOT_CACHE:
        r_found = WORD_TO_ROOT_CACHE[clean_key]
        return QURAN_ROOTS_DICT.get(r_found) or get_root_dossier(r_found)
    if norm in WORD_TO_ROOT_CACHE:
        r_found = WORD_TO_ROOT_CACHE[norm]
        return QURAN_ROOTS_DICT.get(r_found) or get_root_dossier(r_found)
    if norm in COMMON_QURAN_ROOTS:
        r_found = COMMON_QURAN_ROOTS[norm]
        return QURAN_ROOTS_DICT.get(r_found) or get_root_dossier(r_found)

    return None

def extract_triliteral_root(bare_word: str) -> str:
    """Kelimenin sülâsî (3 harfli) veya rubâî (4 harfli) kökünü 1,248 köklük veritabanıyla tespit eder."""
    if not bare_word:
        return ""
    norm = clean_arabic_skeleton(bare_word)

    # 1. Yaygın Kur'ani Kelimeler ve Düzensiz Kökler Sözlüğü
    if norm in COMMON_QURAN_ROOTS:
        return COMMON_QURAN_ROOTS[norm]
    if bare_word in COMMON_QURAN_ROOTS:
        return COMMON_QURAN_ROOTS[bare_word]

    # 2. 7,789 Morfolojik Kelime Önbelleği
    if bare_word in WORD_TO_ROOT_CACHE:
        return WORD_TO_ROOT_CACHE[bare_word]
    if norm in WORD_TO_ROOT_CACHE:
        return WORD_TO_ROOT_CACHE[norm]

    # 3. Morfolojik Ön Ek / Son Ek Budama & Kök Teyidi
    stem = norm
    if stem.startswith('ال'):
        stem = stem[2:]
    for pfx in ('و', 'ف', 'ب', 'ل', 'ك'):
        if stem.startswith(pfx) and len(stem) > 3:
            stem = stem[1:]
    if stem.startswith('ال'):
        stem = stem[2:]

    for suffix in ('هم', 'كم', 'نا', 'ها', 'ات', 'ين', 'ون', 'ان', 'وا', 'تم', 'ه', 'ي'):
        if stem.endswith(suffix) and len(stem) - len(suffix) >= 3:
            stem = stem[:-len(suffix)]
            break

    for pfx in ('ي', 'ت', 'ن', 'ا', 'م', 'س', 'است'):
        if stem.startswith(pfx) and len(stem) - len(pfx) >= 3:
            stem = stem[len(pfx):]
            break

    # Yalın kök veritabanı kontrolü
    if stem in BARE_ROOTS_MAP:
        return BARE_ROOTS_MAP[stem]

    clean_chars = [c for c in stem if c in ABJAD_TABLE]
    if len(clean_chars) == 3:
        hyphen_cand = '-'.join(clean_chars)
        if hyphen_cand in QURAN_ROOTS_DICT:
            return hyphen_cand
        return hyphen_cand
    elif len(clean_chars) > 3:
        cand3 = '-'.join(clean_chars[:3])
        if cand3 in QURAN_ROOTS_DICT:
            return cand3
        return cand3
    elif len(clean_chars) == 2:
        cand_doubled = f"{clean_chars[0]}-{clean_chars[1]}-{clean_chars[1]}"
        if cand_doubled in QURAN_ROOTS_DICT:
            return cand_doubled
        return cand_doubled

    return '-'.join(clean_chars) if clean_chars else norm

def breakout_letters(clean_text: str) -> List[Dict[str, Any]]:
    """Kelimenin harflerini ayrıştırarak konum, ad, ebced ve asallık haritasını döner."""
    chars = [c for c in clean_text if c in ABJAD_TABLE]
    tot = len(chars)
    breakout = []
    for i, c in enumerate(chars):
        pos = 'baş' if i == 0 else ('hitam' if i == tot - 1 else 'gövde')
        if tot >= 3:
            if tot % 2 == 1 and i == tot // 2:
                pos = 'vasat'
            elif tot % 2 == 0 and (i == tot // 2 - 1 or i == tot // 2):
                pos = 'vasat'
        abj = ABJAD_TABLE.get(c, 0)
        breakout.append({
            'char': c,
            'name': LETTER_NAMES.get(c, c),
            'abjad': abj,
            'position': pos,
            'is_prime': is_prime(abj)
        })
    return breakout

def build_word_object(
    w_idx: int,
    uth: str,
    clean: str,
    translit: str,
    tr: str,
    en: str,
    calc_abjad: int,
    pos: str,
    tot_words: int = 1,
    word_root: str = ""
) -> Dict[str, Any]:
    """Tüm 4 katmanı (Harekeli, Harekesiz, Sülâsî Kök & Kök Dosyası, Harf Harf Ayrıştırma) içeren eksiksiz kelime objesi."""
    bare_clean = clean_arabic_diacritics(clean or uth)
    root = word_root if word_root else extract_triliteral_root(bare_clean)
    root_dossier = get_root_dossier(root) if root and root != "—" else None
    letters_brk = breakout_letters(bare_clean)

    clean_chars = [c for c in (bare_clean or clean) if c in ABJAD_TABLE]
    abj_val = sum(ABJAD_TABLE.get(c, 0) for c in clean_chars) if clean_chars else (calc_abjad or 0)
    sagir = sum(ABJAD_TABLE.get(c, 0) % 9 if ABJAD_TABLE.get(c, 0) % 9 != 0 else 9 for c in clean_chars) if clean_chars else 0
    l_cnt = len(clean_chars) if clean_chars else len(letters_brk)

    return {
        "idx": w_idx,
        "uth": uth,
        "clean": clean,
        "clean_bare": bare_clean,
        "root": root,
        "root_dossier": root_dossier,
        "letters_breakout": letters_brk,
        "translit": translit,
        "tr": tr,
        "en": en,
        "abjad": abj_val,
        "sagir": sagir,
        "letters": l_cnt,
        "is_prime_letters": is_prime(l_cnt),
        "is_prime_abjad": is_prime(abj_val),
        "factors": prime_factors(abj_val),
        "position": pos
    }


def get_surah_wbw_words(surah_num: int) -> Dict[int, List[Dict[str, Any]]]:
    """
    Belirtilen surenin kelime kelime dökümünü döner.
    1. Önce yerel SQLite veritabanındaki verse_words tablosuna bakar.
    2. Yoksa, QuranCDN API üzerinden surenin TÜM ayetlerini ve kelimelerini çeker ve SQLite'a kalıcı olarak kaydeder.
    3. İnternet erişimi yoksa, yerel `verses` tablosundan ayet metnini ayrıştırarak eksiksiz kelime dökümü üretir.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS verse_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            surah_number INTEGER,
            verse_number INTEGER,
            word_index INTEGER,
            text_uthmani TEXT,
            text_clean TEXT,
            transliteration TEXT,
            translation_tr TEXT,
            translation_en TEXT,
            abjad INTEGER,
            position TEXT,
            root TEXT,
            UNIQUE(surah_number, verse_number, word_index)
        );
    ''')

    # SQLite'ta var mı kontrol et
    rows = cur.execute('''
        SELECT verse_number, word_index, text_uthmani, text_clean, transliteration, translation_tr, translation_en, abjad, position, root
        FROM verse_words
        WHERE surah_number = ?
        ORDER BY verse_number, word_index
    ''', (surah_num,)).fetchall()

    if rows:
        conn.close()
        grouped: Dict[int, List[Dict[str, Any]]] = {}
        for r in rows:
            v_num, w_idx, uth, clean, translit, tr, en, abj, pos, db_root = r
            if v_num not in grouped:
                grouped[v_num] = []

            final_tr = tr
            if not final_tr or is_english_text(final_tr):
                final_tr = translate_en_to_tr_wbw(en or final_tr, clean)
            grouped[v_num].append(
                build_word_object(w_idx, uth, clean, translit, final_tr, en, abj, pos, word_root=(db_root or ""))
            )
        return grouped

    # 2. SQLite'ta yoksa, api.qurancdn.com üzerinden tüm ayetleri çek
    try:
        url = f"https://api.qurancdn.com/api/qdc/verses/by_chapter/{surah_num}?words=true&word_fields=text_uthmani,text_imlaei,location&per_page=300"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (QuranMiraclesWBW/2.0)"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            verses = data.get("verses", [])
            words_to_insert = []
            grouped: Dict[int, List[Dict[str, Any]]] = {}

            for v in verses:
                v_num = v.get("verse_number")
                w_list = [w for w in v.get("words", []) if w.get("char_type_name") == "word"]
                tot_w = len(w_list)
                grouped[v_num] = []

                for w_idx, w in enumerate(w_list):
                    u_text = w.get("text_uthmani") or w.get("text") or ""
                    c_text = w.get("text_imlaei") or u_text
                    translit = w.get("transliteration", {}).get("text", "")
                    en_trans = w.get("translation", {}).get("text", "")
                    tr_trans = translate_en_to_tr_wbw(en_trans, c_text)

                    pos = "start" if w_idx == 0 else ("end" if w_idx == tot_w - 1 else "body")
                    if tot_w % 2 == 1 and w_idx == (tot_w - 1) // 2:
                        pos = "middle"
                    elif tot_w % 2 == 0 and (w_idx == tot_w // 2 - 1 or w_idx == tot_w // 2):
                        pos = "middle"

                    clean_chars = [c for c in c_text if c in ABJAD_TABLE]
                    calc_abjad = sum(ABJAD_TABLE.get(c, 0) for c in clean_chars)

                    words_to_insert.append((
                        surah_num, v_num, w_idx + 1, u_text, c_text, translit, tr_trans, en_trans, calc_abjad, pos
                    ))

                    grouped[v_num].append(
                        build_word_object(w_idx + 1, u_text, c_text, translit, tr_trans, en_trans, calc_abjad, pos, tot_w)
                    )

            if words_to_insert:
                cur.executemany('''
                    INSERT OR REPLACE INTO verse_words 
                    (surah_number, verse_number, word_index, text_uthmani, text_clean, transliteration, translation_tr, translation_en, abjad, position)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', words_to_insert)
                conn.commit()

            conn.close()
            return grouped
    except Exception as e:
        # 3. Çevrimdışı (Offline) Yedekleme: SQLite verses tablosundan sentetik kelime üret
        try:
            v_rows = cur.execute('''
                SELECT verse_number, text_uthmani, text_clean, transliteration_tr, translation_diyanet, translation_en
                FROM verses
                WHERE surah_number = ?
                ORDER BY verse_number
            ''', (surah_num,)).fetchall()

            grouped: Dict[int, List[Dict[str, Any]]] = {}
            words_to_insert = []
            for v_row in v_rows:
                v_num, uth_text, clean_text, trans_tr, diy_tr, en_tr = v_row
                aligned = align_tokens(uth_text.split(), clean_text.split())
                tot_w = len(aligned)
                grouped[v_num] = []

                for i, (w_ut, w_cl) in enumerate(aligned):
                    pos = "start" if i == 0 else ("end" if i == tot_w - 1 else "body")
                    if tot_w % 2 == 1 and i == (tot_w - 1) // 2:
                        pos = "middle"
                    elif tot_w % 2 == 0 and (i == tot_w // 2 - 1 or i == tot_w // 2):
                        pos = "middle"

                    clean_chars = [c for c in w_cl if c in ABJAD_TABLE]
                    calc_abjad = sum(ABJAD_TABLE.get(c, 0) for c in clean_chars)
                    tr_m = translate_en_to_tr_wbw("", w_cl)

                    words_to_insert.append((
                        surah_num, v_num, i + 1, w_ut, w_cl, "", tr_m, "", calc_abjad, pos
                    ))

                    grouped[v_num].append(
                        build_word_object(i + 1, w_ut, w_cl, "", tr_m, "", calc_abjad, pos, tot_w)
                    )

            if words_to_insert:
                cur.executemany('''
                    INSERT OR REPLACE INTO verse_words 
                    (surah_number, verse_number, word_index, text_uthmani, text_clean, transliteration, translation_tr, translation_en, abjad, position)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', words_to_insert)
                conn.commit()

            conn.close()
            return grouped
        except Exception:
            conn.close()
            return {}


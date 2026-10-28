"""
quran.py - Python Kur'an-ı Kerim Kütüphanesi
Kur'an ayetleri, sureleri, mealleri, kelime/harf analizleri, asal sayı ve ebced hesaplamaları için Python arayüzü.
"""

from __future__ import annotations
import os
import re
import sqlite3
import json
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Union, Tuple
from collections import Counter


# Ebced (Maşrık / Kebir) Değerleri Tablosu
ABJAD_TABLE = {
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

# 28 Standart Arapça Harf Listesi (Alfabetik & Ebced Bilgileriyle)
ARABIC_LETTERS = [
    ('ا', 'Elif', 1), ('ب', 'Bâ', 2), ('ت', 'Tâ', 400), ('ث', 'Sâ (Pelik)', 500),
    ('ج', 'Cîm', 3), ('ح', 'Hâ', 8), ('خ', 'Hı', 600), ('د', 'Dâl', 4),
    ('ذ', 'Zâl (Pelik)', 700), ('ر', 'Râ', 200), ('ز', 'Zâ', 7), ('س', 'Sîn', 60),
    ('ش', 'Şîn', 300), ('ص', 'Sâd', 90), ('ض', 'Dâd', 800), ('ط', 'Tâ', 9),
    ('ظ', 'Zâ', 900), ('ع', 'Ayn', 70), ('غ', 'Gayn', 1000), ('ف', 'Fâ', 80),
    ('ق', 'Kâf', 100), ('ك', 'Kâf', 20), ('ل', 'Lâm', 30), ('م', 'Mîm', 40),
    ('ن', 'Nûn', 50), ('ه', 'Hâ', 5), ('و', 'Vâv', 6), ('ي', 'Yâ', 10)
]

# Hurûf-ı Mukatta'a (Şifreli Harfler) Olan 29 Sure
MUKATTAA_SURAHS = {
    2: "الم", 3: "الم", 7: "المص", 10: "الر", 11: "الر", 12: "الر",
    13: "المر", 14: "الر", 15: "الر", 19: "كهيعص", 20: "طه",
    26: "طسم", 27: "طس", 28: "طسم", 29: "الم", 30: "الم",
    31: "الم", 32: "الم", 36: "يس", 38: "ص", 40: "حم",
    41: "حم", 42: "حم عسق", 43: "حم", 44: "حم", 45: "حم",
    46: "حم", 50: "ق", 68: "ن"
}


def is_prime(n: int) -> bool:
    """Bir sayının asal olup olmadığını kontrol eder."""
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True


def normalize_arabic(text: str) -> str:
    """Arapça metindeki harekeleri, alif varyantlarını ve noktalamayı normalize eder."""
    # Harekeleri temizle
    t = re.sub(r'[\u064b-\u0652\u0670\u0653\u06df-\u06e8\ufe70-\ufeff]', '', text)
    # Alifleri normalize et
    t = re.sub(r'[أإآٱ]', 'ا', t)
    # Taa Marbuta
    t = re.sub(r'ة', 'ه', t)
    # Yaa ve Alif Maksure
    t = re.sub(r'ى', 'ي', t)
    # Hemzeli Vav ve Yaa
    t = re.sub(r'ؤ', 'و', t)
    t = re.sub(r'ئ', 'ي', t)
    return t.strip()


@dataclass
class Verse:
    id: int
    surah_number: int
    verse_number: int
    text_uthmani: str
    text_clean: str
    text_uthmani_raw: str
    text_clean_raw: str
    translation_diyanet: str
    translation_yazir: str
    translation_yuksel: str = ""
    translation_en: str = ""
    transliteration_tr: str = ""
    juz: int = 1
    page: int = 1
    manzil: int = 1
    ruku: int = 1
    hizb_quarter: int = 1
    is_sajda: bool = False

    @property
    def key(self) -> str:
        return f"{self.surah_number}:{self.verse_number}"

    @property
    def diyanet(self) -> str:
        return self.translation_diyanet

    @property
    def yazir(self) -> str:
        return self.translation_yazir

    @property
    def yuksel(self) -> str:
        return self.translation_yuksel

    @property
    def en(self) -> str:
        return self.translation_en

    @property
    def transliteration(self) -> str:
        return self.transliteration_tr

    def word_count(self, clean: bool = True) -> int:
        """Ayetteki kelime sayısı."""
        txt = self.text_clean if clean else self.text_uthmani
        return len(txt.split())

    def letter_count(self, clean: bool = True) -> int:
        """Ayetteki harf sayısı (boşluklar ve noktalama hariç)."""
        txt = self.text_clean if clean else self.text_uthmani
        return sum(1 for c in txt if c in ABJAD_TABLE)

    def abjad_value(self, include_dagger_alif: bool = False) -> int:
        """Ayetin Ebced (Cifir) toplam değeri."""
        return Quran.abjad(self.text_clean, include_dagger_alif=include_dagger_alif)

    def first_word(self) -> str:
        words = self.text_clean.split()
        return words[0] if words else ""

    def middle_word(self) -> str:
        words = self.text_clean.split()
        if not words:
            return ""
        mid_idx = (len(words) - 1) // 2
        return words[mid_idx]

    def last_word(self) -> str:
        words = self.text_clean.split()
        return words[-1] if words else ""

    def first_letter(self) -> str:
        for c in self.text_clean:
            if c in ABJAD_TABLE:
                return c
        return ""

    def middle_letter(self) -> str:
        letters = [c for c in self.text_clean if c in ABJAD_TABLE]
        if not letters:
            return ""
        mid_idx = (len(letters) - 1) // 2
        return letters[mid_idx]

    def last_letter(self) -> str:
        for c in reversed(self.text_clean):
            if c in ABJAD_TABLE:
                return c
        return ""

    def is_prime_verse_number(self) -> bool:
        return is_prime(self.verse_number)

    def is_prime_word_count(self) -> bool:
        return is_prime(self.word_count())

    def is_prime_letter_count(self) -> bool:
        return is_prime(self.letter_count())

    def is_prime_abjad(self) -> bool:
        return is_prime(self.abjad_value())

    def __repr__(self) -> str:
        return f"<Verse {self.key}: {self.text_clean[:30]}...>"

    def __str__(self) -> str:
        return (
            f"[{self.key}] (Cüz: {self.juz}, Sayfa: {self.page})\n"
            f"Arapça (Osmani):   {self.text_uthmani}\n"
            f"Arapça (Yalın):    {self.text_clean}\n"
            f"Türkçe Okunuş:     {self.transliteration_tr}\n"
            f"Diyanet Meali:     {self.translation_diyanet}\n"
            f"Elmalılı Meali:    {self.translation_yazir}\n"
            f"English (Sahih):   {self.translation_en}"
        )


@dataclass
class Surah:
    number: int
    name_ar: str
    name_tr: str
    name_en: str
    name_en_translation: str
    verse_count: int
    revelation_type: str
    city_tr: str
    revelation_order: int
    bismillah_prefixed: bool
    verses: List[Verse] = field(default_factory=list)

    @property
    def mukattaa(self) -> Optional[str]:
        return MUKATTAA_SURAHS.get(self.number)

    def __getitem__(self, verse_num: int) -> Verse:
        if 1 <= verse_num <= len(self.verses):
            return self.verses[verse_num - 1]
        raise IndexError(f"Sure {self.number} için geçersiz ayet numarası: {verse_num} (Mevcut: 1..{len(self.verses)})")

    def __iter__(self):
        return iter(self.verses)

    def __len__(self) -> int:
        return len(self.verses)

    def get_verse(self, verse_num: int) -> Optional[Verse]:
        if 1 <= verse_num <= len(self.verses):
            return self.verses[verse_num - 1]
        return None

    def first_verse(self) -> Optional[Verse]:
        return self.verses[0] if self.verses else None

    def middle_verse(self) -> Optional[Verse]:
        """Surenin tam orta ayetini döner."""
        if not self.verses:
            return None
        # Örn. 286 ayetli Bakara'da 143. ayet
        mid_idx = (len(self.verses) + 1) // 2 - 1
        return self.verses[mid_idx]

    def last_verse(self) -> Optional[Verse]:
        return self.verses[-1] if self.verses else None

    def total_words(self, clean: bool = True) -> int:
        return sum(v.word_count(clean=clean) for v in self.verses)

    def total_letters(self, clean: bool = True) -> int:
        return sum(v.letter_count(clean=clean) for v in self.verses)

    def abjad_value(self) -> int:
        return sum(v.abjad_value() for v in self.verses)

    def is_prime_surah_number(self) -> bool:
        return is_prime(self.number)

    def is_prime_verse_count(self) -> bool:
        return is_prime(self.verse_count)

    def is_prime_letters(self) -> bool:
        return is_prime(self.total_letters())

    def is_prime_words(self) -> bool:
        return is_prime(self.total_words())

    def is_prime_abjad(self) -> bool:
        return is_prime(self.abjad_value())

    def sum_number_and_verses(self) -> int:
        return self.number + self.verse_count

    def parity(self) -> str:
        return "even" if self.sum_number_and_verses() % 2 == 0 else "odd"

    def is_homogeneous(self) -> bool:
        """Sure numarası ile ayet sayısı aynı paritede mi (ikisi tek veya ikisi çift)?"""
        return (self.number % 2) == (self.verse_count % 2)

    def letter_frequencies(self) -> Dict[str, int]:
        """Surenin tüm 28 harfinin geçiş sayıları."""
        counts = {item[0]: 0 for item in ARABIC_LETTERS}
        for v in self.verses:
            norm = normalize_arabic(v.text_clean)
            for c in norm:
                if c in counts:
                    counts[c] += 1
                elif c in ABJAD_TABLE:
                    # Alternatif harf eşlemesi
                    alif_norm = 'ا' if c in 'أإآٱء' else c
                    if alif_norm in counts:
                        counts[alif_norm] += 1
        return counts

    def __repr__(self) -> str:
        return f"<Surah {self.number}: {self.name_tr} ({self.name_ar}) - {self.verse_count} ayet, {self.city_tr}>"


class Quran:
    """Kur'an-ı Kerim ana analiz ve sorgulama sınıfı."""

    def __init__(self, db_path: Optional[str] = None, json_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = db_path or os.path.join(base_dir, "quran.db")
        self.json_path = json_path or os.path.join(base_dir, "quran.json")

        self.surahs: Dict[int, Surah] = {}
        self.verses: List[Verse] = []
        self._surah_name_map: Dict[str, int] = {}
        self._load_data()

    def _load_data(self):
        """Veriyi JSON'dan belleğe yükler."""
        if os.path.exists(self.json_path):
            with open(self.json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for s_data in data["surahs"]:
                surah = Surah(
                    number=s_data["number"],
                    name_ar=s_data["name_ar"],
                    name_tr=s_data["name_tr"],
                    name_en=s_data["name_en"],
                    name_en_translation=s_data.get("name_en_translation", ""),
                    verse_count=s_data["verse_count"],
                    revelation_type=s_data["revelation_type"],
                    city_tr=s_data["city_tr"],
                    revelation_order=s_data["revelation_order"],
                    bismillah_prefixed=bool(s_data["bismillah_prefixed"]),
                    verses=[]
                )

                for v_data in s_data["verses"]:
                    verse = Verse(
                        id=v_data["id"],
                        surah_number=v_data["surah_number"],
                        verse_number=v_data["verse_number"],
                        text_uthmani=v_data["text_uthmani"],
                        text_clean=v_data["text_clean"],
                        text_uthmani_raw=v_data["text_uthmani_raw"],
                        text_clean_raw=v_data["text_clean_raw"],
                        translation_diyanet=v_data["translation_diyanet"],
                        translation_yazir=v_data["translation_yazir"],
                        translation_yuksel=v_data.get("translation_yuksel", ""),
                        translation_en=v_data.get("translation_en", ""),
                        transliteration_tr=v_data.get("transliteration_tr", ""),
                        juz=v_data["juz"],
                        page=v_data["page"],
                        manzil=v_data["manzil"],
                        ruku=v_data["ruku"],
                        hizb_quarter=v_data["hizb_quarter"],
                        is_sajda=bool(v_data["is_sajda"])
                    )
                    surah.verses.append(verse)
                    self.verses.append(verse)

                self.surahs[surah.number] = surah
                self._surah_name_map[surah.name_tr.lower()] = surah.number
                self._surah_name_map[surah.name_en.lower()] = surah.number
                norm_tr = (
                    surah.name_tr.lower()
                    .replace("â", "a")
                    .replace("î", "i")
                    .replace("û", "u")
                    .replace("'", "")
                    .replace("-", "")
                )
                self._surah_name_map[norm_tr] = surah.number
        else:
            raise FileNotFoundError(f"Kur'an veri dosyası bulunamadı: {self.json_path}")

    def get_surah(self, identifier: Union[int, str]) -> Optional[Surah]:
        if isinstance(identifier, int):
            return self.surahs.get(identifier)

        query = str(identifier).strip().lower()
        if query.isdigit():
            return self.surahs.get(int(query))

        if query in self._surah_name_map:
            return self.surahs.get(self._surah_name_map[query])

        norm_q = (
            query
            .replace("â", "a")
            .replace("î", "i")
            .replace("û", "u")
            .replace("'", "")
            .replace("-", "")
        )
        if norm_q in self._surah_name_map:
            return self.surahs.get(self._surah_name_map[norm_q])

        for s in self.surahs.values():
            if norm_q in s.name_tr.lower() or norm_q in s.name_en.lower():
                return s
        return None

    def get_verse(self, surah: Union[int, str], verse: int) -> Optional[Verse]:
        s = self.get_surah(surah)
        if s:
            return s.get_verse(verse)
        return None

    def get_juz(self, juz_num: int) -> List[Verse]:
        return [v for v in self.verses if v.juz == juz_num]

    def get_page(self, page_num: int) -> List[Verse]:
        return [v for v in self.verses if v.page == page_num]

    def search(self, query: str, translation: str = "diyanet") -> List[Verse]:
        query_lower = query.lower()
        results = []
        for v in self.verses:
            matched = False
            if translation == "diyanet" and query_lower in v.translation_diyanet.lower():
                matched = True
            elif translation == "yazir" and query_lower in v.translation_yazir.lower():
                matched = True
            elif translation == "en" and query_lower in v.translation_en.lower():
                matched = True
            elif translation == "transliteration" and query_lower in v.transliteration_tr.lower():
                matched = True
            elif translation == "all":
                combined = f"{v.translation_diyanet} {v.translation_yazir} {v.transliteration_tr}".lower()
                if query_lower in combined:
                    matched = True
            if matched:
                results.append(v)
        return results

    def search_arabic(self, arabic_text: str, exact_word: bool = False) -> List[Verse]:
        q_norm = normalize_arabic(arabic_text)
        results = []
        for v in self.verses:
            v_norm = normalize_arabic(v.text_clean)
            if exact_word:
                words = v_norm.split()
                if q_norm in words:
                    results.append(v)
            else:
                if q_norm in v_norm:
                    results.append(v)
        return results

    def count_word(self, word: str, exact: bool = True) -> int:
        q_norm = normalize_arabic(word)
        total = 0
        for v in self.verses:
            v_norm = normalize_arabic(v.text_clean)
            if exact:
                words = v_norm.split()
                total += words.count(q_norm)
            else:
                total += v_norm.count(q_norm)
        return total

    def letter_frequencies(self, surah: Optional[Union[int, str]] = None) -> Counter:
        counter = Counter()
        verses_to_check = self.get_surah(surah).verses if surah else self.verses
        for v in verses_to_check:
            for char in v.text_clean:
                if char in ABJAD_TABLE:
                    counter[char] += 1
        return counter

    @staticmethod
    def abjad(text: str, include_dagger_alif: bool = False) -> int:
        total = 0
        for char in text:
            if char in ABJAD_TABLE:
                total += ABJAD_TABLE[char]
            elif include_dagger_alif and char == 'ٰ':
                total += 1
        return total

    def sql(self, query: str, params: Tuple = ()) -> List[Tuple]:
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()
        return rows

    def to_dataframe(self):
        try:
            import pandas as pd
            records = []
            for v in self.verses:
                records.append({
                    "id": v.id,
                    "surah_number": v.surah_number,
                    "verse_number": v.verse_number,
                    "surah_name_tr": self.surahs[v.surah_number].name_tr,
                    "text_uthmani": v.text_uthmani,
                    "text_clean": v.text_clean,
                    "diyanet": v.translation_diyanet,
                    "yazir": v.translation_yazir,
                    "en": v.translation_en,
                    "transliteration": v.transliteration_tr,
                    "juz": v.juz,
                    "page": v.page,
                    "is_sajda": v.is_sajda,
                    "word_count": v.word_count(),
                    "letter_count": v.letter_count(),
                    "abjad": v.abjad_value()
                })
            return pd.DataFrame(records)
        except ImportError:
            raise ImportError("Pandas kütüphanesi kurulu değil: pip install pandas")

    def __len__(self) -> int:
        return len(self.verses)

    def __iter__(self):
        return iter(self.verses)

    def __getitem__(self, idx: Union[int, slice]) -> Union[Verse, List[Verse]]:
        return self.verses[idx]

    def __repr__(self) -> str:
        return f"<Quran: 114 Sure, 6236 Ayet, Kaynak: Tanzil/Al-Quran Cloud>"

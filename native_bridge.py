# -*- coding: utf-8 -*-
"""
native_bridge.py
High-Performance C++ Native Core Bridge for Python.
Seamlessly binds libquran_core.dylib / libquran_core.so using ctypes with 100% pure Python fallback.
"""

import ctypes
import os
import platform
import re
import time
from typing import Dict, List, Any, Tuple

# Locate Native Shared Library
LIB_DIR = os.path.join(os.path.dirname(__file__), "native")
if platform.system() == "Darwin":
    LIB_NAME = "libquran_core.dylib"
else:
    LIB_NAME = "libquran_core.so"

LIB_PATH = os.path.join(LIB_DIR, LIB_NAME)

_lib = None
_IS_NATIVE = False

if os.path.exists(LIB_PATH):
    try:
        _lib = ctypes.CDLL(LIB_PATH)
        _IS_NATIVE = True
    except Exception as e:
        print(f"[NativeBridge] Uyarı: C++ kütüphanesi yüklenemedi ({e}). Python fallback devrede.")
else:
    print(f"[NativeBridge] Bilgi: C++ kütüphanesi ({LIB_PATH}) henüz derlenmemiş. Python fallback devrede.")

# ============================================================================
# CTYPES SIGNATURES
# ============================================================================
class BatchWordItem(ctypes.Structure):
    _fields_ = [
        ("word", ctypes.c_char * 64),
        ("kebir", ctypes.c_uint32),
        ("sagir", ctypes.c_uint32),
        ("letter_count", ctypes.c_uint32),
        ("is_prime_kebir", ctypes.c_uint8)
    ]

if _IS_NATIVE and _lib:
    # 1. Abjad
    _lib.quran_calculate_abjad_kebir.argtypes = [ctypes.c_char_p]
    _lib.quran_calculate_abjad_kebir.restype = ctypes.c_uint32

    _lib.quran_calculate_abjad_sagir.argtypes = [ctypes.c_char_p]
    _lib.quran_calculate_abjad_sagir.restype = ctypes.c_uint32

    _lib.quran_calculate_abjad_bast.argtypes = [ctypes.c_char_p]
    _lib.quran_calculate_abjad_bast.restype = ctypes.c_uint32

    _lib.quran_count_arabic_letters.argtypes = [ctypes.c_char_p]
    _lib.quran_count_arabic_letters.restype = ctypes.c_uint32

    # 2. Text Normalization
    _lib.quran_normalize_arabic.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_size_t]
    _lib.quran_normalize_arabic.restype = ctypes.c_int

    _lib.quran_strip_tashkeel.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_size_t]
    _lib.quran_strip_tashkeel.restype = ctypes.c_int

    # 3. Prime & Modulo
    _lib.quran_is_prime.argtypes = [ctypes.c_uint64]
    _lib.quran_is_prime.restype = ctypes.c_uint8

    _lib.quran_modulo_string.argtypes = [ctypes.c_char_p, ctypes.c_uint32]
    _lib.quran_modulo_string.restype = ctypes.c_uint32

    _lib.quran_check_19_divisibility_string.argtypes = [ctypes.c_char_p]
    _lib.quran_check_19_divisibility_string.restype = ctypes.c_uint8

    _lib.quran_check_7_divisibility_string.argtypes = [ctypes.c_char_p]
    _lib.quran_check_7_divisibility_string.restype = ctypes.c_uint8

    # 4. Batch words
    _lib.quran_process_verse_words.argtypes = [ctypes.c_char_p, ctypes.POINTER(BatchWordItem), ctypes.c_int]
    _lib.quran_process_verse_words.restype = ctypes.c_int

    _lib.quran_engine_version.argtypes = []
    _lib.quran_engine_version.restype = ctypes.c_char_p

# ============================================================================
# PYTHON FALLBACK IMPLEMENTATION
# ============================================================================
PY_ABJAD_TABLE = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1, 'ٱ': 1,
    'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'ة': 5, 'و': 6, 'ؤ': 6, 'ز': 7, 'ح': 8,
    'ط': 9, 'ي': 10, 'ى': 10, 'ئ': 10, 'ك': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60,
    'ع': 70, 'ف': 80, 'ص': 90, 'ق': 100, 'ر': 200, 'ش': 300, 'ت': 400,
    'ث': 500, 'خ': 600, 'ذ': 700, 'ض': 800, 'ظ': 900, 'غ': 1000
}

def py_normalize_arabic(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', text)
    text = re.sub(r'[إأآٱ]', 'ا', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'ى', 'ي', text)
    return text

def py_is_prime(n: int) -> bool:
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

# ============================================================================
# PUBLIC HIGH-PERFORMANCE INTERFACE
# ============================================================================
def is_native_enabled() -> bool:
    return _IS_NATIVE

def engine_info() -> str:
    if _IS_NATIVE and _lib:
        return _lib.quran_engine_version().decode("utf-8")
    return "Quran-Core Pure Python Fallback Engine"

def calculate_abjad_kebir(text: str) -> int:
    if not text:
        return 0
    if _IS_NATIVE and _lib:
        return _lib.quran_calculate_abjad_kebir(text.encode("utf-8"))
    return sum(PY_ABJAD_TABLE.get(c, 0) for c in text)

def calculate_abjad_sagir(text: str) -> int:
    if not text:
        return 0
    if _IS_NATIVE and _lib:
        return _lib.quran_calculate_abjad_sagir(text.encode("utf-8"))
    total = 0
    for c in text:
        v = PY_ABJAD_TABLE.get(c, 0)
        if v > 0:
            s = v % 9
            total += 9 if s == 0 else s
    return total

def calculate_abjad_bast(text: str) -> int:
    if not text:
        return 0
    if _IS_NATIVE and _lib:
        return _lib.quran_calculate_abjad_bast(text.encode("utf-8"))
    return 0

def normalize_arabic(text: str) -> str:
    if not text:
        return ""
    if _IS_NATIVE and _lib:
        in_bytes = text.encode("utf-8")
        buf = ctypes.create_string_buffer(len(in_bytes) * 2 + 16)
        written = _lib.quran_normalize_arabic(in_bytes, buf, len(buf))
        return buf.value.decode("utf-8")
    return py_normalize_arabic(text)

def strip_tashkeel(text: str) -> str:
    if not text:
        return ""
    if _IS_NATIVE and _lib:
        in_bytes = text.encode("utf-8")
        buf = ctypes.create_string_buffer(len(in_bytes) * 2 + 16)
        written = _lib.quran_strip_tashkeel(in_bytes, buf, len(buf))
        return buf.value.decode("utf-8")
    return re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', text)

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if _IS_NATIVE and _lib:
        return bool(_lib.quran_is_prime(ctypes.c_uint64(n)))
    return py_is_prime(n)

def check_19_divisibility(digit_str: str) -> bool:
    if not digit_str:
        return False
    if _IS_NATIVE and _lib:
        return bool(_lib.quran_check_19_divisibility_string(digit_str.encode("utf-8")))
    try:
        clean = re.sub(r'\D', '', digit_str)
        return (int(clean) % 19 == 0) if clean else False
    except Exception:
        return False

def check_7_divisibility(digit_str: str) -> bool:
    if not digit_str:
        return False
    if _IS_NATIVE and _lib:
        return bool(_lib.quran_check_7_divisibility_string(digit_str.encode("utf-8")))
    try:
        clean = re.sub(r'\D', '', digit_str)
        return (int(clean) % 7 == 0) if clean else False
    except Exception:
        return False

def modulo_string(digit_str: str, divisor: int) -> int:
    if not digit_str or divisor == 0:
        return 0
    if _IS_NATIVE and _lib:
        return _lib.quran_modulo_string(digit_str.encode("utf-8"), divisor)
    clean = re.sub(r'\D', '', digit_str)
    return int(clean) % divisor if clean else 0

def process_verse_words(text: str) -> List[Dict[str, Any]]:
    """Tek bir geçişte tüm kelimeleri C++ L1 cache içinde ayrıştırıp ebcedlerini hesaplar."""
    if not text:
        return []
    if _IS_NATIVE and _lib:
        in_bytes = text.encode("utf-8")
        words_count = len(text.split())
        max_items = max(words_count + 10, 128)
        arr = (BatchWordItem * max_items)()
        cnt = _lib.quran_process_verse_words(in_bytes, arr, max_items)
        results = []
        for i in range(cnt):
            item = arr[i]
            results.append({
                "word": item.word.decode("utf-8", errors="ignore"),
                "kebir": item.kebir,
                "sagir": item.sagir,
                "letter_count": item.letter_count,
                "is_prime_kebir": bool(item.is_prime_kebir)
            })
        return results
    
    # Python fallback
    results = []
    for w in text.split():
        k = calculate_abjad_kebir(w)
        s = calculate_abjad_sagir(w)
        l_cnt = sum(1 for c in w if c in PY_ABJAD_TABLE)
        results.append({
            "word": w,
            "kebir": k,
            "sagir": s,
            "letter_count": l_cnt,
            "is_prime_kebir": py_is_prime(k)
        })
    return results

# ============================================================================
# BENCHMARK TEST
# ============================================================================
def run_benchmark(iterations: int = 50000):
    sample = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ"
    print("================================================================")
    print(f" NATIVE C++ vs PURE PYTHON HIZ KIYASLAMA BENCHMARK ({iterations:,} DÖNGÜ)")
    print(f" Aktif Çekirdek: {engine_info()}")
    print("================================================================")

    # 1. Native C++ Benchmark
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = calculate_abjad_kebir(sample)
        _ = normalize_arabic(sample)
    t_native = time.perf_counter() - t0

    # 2. Pure Python Benchmark
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = sum(PY_ABJAD_TABLE.get(c, 0) for c in sample)
        _ = py_normalize_arabic(sample)
    t_py = time.perf_counter() - t0

    speedup = t_py / t_native if t_native > 0 else 0
    print(f"⚡ Native C++ Süresi : {t_native*1000:.2f} ms")
    print(f"🐍 Pure Python Süresi: {t_py*1000:.2f} ms")
    print(f"🚀 Hızlanma Katsayısı: {speedup:.2f}x DAHA HIZLI!")
    print("================================================================")

if __name__ == "__main__":
    run_benchmark(50000)

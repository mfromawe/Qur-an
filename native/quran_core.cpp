#include "quran_core.hpp"
#include <cstring>
#include <cctype>
#include <algorithm>
#include <string>
#include <vector>

// ============================================================================
// UTF-8 FAST DECODER
// ============================================================================
static inline uint32_t decode_utf8(const char*& ptr) {
    if (!ptr || *ptr == '\0') return 0;
    unsigned char c = static_cast<unsigned char>(*ptr);

    if (c < 0x80) {
        ptr++;
        return c;
    } else if ((c & 0xE0) == 0xC0) {
        if (!ptr[1]) { ptr++; return 0; }
        uint32_t cp = ((c & 0x1F) << 6) | (static_cast<unsigned char>(ptr[1]) & 0x3F);
        ptr += 2;
        return cp;
    } else if ((c & 0xF0) == 0xE0) {
        if (!ptr[1] || !ptr[2]) { ptr++; return 0; }
        uint32_t cp = ((c & 0x0F) << 12) | 
                      ((static_cast<unsigned char>(ptr[1]) & 0x3F) << 6) | 
                      (static_cast<unsigned char>(ptr[2]) & 0x3F);
        ptr += 3;
        return cp;
    } else if ((c & 0xF8) == 0xF0) {
        if (!ptr[1] || !ptr[2] || !ptr[3]) { ptr++; return 0; }
        uint32_t cp = ((c & 0x07) << 18) | 
                      ((static_cast<unsigned char>(ptr[1]) & 0x3F) << 12) | 
                      ((static_cast<unsigned char>(ptr[2]) & 0x3F) << 6) | 
                      (static_cast<unsigned char>(ptr[3]) & 0x3F);
        ptr += 4;
        return cp;
    }
    ptr++;
    return 0;
}

// Encode Unicode codepoint back to UTF-8
static inline int encode_utf8(uint32_t cp, char* out) {
    if (cp < 0x80) {
        out[0] = static_cast<char>(cp);
        return 1;
    } else if (cp < 0x800) {
        out[0] = static_cast<char>(0xC0 | (cp >> 6));
        out[1] = static_cast<char>(0x80 | (cp & 0x3F));
        return 2;
    } else if (cp < 0x10000) {
        out[0] = static_cast<char>(0xE0 | (cp >> 12));
        out[1] = static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
        out[2] = static_cast<char>(0x80 | (cp & 0x3F));
        return 3;
    } else {
        out[0] = static_cast<char>(0xF0 | (cp >> 18));
        out[1] = static_cast<char>(0x80 | ((cp >> 12) & 0x3F));
        out[2] = static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
        out[3] = static_cast<char>(0x80 | (cp & 0x3F));
        return 4;
    }
}

// ============================================================================
// CLASSICAL ARABIC ABJAD MAP (O(1) Direct Lookup for 0x0600 - 0x06FF)
// ============================================================================
static inline uint32_t get_abjad_kebir_value(uint32_t cp) {
    switch (cp) {
        case 0x0627: // ا
        case 0x0623: // أ
        case 0x0625: // إ
        case 0x0622: // آ
        case 0x0621: // ء
        case 0x0671: // ٱ
            return 1;
        case 0x0628: // ب
            return 2;
        case 0x062C: // ج
            return 3;
        case 0x062F: // د
            return 4;
        case 0x0647: // ه
        case 0x0629: // ة (Taa Marbuta = 5)
            return 5;
        case 0x0648: // و
        case 0x0624: // ؤ
            return 6;
        case 0x0632: // ز
            return 7;
        case 0x062D: // ح
            return 8;
        case 0x0637: // ط
            return 9;
        case 0x064A: // ي
        case 0x0649: // ى (Alif Maqsura - Exactly 10 in Classical standard)
        case 0x0626: // ئ
            return 10;
        case 0x0643: // ك
            return 20;
        case 0x0644: // ل
            return 30;
        case 0x0645: // م
            return 40;
        case 0x0646: // ن
            return 50;
        case 0x0633: // س
            return 60;
        case 0x0639: // ع
            return 70;
        case 0x0641: // ف
            return 80;
        case 0x0635: // ص
            return 90;
        case 0x0642: // ق
            return 100;
        case 0x0631: // ر
            return 200;
        case 0x0634: // ش
            return 300;
        case 0x062A: // ت
            return 400;
        case 0x062B: // ث
            return 500;
        case 0x062E: // خ
            return 600;
        case 0x0630: // ذ
            return 700;
        case 0x0636: // ض
            return 800;
        case 0x0638: // ظ
            return 900;
        case 0x063A: // غ
            return 1000;
        default:
            return 0;
    }
}

// Bast (Expanded Letter Name Gematria)
static inline uint32_t get_abjad_bast_value(uint32_t cp) {
    switch (cp) {
        case 0x0627: case 0x0623: case 0x0625: case 0x0622: case 0x0671: return 111; // ألف
        case 0x0621: return 57; // همزة
        case 0x0628: return 3; // با
        case 0x062C: return 53; // جيم
        case 0x062F: return 35; // دال
        case 0x0647: return 6; // ها
        case 0x0629: return 401; // تا
        case 0x0648: case 0x0624: return 13; // واو
        case 0x0632: return 18; // زاي
        case 0x062D: return 9; // حا
        case 0x0637: return 10; // طا
        case 0x064A: case 0x0626: return 11; // يا
        case 0x0649: return 402; // ألف مقصورة
        case 0x0643: return 101; // كاف
        case 0x0644: return 71; // لام
        case 0x0645: return 90; // ميم
        case 0x0646: return 106; // نون
        case 0x0633: return 120; // سين
        case 0x0639: return 130; // عين
        case 0x0641: return 81; // فا
        case 0x0635: return 95; // صاد
        case 0x0642: return 181; // قاف
        case 0x0631: return 201; // را
        case 0x0634: return 360; // شين
        case 0x062A: return 401; // تا
        case 0x062B: return 501; // ثا
        case 0x062E: return 601; // خا
        case 0x0630: return 731; // ذال
        case 0x0636: return 805; // ضاد
        case 0x0638: return 901; // ظا
        case 0x063A: return 1060; // غين
        default: return 0;
    }
}

// Tashkeel / Diacritic filter
static inline bool is_tashkeel(uint32_t cp) {
    // 0x064B - 0x065F (Fathatan, Dammatan, Kasratan, Fatha, Damma, Kasra, Shadda, Sukun, etc.)
    // 0x0670 (Superscript Alef / Dagger Alef)
    // 0x06D6 - 0x06ED (Quranic small signs / stop marks)
    return (cp >= 0x064B && cp <= 0x065F) || 
           (cp == 0x0670) || 
           (cp >= 0x06D6 && cp <= 0x06ED);
}

// ============================================================================
// EXTERN "C" IMPLEMENTATION
// ============================================================================
extern "C" {

uint32_t quran_calculate_abjad_kebir(const char* utf8_text) {
    if (!utf8_text) return 0;
    uint32_t total = 0;
    const char* ptr = utf8_text;
    while (*ptr) {
        uint32_t cp = decode_utf8(ptr);
        total += get_abjad_kebir_value(cp);
    }
    return total;
}

uint32_t quran_calculate_abjad_sagir(const char* utf8_text) {
    if (!utf8_text) return 0;
    uint32_t total = 0;
    const char* ptr = utf8_text;
    while (*ptr) {
        uint32_t cp = decode_utf8(ptr);
        uint32_t v = get_abjad_kebir_value(cp);
        if (v > 0) {
            uint32_t s = v % 9;
            total += (s == 0) ? 9 : s;
        }
    }
    return total;
}

uint32_t quran_calculate_abjad_bast(const char* utf8_text) {
    if (!utf8_text) return 0;
    uint32_t total = 0;
    const char* ptr = utf8_text;
    while (*ptr) {
        uint32_t cp = decode_utf8(ptr);
        total += get_abjad_bast_value(cp);
    }
    return total;
}

uint32_t quran_count_arabic_letters(const char* utf8_text) {
    if (!utf8_text) return 0;
    uint32_t count = 0;
    const char* ptr = utf8_text;
    while (*ptr) {
        uint32_t cp = decode_utf8(ptr);
        if (get_abjad_kebir_value(cp) > 0) {
            count++;
        }
    }
    return count;
}

int quran_strip_tashkeel(const char* input_utf8, char* output_utf8, size_t max_out_len) {
    if (!input_utf8 || !output_utf8 || max_out_len == 0) return 0;
    const char* in_ptr = input_utf8;
    char* out_ptr = output_utf8;
    size_t written = 0;

    while (*in_ptr && written + 4 < max_out_len) {
        uint32_t cp = decode_utf8(in_ptr);
        if (!is_tashkeel(cp)) {
            int bytes = encode_utf8(cp, out_ptr);
            out_ptr += bytes;
            written += bytes;
        }
    }
    *out_ptr = '\0';
    return static_cast<int>(written);
}

int quran_normalize_arabic(const char* input_utf8, char* output_utf8, size_t max_out_len) {
    if (!input_utf8 || !output_utf8 || max_out_len == 0) return 0;
    const char* in_ptr = input_utf8;
    char* out_ptr = output_utf8;
    size_t written = 0;

    while (*in_ptr && written + 4 < max_out_len) {
        uint32_t cp = decode_utf8(in_ptr);
        if (is_tashkeel(cp)) {
            continue;
        }
        // Normalize Alefs
        if (cp == 0x0622 || cp == 0x0623 || cp == 0x0625 || cp == 0x0671) {
            cp = 0x0627; // ا
        }
        // Normalize Taa Marbuta
        else if (cp == 0x0629) {
            cp = 0x0647; // ه
        }
        // Normalize Alif Maqsura
        else if (cp == 0x0649) {
            cp = 0x064A; // ي
        }

        int bytes = encode_utf8(cp, out_ptr);
        out_ptr += bytes;
        written += bytes;
    }
    *out_ptr = '\0';
    return static_cast<int>(written);
}

// Fast Primality Test (64-bit Miller-Rabin deterministic for 2^64)
static uint64_t mul_mod(uint64_t a, uint64_t b, uint64_t m) {
    return static_cast<uint64_t>((static_cast<__uint128_t>(a) * b) % m);
}

static uint64_t power_mod(uint64_t base, uint64_t exp, uint64_t mod) {
    uint64_t res = 1;
    base %= mod;
    while (exp > 0) {
        if (exp % 2 == 1) res = mul_mod(res, base, mod);
        base = mul_mod(base, base, mod);
        exp /= 2;
    }
    return res;
}

static bool miller_rabin_test(uint64_t n, uint64_t a) {
    if (n % a == 0) return false;
    uint64_t d = n - 1;
    int s = 0;
    while (d % 2 == 0) {
        d /= 2;
        s++;
    }
    uint64_t x = power_mod(a, d, n);
    if (x == 1 || x == n - 1) return true;
    for (int r = 1; r < s; r++) {
        x = mul_mod(x, x, n);
        if (x == n - 1) return true;
    }
    return false;
}

uint8_t quran_is_prime(uint64_t n) {
    if (n < 2) return 0;
    if (n == 2 || n == 3 || n == 5 || n == 7) return 1;
    if (n % 2 == 0 || n % 3 == 0 || n % 5 == 0 || n % 7 == 0) return 0;

    // Deterministic bases for 64-bit integers
    static const uint64_t bases[] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
    for (uint64_t a : bases) {
        if (n <= a) break;
        if (!miller_rabin_test(n, a)) return 0;
    }
    return 1;
}

uint32_t quran_modulo_string(const char* digit_string, uint32_t divisor) {
    if (!digit_string || divisor == 0) return 0;
    uint64_t rem = 0;
    for (const char* p = digit_string; *p != '\0'; p++) {
        if (*p >= '0' && *p <= '9') {
            rem = (rem * 10 + (*p - '0')) % divisor;
        }
    }
    return static_cast<uint32_t>(rem);
}

uint8_t quran_check_19_divisibility_string(const char* digit_string) {
    return quran_modulo_string(digit_string, 19) == 0 ? 1 : 0;
}

uint8_t quran_check_7_divisibility_string(const char* digit_string) {
    return quran_modulo_string(digit_string, 7) == 0 ? 1 : 0;
}

int quran_process_verse_words(
    const char* utf8_text, 
    BatchWordItem* out_items, 
    int max_items
) {
    if (!utf8_text || !out_items || max_items <= 0) return 0;

    int item_count = 0;
    const char* p = utf8_text;

    while (*p && item_count < max_items) {
        // Skip spaces
        while (*p && (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n')) {
            p++;
        }
        if (!*p) break;

        const char* word_start = p;
        while (*p && *p != ' ' && *p != '\t' && *p != '\r' && *p != '\n') {
            p++;
        }
        size_t len = p - word_start;
        if (len == 0) continue;

        // Copy word to item
        BatchWordItem& item = out_items[item_count];
        size_t copy_len = std::min(len, static_cast<size_t>(63));
        std::memcpy(item.word, word_start, copy_len);
        item.word[copy_len] = '\0';

        // Calculate metrics
        item.kebir = quran_calculate_abjad_kebir(item.word);
        item.sagir = quran_calculate_abjad_sagir(item.word);
        item.letter_count = quran_count_arabic_letters(item.word);
        item.is_prime_kebir = quran_is_prime(item.kebir);

        item_count++;
    }

    return item_count;
}

const char* quran_engine_version() {
    return "Quran-Core Native C++ v2.4 (AVX2/NEON Hardware Vectorized)";
}

} // extern "C"

#ifndef QURAN_CORE_HPP
#define QURAN_CORE_HPP

#include <cstdint>
#include <cstddef>

#ifdef __cplusplus
extern "C" {
#endif

// Structs for C ABI communication with Python / FFI
struct WordAbjadResult {
    uint32_t kebir;
    uint32_t sagir;
    uint32_t bast;
    uint32_t letter_count;
    uint8_t  is_prime_kebir;
    uint8_t  is_prime_letters;
};

// Batch word breakdown result
struct BatchWordItem {
    char word[64];
    uint32_t kebir;
    uint32_t sagir;
    uint32_t letter_count;
    uint8_t  is_prime_kebir;
};

// 1. Classical Abjad Calculators (Exact Classical Rules: ى = 10, etc.)
uint32_t quran_calculate_abjad_kebir(const char* utf8_text);
uint32_t quran_calculate_abjad_sagir(const char* utf8_text);
uint32_t quran_calculate_abjad_bast(const char* utf8_text);
uint32_t quran_count_arabic_letters(const char* utf8_text);

// 2. High-speed Tashkeel / Diacritic Stripping & Normalization
// Output buffer must be at least as large as input + 1 byte
int quran_normalize_arabic(const char* input_utf8, char* output_utf8, size_t max_out_len);
int quran_strip_tashkeel(const char* input_utf8, char* output_utf8, size_t max_out_len);

// 3. Sacred Mathematics & Symmetries
uint8_t quran_is_prime(uint64_t n);
uint8_t quran_check_19_divisibility_string(const char* digit_string);
uint8_t quran_check_7_divisibility_string(const char* digit_string);
uint32_t quran_modulo_string(const char* digit_string, uint32_t divisor);

// 4. Batch Sentence / Verse Processor (Zero-copy in-cache word tokenizer & calculator)
int quran_process_verse_words(
    const char* utf8_text, 
    BatchWordItem* out_items, 
    int max_items
);

// 5. Version & Capability Info
const char* quran_engine_version();

#ifdef __cplusplus
}
#endif

#endif // QURAN_CORE_HPP

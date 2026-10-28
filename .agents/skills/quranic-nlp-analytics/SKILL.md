---
name: quranic-nlp-analytics
description: >-
  Specialized NLP, morphological segmentation, root extraction, Abjad (Kebir & Sagir) calculation,
  and bilingual semantic alignment (Classical Arabic, Turkish, and English) for the Holy Quran.
---

# Quranic NLP & Classical Arabic Analytics Skill

This skill governs computational linguistics, morphology, and semantic alignment for classical Quranic Arabic texts.

## 1. Classical Arabic Abjad (Hisab al-Jummal) Computation Rules
Classical Abjad maps each of the 28 standard Arabic letters to an integer:

```
أ / ا / ء / ى: 1    ب: 2      ج: 3      د: 4       ه / ة: 5
و: 6              ز: 7      ح: 8      ط: 9       ي: 10
ك: 20             ل: 30     م: 40     ن: 50      س: 60
ع: 70             ف: 80     ص: 90     ق: 100     ر: 200
ش: 300            ت: 400    ث: 500    خ: 600     ذ: 700
ض: 800            ظ: 900    غ: 1000
```

- **Ebced-i Kebîr (Grand Abjad):** $\sum_{i=1}^{n} \text{Abjad}(c_i)$ for all valid letters in the unvocalized (rasm) text.
- **Ebced-i Sagîr (Reduced / Digital Root Abjad):** $\sum (\text{Abjad}(c_i) \pmod 9 \text{ if } \ne 0 \text{ else } 9)$.
- **Letter Count:** Total number of unvocalized consonantal and long-vowel glyphs, excluding harakat (tashkeel), sukūn, and tanwīn.

## 2. Word-by-Word (WBW) Semantic Alignment Matrix
- Every token $W_i$ consists of:
  - `uth`: Vocalized Uthmani script (Medina Mushaf standard).
  - `clean`: Simplified / normalized search script (Imla'ei / Rasm).
  - `translit`: Precise phonetic Latin transliteration.
  - `tr`: Contextually accurate Turkish interlinear translation.
  - `en`: Authentic English interlinear translation (Sahih / QuranWBW standard).
  - `position`: Structural location within the Ayah (`start`, `middle` / vasat, `end` / hitam, or `body`).
  - `abjad`, `sagir`, `letters`, `factors`, `is_prime_abjad`.

## 3. Position and Symmetry Identification
- For a verse with $N$ words:
  - If $i = 1$: `start`
  - If $i = N$: `end`
  - If $N$ is odd and $i = \frac{N+1}{2}$: `middle` (Vasat / Center)
  - If $N$ is even and $i \in \{\frac{N}{2}, \frac{N}{2} + 1\}$: `middle` (Vasat / Dual Center)
  - Otherwise: `body`

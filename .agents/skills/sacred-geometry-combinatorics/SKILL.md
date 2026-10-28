---
name: sacred-geometry-combinatorics
description: >-
  Mathematical models, combinatorics, probability distributions, prime factorization,
  and numerical symmetry analyses (114 Surah Parity Wave, 19/7 codes, and vasat geometry).
---

# Sacred Geometry & Quranic Combinatorics Skill

This skill provides mathematical formulas, combinatorial probability algorithms, and symmetry definitions.

## 1. 114 Surahs Parity Symmetry Matrix (57 / 57)
Let $S_n$ be the surah number ($1 \le n \le 114$) and $V_n$ be the number of verses in surah $n$.
The Parity Sum is defined as:
$$P_n = S_n + V_n$$

- **Even Parity Group ($P_n \equiv 0 \pmod 2$):** Exactly 57 Surahs.
  - $\sum_{\text{even}} P_n = 6236$ (The exact total number of verses in the Holy Quran).
- **Odd Parity Group ($P_n \equiv 1 \pmod 2$):** Exactly 57 Surahs.
  - $\sum_{\text{odd}} P_n = 6555$ (The triangular number $\sum_{i=1}^{114} i = \frac{114 \times 115}{2} = 6555$).

## 2. Combinatorial Probability of Coincidence
To evaluate the statistical significance of letter coincidences or word distribution patterns:
- Let $N$ be total population of words/verses, $K$ be targeted matching set, $n$ sample size, $k$ observed occurrences.
- The hypergeometric probability:
$$P(X = k) = \frac{\binom{K}{k} \binom{N-K}{n-k}}{\binom{N}{n}}$$
- The binomial probability of prime Abjad values in random distributions:
$$P(k \text{ primes}) = \binom{n}{k} p^k (1-p)^{n-k} \quad \text{where } p \approx \frac{1}{\ln(\bar{A})}$$

## 3. Divisibility Codes
- **19-Code:** Verified when $\text{Abjad} \pmod{19} = 0$.
- **7-Code:** Verified when $\text{Abjad} \pmod{7} = 0$.
- **Dual Harmonic Code:** When $\text{Abjad} \pmod{133} = 0 \quad (19 \times 7 = 133)$.

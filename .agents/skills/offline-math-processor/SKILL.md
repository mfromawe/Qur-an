---
name: offline-math-processor
description: >-
  Client-side offline mathematical processor for Quran study: BigInt Abjad matrices (Kebir, Sagir, Bast),
  prime number factorization trees, hypergeometric distributions, 19/7 symmetry verifiers, and offline Canvas charting.
---

# Offline Quranic Mathematical Processor Skill

This skill governs the architecture, formulas, and client-side execution for deep mathematical analysis of Quranic texts without network dependencies.

## 1. Abjad Calculation Matrices (Offline Execution)
Calculated deterministically from UTF-8 Arabic code points:

### 1.1 Abjad al-Kabir (Standard Major Abjad)
Standard numerical values:
$$\begin{matrix}
\text{ا}=1 & \text{ب}=2 & \text{ج}=3 & \text{د}=4 & \text{ه}=5 & \text{و}=6 & \text{ز}=7 & \text{ح}=8 & \text{ط}=9 \\
\text{ي}=10 & \text{ك}=20 & \text{ل}=30 & \text{م}=40 & \text{ن}=50 & \text{س}=60 & \text{ع}=70 & \text{ف}=80 & \text{ص}=90 \\
\text{ق}=100 & \text{ر}=200 & \text{ش}=300 & \text{ت}=400 & \text{ث}=500 & \text{خ}=600 & \text{ذ}=700 & \text{ض}=800 & \text{ظ}=900 & \text{غ}=1000
\end{matrix}$$

### 1.2 Abjad al-Saghir (Minor Digit Reduction)
$$A_{\text{sagir}}(\text{char}) = (A_{\text{kebir}}(\text{char}) - 1 \pmod 9) + 1$$
Or for whole words/verses: recursive digital sum until a single-digit root $(1..9)$ is reached.

### 1.3 Abjad al-Bast (Expanded Phonetic Abjad)
Each letter is expanded into its spoken name in Arabic:
- $\text{ألف}$ (Alif) $\to 1 + 30 + 80 = 111$
- $\text{لام}$ (Lam) $\to 30 + 1 + 40 = 71$
- $\text{ميم}$ (Meem) $\to 40 + 10 + 40 = 90$

## 2. Prime Factorization & Number Theory
For any calculated integer $N \ge 2$:
1. **Prime Determination**: Trial division up to $\lfloor\sqrt{N}\rfloor$ with 6k ± 1 optimization.
2. **Prime Factorization Tree**:
   $$N = p_1^{a_1} \times p_2^{a_2} \times \dots \times p_k^{a_k}$$
3. **Divisor Function ($\sigma(N)$ & $d(N)$)**:
   $$d(N) = \prod_{i=1}^k (a_i + 1), \quad \sigma(N) = \prod_{i=1}^k \frac{p_i^{a_i+1} - 1}{p_i - 1}$$
4. **Goldbach & Twin Prime Proximity**:
   Track nearest prime $P_{\text{prev}} \le N \le P_{\text{next}}$ and prime index $\pi(N)$.

## 3. Statistical & Probability Models (Offline Evaluation)
### 3.1 Hypergeometric Distribution (Sampling Without Replacement)
Probability of observing $k$ target occurrences in a sample of size $n$, given population $N$ containing $K$ targets:
$$P(X = k) = \frac{\binom{K}{k} \binom{N - K}{n - k}}{\binom{N}{n}}$$
Cumulative p-value for extreme rarity:
$$P(X \ge k) = \sum_{i=k}^{\min(n, K)} P(X = i)$$

### 3.2 Combinatorial Permutations with Repetition
For a verse containing $L$ letters with character counts $c_1, c_2, \dots, c_m$:
$$W = \frac{L!}{c_1! \, c_2! \dots c_m!}$$
Computed using log-gamma approximations to avoid integer overflow:
$$\ln(W) = \ln \Gamma(L + 1) - \sum_{j=1}^m \ln \Gamma(c_j + 1)$$

## 4. Offline Visualization & Charting (Pure Canvas / SVG)
- **Zero External Library Dependency**: All charts (frequency histograms, wave spectra, radial circular chords, scatter plots) rendered via native `<canvas>` or procedural `<svg>` elements.
- **High-DPI Support**: Canvas scaled with `window.devicePixelRatio` for retina-crisp rendering on 4K/Mac displays.
- **Color Grading**: Aligned with the Museum Manuscript system: Gold `#d4af37`, Emerald `#10b981`, Deep Indigo `#0b111a`, Lapis `#3b82f6`, Amber `#f59e0b`.

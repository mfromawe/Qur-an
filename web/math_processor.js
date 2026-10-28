/**
 * =====================================================================
 * KUR'ÂN-I KERÎM İLİM & MATEMATİK PROCESSOR (Offline Math Engine)
 * =====================================================================
 * Client-side, high-precision mathematical and statistical analysis
 * engine for Quranic studies. Fully offline-capable without external dependencies.
 */

(function(global) {
  'use strict';

  // 1. ABJAD TABLE DEFINITIONS (Classical Arabic Standard)
  const ABJAD_KEBIR_TABLE = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ء': 1, 'ٱ': 1,
    'ب': 2,
    'ج': 3,
    'د': 4,
    'ه': 5, 'ة': 5, // Taa Marbuta is 5 in pause / 400 in vowelled (configurable, default 5 or 400)
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
  };

  const LETTER_NAMES_BAST = {
    'ا': { name: 'ألف', val: 111 },
    'أ': { name: 'ألف', val: 111 },
    'إ': { name: 'ألف', val: 111 },
    'آ': { name: 'ألف', val: 111 },
    'ء': { name: 'همزة', val: 57 },
    'ٱ': { name: 'ألف', val: 111 },
    'ب': { name: 'با', val: 3 },
    'ج': { name: 'جيم', val: 53 },
    'د': { name: 'دال', val: 35 },
    'ه': { name: 'ها', val: 6 },
    'ة': { name: 'تا', val: 401 },
    'و': { name: 'واو', val: 13 },
    'ؤ': { name: 'واو', val: 13 },
    'ز': { name: 'زاي', val: 18 },
    'ح': { name: 'حا', val: 9 },
    'ط': { name: 'طا', val: 10 },
    'ي': { name: 'يا', val: 11 },
    'ى': { name: 'ألف مقصورة', val: 402 },
    'ئ': { name: 'يا', val: 11 },
    'ك': { name: 'كاف', val: 101 },
    'ل': { name: 'لام', val: 71 },
    'م': { name: 'ميم', val: 90 },
    'ن': { name: 'نون', val: 106 },
    'س': { name: 'سين', val: 120 },
    'ع': { name: 'عين', val: 130 },
    'ف': { name: 'فا', val: 81 },
    'ص': { name: 'صاد', val: 95 },
    'ق': { name: 'قاف', val: 181 },
    'ر': { name: 'را', val: 201 },
    'ش': { name: 'شين', val: 360 },
    'ت': { name: 'تا', val: 401 },
    'ث': { name: 'ثا', val: 501 },
    'خ': { name: 'خا', val: 601 },
    'ذ': { name: 'ذال', val: 731 },
    'ض': { name: 'ضاد', val: 805 },
    'ظ': { name: 'ظا', val: 901 },
    'غ': { name: 'غين', val: 1060 }
  };

  // Strip diacritics / vowels (Tashkeel)
  function stripDiacritics(text) {
    if (!text) return '';
    return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  }

  // Pure clean Arabic letters
  function extractArabicLetters(text) {
    const stripped = stripDiacritics(text);
    return stripped.replace(/[^\u0621-\u064A\u0671]/g, '');
  }

  // ===================================================================
  // ABJAD CALCULATORS
  // ===================================================================
  function calculateAbjadKebir(text, useTaaMarbuta400 = true) {
    const clean = extractArabicLetters(text);
    let total = 0;
    const breakdown = [];

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      let val = ABJAD_KEBIR_TABLE[char] || 0;
      if (char === 'ة' && useTaaMarbuta400) {
        val = 400;
      }
      if (val > 0) {
        total += val;
        breakdown.push({ char, val });
      }
    }

    return { total, count: breakdown.length, breakdown };
  }

  function calculateAbjadSagir(totalKebir) {
    if (typeof totalKebir !== 'number' || totalKebir <= 0) return 0;
    let n = totalKebir;
    while (n >= 10) {
      let sum = 0;
      String(n).split('').forEach(d => { sum += parseInt(d, 10); });
      n = sum;
    }
    return n;
  }

  function calculateAbjadBast(text) {
    const clean = extractArabicLetters(text);
    let total = 0;
    const details = [];

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      const entry = LETTER_NAMES_BAST[char];
      if (entry) {
        total += entry.val;
        details.push({ char, name: entry.name, val: entry.val });
      }
    }

    return { total, count: details.length, details };
  }

  // ===================================================================
  // NUMBER THEORY & PRIME FACTORIZATION
  // ===================================================================
  function isPrime(n) {
    if (typeof n !== 'number' || isNaN(n) || n < 2) return false;
    if (n === 2 || n === 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  function getPrimeFactors(n) {
    if (typeof n !== 'number' || n < 2) {
      return { n, isPrime: false, factors: [], formatted: `${n}`, divisorCount: 1, divisorSum: n };
    }

    if (isPrime(n)) {
      return {
        n,
        isPrime: true,
        factors: [{ prime: n, power: 1 }],
        formatted: `${n} (Asal Sayı)`,
        divisorCount: 2,
        divisorSum: n + 1
      };
    }

    let temp = n;
    const factorMap = {};

    // Check 2
    while (temp % 2 === 0) {
      factorMap[2] = (factorMap[2] || 0) + 1;
      temp = Math.floor(temp / 2);
    }
    // Check 3
    while (temp % 3 === 0) {
      factorMap[3] = (factorMap[3] || 0) + 1;
      temp = Math.floor(temp / 3);
    }
    // Check 6k +- 1
    for (let d = 5; d * d <= temp; d += 6) {
      while (temp % d === 0) {
        factorMap[d] = (factorMap[d] || 0) + 1;
        temp = Math.floor(temp / d);
      }
      while (temp % (d + 2) === 0) {
        factorMap[d + 2] = (factorMap[d + 2] || 0) + 1;
        temp = Math.floor(temp / (d + 2));
      }
    }
    if (temp > 1) {
      factorMap[temp] = (factorMap[temp] || 0) + 1;
    }

    const factors = Object.keys(factorMap).map(k => ({
      prime: parseInt(k, 10),
      power: factorMap[k]
    })).sort((a, b) => a.prime - b.prime);

    // Divisor count d(n) and divisor sum sigma(n)
    let divisorCount = 1;
    let divisorSum = 1;
    factors.forEach(f => {
      divisorCount *= (f.power + 1);
      let term = 0;
      for (let p = 0; p <= f.power; p++) {
        term += Math.pow(f.prime, p);
      }
      divisorSum *= term;
    });

    const formatted = factors.map(f => f.power === 1 ? `${f.prime}` : `${f.prime}^${f.power}`).join(' × ');

    return {
      n,
      isPrime: false,
      factors,
      formatted,
      divisorCount,
      divisorSum
    };
  }

  function getNearestPrimes(n) {
    if (n < 2) return { prev: null, next: 2 };
    
    // Nearest previous prime
    let prev = null;
    for (let p = n - 1; p >= 2; p--) {
      if (isPrime(p)) {
        prev = p;
        break;
      }
    }

    // Nearest next prime
    let next = null;
    for (let p = n + 1; p <= n + 2000; p++) {
      if (isPrime(p)) {
        next = p;
        break;
      }
    }

    return { prev, next };
  }

  // ===================================================================
  // DIVISIBILITY & SYMMETRY CODES
  // ===================================================================
  function checkDivisibilityCodes(val) {
    if (typeof val !== 'number' || val <= 0) {
      return { is19: false, rem19: 0, is7: false, rem7: 0, isDualHarmonic: false };
    }
    const rem19 = val % 19;
    const rem7 = val % 7;
    return {
      is19: rem19 === 0,
      rem19,
      is7: rem7 === 0,
      rem7,
      isDualHarmonic: (rem19 === 0 && rem7 === 0),
      multiplier19: rem19 === 0 ? val / 19 : null,
      multiplier7: rem7 === 0 ? val / 7 : null
    };
  }

  // ===================================================================
  // STATISTICAL COMBINATORICS & PROBABILITY
  // ===================================================================
  // Log-factorial for large combinations
  function logFactorial(n) {
    if (n <= 1) return 0;
    let sum = 0;
    for (let i = 2; i <= n; i++) {
      sum += Math.log(i);
    }
    return sum;
  }

  function logComb(n, k) {
    if (k < 0 || k > n) return -Infinity;
    return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  }

  // Hypergeometric distribution P(X = k)
  function hypergeometricProbability(k, N, K, n) {
    if (k < Math.max(0, n - (N - K)) || k > Math.min(n, K)) return 0;
    const logP = logComb(K, k) + logComb(N - K, n - k) - logComb(N, n);
    return Math.exp(logP);
  }

  // Shannon Entropy of letter sequences
  function calculateLetterEntropy(text) {
    const letters = extractArabicLetters(text);
    if (!letters.length) return 0;

    const freqMap = {};
    for (let i = 0; i < letters.length; i++) {
      const c = letters[i];
      freqMap[c] = (freqMap[c] || 0) + 1;
    }

    const total = letters.length;
    let entropy = 0;
    Object.values(freqMap).forEach(count => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });

    return {
      entropy: parseFloat(entropy.toFixed(4)),
      distinctCount: Object.keys(freqMap).length,
      totalCount: total,
      freqMap
    };
  }

  // ===================================================================
  // FULL SURAH LETTER FREQUENCY SPECTRUM
  // ===================================================================
  function getLetterFrequencySpectrum(text) {
    const letters = extractArabicLetters(text);
    const counts = {};
    const ARABIC_ALPHABET = [
      'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
      'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
      'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'
    ];

    ARABIC_ALPHABET.forEach(char => { counts[char] = 0; });

    for (let i = 0; i < letters.length; i++) {
      let char = letters[i];
      // Normalize alif/hamza forms for pure alphabet tally
      if (['أ', 'إ', 'آ', 'ء', 'ٱ'].includes(char)) char = 'ا';
      if (['ة'].includes(char)) char = 'ه';
      if (['ى', 'ئ'].includes(char)) char = 'ي';
      if (['ؤ'].includes(char)) char = 'و';

      if (counts[char] !== undefined) {
        counts[char]++;
      }
    }

    const spectrum = ARABIC_ALPHABET.map(char => {
      const count = counts[char] || 0;
      const abjad = ABJAD_KEBIR_TABLE[char] || 0;
      return {
        char,
        count,
        percentage: letters.length > 0 ? ((count / letters.length) * 100).toFixed(2) : '0.00',
        abjad,
        totalAbjad: count * abjad
      };
    }).sort((a, b) => b.count - a.count);

    return {
      totalLetters: letters.length,
      spectrum
    };
  }

  // ===================================================================
  // RETINA-CRISP CANVAS RENDERERS (Native, Zero Dependency)
  // ===================================================================
  function setupHiDpiCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  function drawLetterBarChart(canvasId, text, isDarkTheme = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const width = canvas.parentElement ? canvas.parentElement.clientWidth : 340;
    const height = 180;
    const ctx = setupHiDpiCanvas(canvas, width, height);

    const { totalLetters, spectrum } = getLetterFrequencySpectrum(text);
    if (totalLetters === 0) {
      ctx.fillStyle = isDarkTheme ? 'rgba(255,255,255,0.4)' : '#666';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Veri bulunamadı', width / 2, height / 2);
      return;
    }

    const top12 = spectrum.slice(0, 12);
    const maxCount = Math.max(...top12.map(item => item.count), 1);

    const padding = { top: 25, right: 15, bottom: 35, left: 25 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const barWidth = Math.max(12, Math.floor(chartW / top12.length) - 6);

    // Grid lines
    ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(width - padding.right, padding.top);
    ctx.moveTo(padding.left, padding.top + chartH / 2);
    ctx.lineTo(width - padding.right, padding.top + chartH / 2);
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(width - padding.right, padding.top + chartH);
    ctx.stroke();

    // Bars
    top12.forEach((item, index) => {
      const x = padding.left + index * (chartW / top12.length) + ((chartW / top12.length) - barWidth) / 2;
      const barH = (item.count / maxCount) * chartH;
      const y = padding.top + chartH - barH;

      // Bar gradient (Gold to Amber)
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (item.abjad % 19 === 0) {
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#059669');
      } else {
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#b45309');
      }

      ctx.fillStyle = grad;
      // Rounded bar top
      const r = Math.min(3, barWidth / 2);
      ctx.beginPath();
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.closePath();
      ctx.fill();

      // Top count label
      ctx.fillStyle = isDarkTheme ? '#d1d5db' : '#374151';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.count, x + barWidth / 2, y - 6);

      // Bottom Arabic letter
      ctx.fillStyle = isDarkTheme ? '#fbbf24' : '#92400e';
      ctx.font = '14px "Amiri", "Traditional Arabic", serif';
      ctx.fillText(item.char, x + barWidth / 2, padding.top + chartH + 18);
    });
  }

  function drawPrimeFactorTree(canvasId, number, isDarkTheme = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const width = canvas.parentElement ? canvas.parentElement.clientWidth : 340;
    const height = 130;
    const ctx = setupHiDpiCanvas(canvas, width, height);

    const factorData = getPrimeFactors(number);
    ctx.clearRect(0, 0, width, height);

    // Root Node (The number)
    const rootX = width / 2;
    const rootY = 24;

    ctx.fillStyle = isDarkTheme ? '#fbbf24' : '#b45309';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${number}`, rootX, rootY);

    if (factorData.isPrime) {
      ctx.fillStyle = '#10b981';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('★ Asal Sayı (Bölünemez)', rootX, rootY + 28);
      return;
    }

    // Leaf Nodes (Prime Factors)
    const leaves = [];
    factorData.factors.forEach(f => {
      for (let i = 0; i < f.power; i++) {
        leaves.push(f.prime);
      }
    });

    const leafY = height - 24;
    const spacing = width / (leaves.length + 1);

    leaves.forEach((prime, idx) => {
      const leafX = spacing * (idx + 1);

      // Connecting branch line
      ctx.strokeStyle = isDarkTheme ? 'rgba(251, 191, 36, 0.35)' : 'rgba(180, 83, 9, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY + 8);
      ctx.lineTo(leafX, leafY - 14);
      ctx.stroke();

      // Leaf circle badge
      ctx.fillStyle = isDarkTheme ? '#1e293b' : '#f1f5f9';
      ctx.beginPath();
      ctx.arc(leafX, leafY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDarkTheme ? '#10b981' : '#059669';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Prime number text
      ctx.fillStyle = isDarkTheme ? '#10b981' : '#047857';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${prime}`, leafX, leafY);
    });
  }

  // 12. WORD-LEVEL LETTER SYMMETRY (Baş, Orta [Vasat], Hitam [Son] Harfleri)
  const LETTER_TR_NAMES = {
    'ا': 'Elif', 'أ': 'Elif', 'إ': 'Elif', 'آ': 'Elif', 'ٱ': 'Elif', 'ء': 'Hemze',
    'ب': 'Bâ', 'ت': 'Tâ', 'ث': 'Sâ', 'ج': 'Cîm', 'ح': 'Hâ', 'خ': 'Hı',
    'د': 'Dâl', 'ذ': 'Zâl', 'ر': 'Râ', 'ز': 'Zây', 'س': 'Sîn', 'ش': 'Şîn',
    'ص': 'Sâd', 'ض': 'Dâd', 'ط': 'Tı', 'ظ': 'Zı', 'ع': 'Ayn', 'غ': 'Gayn',
    'ف': 'Fâ', 'ق': 'Kâf', 'ك': 'Kef', 'ل': 'Lâm', 'م': 'Mîm', 'ن': 'Nûn',
    'ه': 'Hê', 'ة': 'Tâ-i Marbûta', 'و': 'Vâv', 'ؤ': 'Vâv', 'ي': 'Yâ', 'ى': 'Elif-i Maksûre', 'ئ': 'Yâ'
  };

  function getWordLetterSymmetry(wordClean) {
    if (!wordClean) return null;
    const chars = Array.from(wordClean).filter(c => ABJAD_KEBIR_TABLE[c] !== undefined);
    const total = chars.length;
    if (total === 0) return null;

    const letterDetails = chars.map((c, idx) => {
      const val = ABJAD_KEBIR_TABLE[c];
      const sagir = (val % 9 === 0) ? 9 : (val % 9);
      let position = 'body';
      if (idx === 0) position = 'start';
      else if (idx === total - 1) position = 'end';
      else if (total % 2 === 1 && idx === Math.floor(total / 2)) position = 'middle';
      else if (total % 2 === 0 && (idx === total / 2 - 1 || idx === total / 2)) position = 'middle';

      return {
        idx: idx + 1,
        char: c,
        name: LETTER_TR_NAMES[c] || c,
        abjad: val,
        sagir: sagir,
        is_prime: isPrime(val),
        position: position
      };
    });

    const startLetter = letterDetails[0];
    const endLetter = letterDetails[total - 1];

    let middleLetter = null;
    if (total === 1) {
      middleLetter = startLetter;
    } else if (total % 2 === 1) {
      middleLetter = letterDetails[Math.floor(total / 2)];
    } else {
      const midIdx = total / 2 - 1;
      const m1 = letterDetails[midIdx];
      const m2 = letterDetails[midIdx + 1];
      middleLetter = {
        ...m1,
        pairChar: m2.char,
        pairName: m2.name,
        pairAbjad: m2.abjad,
        isPair: true
      };
    }

    return {
      totalLetters: total,
      letters: letterDetails,
      start: startLetter,
      middle: middleLetter,
      end: endLetter
    };
  }

  // EXPORT ENGINE GLOBALLY
  global.QuranMathProcessor = {
    stripDiacritics,
    extractArabicLetters,
    calculateAbjadKebir,
    calculateAbjadSagir,
    calculateAbjadBast,
    isPrime,
    getPrimeFactors,
    getNearestPrimes,
    checkDivisibilityCodes,
    hypergeometricProbability,
    calculateLetterEntropy,
    getLetterFrequencySpectrum,
    drawLetterBarChart,
    drawPrimeFactorTree,
    getWordLetterSymmetry,
    LETTER_TR_NAMES
  };

})(typeof window !== 'undefined' ? window : this);

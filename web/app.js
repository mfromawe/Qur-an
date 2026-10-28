/**
 * app.js - Kur'an-ı Kerim Web Uygulaması İstemci Motoru
 * Vanilla JavaScript (ES6+), yüksek performans, ses oynatıcı, mucize analizi,
 * 28 harf dökümü, 57/57 simetri matrisi ve merkez simetri noktaları.
 */

// Uygulama Durumu (State)
const AppState = {
  currentTab: 'reader',
  language: 'tr', // 'tr', 'en', 'ar'
  theme: localStorage.getItem('quran_theme') || 'parchment',
  foreignEdition: 'none',
  foreignVerses: {},
  calcPreferences: {
    ebcedKebir: true,
    ebcedSagir: true,
    letterCount: true,
    code197: true,
    primeFactors: true,
    probability: true,
    letterTable: true,
    ayahMatrix: true
  },
  surahs: [],
  currentSurahId: 1,
  currentSurahData: null,
  lastReadPosition: (function() {
    try {
      const s = localStorage.getItem('quran_reading_position');
      if (s) return JSON.parse(s);
    } catch(e) {}
    return { surahNumber: 1, verseNumber: 1, key: '1:1', page: 1, juz: 1 };
  })(),
  fontSize: 32, // px
  readerMode: {
    scriptType: 'uthmani', // 'uthmani' (harekeli) or 'clean' (harekesiz)
    layout: 'wbw',         // 'wbw' (interlinear) or 'flowing' (akıcı)
    wbwLang: 'tr'          // 'tr' or 'en'
  },
  viewSettings: {
    diyanet: true,
    yazir: true,
    en: false,
    translit: true,
    cleanArabic: false
  },
  audio: {
    element: null,
    isPlaying: false,
    currentVerse: null,
    currentSurahNumber: 1,
    currentVerseNumber: 1,
    autoAdvance: true
  },
  miracles: [],
  symmetryData: null,
  patternsSubtab: 'letters',
  positionLevel: 'quran',
  mathInspector: {
    pinned: true,
    activeSubtab: 'morphology',
    activeWord: null,
    activeVerse: null,
    isLocked: false,
    lockedWord: null,
    lockedVerse: null,
    lockedElement: null
  },
  hadith: {
    loaded: false,
    activeCollection: 'all',
    activeBook: null,
    collections: [],
    searchQuery: ''
  },
  delail: {
    loaded: false,
    data: null,
    activeDay: 1,
    subtab: 'hizib',
    tasbeeh: { count: 0, target: 100, sound: true }
  },
  visualizer: {
    activeSub: 'parity',
    animationId: null
  },
  nurmuhammad: {
    loaded: false,
    data: null,
    activeLetter: null,
    subtab: 'nuqta'
  },
  multiScale: {
    level: 'quran',
    juz: 1,
    surah: 1,
    verse: 1,
    centerOnly: false,
    primesHighlight: true,
    meal: 'diyanet'
  }
};

// =================================================================
// ÇOKLU DİL (I18N / MULTILINGUAL) SÖZLÜĞÜ (TR, EN, AR)
// =================================================================
const I18N = {
  tr: {
    appTitle: "KUR'ÂN-I KERÎM",
    appSubtitle: "İlim, Örüntüler, Delâilü'l-Hayrât & Mucizeler",
    tabReader: "Mushaf & Mealler",
    tabDelail: "Delâilü'l-Hayrât",
    tabPatterns: "Örüntüler & Simetri",
    tabVisualizer: "Görselleştirmeler",
    tabNurMuhammad: "Esrâr-ı Hurûf (Nur Muhammad)",
    tabMiracles: "Mucizeler & Kelimeler",
    tabAbjad: "Ebced / Cifir",
    tabSearch: "Arama",
    modeVocalized: "Harekeli (Osmanî)",
    modeUnvocalized: "Harekesiz (Yalın)",
    modeWbw: "Kelime Kelime Meal",
    modeFlowing: "Akıcı Mushaf",
    lblTranslations: "Mealler:",
    inspLiveMath: "CANLI MATEMATİK",
    inspTitle: "Ayet & Kelime Müfettişi",
    wordStart: "🟢 Başlangıç Kelimesi (1. Kelime)",
    wordCenter: "🟡 Vasat (Merkez) Kelimesi",
    wordEnd: "🔴 Hitam / Bitiş Kelimesi",
    wordBody: "⚪ Gövde Kelimesi",
    layer_vocalized: "Orijinal Harekeli",
    layer_clean_bare: "Harekesiz (Sade)",
    layer_root: "Sülâsî Kök",
    layer_breakout: "Harf Harf Ayrıştırma & Ebced"
  },
  en: {
    appTitle: "THE HOLY QURAN",
    appSubtitle: "Knowledge, Sacred Patterns, Dalail al-Khayrat & Realities",
    tabReader: "Mushaf & Translations",
    tabDelail: "Dalail al-Khayrat",
    tabPatterns: "Patterns & Symmetry",
    tabVisualizer: "Visualizations",
    tabNurMuhammad: "Esoteric Realities (Nur Muhammad)",
    tabMiracles: "Miracles & Words",
    tabAbjad: "Abjad / Numerics",
    tabSearch: "Search",
    modeVocalized: "Vocalized (Uthmani)",
    modeUnvocalized: "Unvocalized (Clean)",
    modeWbw: "Word-by-Word Interlinear",
    modeFlowing: "Flowing Text",
    lblTranslations: "Translations:",
    inspLiveMath: "LIVE MATHEMATICS",
    inspTitle: "Ayah & Word Inspector",
    wordStart: "🟢 Opening Word (1st Word)",
    wordCenter: "🟡 Center / Vasat Word",
    wordEnd: "🔴 Concluding Word",
    wordBody: "⚪ Body Word",
    layer_vocalized: "Original Vocalized",
    layer_clean_bare: "Bare Script",
    layer_root: "Triliteral Root",
    layer_breakout: "Letter Breakout & Abjad"
  },
  ar: {
    appTitle: "الْقُرْآنُ الْكَرِيمُ",
    appSubtitle: "العلوم والإعجاز ودلائل الخيرات والأنوار المحمدية",
    tabReader: "المصحف والتفاسير",
    tabDelail: "دلائل الخيرات",
    tabPatterns: "التماثل والأنماط",
    tabVisualizer: "المخططات التفاعلية",
    tabNurMuhammad: "أسرار الحروف ونور محمد",
    tabMiracles: "الإعجاز والكلمات",
    tabAbjad: "حساب الجمل",
    tabSearch: "البحث الشامل",
    modeVocalized: "بالتشكيل (عثماني)",
    modeUnvocalized: "بدون تشكيل (رسم قديم)",
    modeWbw: "ترجمة كلمة بكلمة",
    modeFlowing: "قراءة متصلة",
    lblTranslations: "التفاسير والترجمات:",
    inspLiveMath: "التحليل الرقمي الحي",
    inspTitle: "مفتش الآيات والكلمات",
    wordStart: "🟢 بداية الآية (الكلمة الأولى)",
    wordCenter: "🟡 واسطة العقد (المركز)",
    wordEnd: "🔴 ختام الآية",
    wordBody: "⚪ متن الآية"
  }
};


// Klasik Ebced Değerleri Tablosu
const ABJAD_TABLE = {
  'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ٱ': 1, 'ء': 1,
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
};

// Harf İsimleri Tablosu
const LETTER_NAMES = {
  'ا': 'Elif', 'أ': 'Elif', 'إ': 'Elif', 'آ': 'Elif', 'ٱ': 'Elif', 'ء': 'Hemze', 'ئ': 'Hemze', 'ؤ': 'Hemze',
  'ب': 'Bâ',
  'ج': 'Cîm',
  'د': 'Dâl',
  'ه': 'He', 'ة': 'Tâ-i Merbûta',
  'و': 'Vâv',
  'ز': 'Ze',
  'ح': 'Hâ',
  'ط': 'Tı',
  'ي': 'Yâ', 'ى': 'Elif-i Maksûre',
  'ك': 'Kâf',
  'ل': 'Lâm',
  'م': 'Mîm',
  'ن': 'Nûn',
  'س': 'Sîn',
  'ع': 'Ayn',
  'ف': 'Fe',
  'ص': 'Sâd',
  'ق': 'Kâf',
  'ر': 'Râ',
  'ش': 'Şîn',
  'ت': 'Te',
  'ث': 'Se',
  'خ': 'Hı',
  'ذ': 'Zel',
  'ض': 'Dâd',
  'ظ': 'Zı',
  'غ': 'Gayn'
};

function getArabicLetterName(ch) {
  return LETTER_NAMES[ch] || ch;
}

// Asal Sayı ve Çarpan Yardımcıları
function isPrimeNumber(n) {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function getPrimeFactors(n) {
  if (n <= 1) return [];
  const factors = [];
  let d = 2;
  let temp = n;
  while (temp % d === 0) {
    factors.push(d);
    temp /= d;
  }
  d = 3;
  while (d * d <= temp) {
    while (temp % d === 0) {
      factors.push(d);
      temp /= d;
    }
    d += 2;
  }
  if (temp > 1) factors.push(temp);
  return factors;
}

function formatPrimeFactorsFormula(n, factors) {
  if (!factors || factors.length === 0) return `${n}`;
  if (factors.length === 1) return `${n} (Asal Sayı)`;
  const counts = {};
  factors.forEach(f => { counts[f] = (counts[f] || 0) + 1; });
  const parts = Object.keys(counts).map(k => {
    const power = counts[k];
    return power > 1 ? `${k}<sup>${power}</sup>` : `${k}`;
  });
  return `${n} = ${parts.join(' × ')}`;
}

function computeArabicMetrics(text) {
  let kebir = 0;
  let letters = 0;
  const breakdown = [];

  for (const ch of text) {
    if (ABJAD_TABLE[ch] !== undefined) {
      const val = ABJAD_TABLE[ch];
      kebir += val;
      letters++;
      breakdown.push({
        char: ch,
        name: getArabicLetterName(ch),
        val: val,
        is_prime: isPrimeNumber(val)
      });
    }
  }

  const sagir = (kebir % 9 === 0 && kebir > 0) ? 9 : (kebir % 9);
  const factors = getPrimeFactors(kebir);

  return {
    text,
    kebir,
    sagir,
    letters,
    is_prime_kebir: isPrimeNumber(kebir),
    is_prime_letters: isPrimeNumber(letters),
    factors,
    breakdown
  };
}

// Arapça Hareke & Morfoloji (Esre, Ötre, Fetha, Cezim, Şedde, Tenvin, Med) Analizörü
function analyzeArabicVocalization(wordStr) {
  if (!wordStr) return { word: '', gramType: 'Bilinmeyen', fetha: [], esre: [], otre: [], cezim: [], sedde: [], tenvin: [], med: [], explanation: '' };

  const FATHA = '\u064E';      // َ  Fetha / Üstün
  const KASRA = '\u0650';      // ِ  Kesre / Esre
  const DAMMA = '\u064F';      // ُ  Damme / Ötre
  const SUKUN = '\u0652';      // ْ  Sukûn / Cezim
  const SHADDA = '\u0651';     // ّ  Şedde
  const FATHATAN = '\u064B';   // ً  İki Üstün
  const KASRATAN = '\u064D';   // ٍ  İki Esre
  const DAMMATAN = '\u064C';   // ٌ  İki Ötre
  const DAGGER_ALIF = '\u0670';// ٰ  Çeker Elif
  const QURAN_SUKUN = '\u06E1';// ۡ  Kur'an Cezmi
  const MADDAH = '\u0653';     // ٓ  Med

  const fethaList = [];
  const esreList = [];
  const otreList = [];
  const cezimList = [];
  const seddeList = [];
  const tenvinList = [];
  const medList = [];

  const chars = Array.from(wordStr);
  let currentLetter = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/[\u0621-\u064A\u0671\u0629]/.test(ch)) {
      currentLetter = ch;
    } else {
      const prev = currentLetter || 'Harf';
      if (ch === FATHA) fethaList.push(prev);
      else if (ch === KASRA) esreList.push(prev);
      else if (ch === DAMMA) otreList.push(prev);
      else if (ch === SUKUN || ch === QURAN_SUKUN) cezimList.push(prev);
      else if (ch === SHADDA) seddeList.push(prev);
      else if (ch === FATHATAN) tenvinList.push(`${prev} (-an)`);
      else if (ch === KASRATAN) tenvinList.push(`${prev} (-in)`);
      else if (ch === DAMMATAN) tenvinList.push(`${prev} (-un)`);
      else if (ch === DAGGER_ALIF || ch === MADDAH) medList.push(prev);
    }
  }

  // Determine Grammatical & Vocalization Type
  let gramType = 'Kelime';
  const cleanBare = wordStr.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

  if (['أم', 'او', 'إن', 'أن', 'لا', 'ما', 'في', 'من', 'إلى', 'على', 'ثم', 'حتى', 'بل', 'عن'].includes(cleanBare) || wordStr === 'أَمْ' || wordStr === 'إِنَّ') {
    gramType = 'Harf / Edat / Bağlaç';
  } else if (cleanBare.endsWith('وا') || cleanBare.endsWith('ت') || cleanBare.endsWith('تم') || cleanBare.endsWith('نا')) {
    gramType = 'Mazi Fiil (Geçmiş Zaman Kipi)';
  } else if (/^[يتنأ]/.test(cleanBare) && (cezimList.length > 0 || otreList.length > 0)) {
    gramType = 'Muzari Fiil (Geniş/Şimdiki Zaman) veya Fiil Türevi';
  } else if (cleanBare.startsWith('ال') || tenvinList.length > 0 || cleanBare.endsWith('ة') || esreList.length > 0) {
    gramType = 'İsim / Sıfat / Tamlama';
  }

  // Create formatted explanation
  const parts = [];
  if (fethaList.length > 0) parts.push(`Fetha [Üstün] (${fethaList.join(', ')})`);
  if (esreList.length > 0) parts.push(`Kesre [Esre] (${esreList.join(', ')})`);
  if (otreList.length > 0) parts.push(`Damme [Ötre] (${otreList.join(', ')})`);
  if (cezimList.length > 0) parts.push(`Sukûn [Cezim] (${cezimList.join(', ')})`);
  if (seddeList.length > 0) parts.push(`Şedde [Teşdid] (${seddeList.join(', ')})`);
  if (tenvinList.length > 0) parts.push(`Tenvin (${tenvinList.join(', ')})`);
  if (medList.length > 0) parts.push(`Med/Uzatma (${medList.join(', ')})`);

  const explanation = parts.length > 0 ? parts.join(' • ') : 'Sade imla / Harekesiz';

  return {
    word: wordStr,
    cleanBare,
    gramType,
    fetha: fethaList,
    esre: esreList,
    otre: otreList,
    cezim: cezimList,
    sedde: seddeList,
    tenvin: tenvinList,
    med: medList,
    explanation
  };
}

function renderHarekeChipsHtml(voc) {
  if (!voc) return '';
  let html = '';
  if (voc.fetha && voc.fetha.length > 0) {
    html += `<span class="phc-chip fetha" title="Fetha / Üstün">🟢 Fetha: ${escapeHtml(voc.fetha.join(', '))}</span>`;
  }
  if (voc.esre && voc.esre.length > 0) {
    html += `<span class="phc-chip esre" title="Kesre / Esre">🔵 Esre: ${escapeHtml(voc.esre.join(', '))}</span>`;
  }
  if (voc.otre && voc.otre.length > 0) {
    html += `<span class="phc-chip otre" title="Damme / Ötre">🟠 Ötre: ${escapeHtml(voc.otre.join(', '))}</span>`;
  }
  if (voc.cezim && voc.cezim.length > 0) {
    html += `<span class="phc-chip cezim" title="Sukûn / Cezim">⚪ Cezim: ${escapeHtml(voc.cezim.join(', '))}</span>`;
  }
  if (voc.sedde && voc.sedde.length > 0) {
    html += `<span class="phc-chip sedde" title="Şedde / Teşdid">🟣 Şedde: ${escapeHtml(voc.sedde.join(', '))}</span>`;
  }
  if (voc.tenvin && voc.tenvin.length > 0) {
    html += `<span class="phc-chip tenvin" title="Tenvin">🟡 Tenvin: ${escapeHtml(voc.tenvin.join(', '))}</span>`;
  }
  if (voc.med && voc.med.length > 0) {
    html += `<span class="phc-chip med" title="Med / Çekme">✨ Med: ${escapeHtml(voc.med.join(', '))}</span>`;
  }
  if (!html) {
    html = `<span class="phc-chip cezim">Sade / Harekeli Olmayan Metin</span>`;
  }
  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Klasik Ebced Harfleri (Sanal Klavye için)
const ARABIC_ALPHABET = [
  'ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ي',
  'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
  'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ', 'ء', 'ة', 'ى'
];


// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initThemeSwitcher();
  initAudio();
  initLanguageSwitcher();
  initNavTabs();
  initViewToggles();
  initReaderControls();
  initCalculationPreferences();
  initForeignLanguages();
  initFontScaler();
  initAbjadModule();
  initSearchModule();
  initMiraclesModule();
  initPatternsModule();
  initDelailModule();
  initHadithModule();
  initVisualizerModule();
  initMathInspector();
  initSelectionEbced();
  initNurMuhammadModule();
  initFocusMode();
  initHamburgerMenu();
  initVerseOutreach();
  initKeyboardShortcuts();
  initQuranWorkspaceToolbar();
  initSemanticExplorer();
  initDynamicLibrary();

  // Initialize Intelligent Multilingual Language Model Engine
  if (typeof QuranLanguageModel !== 'undefined') {
    QuranLanguageModel.init();
  }

  // Sureleri Yükle
  await loadSurahs();
  // İlk Sureyi (Fâtiha) Yükle
  await loadSurah(1);
});


// =================================================================
// NAVIGATION TABS
// =================================================================
function initNavTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchTab(target);
    });
  });
}

function switchTab(tabId) {
  AppState.currentTab = tabId;
  
  // Tab Butonları
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Paneller
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  const activePane = document.getElementById(`pane-${tabId}`);
  if (activePane) activePane.classList.add('active');

  // Özel Tab Geçiş İşlemleri
  if (tabId === 'hadith') {
    loadHadithModule();
  }
  if (tabId === 'delail') {
    loadDelailData();
  }
  if (tabId === 'visualizer') {
    renderActiveVisualizerCanvas();
  }
  if (tabId === 'miracles' && AppState.miracles.length === 0) {
    loadMiracles();
  }
  if (tabId === 'patterns') {
    if (AppState.patternsSubtab === 'letters') {
      loadSurahLetterAnalysis(AppState.currentSurahId);
    } else if (AppState.patternsSubtab === 'symmetry') {
      loadSymmetryMatrix();
    } else if (AppState.patternsSubtab === 'positions') {
      loadPositions(AppState.positionLevel);
    }
  }
  if (tabId === 'nurmuhammad') {
    loadNurMuhammadData();
  }
  if (tabId === 'roots') {
    initRootsLexicon();
  }
}


// =================================================================
// SURAHS & READER MODULE
// =================================================================
async function loadSurahs() {
  const listEl = document.getElementById('surah-list');
  try {
    const res = await fetch('/api/surahs');
    const data = await res.json();
    AppState.surahs = data.surahs;
    renderSurahList(AppState.surahs);
    populateWorkspaceToolbarSurahSelect(AppState.surahs);
    populateSearchSurahSelect(AppState.surahs);
    populatePatternSurahSelect(AppState.surahs);
  } catch (err) {
    listEl.innerHTML = `<div style="padding:1rem;color:#f87171;">Sureler yüklenirken hata oluştu.</div>`;
  }
}

function renderSurahList(surahs) {
  const listEl = document.getElementById('surah-list');
  listEl.innerHTML = '';

  surahs.forEach(s => {
    const item = document.createElement('div');
    item.className = `surah-item ${s.number === AppState.currentSurahId ? 'active' : ''}`;
    item.id = `surah-item-${s.number}`;
    item.innerHTML = `
      <div class="surah-item-no">${s.number}</div>
      <div class="surah-item-info">
        <div class="surah-item-name-tr">
          <span>${s.name_tr}</span>
          ${s.is_prime_number ? `<span class="badge-prime-yes" style="font-size:0.65rem;">Asal</span>` : ''}
        </div>
        <div class="surah-item-meta">
          <span>${s.city_tr}</span>
          <span>•</span>
          <span>${s.verse_count} Ayet</span>
          <span>•</span>
          <span>İniş: ${s.revelation_order}</span>
        </div>
      </div>
      <div class="surah-item-name-ar">${s.name_ar}</div>
    `;

    item.addEventListener('click', () => {
      loadSurah(s.number);
    });

    listEl.appendChild(item);
  });

  // Sure Arama Filtresi
  const searchInput = document.getElementById('surah-search-input');
  const clearBtn = document.getElementById('surah-search-clear');

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    clearBtn.classList.toggle('hidden', q.length === 0);

    const filtered = AppState.surahs.filter(s => 
      s.number.toString() === q ||
      s.name_tr.toLowerCase().includes(q) ||
      s.name_en.toLowerCase().includes(q) ||
      s.name_ar.includes(q)
    );
    renderSurahList(filtered);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    renderSurahList(AppState.surahs);
  });

  initSidebarSubtabs();
}

function initSidebarSubtabs() {
  const subtabs = document.querySelectorAll('.subtab-btn');
  const surahList = document.getElementById('surah-list');
  const juzGrid = document.getElementById('juz-grid');
  const pageGrid = document.getElementById('page-grid');

  juzGrid.innerHTML = '';
  for (let j = 1; j <= 30; j++) {
    const btn = document.createElement('button');
    btn.className = 'juz-card-btn';
    btn.innerHTML = `<strong>${j}. Cüz</strong>`;
    btn.addEventListener('click', () => loadJuz(j));
    juzGrid.appendChild(btn);
  }

  const pageChips = document.getElementById('page-quick-chips');
  pageChips.innerHTML = '';
  const samplePages = [1, 2, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 604];
  samplePages.forEach(p => {
    const chip = document.createElement('button');
    chip.className = 'page-chip-btn';
    chip.innerText = `S. ${p}`;
    chip.addEventListener('click', () => loadPage(p));
    pageChips.appendChild(chip);
  });

  document.getElementById('btn-jump-page').addEventListener('click', () => {
    const val = parseInt(document.getElementById('page-jump-input').value, 10);
    if (val >= 1 && val <= 604) loadPage(val);
  });

  subtabs.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.subtab;

      surahList.classList.toggle('hidden', target !== 'surahs');
      juzGrid.classList.toggle('hidden', target !== 'juz');
      pageGrid.classList.toggle('hidden', target !== 'page');
    });
  });
}

async function loadSurah(surahNumber, targetVerseNumber = null, targetPage = null) {
  AppState.currentSurahId = surahNumber;
  AppState.mathInspector.activeWord = null;
  AppState.mathInspector.activeVerse = null;
  
  // Toolbar dropdown sync
  const tbSelect = document.getElementById('tb-surah-select');
  if (tbSelect && tbSelect.value !== String(surahNumber)) {
    tbSelect.value = String(surahNumber);
  }

  document.querySelectorAll('.surah-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`surah-item-${surahNumber}`);
  if (activeItem) {
    activeItem.classList.add('active');
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const streamEl = document.getElementById('verses-stream');
  streamEl.innerHTML = `<div class="loader-spinner"></div>`;

  try {
    const res = await fetch(`/api/surah/${surahNumber}`);
    const data = await res.json();
    AppState.currentSurahData = data;

    if (AppState.foreignEdition && AppState.foreignEdition !== 'none') {
      await loadForeignTranslation(surahNumber, AppState.foreignEdition);
    }

    renderSurahHero(data);
    renderVersesStream(data.verses);

    const bismillahPlate = document.getElementById('bismillah-plate');
    if (bismillahPlate) {
      bismillahPlate.classList.toggle('hidden', surahNumber === 9 || surahNumber === 1);
    }

    if (targetVerseNumber) {
      setTimeout(() => {
        scrollToTargetVerse(`${surahNumber}:${targetVerseNumber}`, targetVerseNumber, targetPage);
      }, 120);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error('loadSurah error:', err);
    streamEl.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;">Sure yüklenirken hata oluştu.</div>`;
  }
}

function renderSurahHero(data) {
  document.getElementById('hero-arabic-title').innerText = data.name_ar;
  document.getElementById('hero-tr-title').innerText = `${data.name_tr} Suresi`;
  document.getElementById('hero-en-title').innerText = `(${data.name_en_translation || data.name_en})`;
  document.getElementById('hero-city-badge').innerText = data.city_tr;
  document.getElementById('hero-order-badge').innerText = `İniş Sırası: ${data.revelation_order}`;
  document.getElementById('hero-verse-count-badge').innerText = `${data.verse_count} Ayet`;
  document.getElementById('hero-words-count').innerText = data.total_words.toLocaleString('tr-TR');
  document.getElementById('hero-letters-count').innerText = data.total_letters.toLocaleString('tr-TR');
  document.getElementById('hero-abjad-count').innerText = data.abjad_value.toLocaleString('tr-TR');

  // Sureyi Dinle Butonu
  const playSurahBtn = document.getElementById('btn-play-surah');
  playSurahBtn.onclick = () => {
    if (data.verses.length > 0) {
      playVerse(data.verses[0]);
    }
  };

  // Sureyi Kopyala
  document.getElementById('btn-copy-surah').onclick = () => {
    let fullText = `${data.name_tr} Suresi (${data.verse_count} Ayet)\n\n`;
    data.verses.forEach(v => {
      fullText += `[${v.key}] ${v.text_uthmani}\n${v.diyanet}\n\n`;
    });
    navigator.clipboard.writeText(fullText).then(() => {
      showToast(`${data.name_tr} suresinin tüm ayetleri panoya kopyalandı.`);
    });
  };

  // Harf & Simetri Analizine Git
  document.getElementById('btn-goto-patterns').onclick = () => {
    switchTab('patterns');
    const select = document.getElementById('pattern-surah-select');
    if (select) select.value = data.number;
    loadSurahLetterAnalysis(data.number);
  };
}

// Reader Layout Switcher (Kelime Kelime Meal vs Sülâsî Kök Modu vs Akıcı Mushaf)
function setReaderLayout(layout) {
  AppState.readerMode.layout = layout;
  ['wbw', 'root', 'flowing'].forEach(l => {
    const tb = document.getElementById(`tb-layout-${l}`);
    if (tb) tb.classList.toggle('active', l === layout);
    const btn = document.getElementById(`btn-layout-${l}`);
    if (btn) btn.classList.toggle('active', l === layout);
  });
  if (AppState.currentSurahData && AppState.currentSurahData.verses) {
    renderVersesStream(AppState.currentSurahData.verses);
  }
}

function renderVersesStream(verses) {
  const streamEl = document.getElementById('verses-stream');
  streamEl.innerHTML = '';

  const isWbw = AppState.readerMode.layout === 'wbw';
  const isRoot = AppState.readerMode.layout === 'root';
  const isClean = AppState.readerMode.scriptType === 'clean';
  const wbwLang = AppState.readerMode.wbwLang || 'tr';

  verses.forEach(v => {
    const card = document.createElement('article');
    card.className = `verse-card ${AppState.audio.currentVerse && AppState.audio.currentVerse.id === v.id ? 'playing' : ''}`;
    card.id = `verse-card-${v.id}`;
    card.setAttribute('data-id', v.id);
    card.setAttribute('data-key', v.key);
    card.setAttribute('data-surah', v.surah_number);
    card.setAttribute('data-verse-number', v.verse_number);
    card.setAttribute('data-page', v.page);
    card.setAttribute('data-juz', v.juz);

    card.addEventListener('click', (e) => {
      if (e.target.closest('button, .ar-word, .wbw-card')) return;
      updateReadingPosition({
        surahNumber: v.surah_number,
        verseNumber: v.verse_number,
        key: v.key,
        page: v.page,
        juz: v.juz,
        id: v.id
      }, true);
    });

    let translationsHtml = '';
    if (AppState.viewSettings.diyanet) {
      translationsHtml += `
        <div class="translation-block diyanet">
          <span class="translation-source-badge">Diyanet Meali</span>
          ${v.diyanet}
        </div>
      `;
    }
    if (AppState.viewSettings.yazir) {
      translationsHtml += `
        <div class="translation-block yazir">
          <span class="translation-source-badge">Elmalılı Hamdi Yazır</span>
          ${v.yazir}
        </div>
      `;
    }
    if (AppState.viewSettings.en) {
      translationsHtml += `
        <div class="translation-block en">
          <span class="translation-source-badge">Sahih International (English)</span>
          ${v.en}
        </div>
      `;
    }
    if (AppState.foreignEdition && AppState.foreignEdition !== 'none') {
      const editionsObj = AppState.foreignVerses[AppState.currentSurahId] || {};
      const foreignData = editionsObj[AppState.foreignEdition];
      if (foreignData && foreignData.verses) {
        const foreignText = foreignData.verses[v.verse_number] || foreignData.verses[String(v.verse_number)];
        if (foreignText) {
          const meta = foreignData.meta || {};
          const label = `${meta.flag || '🌐'} ${meta.name || AppState.foreignEdition} (${meta.author || ''})`;
          translationsHtml += `
            <div class="translation-block foreign">
              <span class="translation-source-badge">${escapeHtml(label)}</span>
              ${escapeHtml(foreignText)}
            </div>
          `;
        }
      }
    }

    // Arapça Kelime Gövdesi: Kelime Kelime Meal vs Sülâsî Kök Modu vs Akıcı Mushaf
    let arabicContentHtml = '';

    if ((isWbw || isRoot) && v.words && v.words.length > 0) {
      // Satır Arası Kart Düzeni (Kelime Meali veya Kök Çalışma Modu)
      const wbwCardsHtml = v.words.map(w => {
        const arWord = isClean ? (w.clean || w.uth) : w.uth;
        const meaning = (wbwLang === 'en') ? (w.en || w.tr || '') : (w.tr || w.en || '');
        const translit = w.translit || '';
        const rootVal = w.root || '';
        const rootCoreMeaning = (w.root_dossier && w.root_dossier.core_meaning) ? w.root_dossier.core_meaning : (w.root_tr || '');

        let innerStudyHtml = '';
        if (isRoot) {
          // Sülâsî Kök Çalışma Metodu (Ayrı İnceleme)
          innerStudyHtml = `
            ${rootVal ? `<span class="wbw-root-badge-study" title="Sülâsî Kök">🌱 ${escapeHtml(rootVal)}</span>` : ''}
            ${rootCoreMeaning ? `<span class="wbw-meaning root-meaning" title="Kök Anlamı">${escapeHtml(rootCoreMeaning)}</span>` : `<span class="wbw-meaning">${escapeHtml(meaning)}</span>`}
            <span class="wbw-context-meaning" title="Ayet İçi Kelime Meali">${escapeHtml(meaning)}</span>
          `;
        } else {
          // Asıl Kelime Kelime Meal Düzeni
          innerStudyHtml = `
            ${translit ? `<span class="wbw-translit">${escapeHtml(translit)}</span>` : ''}
            <span class="wbw-meaning">${escapeHtml(meaning)}</span>
          `;
        }

        return `
          <div class="wbw-card ${w.position} ${isRoot ? 'wbw-root-card' : ''}" 
               data-word-idx="${w.idx}" 
               data-word-total="${v.words.length}"
               data-pos="${w.position}" 
               data-verse-key="${v.key}"
               data-verse-id="${v.id}"
               data-uth="${escapeHtml(w.uth)}" 
               data-clean="${escapeHtml(w.clean)}" 
               data-abjad="${w.abjad}" 
               data-sagir="${w.sagir !== undefined ? w.sagir : (w.abjad % 9 || 9)}" 
               data-letters="${w.letters}"
               data-tr="${escapeHtml(w.tr || '')}"
               data-en="${escapeHtml(w.en || '')}"
               data-translit="${escapeHtml(translit)}"
               data-root="${escapeHtml(rootVal)}"
               data-prime-abjad="${w.is_prime_abjad ? 1 : 0}" 
               data-prime-letters="${w.is_prime_letters ? 1 : 0}">
            <span class="wbw-arabic" style="font-size: ${AppState.fontSize}px;">${arWord}</span>
            ${innerStudyHtml}
            <span class="wbw-abjad-pill">${w.abjad}</span>
          </div>
        `;
      }).join('');

      arabicContentHtml = `<div class="wbw-cards-flow">${wbwCardsHtml}</div>`;
    } else {
      // Akıcı Mushaf Metni
      let wordsTokens = '';
      if (v.words && v.words.length > 0) {
        wordsTokens = v.words.map(w => {
          const arWord = isClean ? (w.clean || w.uth) : w.uth;
          return `<span class="ar-word ${w.position}" 
                        data-word-idx="${w.idx}" 
                        data-word-total="${v.words.length}"
                        data-pos="${w.position}" 
                        data-verse-key="${v.key}"
                        data-verse-id="${v.id}"
                        data-uth="${escapeHtml(w.uth)}" 
                        data-clean="${escapeHtml(w.clean)}" 
                        data-abjad="${w.abjad}" 
                        data-sagir="${w.sagir !== undefined ? w.sagir : (w.abjad % 9 || 9)}" 
                        data-letters="${w.letters}"
                        data-tr="${escapeHtml(w.tr || '')}"
                        data-en="${escapeHtml(w.en || '')}"
                        data-translit="${escapeHtml(w.translit || '')}"
                        data-root="${escapeHtml(w.root || '')}"
                        data-prime-abjad="${w.is_prime_abjad ? 1 : 0}" 
                        data-prime-letters="${w.is_prime_letters ? 1 : 0}">${arWord}</span>`;
        }).join(' ');
      } else {
        wordsTokens = isClean ? v.text_clean : v.text_uthmani;
      }
      arabicContentHtml = `<div class="verse-arabic-uthmani" style="font-size: ${AppState.fontSize}px;">${wordsTokens}</div>`;
    }

    card.innerHTML = `
      <div class="verse-card-header">
        <div class="verse-badge-group">
          <span class="verse-no-badge">${v.key}</span>
          <span class="verse-tag">Cüz ${v.juz}</span>
          <span class="verse-tag">Sayfa ${v.page}</span>
          ${v.is_sajda ? `<span class="sajda-badge">Secde Ayeti</span>` : ''}
          ${v.is_prime_verse ? `<span class="badge-prime-yes" style="font-size:0.68rem;">Ayet No Asal</span>` : ''}
        </div>
        <div class="verse-top-actions">
          <button class="btn-verse-tool btn-verse-play" data-verse-id="${v.id}" title="Ayeti Dinle">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Dinle</span>
          </button>
          <button class="btn-verse-tool btn-verse-copy" title="Ayeti Kopyala">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
      </div>

      ${arabicContentHtml}

      ${(AppState.viewSettings.cleanArabic && !isClean) ? `<div class="verse-arabic-clean">${v.text_clean}</div>` : ''}
      ${AppState.viewSettings.translit ? `<div class="verse-transliteration">${v.transliteration}</div>` : ''}

      <div class="verse-translations-group">
        ${translationsHtml}
      </div>

      <div class="verse-card-footer">
        <div class="verse-stats-chips">
          <span class="stat-chip">Ebced: <strong>${v.abjad.toLocaleString('tr-TR')}</strong></span>
          <span class="stat-chip">Kelime: <strong>${v.word_count}</strong> ${v.is_prime_words ? '<span class="badge-prime-yes" style="font-size:0.65rem;">Asal</span>' : ''}</span>
          <span class="stat-chip">Harf: <strong>${v.letter_count}</strong> ${v.is_prime_letters ? '<span class="badge-prime-yes" style="font-size:0.65rem;">Asal</span>' : ''}</span>
        </div>
        <div>
          <button class="btn-verse-tool btn-verse-abjad-send" title="Ebced hesaplayıcıya aktar">
            <span>Ebced Dökümü</span>
          </button>
        </div>
      </div>
    `;

    // Hem akıcı kelime (.ar-word) hem de kelime kelime kart (.wbw-card) etkileşimleri
    card.querySelectorAll('.ar-word, .wbw-card').forEach(wElem => {
      const getWordObj = () => {
        const wIdx = parseInt(wElem.dataset.wordIdx, 10);
        if (v.words && v.words[wIdx - 1]) return v.words[wIdx - 1];
        return {
          idx: wIdx,
          uth: wElem.dataset.uth,
          clean: wElem.dataset.clean,
          abjad: parseInt(wElem.dataset.abjad, 10),
          sagir: parseInt(wElem.dataset.sagir, 10),
          letters: parseInt(wElem.dataset.letters, 10),
          position: wElem.dataset.pos,
          tr: wElem.dataset.tr || '',
          en: wElem.dataset.en || '',
          translit: wElem.dataset.translit || '',
          root: wElem.dataset.root || '',
          is_prime_abjad: wElem.dataset.primeAbjad === '1',
          is_prime_letters: wElem.dataset.primeLetters === '1'
        };
      };

      // Kelimeye tıklandığında müfettişi o kelimeye odaklar ve sabitler
      wElem.addEventListener('click', (e) => {
        e.stopPropagation();

        // Shift+Click: Multi-word phrase gathering
        if (e.shiftKey && AppState.mathInspector.activeWord && AppState.mathInspector.activeVerse && AppState.mathInspector.activeVerse.id === v.id) {
          handleShiftClickPhrase(AppState.mathInspector.activeWord, getWordObj(), v);
          return;
        }

        // Clicking the currently locked word toggles unlock
        if (AppState.mathInspector.isLocked && AppState.mathInspector.lockedElement === wElem) {
          unlockInspectorFocus();
          return;
        }

        // Lock onto this word!
        lockInspectorOnWord(getWordObj(), v, wElem);
        if (window.innerWidth <= 1360) {
          openInspectorDrawer();
        }
      });
    });

    card.querySelector('.btn-verse-play').addEventListener('click', () => {
      playVerse(v);
    });

    card.querySelector('.btn-verse-copy').addEventListener('click', () => {
      const textToCopy = `[${v.key}]\n${v.text_uthmani}\n${v.transliteration}\n\n${v.diyanet}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`${v.key} ayeti panoya kopyalandı.`);
      });
    });

    card.querySelector('.btn-verse-abjad-send').addEventListener('click', () => {
      switchTab('abjad');
      document.getElementById('abjad-text-input').value = v.text_clean;
      calculateAbjad();
    });

    streamEl.appendChild(card);
  });

  // Default inspection of first word on every surah load
  if (verses.length > 0 && verses[0].words && verses[0].words.length > 0) {
    inspectWord(verses[0].words[0], verses[0]);
  }

  // Connect scroll tracker to continuously observe reading position
  initReaderScrollTracker();
}

function lockInspectorOnWord(w, v, element) {
  document.querySelectorAll('.ar-word.selected, .wbw-card.selected, .locked-focus, .phrase-connected-highlight').forEach(el => {
    el.classList.remove('selected', 'locked-focus', 'phrase-connected-highlight');
  });

  if (element) {
    element.classList.add('selected', 'locked-focus');
  }

  AppState.mathInspector.isLocked = true;
  AppState.mathInspector.lockedWord = w;
  AppState.mathInspector.lockedVerse = v;
  AppState.mathInspector.lockedElement = element;

  inspectWord(w, v, element, true);
  updateInspectorLockUI(true, w);
}

function unlockInspectorFocus() {
  AppState.mathInspector.isLocked = false;
  AppState.mathInspector.lockedWord = null;
  AppState.mathInspector.lockedVerse = null;
  AppState.mathInspector.lockedElement = null;

  document.querySelectorAll('.locked-focus').forEach(el => el.classList.remove('locked-focus'));
  updateInspectorLockUI(false, null);
  showToast('🔓 Müfettiş odak kilidi kaldırıldı (Serbest gezintiye dönüldü)');
}

function updateInspectorLockUI(isLocked, word) {
  const banner = document.getElementById('insp-lock-banner');
  const title = document.getElementById('insp-lock-title');
  if (!banner) return;

  if (isLocked && word) {
    banner.style.display = 'flex';
    if (title) {
      const arText = word.uth || word.clean || '';
      const trText = word.tr ? ` ("${word.tr}")` : '';
      title.innerHTML = `🔒 <strong>[${escapeHtml(arText)}]${escapeHtml(trText)}</strong> kelimesine sabitlendi`;
    }
  } else {
    banner.style.display = 'none';
  }
}

function handleShiftClickPhrase(w1, w2, v) {
  if (!v || !v.words || v.words.length === 0) return;
  const idx1 = Math.min(w1.idx, w2.idx);
  const idx2 = Math.max(w1.idx, w2.idx);

  const phraseWords = v.words.filter(w => w.idx >= idx1 && w.idx <= idx2);
  if (phraseWords.length === 0) return;

  const card = document.getElementById(`verse-card-${v.id}`);
  if (card) {
    card.querySelectorAll('.ar-word, .wbw-card').forEach(el => {
      const i = parseInt(el.dataset.wordIdx, 10);
      if (i >= idx1 && i <= idx2) {
        el.classList.add('phrase-connected-highlight');
      } else {
        el.classList.remove('phrase-connected-highlight');
      }
    });
  }

  inspectPhrase(phraseWords, v);
  if (window.innerWidth <= 1360) {
    openInspectorDrawer();
  }
  showToast(`✨ ${phraseWords.length} kelimelik öbek toplandı ve müfettişe aktarıldı`);
}

function inspectPhrase(phraseWords, verse, combinedMetrics = null) {
  if (!phraseWords || phraseWords.length === 0) return;

  const emptyState = document.getElementById('inspector-empty-state');
  const activeBody = document.getElementById('inspector-active-body');
  if (emptyState) emptyState.classList.add('hidden');
  if (activeBody) activeBody.classList.remove('hidden');

  const posBadge = document.getElementById('insp-word-pos-badge');
  posBadge.className = 'pos-indicator-badge center';
  posBadge.innerText = `✨ Cümle / Kelime Öbeği (${phraseWords.length} Kelime)`;

  const verseKey = verse ? (verse.key || `${verse.surah_number}:${verse.verse_number}`) : '';
  document.getElementById('insp-word-idx-text').innerText = `${verseKey ? `[${verseKey}] Ayeti / ` : ''}${phraseWords[0].idx} - ${phraseWords[phraseWords.length - 1].idx}. Kelimeler`;

  const fullArabic = phraseWords.map(w => w.uth || w.clean).join(' ');
  const fullClean = phraseWords.map(w => w.clean || w.clean_bare).join(' ');
  const fullMeaning = phraseWords.map(w => w.tr || w.en).filter(Boolean).join(' ');
  const fullTranslit = phraseWords.map(w => w.translit).filter(Boolean).join(' ');

  document.getElementById('insp-word-ar').innerText = fullArabic;
  document.getElementById('insp-word-clean').innerText = fullClean;

  const rootEl = document.getElementById('insp-word-root');
  const rootsList = phraseWords.map(w => w.root).filter(r => r && r !== '-' && r !== '—');
  const uniqueRoots = [...new Set(rootsList)];
  if (rootEl) {
    rootEl.innerText = uniqueRoots.length > 0 ? uniqueRoots.join(' • ') : '-';
  }

  const breakoutGrid = document.getElementById('insp-word-breakout-grid');
  const countTag = document.getElementById('insp-word-letters-count');
  let allBreakout = [];
  phraseWords.forEach(w => {
    if (w.letters_breakout && w.letters_breakout.length > 0) {
      allBreakout = allBreakout.concat(w.letters_breakout);
    } else {
      const bare = w.clean_bare || w.clean || '';
      if (typeof breakoutLettersClient === 'function') {
        allBreakout = allBreakout.concat(breakoutLettersClient(bare));
      }
    }
  });

  if (countTag) {
    countTag.innerText = `${allBreakout.length} Harf (Toplam)`;
  }
  if (breakoutGrid) {
    breakoutGrid.innerHTML = '';
    allBreakout.forEach(item => {
      const chip = document.createElement('div');
      chip.className = `letter-breakout-chip ${item.is_prime ? 'is-prime' : ''}`;
      chip.setAttribute('data-char', item.char);
      chip.setAttribute('title', `${item.name} (Ebced: ${item.abjad})`);
      chip.innerHTML = `
        <span class="chip-char">${item.char}</span>
        <span class="chip-name">${item.name || item.char}</span>
        <span class="chip-abjad">${item.abjad} ${item.is_prime ? '★' : ''}</span>
      `;
      breakoutGrid.appendChild(chip);
    });
  }

  const translitEl = document.getElementById('insp-word-translit');
  const trEl = document.getElementById('insp-word-tr');
  const enEl = document.getElementById('insp-word-en');
  if (translitEl) translitEl.innerText = fullTranslit ? `[ ${fullTranslit} ]` : '';
  if (trEl) trEl.innerText = fullMeaning || 'Cümle öbeği meali';
  if (enEl) enEl.innerText = phraseWords.map(w => w.en).filter(Boolean).join(' ');

  // Show Phrase Box
  const phraseBox = document.getElementById('spotlight-phrase-box');
  const phraseTbody = document.getElementById('insp-phrase-words-tbody');
  const phraseCountBadge = document.getElementById('insp-phrase-count-badge');
  const phraseCombinedMeaning = document.getElementById('insp-phrase-combined-meaning');

  if (phraseBox && phraseTbody) {
    phraseBox.classList.remove('hidden');
    if (phraseCountBadge) phraseCountBadge.innerText = `${phraseWords.length} Kelime`;
    if (phraseCombinedMeaning) phraseCombinedMeaning.innerText = fullMeaning;

    phraseTbody.innerHTML = phraseWords.map(w => {
      const voc = analyzeArabicVocalization(w.uth || w.clean);
      return `
        <tr>
          <td><strong style="color:var(--gold-light);">${w.idx}</strong></td>
          <td style="font-family:var(--font-arabic-quran); direction:rtl; font-size:1.15rem;">${escapeHtml(w.uth)}</td>
          <td style="color:var(--emerald-light); font-weight:700;">${escapeHtml(w.root || '—')}</td>
          <td>${escapeHtml(w.tr || w.en || '—')}</td>
          <td><strong style="color:var(--gold-light);">${w.abjad || 0}</strong></td>
          <td><span style="font-size:0.72rem; color:#cbd5e1;">${escapeHtml(voc.explanation.slice(0, 35))}...</span></td>
        </tr>
      `;
    }).join('');
  }

  // Hareke Box for phrase
  const harekeBox = document.getElementById('spotlight-hareke-box');
  const harekeType = document.getElementById('insp-hareke-type');
  const harekeChips = document.getElementById('insp-hareke-chips-row');
  const harekeExp = document.getElementById('insp-hareke-explanation');

  if (harekeBox) {
    const voc = analyzeArabicVocalization(fullArabic);
    if (harekeType) harekeType.innerText = `Cümle / Kelime Öbeği (${phraseWords.length} Kelime)`;
    if (harekeChips) harekeChips.innerHTML = renderHarekeChipsHtml(voc);
    if (harekeExp) {
      harekeExp.innerText = `Öbek Tahlili: "${fullMeaning}" • ${voc.explanation}`;
    }
  }

  // Compute metrics for the entire phrase
  const metrics = combinedMetrics || computeArabicMetrics(fullClean || fullArabic);

  document.getElementById('insp-ebced-kebir').innerText = metrics.kebir.toLocaleString('tr-TR');
  document.getElementById('insp-kebir-prime-sub').innerText = metrics.is_prime_kebir ? '✨ Asal Sayı' : 'Bileşik Sayı';
  document.getElementById('insp-ebced-sagir').innerText = metrics.sagir.toLocaleString('tr-TR');
  document.getElementById('insp-letter-count').innerText = metrics.letters.toLocaleString('tr-TR');
  document.getElementById('insp-letter-prime-sub').innerText = metrics.is_prime_letters ? '✨ Asal Sayı' : (metrics.letters % 2 === 0 ? 'Çift Sayı' : 'Tek Sayı');

  const codeVal = document.getElementById('insp-code-check');
  const codeSub = document.getElementById('insp-code-sub');
  const is19 = metrics.kebir > 0 && metrics.kebir % 19 === 0;
  const is7 = metrics.kebir > 0 && metrics.kebir % 7 === 0;
  if (is19 && is7) {
    codeVal.innerText = '19 & 7 Katı';
    codeSub.innerText = `${metrics.kebir} = 19 × 7 × ${metrics.kebir / 133}`;
    codeVal.style.color = 'var(--gold-light)';
  } else if (is19) {
    codeVal.innerText = `19 × ${metrics.kebir / 19}`;
    codeSub.innerText = '19 Sayısal Kodu';
    codeVal.style.color = 'var(--gold-light)';
  } else if (is7) {
    codeVal.innerText = `7 × ${metrics.kebir / 7}`;
    codeSub.innerText = '7 Sayısal Kodu';
    codeVal.style.color = 'var(--emerald-light)';
  } else {
    codeVal.innerText = '-';
    codeSub.innerText = 'Özel Kat Değil';
    codeVal.style.color = 'var(--text-muted)';
  }

  document.getElementById('insp-prime-flag').innerText = metrics.is_prime_kebir ? 'Asal Sayı' : 'Bileşik Sayı';
  document.getElementById('insp-factors-formula').innerHTML = formatPrimeFactorsFormula(metrics.kebir, metrics.factors);

  updateInspectorLockUI(true, { uth: fullArabic, tr: fullMeaning });
  AppState.mathInspector.isLocked = true;
  AppState.mathInspector.activeVerse = verse;
}

// Kelime ve Ayet Matematik Müfettişi
function inspectWord(w, v, spanEl, isLockAction = false) {
  AppState.mathInspector.activeWord = w;
  AppState.mathInspector.activeVerse = v;
  if (v) {
    updateReadingPosition({
      surahNumber: v.surah_number,
      verseNumber: v.verse_number,
      key: v.key,
      page: v.page,
      juz: v.juz,
      id: v.id
    }, true);
  }

  const emptyState = document.getElementById('inspector-empty-state');
  const activeBody = document.getElementById('inspector-active-body');
  if (emptyState) emptyState.classList.add('hidden');
  if (activeBody) activeBody.classList.remove('hidden');

  // Spotlight position
  const posBadge = document.getElementById('insp-word-pos-badge');
  posBadge.className = `pos-indicator-badge ${w.position}`;
  const lang = AppState.language || 'tr';
  const isEn = lang === 'en';
  const isAr = lang === 'ar';
  const i18nObj = I18N[lang] || I18N.tr;

  if (w.position === 'start') {
    posBadge.innerText = i18nObj.wordStart || (isEn ? '🟢 Opening Word (1st Word)' : '🟢 Başlangıç Kelimesi (1. Kelime)');
  } else if (w.position === 'middle') {
    posBadge.innerText = i18nObj.wordCenter || (isEn ? '🟡 Center / Vasat Word' : '🟡 Vasat / Merkez Kelime (Tam Ortası)');
  } else if (w.position === 'end') {
    posBadge.innerText = i18nObj.wordEnd || (isEn ? '🔴 Concluding Word' : '🔴 Hitam / Son Kelime (Ayet Sonu)');
  } else {
    posBadge.innerText = i18nObj.wordBody || (isEn ? '⚪ Body Word' : '⚪ Gövde Kelimesi');
  }

  const totalWords = (v && v.words) ? v.words.length : (w.word_total || '');
  const wordIdxStr = isEn ? `${w.idx}th Word / Total ${totalWords}` : (isAr ? `الكلمة ${w.idx} / مجموع ${totalWords}` : `${w.idx}. Kelime / Toplam ${totalWords}`);
  document.getElementById('insp-word-idx-text').innerText = wordIdxStr;
  
  // Katman 1: Orijinal Harekeli
  const arEl = document.getElementById('insp-word-ar');
  if (arEl) arEl.innerText = w.uth;

  // Katman 2: Harekesiz Sade İmla
  const cleanEl = document.getElementById('insp-word-clean');
  const bareVal = w.clean_bare || (typeof cleanArabicDiacriticsClient === 'function' ? cleanArabicDiacriticsClient(w.clean || w.uth) : (w.clean || w.uth));
  if (cleanEl) cleanEl.innerText = bareVal;

  // Katman 3: Sülâsî Kök
  const rootEl = document.getElementById('insp-word-root');
  const rootVal = (w.root && w.root !== '-' && w.root !== '—') ? w.root : '-';
  if (rootEl) rootEl.innerText = rootVal || '-';

  // Katman 4: Harf Harf Ayrıştırma (Letter-by-Letter Breakout)
  const breakoutGrid = document.getElementById('insp-word-breakout-grid');
  const countTag = document.getElementById('insp-word-letters-count');
  const breakoutList = (w.letters_breakout && w.letters_breakout.length > 0)
    ? w.letters_breakout
    : (typeof breakoutLettersClient === 'function' ? breakoutLettersClient(bareVal) : []);

  if (countTag) {
    countTag.innerText = isEn ? `${breakoutList.length} Letters` : (isAr ? `${breakoutList.length} حرف` : `${breakoutList.length} Harf`);
  }

  if (breakoutGrid) {
    breakoutGrid.innerHTML = '';
    breakoutList.forEach(item => {
      const chip = document.createElement('div');
      chip.className = `letter-breakout-chip ${item.is_prime ? 'is-prime' : ''}`;
      chip.setAttribute('data-char', item.char);
      chip.setAttribute('title', isEn ? `Letter ${item.name} (Abjad: ${item.abjad}) - Click for Murakabe & Secrets` : `${item.name} Harfi (Ebced: ${item.abjad}) - Tefekkür ve Sırları İncele`);
      
      let posLabel = isEn ? 'Body' : (isAr ? 'متن' : 'Gövde');
      if (item.position === 'baş' || item.position === 'start') posLabel = isEn ? 'Start' : (isAr ? 'بداية' : 'Baş');
      else if (item.position === 'vasat' || item.position === 'middle' || item.position === 'center') posLabel = isEn ? 'Center' : (isAr ? 'وسط' : 'Vasat');
      else if (item.position === 'hitam' || item.position === 'end') posLabel = isEn ? 'End' : (isAr ? 'ختام' : 'Hitam');

      chip.innerHTML = `
        <span class="chip-char">${item.char}</span>
        <span class="chip-name">${item.name || (typeof getArabicLetterName === 'function' ? getArabicLetterName(item.char) : item.char)}</span>
        <span class="chip-abjad">${item.abjad} ${item.is_prime ? '★' : ''}</span>
        <span class="chip-pos-tag ${item.position || 'body'}">${posLabel}</span>
      `;

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        switchInspectorSubtab('reflection');
        loadInspectorLetterSecret(item.char);
      });

      breakoutGrid.appendChild(chip);
    });
  }

  // Transliteration & Word Translations in Spotlight Box
  const spotlightBox = document.getElementById('spotlight-word-translation-box');
  if (spotlightBox) spotlightBox.style.display = 'flex';
  const translitEl = document.getElementById('insp-word-translit');
  const trEl = document.getElementById('insp-word-tr');
  const enEl = document.getElementById('insp-word-en');

  if (translitEl) translitEl.innerText = w.translit ? `[ ${w.translit} ]` : '';
  if (trEl) trEl.innerText = w.tr ? w.tr : (w.en ? `(${w.en})` : 'Kelime meali');
  if (enEl) enEl.innerText = w.en ? `🇬🇧 ${w.en}` : '';

  // Sülâsî Kök Dosyası Entegrasyonu
  const rootDossierCard = document.getElementById('insp-root-dossier-card');
  const rootBadge = document.getElementById('insp-word-root');
  if (rootBadge && rootVal && rootVal !== '-') {
    rootBadge.onclick = (e) => {
      e.stopPropagation();
      openRootDossierModal(rootVal);
    };
  }
  if (rootDossierCard) {
    const rd = w.root_dossier;
    if (rd && rd.reading) {
      rootDossierCard.style.display = 'flex';
      const freqEl = document.getElementById('insp-root-freq');
      const readingEl = document.getElementById('insp-root-reading');
      const meaningEl = document.getElementById('insp-root-core-meaning');
      const miniFormsEl = document.getElementById('insp-root-mini-forms');
      const openBtn = document.getElementById('btn-open-root-dossier');

      if (freqEl) freqEl.innerText = rd.frequency ? `${rd.frequency} Geçiş` : "Kur'an Kökü";
      if (readingEl) readingEl.innerText = `${rd.reading} (${w.root})`;
      if (meaningEl) meaningEl.innerText = rd.core_meaning || 'İlmi kök anlamı';

      if (miniFormsEl) {
        miniFormsEl.innerHTML = '';
        const formsToShow = [
          { label: 'Mazi', val: rd.madi, tr: rd.madi_tr },
          { label: 'Muzari', val: rd.mudari, tr: rd.mudari_tr },
          { label: 'Masdar', val: rd.masdar, tr: rd.masdar_tr },
          { label: 'Fâil', val: rd.fail, tr: rd.fail_tr }
        ].filter(f => f.val && f.val !== '—');

        formsToShow.forEach(f => {
          const chip = document.createElement('span');
          chip.className = 'dossier-mini-chip';
          chip.innerHTML = `<strong>${f.label}:</strong> ${f.val} <em style="opacity:0.8;">(${f.tr})</em>`;
          miniFormsEl.appendChild(chip);
        });
      }

      if (openBtn) {
        openBtn.onclick = (e) => {
          e.stopPropagation();
          openRootDossierModal(w.root);
        };
      }
    } else if (rootVal && rootVal !== '-') {
      rootDossierCard.style.display = 'flex';
      const readingEl = document.getElementById('insp-root-reading');
      const meaningEl = document.getElementById('insp-root-core-meaning');
      const freqEl = document.getElementById('insp-root-freq');
      const miniFormsEl = document.getElementById('insp-root-mini-forms');
      if (readingEl) readingEl.innerText = `Sülâsî Kök: ${rootVal}`;
      if (meaningEl) meaningEl.innerText = 'Yükleniyor...';
      if (freqEl) freqEl.innerText = '...';
      if (miniFormsEl) miniFormsEl.innerHTML = '';

      fetch(`/api/root/${encodeURIComponent(rootVal)}`)
        .then(r => r.json())
        .then(data => {
          if (data && !data.error) {
            if (freqEl) freqEl.innerText = `${data.frequency || 0} Geçiş`;
            if (readingEl) readingEl.innerText = `${data.reading} (${data.root})`;
            if (meaningEl) meaningEl.innerText = data.core_meaning || '';
            if (miniFormsEl) {
              miniFormsEl.innerHTML = '';
              const formsToShow = [
                { label: 'Mazi', val: data.madi, tr: data.madi_tr },
                { label: 'Muzari', val: data.mudari, tr: data.mudari_tr },
                { label: 'Masdar', val: data.masdar, tr: data.masdar_tr },
                { label: 'Fâil', val: data.fail, tr: data.fail_tr }
              ].filter(f => f.val && f.val !== '—');

              formsToShow.forEach(f => {
                const chip = document.createElement('span');
                chip.className = 'dossier-mini-chip';
                chip.innerHTML = `<strong>${f.label}:</strong> ${f.val} <em style="opacity:0.8;">(${f.tr})</em>`;
                miniFormsEl.appendChild(chip);
              });
            }
          }
        }).catch(() => {});

      const openBtn = document.getElementById('btn-open-root-dossier');
      if (openBtn) {
        openBtn.onclick = (e) => {
          e.stopPropagation();
          openRootDossierModal(rootVal);
        };
      }
    } else {
      rootDossierCard.style.display = 'none';
    }
  }

  // Hide phrase box when inspecting a single word
  const phraseBox = document.getElementById('spotlight-phrase-box');
  if (phraseBox) phraseBox.classList.add('hidden');

  // Populate Hareke & Sarf Box in Inspector
  const harekeBox = document.getElementById('spotlight-hareke-box');
  const harekeType = document.getElementById('insp-hareke-type');
  const harekeChips = document.getElementById('insp-hareke-chips-row');
  const harekeExp = document.getElementById('insp-hareke-explanation');

  if (harekeBox) {
    const voc = analyzeArabicVocalization(w.uth || w.clean);
    if (harekeType) harekeType.innerText = voc.gramType;
    if (harekeChips) harekeChips.innerHTML = renderHarekeChipsHtml(voc);
    if (harekeExp) {
      const rootStr = (w.root && w.root !== '-') ? `🌱 Sülâsî Kök: ${w.root} • ` : '';
      const coreMean = (w.root_dossier && w.root_dossier.core_meaning) ? `Kök Manası: "${w.root_dossier.core_meaning}" • ` : '';
      harekeExp.innerHTML = `<strong>Ayet İçi Manası:</strong> "${escapeHtml(w.tr || w.en || '')}"<br><span style="opacity:0.9;">${escapeHtml(rootStr + coreMean + voc.explanation)}</span>`;
    }
  }

  // Update Lock Banner
  if (AppState.mathInspector.isLocked) {
    updateInspectorLockUI(true, w);
  } else {
    updateInspectorLockUI(false, null);
  }

  // KPIs
  document.getElementById('insp-ebced-kebir').innerText = (w.abjad || 0).toLocaleString('tr-TR');
  const kebirPrimeStr = isPrimeNumber(w.abjad) ? (isEn ? '✨ Prime Number' : (isAr ? '✨ عدد أولي' : '✨ Asal Sayı')) : (isEn ? 'Composite Number' : (isAr ? 'عدد مركب' : 'Bileşik Sayı'));
  document.getElementById('insp-kebir-prime-sub').innerText = kebirPrimeStr;
  document.getElementById('insp-ebced-sagir').innerText = (w.sagir !== undefined ? w.sagir : (w.abjad % 9 || 9)).toLocaleString('tr-TR');
  document.getElementById('insp-letter-count').innerText = (w.letters || 0).toLocaleString('tr-TR');
  const letterPrimeStr = isPrimeNumber(w.letters) ? (isEn ? '✨ Prime Number' : (isAr ? '✨ عدد أولي' : '✨ Asal Sayı')) : (w.letters % 2 === 0 ? (isEn ? 'Even Number' : (isAr ? 'عدد زوجي' : 'Çift Sayı')) : (isEn ? 'Odd Number' : (isAr ? 'عدد فردي' : 'Tek Sayı')));
  document.getElementById('insp-letter-prime-sub').innerText = letterPrimeStr;

  // Bast Ebced (Expanded letter names) & Shannon Information Entropy via Offline Math Engine
  if (typeof QuranMathProcessor !== 'undefined') {
    const bastResult = QuranMathProcessor.calculateAbjadBast(w.clean);
    const bastEl = document.getElementById('insp-ebced-bast');
    if (bastEl) bastEl.innerText = bastResult.total.toLocaleString('tr-TR');

    const entropyResult = QuranMathProcessor.calculateLetterEntropy(v ? v.text_uthmani : w.uth);
    const entropyEl = document.getElementById('insp-letter-entropy');
    if (entropyEl) entropyEl.innerText = `${entropyResult.entropy}`;
  }

  // 19 / 7 Kodu
  const codeVal = document.getElementById('insp-code-check');
  const codeSub = document.getElementById('insp-code-sub');
  const is19 = w.abjad > 0 && w.abjad % 19 === 0;
  const is7 = w.abjad > 0 && w.abjad % 7 === 0;

  if (is19 && is7) {
    codeVal.innerText = isEn ? 'Multiple of 19 & 7' : (isAr ? 'مضاعف ١٩ و ٧' : '19 & 7 Katı');
    codeSub.innerText = `${w.abjad} = 19 × 7 × ${w.abjad / 133}`;
    codeVal.style.color = 'var(--gold-light)';
  } else if (is19) {
    codeVal.innerText = `19 × ${w.abjad / 19}`;
    codeSub.innerText = isEn ? '19 Numerical Code' : (isAr ? 'الشيفرة الرقمية ١٩' : '19 Sayısal Kodu');
    codeVal.style.color = 'var(--gold-light)';
  } else if (is7) {
    codeVal.innerText = `7 × ${w.abjad / 7}`;
    codeSub.innerText = isEn ? '7 Numerical Code' : (isAr ? 'الشيفرة الرقمية ٧' : '7 Sayısal Kodu');
    codeVal.style.color = 'var(--emerald-light)';
  } else {
    codeVal.innerText = '-';
    codeSub.innerText = isEn ? 'Standard Number' : (isAr ? 'عدد طبيعي' : 'Özel Kat Değil');
    codeVal.style.color = 'var(--text-muted)';
  }

  // Prime factors
  const factors = w.factors || getPrimeFactors(w.abjad);
  document.getElementById('insp-prime-flag').innerText = isPrimeNumber(w.abjad) ? (isEn ? 'Prime Number' : (isAr ? 'عدد أولي' : 'Asal Sayı')) : (isEn ? 'Composite Number' : (isAr ? 'عدد مركب' : 'Bileşik Sayı'));
  document.getElementById('insp-factors-formula').innerHTML = formatPrimeFactorsFormula(w.abjad, factors);

  // Render Offline Math Processor Canvas Charts
  if (typeof QuranMathProcessor !== 'undefined') {
    const isDark = document.body.classList.contains('theme-dark') || !document.body.classList.contains('theme-parchment');
    setTimeout(() => {
      QuranMathProcessor.drawPrimeFactorTree('insp-canvas-factor-tree', w.abjad, isDark);
      QuranMathProcessor.drawLetterBarChart('insp-canvas-letter-spectrum', v ? v.text_uthmani : w.uth, isDark);
    }, 20);
  }

  // Word-Level Letter Symmetry (Baş, Merkez [Vasat], Hitam [Son] Harfleri)
  if (typeof QuranMathProcessor !== 'undefined') {
    const symData = QuranMathProcessor.getWordLetterSymmetry(w.clean || w.uth);
    if (symData) {
      const sCharEl = document.getElementById('wls-start-char');
      const sNameEl = document.getElementById('wls-start-name');
      const sAbjadEl = document.getElementById('wls-start-abjad');

      const mCharEl = document.getElementById('wls-mid-char');
      const mNameEl = document.getElementById('wls-mid-name');
      const mAbjadEl = document.getElementById('wls-mid-abjad');

      const eCharEl = document.getElementById('wls-end-char');
      const eNameEl = document.getElementById('wls-end-name');
      const eAbjadEl = document.getElementById('wls-end-abjad');

      if (sCharEl && symData.start) {
        sCharEl.innerText = symData.start.char;
        sNameEl.innerText = symData.start.name;
        sAbjadEl.innerText = `${symData.start.abjad} ${symData.start.is_prime ? (isEn ? '★ Prime' : (isAr ? '★ أولي' : '★ Asal')) : ''}`;
      }
      if (mCharEl && symData.middle) {
        if (symData.middle.isPair) {
          mCharEl.innerText = `${symData.middle.char} - ${symData.middle.pairChar}`;
          mNameEl.innerText = `${symData.middle.name} / ${symData.middle.pairName}`;
          mAbjadEl.innerText = `${symData.middle.abjad} + ${symData.middle.pairAbjad}`;
        } else {
          mCharEl.innerText = symData.middle.char;
          mNameEl.innerText = symData.middle.name;
          mAbjadEl.innerText = `${symData.middle.abjad} ${symData.middle.is_prime ? (isEn ? '★ Prime' : (isAr ? '★ أولي' : '★ Asal')) : ''}`;
        }
      }
      if (eCharEl && symData.end) {
        eCharEl.innerText = symData.end.char;
        eNameEl.innerText = symData.end.name;
        eAbjadEl.innerText = `${symData.end.abjad} ${symData.end.is_prime ? (isEn ? '★ Prime' : (isAr ? '★ أولي' : '★ Asal')) : ''}`;
      }
    }
  }

  // Letter breakdown table
  const tbody = document.getElementById('insp-letters-tbody');
  tbody.innerHTML = '';
  const breakdown = w.letter_breakdown || computeArabicMetrics(w.clean).breakdown;
  breakdown.forEach((l, idx) => {
    let posBadgeHtml = `<span class="letter-pos-badge body">${isEn ? '⚪ Body' : (isAr ? '⚪ متن' : '⚪ Gövde')}</span>`;
    if (idx === 0) {
      posBadgeHtml = `<span class="letter-pos-badge start">🟢 ${isEn ? 'Start' : (isAr ? 'بداية' : 'Baş')}</span>`;
    } else if (idx === breakdown.length - 1) {
      posBadgeHtml = `<span class="letter-pos-badge end">🔴 ${isEn ? 'End' : (isAr ? 'ختام' : 'Hitam')}</span>`;
    } else if (breakdown.length % 2 === 1 && idx === Math.floor(breakdown.length / 2)) {
      posBadgeHtml = `<span class="letter-pos-badge middle">🟡 ${isEn ? 'Center' : (isAr ? 'وسط' : 'Vasat')}</span>`;
    } else if (breakdown.length % 2 === 0 && (idx === breakdown.length / 2 - 1 || idx === breakdown.length / 2)) {
      posBadgeHtml = `<span class="letter-pos-badge middle">🟡 ${isEn ? 'Center' : (isAr ? 'وسط' : 'Vasat')}</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="char-cell">${l.char}</td>
      <td>${posBadgeHtml}</td>
      <td>${l.name || getArabicLetterName(l.char)}</td>
      <td style="font-family:var(--font-arabic-clean); font-size:1.05rem;">${l.char}</td>
      <td><strong>${l.val || ABJAD_TABLE[l.char] || 0}</strong></td>
      <td><span class="kpi-prime-badge ${(l.is_prime || isPrimeNumber(l.val || 0)) ? 'badge-prime-yes' : 'badge-prime-no'}" style="font-size:0.6rem;">${(l.is_prime || isPrimeNumber(l.val || 0)) ? (isEn ? 'Prime' : (isAr ? 'أولي' : 'Asal')) : (isEn ? 'Comp' : (isAr ? 'مركب' : 'Değil'))}</span></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('insp-letters-summary').innerText = isEn ? `${breakdown.length} Letters` : (isAr ? `${breakdown.length} حرف` : `${breakdown.length} Harf`);

  // Ayah Level Summary
  if (v) {
    document.getElementById('insp-ayah-key').innerText = `[${v.key}]`;
    document.getElementById('insp-ayah-abjad').innerText = (v.abjad || 0).toLocaleString('tr-TR');
    document.getElementById('insp-ayah-words').innerText = v.word_count || (v.words ? v.words.length : 0);
    document.getElementById('insp-ayah-letters').innerText = v.letter_count || 0;
    
    let centerWordStr = '-';
    if (v.words && v.words.length > 0) {
      const midIdx = Math.floor(v.words.length / 2);
      centerWordStr = v.words[midIdx].uth;
    }
    document.getElementById('insp-ayah-center-word').innerText = centerWordStr;
  }

  // Combinatorial Probability & Distribution
  if (AppState.currentSurahData && AppState.currentSurahData.verses) {
    const cleanWord = (w.clean || '').trim();
    let wordCountInSurah = 0;
    let totalWordsInSurah = 0;
    AppState.currentSurahData.verses.forEach(vs => {
      if (vs.words) {
        totalWordsInSurah += vs.words.length;
        vs.words.forEach(wd => {
          if ((wd.clean || '').trim() === cleanWord) {
            wordCountInSurah++;
          }
        });
      }
    });

    const densityPct = totalWordsInSurah > 0 ? ((wordCountInSurah / totalWordsInSurah) * 100).toFixed(2) : '0.00';
    const densityEl = document.getElementById('insp-prob-surah-density');
    if (densityEl) {
      densityEl.innerText = `${wordCountInSurah} / ${totalWordsInSurah} (%${densityPct})`;
    }

    const quranFreqEl = document.getElementById('insp-prob-quran-freq');
    const formulaEl = document.getElementById('insp-prob-formula');
    const descEl = document.getElementById('insp-prob-desc');

    const p = totalWordsInSurah > 0 ? wordCountInSurah / totalWordsInSurah : 0.001;
    if (quranFreqEl) {
      quranFreqEl.innerText = `p = ${p.toFixed(4)} | n = ${totalWordsInSurah}`;
    }
    if (formulaEl) {
      formulaEl.innerText = `P(k=${wordCountInSurah}) = C(${totalWordsInSurah}, ${wordCountInSurah}) · (${p.toFixed(3)})^${wordCountInSurah}`;
    }
    if (descEl) {
      descEl.innerText = `Sure yoğunluğu %${densityPct}. Hipergeometrik olasılık ve Poisson frekans dağılımı.`;
    }
  }

  // Send to Abjad Calculator button
  const sendBtn = document.getElementById('btn-insp-send-abjad');
  if (sendBtn) {
    sendBtn.onclick = () => {
      switchTab('abjad');
      const input = document.getElementById('abjad-text-input');
      if (input) {
        input.value = w.clean;
        calculateAbjad();
      }
    };
  }

  // Apply Calculation & Probability Preferences Visibility
  applyCalcPreferencesVisibility();

  // Synchronize Active Inspector Subtab Data (Diyanet Tefsiri, Hadisler, Tefekkür)
  const activeSubtab = AppState.mathInspector.activeSubtab || 'morphology';
  const sNum = v ? (v.surah_id || AppState.currentSurahId) : AppState.currentSurahId;
  const vNum = v ? (v.verse_number || 1) : 1;
  if (activeSubtab === 'tefsir') {
    loadInspectorTefsir(sNum, vNum);
  } else if (activeSubtab === 'hadith') {
    loadInspectorHadiths(sNum, vNum);
  } else if (activeSubtab === 'reflection') {
    loadInspectorReflections(sNum, vNum, w);
  }
}

// Seçilen Özel Metin Müfettişi
function inspectCustomText(text, metrics) {
  const emptyState = document.getElementById('inspector-empty-state');
  const activeBody = document.getElementById('inspector-active-body');
  if (emptyState) emptyState.classList.add('hidden');
  if (activeBody) activeBody.classList.remove('hidden');

  const posBadge = document.getElementById('insp-word-pos-badge');
  posBadge.className = 'pos-indicator-badge center';
  posBadge.innerText = '🎯 Seçilen Özel Metin';

  document.getElementById('insp-word-idx-text').innerText = `${metrics.letters} Harf / Özel Seçim`;
  document.getElementById('insp-word-ar').innerText = text;
  document.getElementById('insp-word-clean').innerText = text;

  document.getElementById('insp-ebced-kebir').innerText = metrics.kebir.toLocaleString('tr-TR');
  document.getElementById('insp-kebir-prime-sub').innerText = metrics.is_prime_kebir ? '✨ Asal Sayı' : 'Bileşik Sayı';
  document.getElementById('insp-ebced-sagir').innerText = metrics.sagir.toLocaleString('tr-TR');
  document.getElementById('insp-letter-count').innerText = metrics.letters.toLocaleString('tr-TR');
  document.getElementById('insp-letter-prime-sub').innerText = metrics.is_prime_letters ? '✨ Asal Sayı' : (metrics.letters % 2 === 0 ? 'Çift Sayı' : 'Tek Sayı');

  const codeVal = document.getElementById('insp-code-check');
  const codeSub = document.getElementById('insp-code-sub');
  const is19 = metrics.kebir > 0 && metrics.kebir % 19 === 0;
  const is7 = metrics.kebir > 0 && metrics.kebir % 7 === 0;

  if (is19 && is7) {
    codeVal.innerText = '19 & 7 Katı';
    codeSub.innerText = `${metrics.kebir} = 19 × 7 × ${metrics.kebir / 133}`;
    codeVal.style.color = 'var(--gold-light)';
  } else if (is19) {
    codeVal.innerText = `19 × ${metrics.kebir / 19}`;
    codeSub.innerText = '19 Sayısal Kodu';
    codeVal.style.color = 'var(--gold-light)';
  } else if (is7) {
    codeVal.innerText = `7 × ${metrics.kebir / 7}`;
    codeSub.innerText = '7 Sayısal Kodu';
    codeVal.style.color = 'var(--emerald-light)';
  } else {
    codeVal.innerText = '-';
    codeSub.innerText = 'Özel Kat Değil';
    codeVal.style.color = 'var(--text-muted)';
  }

  document.getElementById('insp-prime-flag').innerText = metrics.is_prime_kebir ? 'Asal Sayı' : 'Bileşik Sayı';
  document.getElementById('insp-factors-formula').innerHTML = formatPrimeFactorsFormula(metrics.kebir, metrics.factors);

  const tbody = document.getElementById('insp-letters-tbody');
  tbody.innerHTML = '';
  metrics.breakdown.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="char-cell">${l.char}</td>
      <td>${l.name}</td>
      <td style="font-family:var(--font-arabic-clean); font-size:1.05rem;">${l.char}</td>
      <td><strong>${l.val}</strong></td>
      <td><span class="kpi-prime-badge ${l.is_prime ? 'badge-prime-yes' : 'badge-prime-no'}" style="font-size:0.6rem;">${l.is_prime ? 'Asal' : 'Değil'}</span></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('insp-letters-summary').innerText = `${metrics.breakdown.length} Harf`;

  const sendBtn = document.getElementById('btn-insp-send-abjad');
  if (sendBtn) {
    sendBtn.onclick = () => {
      switchTab('abjad');
      const input = document.getElementById('abjad-text-input');
      if (input) {
        input.value = text;
        calculateAbjad();
      }
    };
  }

  // Apply Calculation & Probability Preferences Visibility
  applyCalcPreferencesVisibility();
}

// =================================================================
// THEME SWITCHER (📜 KAĞIT / 🌌 GECE / 🕯️ SEPYA)
// =================================================================
function initThemeSwitcher() {
  const savedTheme = localStorage.getItem('quran_theme') || 'parchment';
  setTheme(savedTheme);

  const themeBtns = document.querySelectorAll('.btn-theme, .m-theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
    });
  });

  const headerSelect = document.getElementById('header-theme-select');
  if (headerSelect) {
    headerSelect.value = savedTheme;
    headerSelect.addEventListener('change', () => {
      setTheme(headerSelect.value);
    });
  }
}

function setTheme(theme) {
  AppState.theme = theme;
  document.body.className = `theme-${theme}`;
  localStorage.setItem('quran_theme', theme);

  document.querySelectorAll('.btn-theme, .m-theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  const headerSelect = document.getElementById('header-theme-select');
  if (headerSelect && headerSelect.value !== theme) {
    headerSelect.value = theme;
  }
}

// =================================================================
// CALCULATION & PROBABILITY PREFERENCES MODULE
// =================================================================
function initCalculationPreferences() {
  const defaultPrefs = {
    ebcedKebir: true,
    ebcedSagir: true,
    letterCount: true,
    code197: true,
    primeFactors: true,
    probability: true,
    letterTable: true,
    ayahMatrix: true
  };

  const saved = localStorage.getItem('quran_calc_prefs');
  AppState.calcPreferences = saved ? { ...defaultPrefs, ...JSON.parse(saved) } : defaultPrefs;

  // Sync checkboxes
  document.querySelectorAll('.cpm-switch input[data-pref]').forEach(input => {
    const key = input.dataset.pref;
    if (AppState.calcPreferences[key] !== undefined) {
      input.checked = AppState.calcPreferences[key];
    }

    input.addEventListener('change', () => {
      AppState.calcPreferences[key] = input.checked;
      localStorage.setItem('quran_calc_prefs', JSON.stringify(AppState.calcPreferences));
      applyCalcPreferencesVisibility();
    });
  });

  // Modal open / close handlers
  const openBtn = document.getElementById('btn-calc-prefs');
  const closeBtn = document.getElementById('btn-close-calc-pref');
  const applyBtn = document.getElementById('btn-apply-calc-pref');
  const modalOverlay = document.getElementById('calc-pref-modal');

  if (openBtn && modalOverlay) {
    openBtn.addEventListener('click', () => {
      modalOverlay.classList.add('open');
    });
  }

  const closeModal = () => {
    if (modalOverlay) modalOverlay.classList.remove('open');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      closeModal();
      showToast('Hesaplama ve olasılık tercihleri başarıyla kaydedildi.');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  applyCalcPreferencesVisibility();
}

function applyCalcPreferencesVisibility() {
  const prefs = AppState.calcPreferences || {};
  document.querySelectorAll('[data-calc]').forEach(el => {
    const key = el.dataset.calc;
    if (prefs[key] !== undefined) {
      el.style.display = prefs[key] ? '' : 'none';
    }
  });
}

// =================================================================
// FOREIGN LANGUAGE TRANSLATIONS MODULE (GLOBAL ÇOK DİLLİ DESTEK)
// =================================================================
function initForeignLanguages() {
  const select = document.getElementById('foreign-lang-select');
  if (!select) return;

  select.addEventListener('change', async (e) => {
    const edition = e.target.value;
    AppState.foreignEdition = edition;

    if (edition === 'none') {
      if (AppState.currentSurahData) {
        renderVersesStream(AppState.currentSurahData.verses);
      }
      return;
    }

    showToast('Yabancı meal yükleniyor...');
    await loadForeignTranslation(AppState.currentSurahId, edition);
    if (AppState.currentSurahData) {
      renderVersesStream(AppState.currentSurahData.verses);
      showToast('Yabancı meal başarıyla gösterildi.');
    }
  });
}

async function loadForeignTranslation(surahId, edition) {
  if (!AppState.foreignVerses[surahId]) {
    AppState.foreignVerses[surahId] = {};
  }
  if (AppState.foreignVerses[surahId][edition]) {
    return AppState.foreignVerses[surahId][edition];
  }

  try {
    const res = await fetch(`/api/translations/foreign?surah=${surahId}&edition=${edition}`);
    const data = await res.json();
    if (data.verses) {
      AppState.foreignVerses[surahId][edition] = {
        meta: data.meta || {},
        verses: data.verses
      };
      return data.verses;
    }
  } catch (err) {
    console.error('Yabancı meal yüklenemedi:', err);
  }
  return null;
}

async function loadJuz(juzNum) {
  const streamEl = document.getElementById('verses-stream');
  streamEl.innerHTML = `<div class="loader-spinner"></div>`;
  try {
    const res = await fetch(`/api/juz/${juzNum}`);
    const data = await res.json();
    document.getElementById('hero-arabic-title').innerText = `الجزء ${juzNum}`;
    document.getElementById('hero-tr-title').innerText = `${juzNum}. Cüz`;
    document.getElementById('hero-en-title').innerText = `(Juz ${juzNum})`;
    document.getElementById('hero-verse-count-badge').innerText = `${data.total} Ayet`;
    renderVersesStream(data.verses);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    streamEl.innerHTML = `<div style="padding:2rem;color:#f87171;">Cüz yüklenemedi.</div>`;
  }
}

async function loadPage(pageNum, targetVerseNumber = null) {
  const streamEl = document.getElementById('verses-stream');
  streamEl.innerHTML = `<div class="loader-spinner"></div>`;
  try {
    const res = await fetch(`/api/page/${pageNum}`);
    const data = await res.json();
    document.getElementById('hero-arabic-title').innerText = `الصفحة ${pageNum}`;
    document.getElementById('hero-tr-title').innerText = `${pageNum}. Sayfa`;
    document.getElementById('hero-en-title').innerText = `(Page ${pageNum})`;
    document.getElementById('hero-verse-count-badge').innerText = `${data.total} Ayet`;
    renderVersesStream(data.verses);
    if (targetVerseNumber) {
      setTimeout(() => {
        scrollToTargetVerse(null, targetVerseNumber, pageNum);
      }, 120);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (e) {
    streamEl.innerHTML = `<div style="padding:2rem;color:#f87171;">Sayfa yüklenemedi.</div>`;
  }
}


// =================================================================
// AUDIO MASTER PLAYER MODULE
// =================================================================
function initAudio() {
  const audio = document.getElementById('global-audio-element');
  AppState.audio.element = audio;

  const playToggleBtn = document.getElementById('player-btn-toggle');
  const prevBtn = document.getElementById('player-btn-prev');
  const nextBtn = document.getElementById('player-btn-next');
  const autoadvanceChk = document.getElementById('player-chk-autoadvance');
  const volumeSlider = document.getElementById('player-volume');

  playToggleBtn.addEventListener('click', togglePlayPause);
  prevBtn.addEventListener('click', playPreviousVerse);
  nextBtn.addEventListener('click', playNextVerse);

  autoadvanceChk.addEventListener('change', (e) => {
    AppState.audio.autoAdvance = e.target.checked;
  });

  volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
  });

  audio.addEventListener('play', () => {
    AppState.audio.isPlaying = true;
    updateAudioUI(true);
  });

  audio.addEventListener('pause', () => {
    AppState.audio.isPlaying = false;
    updateAudioUI(false);
  });

  audio.addEventListener('ended', () => {
    if (AppState.audio.autoAdvance) {
      playNextVerse();
    } else {
      AppState.audio.isPlaying = false;
      updateAudioUI(false);
    }
  });

  audio.addEventListener('error', () => {
    showToast('Ses akışı yüklenirken bir bağlantı hatası oluştu.');
    AppState.audio.isPlaying = false;
    updateAudioUI(false);
  });
}

function playVerse(verse) {
  if (!verse) return;
  AppState.audio.currentVerse = verse;
  AppState.audio.currentSurahNumber = verse.surah_number;
  AppState.audio.currentVerseNumber = verse.verse_number;

  updateReadingPosition({
    surahNumber: verse.surah_number,
    verseNumber: verse.verse_number,
    key: verse.key,
    page: verse.page,
    juz: verse.juz,
    id: verse.id
  }, true);

  const audio = AppState.audio.element;
  audio.src = verse.audio_url;
  audio.play().catch(e => console.log('Playback error:', e));

  const surahMeta = AppState.surahs.find(s => s.number === verse.surah_number);
  const surahName = surahMeta ? surahMeta.name_tr : `Sure ${verse.surah_number}`;
  document.getElementById('player-surah-name').innerText = `${surahName} Suresi`;
  document.getElementById('player-verse-badge').innerText = verse.key;

  document.querySelectorAll('.verse-card').forEach(c => c.classList.remove('playing'));
  const activeCard = document.getElementById(`verse-card-${verse.id}`);
  if (activeCard) {
    activeCard.classList.add('playing');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function togglePlayPause() {
  const audio = AppState.audio.element;
  if (!audio.src) {
    if (AppState.currentSurahData && AppState.currentSurahData.verses.length > 0) {
      playVerse(AppState.currentSurahData.verses[0]);
    }
    return;
  }
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function playNextVerse() {
  if (!AppState.audio.currentVerse) return;
  const nextId = AppState.audio.currentVerse.id + 1;
  if (nextId <= 6236) {
    fetchVerseAndPlay(nextId);
  } else {
    showToast("Kur'an'ın son ayetine ulaşıldı.");
  }
}

function playPreviousVerse() {
  if (!AppState.audio.currentVerse) return;
  const prevId = AppState.audio.currentVerse.id - 1;
  if (prevId >= 1) {
    fetchVerseAndPlay(prevId);
  }
}

async function fetchVerseAndPlay(verseId) {
  if (AppState.currentSurahData) {
    const v = AppState.currentSurahData.verses.find(x => x.id === verseId);
    if (v) {
      playVerse(v);
      return;
    }
  }
  try {
    const surahId = getSurahNumberFromGlobalId(verseId);
    await loadSurah(surahId);
    const v = AppState.currentSurahData.verses.find(x => x.id === verseId);
    if (v) playVerse(v);
  } catch (e) {
    console.error(e);
  }
}

function getSurahNumberFromGlobalId(globalId) {
  let count = 0;
  for (const s of AppState.surahs) {
    count += s.verse_count;
    if (globalId <= count) return s.number;
  }
  return 1;
}

function updateAudioUI(isPlaying) {
  const playIcon = document.querySelector('.icon-play');
  const pauseIcon = document.querySelector('.icon-pause');
  const visualizer = document.getElementById('audio-visualizer');
  const dot = document.getElementById('player-indicator-dot');

  playIcon.classList.toggle('hidden', isPlaying);
  pauseIcon.classList.toggle('hidden', !isPlaying);
  visualizer.classList.toggle('active', isPlaying);
  dot.classList.toggle('hidden', !isPlaying);
}


// =================================================================
// VIEW TOGGLES & FONT SCALER
// =================================================================
function initViewToggles() {
  const toggles = [
    { id: 'chk-meal-diyanet', key: 'diyanet' },
    { id: 'chk-meal-yazir', key: 'yazir' },
    { id: 'chk-meal-en', key: 'en' },
    { id: 'chk-translit', key: 'translit' },
    { id: 'chk-clean-ar', key: 'cleanArabic' }
  ];

  toggles.forEach(t => {
    const el = document.getElementById(t.id);
    if (el) {
      el.addEventListener('change', (e) => {
        AppState.viewSettings[t.key] = e.target.checked;
        el.parentElement.classList.toggle('active', e.target.checked);
        if (AppState.currentSurahData) {
          renderVersesStream(AppState.currentSurahData.verses);
        }
      });
    }
  });
}

function initFontScaler() {
  const decBtn = document.getElementById('btn-font-dec');
  const incBtn = document.getElementById('btn-font-inc');
  const valEl = document.getElementById('font-size-val');

  decBtn.addEventListener('click', () => {
    if (AppState.fontSize > 18) {
      AppState.fontSize -= 2;
      valEl.innerText = `${AppState.fontSize}px`;
      updateArabicFontSize();
    }
  });

  incBtn.addEventListener('click', () => {
    if (AppState.fontSize < 48) {
      AppState.fontSize += 2;
      valEl.innerText = `${AppState.fontSize}px`;
      updateArabicFontSize();
    }
  });
}

// =================================================================
// LANGUAGE SWITCHER & MULTILINGUAL SYSTEM (Google Directory BCP 47: TR, EN, AR, DE, FR)
// =================================================================
function initLanguageSwitcher() {
  const savedLang = localStorage.getItem('quran_app_lang') || localStorage.getItem('quran_lang') || 'tr';
  setAppLanguage(savedLang);

  const langBtns = document.querySelectorAll('.lang-switcher .btn-lang, .m-lang-selector .m-lang-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setAppLanguage(lang);
    });
  });

  const headerSelect = document.getElementById('header-lang-select');
  if (headerSelect) {
    headerSelect.value = savedLang;
    headerSelect.addEventListener('change', () => {
      setAppLanguage(headerSelect.value);
    });
  }

  // Reactive listener for language changes dispatched by language_model.js
  window.addEventListener('quran-language-changed', (e) => {
    if (e.detail && e.detail.lang && e.detail.lang !== AppState.language) {
      setAppLanguage(e.detail.lang, false);
    }
  });
}

function setAppLanguage(lang, triggerModel = true) {
  if (!lang) lang = 'tr';
  AppState.language = lang;
  try { 
    localStorage.setItem('quran_app_lang', lang); 
    localStorage.setItem('quran_lang', lang);
  } catch (e) {}

  // Dil butonlarını ve dropdown'u güncelle
  document.querySelectorAll('.lang-switcher .btn-lang, .m-lang-selector .m-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  const headerSelect = document.getElementById('header-lang-select');
  if (headerSelect && headerSelect.value !== lang) {
    headerSelect.value = lang;
  }

  // Multilingual Language Model Engine (Full DOM tree translation)
  if (triggerModel && typeof QuranLanguageModel !== 'undefined') {
    QuranLanguageModel.setLanguage(lang);
  }

  // Standardized Müfettiş & Keşif Terminology
  const inspectorTerms = {
    tr: { text: "Müfettiş", full: "Müfettiş & Keşif", live: "Canlı", title: "Ayet & Kelime Müfettişi", subtitle: "CANLI MATEMATİK & BAĞLAMSAL KEŞİF" },
    en: { text: "Inspector", full: "Inspector & Explorer", live: "Live", title: "Ayah & Word Inspector", subtitle: "LIVE MATHEMATICS & CONTEXTUAL DISCOVERY" },
    ar: { text: "المفتش", full: "المفتش والمستكشف", live: "مباشر", title: "مفتش الآيات والكلمات", subtitle: "التحليل الرقمي الحي والاستكشاف السياقي" },
    de: { text: "Inspektor", full: "Inspektor & Erkunder", live: "Live", title: "Vers- & Wort-Inspektor", subtitle: "LIVE-MATHEMATIK & KONTEXTUELLE ENTDECKUNG" },
    fr: { text: "Inspecteur", full: "Inspecteur & Explorateur", live: "Direct", title: "Inspecteur de Verset & Mot", subtitle: "MATHÉMATIQUES EN DIRECT & DÉCOUVERTE" },
    es: { text: "Inspector", full: "Inspector y Explorador", live: "En vivo", title: "Inspector de Versículos y Palabras", subtitle: "MATEMÁTICAS EN VIVO Y DESCUBRIMIENTO" },
    ru: { text: "Инспектор", full: "Инспектор и Исследователь", live: "Прямой", title: "Инспектор Аятов и Слов", subtitle: "ЖИВАЯ МАТЕМАТИКА И ИССЛЕДОВАНИЕ" }
  };
  const t = inspectorTerms[lang] || inspectorTerms.en || inspectorTerms.tr;

  // Floating Inspector Pill update
  const pillBtn = document.getElementById('btn-floating-inspector-toggle');
  if (pillBtn) {
    const pillText = pillBtn.querySelector('.f-pill-text');
    const pillBadge = pillBtn.querySelector('#f-pill-badge');
    if (pillText) pillText.innerText = t.text;
    if (pillBadge) pillBadge.innerText = t.live;
    pillBtn.title = `${t.full} (M)`;
  }

  // Toolbar Inspector Pill update
  const tbInspBtn = document.getElementById('tb-btn-inspector-toggle');
  if (tbInspBtn) {
    const tbText = tbInspBtn.querySelector('.tb-label');
    if (tbText) tbText.innerText = t.text;
    tbInspBtn.title = `${t.full} (M)`;
  }

  // Inspector Drawer Header update
  const inspTitleEl = document.querySelector('.inspector-title');
  if (inspTitleEl) {
    inspTitleEl.innerText = t.title;
  }
  const inspBadgeEl = document.querySelector('.inspector-badge-gold');
  if (inspBadgeEl) {
    inspBadgeEl.innerText = t.subtitle;
  }
  const pinBtn = document.getElementById('btn-pin-inspector');
  if (pinBtn) {
    const pinTitles = {
      tr: "Müfettişi Sabitle / Otomatik Gizle",
      en: "Pin Inspector / Auto Hide",
      ar: "تثبيت المفتش / إخفاء تلقائي",
      de: "Inspektor fixieren",
      fr: "Épingler l'inspecteur"
    };
    pinBtn.title = pinTitles[lang] || pinTitles.tr;
  }

  // data-i18n etiketli tüm elemanları güncelle
  const dict = I18N[lang] || I18N.tr;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      el.innerText = dict[key];
    }
  });

  // Eğer İngilizce seçildiyse kelime mealini de otomatik İngilizce'ye çevir
  if (lang === 'en') {
    AppState.readerMode.wbwLang = 'en';
    const trBtn = document.getElementById('btn-wbw-tr');
    const enBtn = document.getElementById('btn-wbw-en');
    if (trBtn) trBtn.classList.remove('active');
    if (enBtn) enBtn.classList.add('active');
  } else if (lang === 'tr') {
    AppState.readerMode.wbwLang = 'tr';
    const trBtn = document.getElementById('btn-wbw-tr');
    const enBtn = document.getElementById('btn-wbw-en');
    if (trBtn) trBtn.classList.add('active');
    if (enBtn) enBtn.classList.remove('active');
  }

  // Mushaf ve ayet akışını yenile
  if (AppState.currentSurahData) {
    renderVersesStream(AppState.currentSurahData.verses);
  }

  // Aktif kelime müfettişini güncelle
  if (AppState.mathInspector.activeWord) {
    inspectWord(AppState.mathInspector.activeWord, AppState.mathInspector.activeVerse);
  }

  // Esma-ül Hüsna ve Esma-i Nebi tablolarını aktif dile göre yenile
  if (AppState.nurmuhammad && AppState.nurmuhammad.data) {
    if (AppState.nurmuhammad.data.asma_ul_husna) {
      renderAsmaHusnaTable(AppState.nurmuhammad.data.asma_ul_husna);
    }
    if (AppState.nurmuhammad.data.asma_un_nabi) {
      renderAsmaNabiTable(AppState.nurmuhammad.data.asma_un_nabi);
    }
  }

  // Örüntüler ve Simetri sekmesi açık ise çok ölçekli pozisyonları aktif dilde yeniden yükle
  if (AppState.currentTab === 'patterns') {
    const activeScaleBtn = document.querySelector('.scale-tab-btn.active');
    const scale = activeScaleBtn ? activeScaleBtn.dataset.scale : 'juz';
    loadPositions(scale);
  }

  // Delâil ve görselleştirici açık ise güncelle
  if (AppState.currentTab === 'delail' && AppState.delail.loaded) {
    renderDelailHizb(AppState.delail.activeDay);
  }
}

// =================================================================
// READER CONTROLS: HAREKELİ/HAREKESİZ & KELİME KELİME MEAL DÜZENİ
// =================================================================
function initReaderControls() {
  // Harekeli vs Harekesiz (Yalın)
  const vocalizedBtn = document.getElementById('btn-mode-vocalized');
  const unvocalizedBtn = document.getElementById('btn-mode-unvocalized');

  if (vocalizedBtn && unvocalizedBtn) {
    vocalizedBtn.addEventListener('click', () => {
      AppState.readerMode.scriptType = 'uthmani';
      vocalizedBtn.classList.add('active');
      unvocalizedBtn.classList.remove('active');
      if (AppState.currentSurahData) {
        renderVersesStream(AppState.currentSurahData.verses);
      }
    });

    unvocalizedBtn.addEventListener('click', () => {
      AppState.readerMode.scriptType = 'clean';
      unvocalizedBtn.classList.add('active');
      vocalizedBtn.classList.remove('active');
      if (AppState.currentSurahData) {
        renderVersesStream(AppState.currentSurahData.verses);
      }
    });
  }

  // Sayfa Düzeni (Kelime Kelime Meal vs Sülâsî Kök Modu vs Akıcı Mushaf)
  ['wbw', 'root', 'flowing'].forEach(l => {
    const btn = document.getElementById(`btn-layout-${l}`);
    if (btn) {
      btn.addEventListener('click', () => setReaderLayout(l));
    }
  });

  // Kelime Meali Dili (TR / EN)
  const wbwTrBtn = document.getElementById('btn-wbw-tr');
  const wbwEnBtn = document.getElementById('btn-wbw-en');

  if (wbwTrBtn && wbwEnBtn) {
    wbwTrBtn.addEventListener('click', () => {
      AppState.readerMode.wbwLang = 'tr';
      wbwTrBtn.classList.add('active');
      wbwEnBtn.classList.remove('active');
      if (AppState.currentSurahData) {
        renderVersesStream(AppState.currentSurahData.verses);
      }
    });

    wbwEnBtn.addEventListener('click', () => {
      AppState.readerMode.wbwLang = 'en';
      wbwEnBtn.classList.add('active');
      wbwTrBtn.classList.remove('active');
      if (AppState.currentSurahData) {
        renderVersesStream(AppState.currentSurahData.verses);
      }
    });
  }
}

function updateArabicFontSize() {
  document.querySelectorAll('.verse-arabic-uthmani, .wbw-arabic').forEach(el => {
    el.style.fontSize = `${AppState.fontSize}px`;
  });
}


// =================================================================
// TAB 2: KUR'AN MUCİZELERİ & AKILLI KELİME TARAYICI
// =================================================================
async function initMiraclesModule() {
  document.getElementById('btn-scanner-submit').addEventListener('click', executeScannerSearch);
  document.getElementById('scanner-word-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeScannerSearch();
  });

  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.word;
      document.getElementById('scanner-word-input').value = w;
      executeScannerSearch();
    });
  });

  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('miracle-modal').addEventListener('click', (e) => {
    if (e.target.id === 'miracle-modal') closeModal();
  });
}

async function loadMiracles() {
  const grid = document.getElementById('miracles-grid');
  grid.innerHTML = `<div class="loader-spinner"></div>`;

  try {
    const res = await fetch('/api/miracles');
    const data = await res.json();
    AppState.miracles = data.miracles;
    renderMiraclesGrid(AppState.miracles);
  } catch (e) {
    grid.innerHTML = `<div style="color:#f87171;">Mucizeler yüklenirken hata oluştu.</div>`;
  }
}

function renderMiraclesGrid(miracles) {
  const grid = document.getElementById('miracles-grid');
  grid.innerHTML = '';

  miracles.forEach(m => {
    const card = document.createElement('div');
    card.className = 'miracle-card';

    let pillsHtml = '';
    m.words.forEach(w => {
      const countDisplay = (w.actual_count !== undefined && w.actual_count !== null) ? `${w.actual_count} kez` : (w.target_count > 0 ? `${w.target_count} kez` : 'Analiz');
      pillsHtml += `
        <div class="miracle-pill">
          <span class="pill-ar">${w.word}</span>
          <span class="pill-cnt">${countDisplay}</span>
          <span style="font-size:0.68rem; color:var(--text-muted);">(quran.db)</span>
        </div>
      `;
    });

    // Dynamic Balance Bar
    let balanceBarHtml = '';
    if (m.words.length === 2 && m.words[0].actual_count > 0 && m.words[1].actual_count > 0) {
      const c1 = m.words[0].actual_count;
      const c2 = m.words[1].actual_count;
      const total = c1 + c2;
      const pct1 = Math.round((c1 / total) * 100);
      const pct2 = 100 - pct1;
      balanceBarHtml = `
        <div class="miracle-balance-bar-wrap">
          <div class="miracle-balance-labels">
            <span>${m.words[0].word} (%${pct1})</span>
            <span style="color:var(--gold-light);">${m.live_status?.ratio_label || ''}</span>
            <span>${m.words[1].word} (%${pct2})</span>
          </div>
          <div class="miracle-balance-track">
            <div class="miracle-balance-fill-a" style="width: ${pct1}%;"></div>
            <div class="miracle-balance-fill-b" style="width: ${pct2}%;"></div>
          </div>
        </div>
      `;
    }

    const badgeText = m.live_status?.badge_text || '● Canlı Kur\'an Teyidi: %100 Doğrulandı';

    card.innerHTML = `
      <div class="miracle-card-header">
        <span class="miracle-card-badge">${m.badge}</span>
        <span class="miracle-live-tag">
          <span class="live-pulse-dot"></span>
          ${escapeHtml(badgeText)}
        </span>
      </div>
      <h3 class="miracle-card-title">${m.title}</h3>
      <p class="miracle-card-summary">${m.summary}</p>
      ${balanceBarHtml}
      <div class="miracle-words-pills">${pillsHtml}</div>
      <button class="btn-inspect-miracle">
        <span>Canlı Doğrula & Ayetleri İncele</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `;

    card.addEventListener('click', () => openMiracleModal(m));
    grid.appendChild(card);
  });
}

async function openMiracleModal(m) {
  AppState.activeMiracle = m;
  document.getElementById('modal-miracle-badge').innerText = m.badge;
  document.getElementById('modal-miracle-title').innerText = m.title;

  const bodyEl = document.getElementById('modal-miracle-body');
  bodyEl.innerHTML = `<div class="loader-spinner" style="margin: 3rem auto;"></div>`;
  document.getElementById('miracle-modal').classList.remove('hidden');

  try {
    const res = await fetch(`/api/miracle/${encodeURIComponent(m.id)}`);
    const data = await res.json();
    renderMiracleModalContent(data);
  } catch (err) {
    bodyEl.innerHTML = `<div style="color:#f87171; padding:2rem; text-align:center;">Canlı Kur'an verisi alınırken hata oluştu.</div>`;
  }
}

function renderMiracleModalContent(data) {
  const bodyEl = document.getElementById('modal-miracle-body');
  const wA = data.word_a_details || {};
  const wB = data.word_b_details || {};
  const isEn = AppState.language === 'en';

  const tab1Label = `⚖️ ${isEn ? 'Live Symmetry Proof' : 'Canlı Eşitlik & Simetri'}`;
  const tab2Label = `📖 ${wA.word || 'Kelime 1'} (${wA.actual_count || 0} ${isEn ? 'Verses' : 'Ayet'})`;
  const tab3Label = (wB.word && wB.occurrences && wB.occurrences.length > 0) ? `📖 ${wB.word} (${wB.actual_count || 0} ${isEn ? 'Verses' : 'Ayet'})` : '';

  let tabsHtml = `
    <div class="miracle-modal-nav">
      <button class="miracle-modal-tab-btn active" data-target="tab-summary">${tab1Label}</button>
      <button class="miracle-modal-tab-btn" data-target="tab-word-a">${tab2Label}</button>
      ${tab3Label ? `<button class="miracle-modal-tab-btn" data-target="tab-word-b">${tab3Label}</button>` : ''}
    </div>
  `;

  // Pane 1: Summary & Side-by-side
  let pane1Html = `
    <div class="miracle-modal-pane" id="tab-summary">
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1rem 1.25rem; border-radius: 10px; margin-bottom: 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <strong style="color: #34d399; font-size: 0.95rem;">✨ ${data.live_status?.badge_text || 'Canlı Doğrulandı'}</strong>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.2rem;">${data.live_status?.provenance || 'quran.db'}</div>
        </div>
        <span class="badge-emerald" style="font-size: 0.85rem; padding: 0.3rem 0.75rem;">${data.live_status?.ratio_label || ''}</span>
      </div>

      <div class="miracle-dual-grid">
        <div class="miracle-stat-box box-gold">
          <div class="miracle-stat-ar" style="color: var(--gold-light);">${wA.word || ''}</div>
          <div class="miracle-stat-meaning">${wA.meaning || ''}</div>
          <div class="miracle-stat-count" style="color: var(--gold-light);">${wA.actual_count || 0}</div>
          <div class="miracle-stat-sub">Kur'an Genelinde (${wA.verse_count || 0} Farklı Ayette)</div>
        </div>
        ${wB.word ? `
        <div class="miracle-stat-box box-emerald">
          <div class="miracle-stat-ar" style="color: var(--emerald-light);">${wB.word}</div>
          <div class="miracle-stat-meaning">${wB.meaning || ''}</div>
          <div class="miracle-stat-count" style="color: var(--emerald-light);">${wB.actual_count || 0}</div>
          <div class="miracle-stat-sub">Kur'an Genelinde (${wB.verse_count || 0} Farklı Ayette)</div>
        </div>
        ` : ''}
      </div>

      <div style="background: rgba(245, 158, 11, 0.06); border: 1px solid var(--border-gold); padding: 1.25rem; border-radius: 12px; margin-bottom: 1rem;">
        <h4 style="color: var(--gold-light); margin-bottom: 0.5rem; font-size: 1.05rem;">İlmi ve Matematiksel Açıklama</h4>
        <p style="color: #cbd5e1; font-size: 0.92rem; line-height: 1.7;">${data.explanation}</p>
      </div>
    </div>
  `;

  // Pane 2: Word A verses
  let pane2Html = `
    <div class="miracle-modal-pane hidden" id="tab-word-a">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.85rem;">
        <h4 style="color:var(--gold-light); font-size:1rem;">'${wA.word}' İçeren Tüm Ayetler (${wA.occurrences ? wA.occurrences.length : 0} Ayet)</h4>
        <span style="font-size:0.8rem; color:var(--text-muted);">Canlı quran.db dökümü</span>
      </div>
      <div class="miracle-verses-stream">
        ${renderVersesStreamHtml(wA.occurrences, wA.word, isEn)}
      </div>
    </div>
  `;

  // Pane 3: Word B verses
  let pane3Html = (wB.word && wB.occurrences && wB.occurrences.length > 0) ? `
    <div class="miracle-modal-pane hidden" id="tab-word-b">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.85rem;">
        <h4 style="color:var(--emerald-light); font-size:1rem;">'${wB.word}' İçeren Tüm Ayetler (${wB.occurrences.length} Ayet)</h4>
        <span style="font-size:0.8rem; color:var(--text-muted);">Canlı quran.db dökümü</span>
      </div>
      <div class="miracle-verses-stream">
        ${renderVersesStreamHtml(wB.occurrences, wB.word, isEn)}
      </div>
    </div>
  ` : '';

  bodyEl.innerHTML = tabsHtml + pane1Html + pane2Html + pane3Html;

  // Tab switching logic
  bodyEl.querySelectorAll('.miracle-modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bodyEl.querySelectorAll('.miracle-modal-tab-btn').forEach(b => b.classList.remove('active'));
      bodyEl.querySelectorAll('.miracle-modal-pane').forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      const targetId = btn.dataset.target;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.remove('hidden');
    });
  });
}

function renderVersesStreamHtml(occurrences, targetWord, isEn) {
  if (!occurrences || occurrences.length === 0) {
    return `<div style="padding:2rem; text-align:center; color:var(--text-muted);">Kayıtlı ayet bulunamadı.</div>`;
  }

  return occurrences.map(v => {
    const sName = isEn ? (v.surah_name_en || v.surah_name_tr) : v.surah_name_tr;
    const transText = isEn ? (v.en || v.diyanet) : (v.diyanet || v.en);
    const countTag = v.count > 1 ? `<span class="miracle-verse-count-tag">Bu ayette ${v.count} kez</span>` : '';

    return `
      <div class="miracle-verse-row">
        <div class="miracle-verse-row-header">
          <span class="miracle-verse-ref">${sName} [${v.key}]</span>
          ${countTag}
        </div>
        <div class="miracle-verse-ar">${v.text_uthmani}</div>
        <div class="miracle-verse-tr">${escapeHtml(transText)}</div>
      </div>
    `;
  }).join('');
}

function closeModal() {
  document.getElementById('miracle-modal').classList.add('hidden');
}

// Akıllı Kelime Tarama (Scanner)
async function executeScannerSearch() {
  const input = document.getElementById('scanner-word-input');
  const word = input.value.trim();
  const exact = document.getElementById('scanner-exact-match').checked ? 1 : 0;
  if (!word) {
    showToast('Lütfen taranacak bir kelime girin.');
    return;
  }

  const container = document.getElementById('scanner-results');
  const summaryEl = document.getElementById('scanner-summary');
  const listEl = document.getElementById('scanner-verses-list');

  container.classList.remove('hidden');
  summaryEl.innerHTML = `<div class="loader-spinner"></div>`;
  listEl.innerHTML = '';

  try {
    const res = await fetch(`/api/stats/word?word=${encodeURIComponent(word)}&exact=${exact}`);
    const data = await res.json();

    const arabicPill = data.mapped_arabic 
      ? `<span class="stat-chip" style="background:rgba(245,158,11,0.15); color:var(--gold-light); padding:0.2rem 0.6rem; border-radius:6px;">Arapça Eşleşme: <strong>${data.mapped_arabic}</strong></span>` 
      : '';

    summaryEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.3rem;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="font-size: 1.15rem; font-weight:700;">'${data.word}' Kelimesi Sonuçları:</span>
          ${arabicPill}
        </div>
        <div style="font-size:0.85rem; color:#cbd5e1;">
          Yalın / Ön Ekli Eşleşme: <strong style="color:var(--emerald-light);">${data.exact_count} kez</strong> | 
          Kök / İçinde Geçenler (Geniş): <strong style="color:var(--gold-light);">${data.stem_count} kez</strong>
        </div>
      </div>
      <div>
        <span class="badge-mini" style="font-size:0.85rem; padding:0.35rem 0.75rem;">${data.verse_count} Ayette Bulundu</span>
      </div>
    `;

    if (data.occurrences.length === 0) {
      listEl.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--text-muted);">Bu kelime Kur'an metninde veya meallerinde bulunamadı. Lütfen kelime kökünü kontrol edin.</div>`;
      return;
    }

    listEl.innerHTML = '';
    data.occurrences.forEach(v => {
      const row = document.createElement('div');
      row.className = 'scanner-verse-row';
      row.innerHTML = `
        <div class="scanner-verse-header">
          <strong>${v.surah_name_tr} Suresi [${v.key}]</strong>
          <span style="color:var(--emerald-light); font-weight:700;">Bu ayette ${v.count_in_verse} kez</span>
        </div>
        <div class="scanner-verse-ar">${v.text_uthmani}</div>
        <div class="scanner-verse-tr">${v.diyanet}</div>
      `;
      listEl.appendChild(row);
    });

  } catch (e) {
    summaryEl.innerHTML = `<div style="color:#f87171;">Arama gerçekleştirilemedi.</div>`;
  }
}


// =================================================================
// TAB 3: SAYISAL ÖRÜNTÜLER & SİMETRİ (NEW!)
// =================================================================
function initPatternsModule() {
  // Pattern Subtabs (letters, symmetry, positions)
  const navBtns = document.querySelectorAll('.pattern-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sub = btn.dataset.sub;
      AppState.patternsSubtab = sub;

      document.querySelectorAll('.pattern-subview').forEach(p => p.classList.add('hidden'));
      const activeP = document.getElementById(`subview-${sub}`);
      if (activeP) activeP.classList.remove('hidden');

      if (sub === 'letters') {
        const sSelect = document.getElementById('pattern-surah-select');
        const sNum = parseInt(sSelect.value, 10) || AppState.currentSurahId;
        loadSurahLetterAnalysis(sNum);
      } else if (sub === 'symmetry') {
        loadSymmetryMatrix();
      } else if (sub === 'positions') {
        loadPositions(AppState.positionLevel);
      }
    });
  });

  // Sure Seçici Değişimi
  const sSelect = document.getElementById('pattern-surah-select');
  sSelect.addEventListener('change', (e) => {
    loadSurahLetterAnalysis(parseInt(e.target.value, 10));
  });

  // Symmetry Filtreleri
  document.querySelectorAll('.sym-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sym-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      filterSymmetryTable(f);
    });
  });

  // Multi-Scale Seviye Butonları (quran, juz, surah, verse, word)
  document.querySelectorAll('.pos-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.positionLevel = btn.dataset.level;
      updateScaleToolbarUI(AppState.positionLevel);
      loadPositions(AppState.positionLevel);
    });
  });

  // Scale Parameters Toolbar Controls
  const juzSelect = document.getElementById('scale-juz-select');
  if (juzSelect) {
    juzSelect.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `${i}. Cüz`;
      juzSelect.appendChild(opt);
    }
    juzSelect.addEventListener('change', (e) => {
      AppState.multiScale.juz = parseInt(e.target.value, 10);
      loadPositions(AppState.positionLevel);
    });
  }

  const scaleSurahSelect = document.getElementById('scale-surah-select');
  if (scaleSurahSelect) {
    scaleSurahSelect.addEventListener('change', (e) => {
      AppState.multiScale.surah = parseInt(e.target.value, 10);
      loadPositions(AppState.positionLevel);
    });
  }

  const btnVerseLoad = document.getElementById('btn-scale-verse-load');
  if (btnVerseLoad) {
    btnVerseLoad.addEventListener('click', () => {
      const val = parseInt(document.getElementById('scale-verse-input').value, 10) || 1;
      AppState.multiScale.verse = val;
      loadPositions(AppState.positionLevel);
    });
  }

  const chkCenterOnly = document.getElementById('chk-filter-center-only');
  if (chkCenterOnly) {
    chkCenterOnly.addEventListener('change', (e) => {
      AppState.multiScale.centerOnly = e.target.checked;
      loadPositions(AppState.positionLevel);
    });
  }

  const chkPrimes = document.getElementById('chk-filter-primes');
  if (chkPrimes) {
    chkPrimes.addEventListener('change', (e) => {
      AppState.multiScale.primesHighlight = e.target.checked;
      loadPositions(AppState.positionLevel);
    });
  }

  const scaleMealSelect = document.getElementById('scale-meal-select');
  if (scaleMealSelect) {
    scaleMealSelect.addEventListener('change', (e) => {
      AppState.multiScale.meal = e.target.value;
      loadPositions(AppState.positionLevel);
    });
  }
}

function updateScaleToolbarUI(level) {
  const pJuz = document.getElementById('param-group-juz');
  const pSurah = document.getElementById('param-group-surah');
  const pVerse = document.getElementById('param-group-verse');

  if (pJuz) pJuz.classList.toggle('hidden', level !== 'juz');
  if (pSurah) pSurah.classList.toggle('hidden', !['surah', 'verse', 'word'].includes(level));
  if (pVerse) pVerse.classList.toggle('hidden', !['verse', 'word'].includes(level));
}

function populatePatternSurahSelect(surahs) {
  const select = document.getElementById('pattern-surah-select');
  const scaleSelect = document.getElementById('scale-surah-select');
  if (select) select.innerHTML = '';
  if (scaleSelect) scaleSelect.innerHTML = '';

  surahs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.number;
    opt.innerText = `${s.number}. ${s.name_tr} (${s.name_ar}) - ${s.verse_count} Ayet`;
    if (select) select.appendChild(opt);
    if (scaleSelect) scaleSelect.appendChild(opt.cloneNode(true));
  });
}

// 1. Harf Harf Sure Analizi Yükleyici
async function loadSurahLetterAnalysis(surahNumber) {
  const tbody = document.getElementById('tbody-surah-letters');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;"><div class="loader-spinner"></div></td></tr>`;

  try {
    const res = await fetch(`/api/analysis/surah-letters?surah=${surahNumber}`);
    const data = await res.json();

    // KPIs Güncelle
    document.getElementById('psk-letters').innerText = data.total_letters.toLocaleString('tr-TR');
    document.getElementById('psk-letters-prime').className = `kpi-prime-badge ${data.is_prime_letters ? 'badge-prime-yes' : 'badge-prime-no'}`;
    document.getElementById('psk-letters-prime').innerText = data.is_prime_letters ? 'Asal Sayı' : 'Asal Değil';

    document.getElementById('psk-words').innerText = data.total_words.toLocaleString('tr-TR');
    document.getElementById('psk-words-prime').className = `kpi-prime-badge ${data.is_prime_words ? 'badge-prime-yes' : 'badge-prime-no'}`;
    document.getElementById('psk-words-prime').innerText = data.is_prime_words ? 'Asal Sayı' : 'Asal Değil';

    document.getElementById('psk-verses').innerText = data.verse_count;
    document.getElementById('psk-verses-prime').className = `kpi-prime-badge ${data.is_prime_verses ? 'badge-prime-yes' : 'badge-prime-no'}`;
    document.getElementById('psk-verses-prime').innerText = data.is_prime_verses ? 'Asal Sayı' : 'Asal Değil';

    document.getElementById('psk-abjad').innerText = data.abjad_value.toLocaleString('tr-TR');
    document.getElementById('psk-abjad-prime').className = `kpi-prime-badge ${data.is_prime_abjad ? 'badge-prime-yes' : 'badge-prime-no'}`;
    document.getElementById('psk-abjad-prime').innerText = data.is_prime_abjad ? 'Asal Sayı' : 'Asal Değil';

    // Mukattaa Kutusu
    const mBox = document.getElementById('mukattaa-special-box');
    if (data.mukattaa_stats) {
      const ms = data.mukattaa_stats;
      let pills = '';
      ms.breakdown.forEach(b => {
        pills += `
          <span style="background:rgba(255,255,255,0.08); padding:0.3rem 0.6rem; border-radius:6px; margin-right:0.4rem;">
            <strong>${b.char}</strong>: ${b.count} kez ${b.is_prime ? '<span class="badge-prime-yes" style="font-size:0.6rem;">Asal</span>' : ''}
          </span>
        `;
      });

      mBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
          <h4 style="color:var(--gold-light); font-size:1.1rem;">
            ✨ Hurûf-ı Mukatta'a (Şifreli Harfler) Analizi: <span style="font-family:var(--font-arabic-quran); font-size:1.4rem;">${data.mukattaa}</span>
          </h4>
          <span class="badge-mini" style="font-size:0.8rem;">Toplam Bu Harfler: ${ms.total_sum} kez</span>
        </div>
        <div style="font-size:0.9rem; color:#cbd5e1; margin-bottom:0.75rem;">
          ${ms.divisible_by_19 ? '🎉 <strong>19 MUCİZESİ:</strong> Bu surenin mukattaa harfleri toplamı 19\'un tam katıdır!' : ''}
          ${ms.is_prime ? '🔢 <strong>ASAL SAYI:</strong> Bu surenin mukattaa harfleri toplamı bir ASAL sayıdır!' : ''}
        </div>
        <div>${pills}</div>
      `;
      mBox.classList.remove('hidden');
    } else {
      mBox.classList.add('hidden');
    }

    // 28 Harf Tablosu - Oransal & Karşılaştırmalı Dağılım
    tbody.innerHTML = '';

    // Normalizasyon: Harf oranları Arapçada en yüksek %25 civarındadır.
    // 25'lik referans tavanı ile harita ölçeklendirilir ve gerçeği tam yansıtır.
    data.letters.forEach(item => {
      const row = document.createElement('tr');
      const surahPct = Number(item.percentage || 0);
      const quranPct = Number(item.quran_percentage || 0);
      const surahBarWidth = Math.min((surahPct / 25) * 100, 100).toFixed(1);
      const quranBarWidth = Math.min((quranPct / 25) * 100, 100).toFixed(1);

      row.innerHTML = `
        <td class="char-cell ${item.is_mukattaa ? 'char-mukattaa-highlight' : ''}">${item.char}</td>
        <td><strong>${item.name}</strong> ${item.is_mukattaa ? '<span class="badge-mini" style="font-size:0.65rem;">Mukatta\'a</span>' : ''}</td>
        <td style="color:var(--gold-light); font-weight:700;">${item.abjad}</td>
        <td><strong>${item.count.toLocaleString('tr-TR')}</strong> adet</td>
        <td style="font-weight:700; color:var(--gold-light);">%${surahPct.toFixed(2)}</td>
        <td style="color:#38bdf8; font-weight:600;">%${quranPct.toFixed(2)} <span style="font-size:0.7rem; color:var(--text-muted);">(${item.quran_count ? item.quran_count.toLocaleString('tr-TR') : '0'})</span></td>
        <td>
          <span class="kpi-prime-badge ${item.is_prime ? 'badge-prime-yes' : 'badge-prime-no'}">
            ${item.is_prime ? 'Asal' : 'Asal Değil'}
          </span>
        </td>
        <td style="min-width: 220px;">
          <div class="freq-dual-bar-container" title="Sure Oranı: %${surahPct.toFixed(2)} | Kur'an Geneli: %${quranPct.toFixed(2)}">
            <div class="freq-bar-line">
              <span class="freq-bar-tag surah-tag">Sure</span>
              <div class="freq-bar-track">
                <div class="freq-bar-fill surah-bar" style="width: ${surahBarWidth}%;"></div>
              </div>
              <span class="freq-bar-num">%${surahPct.toFixed(1)}</span>
            </div>
            <div class="freq-bar-line">
              <span class="freq-bar-tag quran-tag">Genel</span>
              <div class="freq-bar-track">
                <div class="freq-bar-fill quran-bar" style="width: ${quranBarWidth}%;"></div>
              </div>
              <span class="freq-bar-num quran-num">%${quranPct.toFixed(1)}</span>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171; text-align:center;">Harf analizi yüklenemedi.</td></tr>`;
  }
}

// 2. 114 Sure Simetri Matrisi (57/57)
async function loadSymmetryMatrix() {
  if (AppState.symmetryData) {
    renderSymmetryTable(AppState.symmetryData.matrix);
    return;
  }

  const tbody = document.getElementById('symmetry-table-body');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem;"><div class="loader-spinner"></div></td></tr>`;

  try {
    const res = await fetch('/api/analysis/symmetry');
    const data = await res.json();
    AppState.symmetryData = data;

    // KPI Banner
    document.getElementById('sym-even-count').innerText = `${data.summary.even_count} Sure`;
    document.getElementById('sym-even-sum').innerText = data.summary.even_sum_total;
    document.getElementById('sym-odd-count').innerText = `${data.summary.odd_count} Sure`;
    document.getElementById('sym-odd-sum').innerText = data.summary.odd_sum_total;
    document.getElementById('sym-prime-count').innerText = `${data.summary.prime_surahs_count} Sure`;
    document.getElementById('sym-prime-verses').innerText = `${data.summary.prime_verses_surahs_count} Sure`;

    renderSymmetryTable(data.matrix);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171; text-align:center;">Simetri matrisi yüklenemedi.</td></tr>`;
  }
}

function renderSymmetryTable(list) {
  const tbody = document.getElementById('symmetry-table-body');
  tbody.innerHTML = '';

  list.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${item.number}</strong></td>
      <td>
        <span style="font-weight:600;">${item.name_tr}</span>
        <span style="color:var(--text-muted); font-size:0.8rem; margin-left:0.3rem;">(${item.name_ar})</span>
      </td>
      <td><strong>${item.verse_count}</strong> ayet</td>
      <td style="color:var(--gold-light); font-weight:800; font-size:1rem;">${item.sum}</td>
      <td>
        <span class="${item.parity === 'even' ? 'badge-even' : 'badge-odd'}">
          ${item.parity === 'even' ? 'ÇİFT' : 'TEK'}
        </span>
      </td>
      <td>
        <span style="font-size:0.8rem; color:${item.is_homogeneous ? '#34d399' : '#94a3b8'};">
          ${item.is_homogeneous ? 'Homojen' : 'Heterojen'}
        </span>
      </td>
      <td>
        <span class="kpi-prime-badge ${item.is_prime_number ? 'badge-prime-yes' : 'badge-prime-no'}">
          ${item.is_prime_number ? 'Asal' : 'Asal Değil'}
        </span>
      </td>
      <td>
        <span class="kpi-prime-badge ${item.is_prime_verses ? 'badge-prime-yes' : 'badge-prime-no'}">
          ${item.is_prime_verses ? 'Asal' : 'Asal Değil'}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterSymmetryTable(filterType) {
  if (!AppState.symmetryData) return;
  const list = AppState.symmetryData.matrix;
  let filtered = list;

  if (filterType === 'even') filtered = list.filter(x => x.parity === 'even');
  else if (filterType === 'odd') filtered = list.filter(x => x.parity === 'odd');
  else if (filterType === 'primes') filtered = list.filter(x => x.is_prime_number);
  else if (filterType === 'prime_verses') filtered = list.filter(x => x.is_prime_verses);
  else if (filterType === 'homogeneous') filtered = list.filter(x => x.is_homogeneous);

  renderSymmetryTable(filtered);
}

// Triad Word-by-Word Interactive Flow Helper
function buildTriadWbwHtml(v) {
  if (!v || !v.words || !v.words.length) return '';
  const isEn = AppState.language === 'en' || AppState.readerMode.wbwLang === 'en';
  const isClean = AppState.readerMode && AppState.readerMode.scriptType === 'clean';

  const cardsHtml = v.words.map((w, idx) => {
    const arWord = isClean ? (w.clean || w.uth) : (w.uth || w.clean);
    const meaning = isEn ? (w.en || w.tr || '') : (w.tr || w.en || '');
    const translit = w.translit || '';
    const pos = (idx === 0) ? 'start' : (idx === v.words.length - 1 ? 'end' : (idx === Math.floor(v.words.length / 2) ? 'middle' : 'body'));

    return `
      <div class="triad-wbw-card ${pos}" 
           data-idx="${w.idx || (idx + 1)}"
           data-verse-key="${v.key || ''}"
           title="${escapeHtml(meaning || translit || '')} (Ebced: ${w.abjad || 0})">
        <span class="triad-wbw-ar">${arWord}</span>
        <span class="triad-wbw-trans">${escapeHtml(meaning || translit || '—')}</span>
        <span class="triad-wbw-abjad">${w.abjad || 0}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="triad-wbw-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <span style="font-size:0.72rem; font-weight:700; color:var(--gold-light); text-transform:uppercase;">
          🔤 ${isEn ? 'Word-by-Word Interlinear' : 'Kelime Kelime İnceleme'} (${v.words.length} ${isEn ? 'Words' : 'Kelime'})
        </span>
        <span style="font-size:0.68rem; color:var(--text-muted);">${isEn ? 'Click word to inspect' : 'İncelemek için tıkla'}</span>
      </div>
      <div class="triad-wbw-flow">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// Word-Level Letter Symmetry Pill (Baş / Vasat [Orta] / Hitam [Son] Harfleri)
function buildWordLetterSymmetryPill(wordStr, label = '') {
  if (!wordStr || typeof QuranMathProcessor === 'undefined') return '';
  const sym = QuranMathProcessor.getWordLetterSymmetry(wordStr);
  if (!sym || !sym.start || !sym.end) return '';
  const isEn = AppState.language === 'en';
  const midChar = sym.middle ? (sym.middle.isPair ? `${sym.middle.char}-${sym.middle.pairChar}` : sym.middle.char) : '—';
  const midAbjad = sym.middle ? (sym.middle.isPair ? `${sym.middle.abjad}+${sym.middle.pairAbjad}` : sym.middle.abjad) : 0;
  const midName = sym.middle ? (sym.middle.isPair ? `${sym.middle.name} / ${sym.middle.pairName}` : sym.middle.name) : '';

  return `
    <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); border-radius:8px; padding:0.45rem 0.6rem; margin-top:0.6rem; font-size:0.75rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
        <span style="font-weight:700; color:var(--gold-light);">🔤 ${label || (isEn ? 'Word Letter Symmetry' : 'Kelime Harf Simetrisi')}: <strong style="font-family:var(--font-arabic-clean); font-size:0.95rem;">${escapeHtml(wordStr)}</strong></span>
        <span style="font-size:0.7rem; color:var(--text-muted);">${sym.totalLetters} ${isEn ? 'Letters' : 'Harf'}</span>
      </div>
      <div style="display:flex; gap:0.4rem; justify-content:space-around; text-align:center;">
        <div style="flex:1; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.25); border-radius:6px; padding:0.25rem 0.3rem;">
          <div style="font-size:0.65rem; color:#60a5fa; font-weight:700;">🟢 ${isEn ? 'START' : 'BAŞ'}</div>
          <div style="font-family:var(--font-arabic-clean); font-size:1.15rem; color:#60a5fa; font-weight:700;">${sym.start.char}</div>
          <div style="font-size:0.65rem; color:var(--text-muted);">${sym.start.name} (${sym.start.abjad})</div>
        </div>
        <div style="flex:1; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:0.25rem 0.3rem;">
          <div style="font-size:0.65rem; color:#fbbf24; font-weight:700;">🟡 ${isEn ? 'CENTER (VASAT)' : 'VASAT (MERKEZ)'}</div>
          <div style="font-family:var(--font-arabic-clean); font-size:1.15rem; color:#fbbf24; font-weight:700;">${midChar}</div>
          <div style="font-size:0.65rem; color:var(--text-muted);">${midName} (${midAbjad})</div>
        </div>
        <div style="flex:1; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:6px; padding:0.25rem 0.3rem;">
          <div style="font-size:0.65rem; color:#34d399; font-weight:700;">🔴 ${isEn ? 'END (HITAM)' : 'HİTAM (SON)'}</div>
          <div style="font-family:var(--font-arabic-clean); font-size:1.15rem; color:#34d399; font-weight:700;">${sym.end.char}</div>
          <div style="font-size:0.65rem; color:var(--text-muted);">${sym.end.name} (${sym.end.abjad})</div>
        </div>
      </div>
    </div>
  `;
}

// Helper: Baş / Orta / Son Simetrisinde Dinamik Meal Çıktısı (Diyanet, Elmalılı, Edip Yüksel, İngilizce, Karşılaştırmalı)
function getPosVerseMealHtml(verseObj, activeMealKey = null, blockId = '') {
  if (!verseObj) return '';
  const mealKey = activeMealKey || AppState.multiScale.meal || 'diyanet';

  const translations = verseObj.translations || {
    diyanet: verseObj.diyanet || verseObj.translation_diyanet || '',
    yazir: verseObj.yazir || verseObj.translation_yazir || '',
    yuksel: verseObj.yuksel || verseObj.translation_yuksel || '',
    en: verseObj.en || verseObj.translation_en || ''
  };

  const mealMeta = {
    diyanet: { name: 'Diyanet Meali', color: '#10b981' },
    yazir: { name: 'Elmalılı Hamdi Yazır', color: '#f59e0b' },
    yuksel: { name: 'Edip Yüksel (Mesaj)', color: '#a855f7' },
    en: { name: 'Sahih International', color: '#38bdf8' }
  };

  if (mealKey === 'compare') {
    return `
      <div class="pos-compare-meals-box">
        <div class="pos-meal-tabs-bar">
          <span class="pm-tab-lbl">Mealler:</span>
          <button class="pm-tab-btn" onclick="switchPosBlockMeal('${blockId}', 'diyanet')">Diyanet</button>
          <button class="pm-tab-btn" onclick="switchPosBlockMeal('${blockId}', 'yazir')">Elmalılı</button>
          <button class="pm-tab-btn" onclick="switchPosBlockMeal('${blockId}', 'yuksel')">Edip Yüksel</button>
          <button class="pm-tab-btn" onclick="switchPosBlockMeal('${blockId}', 'en')">English</button>
          <button class="pm-tab-btn active" onclick="switchPosBlockMeal('${blockId}', 'compare')">⚡ Tümü (Karşılaştır)</button>
        </div>
        <div class="pos-compare-rows-list">
          ${Object.entries(translations).map(([k, txt]) => {
            if (!txt) return '';
            const m = mealMeta[k] || { name: k, color: '#d4af37' };
            return `
              <div class="pos-comp-meal-row">
                <span class="pos-comp-badge" style="color:${m.color}; border:1px solid ${m.color}50; background:${m.color}15;">${m.name}</span>
                <p class="pos-comp-text">${escapeHtml(txt)}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const currentText = translations[mealKey] || translations.diyanet || translations.en || 'Tercüme bulunamadı.';
  const currentMeta = mealMeta[mealKey] || mealMeta.diyanet;

  return `
    <div class="pos-single-meal-wrap">
      <div class="pos-meal-tabs-bar">
        <span class="pm-tab-lbl">Meal:</span>
        <button class="pm-tab-btn ${mealKey === 'diyanet' ? 'active' : ''}" onclick="switchPosBlockMeal('${blockId}', 'diyanet')">Diyanet</button>
        <button class="pm-tab-btn ${mealKey === 'yazir' ? 'active' : ''}" onclick="switchPosBlockMeal('${blockId}', 'yazir')">Elmalılı</button>
        <button class="pm-tab-btn ${mealKey === 'yuksel' ? 'active' : ''}" onclick="switchPosBlockMeal('${blockId}', 'yuksel')">Edip Yüksel</button>
        <button class="pm-tab-btn ${mealKey === 'en' ? 'active' : ''}" onclick="switchPosBlockMeal('${blockId}', 'en')">English</button>
        <button class="pm-tab-btn ${mealKey === 'compare' ? 'active' : ''}" onclick="switchPosBlockMeal('${blockId}', 'compare')">⚡ Tümü</button>
      </div>
      <div class="pos-block-tr">
        <span class="pos-meal-source-tag" style="color:${currentMeta.color};">[${currentMeta.name}]</span>
        <span class="pos-meal-main-text">${escapeHtml(currentText)}</span>
      </div>
    </div>
  `;
}

function switchPosBlockMeal(blockId, mealKey) {
  AppState.multiScale.meal = mealKey;
  const select = document.getElementById('scale-meal-select');
  if (select) select.value = mealKey;
  loadPositions(AppState.positionLevel);
}
window.switchPosBlockMeal = switchPosBlockMeal;

// 3. Merkez & Baş/Orta/Son Simetrileri (Çok Ölçekli Örüntü Motoru)
async function loadPositions(level = 'quran') {
  const container = document.getElementById('position-view-content');
  container.innerHTML = `<div class="loader-spinner"></div>`;

  try {
    let url = `/api/analysis/positions?type=${level}`;
    const sId = AppState.multiScale.surah || AppState.currentSurahId || 1;
    const vId = AppState.multiScale.verse || 1;
    const jId = AppState.multiScale.juz || 1;

    if (level === 'juz') url += `&id=${jId}`;
    if (level === 'surah') url += `&id=${sId}`;
    if (level === 'verse' || level === 'word') url += `&surah=${sId}&verse=${vId}`;

    const res = await fetch(url);
    const data = await res.json();

    const centerOnly = AppState.multiScale.centerOnly;
    const primeHighlight = AppState.multiScale.primesHighlight;
    const isEn = AppState.language === 'en';

    if (level === 'quran') {
      container.innerHTML = `
        <div class="position-triad-grid">
          <!-- Baş -->
          ${!centerOnly ? `
          <div class="position-block">
            <span class="pos-badge start">${isEn ? "🌌 BEGINNING OF THE QUR'AN" : "🌌 KUR'AN'IN BAŞLANGICI"}</span>
            <h4 class="pos-block-title">${data.beginning.title}</h4>
            <div class="pos-block-ar">${data.beginning.text_uthmani}</div>
            ${getPosVerseMealHtml(data.beginning, null, 'qbeg')}
            ${buildTriadWbwHtml(data.beginning)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'First Word' : 'İlk Kelime'}: <strong>${data.beginning.first_word}</strong></span>
              <span class="pos-pill">${isEn ? 'First Letter' : 'İlk Harf'}: <strong>${data.beginning.first_letter} (Bâ)</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.beginning.first_word, isEn ? 'First Word Letters' : 'İlk Kelime Harf Simetrisi')}
          </div>
          ` : ''}

          <!-- Orta (Merkez) -->
          <div class="position-block center-block ${centerOnly ? 'center-expanded' : ''}">
            <span class="pos-badge center">${isEn ? "🟡 ABSOLUTE CENTER OF THE QUR'AN" : "🟡 KUR'AN'IN MUTLAK MERKEZİ (TAM ORTA)"}</span>
            <h4 class="pos-block-title">${isEn ? "Central Word & Surah of the Holy Qur'an" : "Kur'an'ın Tam Orta Kelimesi & Suresi"}</h4>
            <div class="center-inner-box" style="background:rgba(245,158,11,0.12); border:1px solid var(--border-gold); padding:1rem; border-radius:10px; margin:0.75rem 0; box-shadow:0 0 20px var(--gold-glow);">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:var(--gold-light); font-size:0.9rem;">${isEn ? 'Center Word' : 'Merkez Kelime'}:</strong>
                <span class="badge-gold">Kehf 18:19</span>
              </div>
              <div style="font-family:var(--font-arabic-quran); font-size:2.2rem; color:var(--text-primary); direction:rtl; text-align:right; margin:0.4rem 0;">
                ${data.center.central_word.word}
              </div>
              <div style="font-size:0.9rem; font-weight:600; color:var(--text-primary); margin-bottom:0.4rem;">"${data.center.central_word.meaning}"</div>
              ${data.center.central_word.translations ? getPosVerseMealHtml(data.center.central_word, null, 'qcenter') : ''}
              <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.5;">${data.center.central_word.note}</p>
            </div>
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'Central Surah' : 'Orta Sure'}: <strong>57. Hadîd (Demir - 57/114)</strong></span>
              <span class="pos-pill">${isEn ? 'Central Verses' : 'Orta Ayetler'}: <strong>26:186 - 26:187 (3118. Ayet)</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.center.central_word.word, isEn ? 'Central Word Letters' : 'Merkez Kelime Harf Simetrisi')}
          </div>

          <!-- Son -->
          ${!centerOnly ? `
          <div class="position-block">
            <span class="pos-badge end">${isEn ? "🔴 CONCLUSION OF THE QUR'AN" : "🔴 KUR'AN'IN HİTAMI (SONU)"}</span>
            <h4 class="pos-block-title">${data.ending.title}</h4>
            <div class="pos-block-ar">${data.ending.text_uthmani}</div>
            ${getPosVerseMealHtml(data.ending, null, 'qend')}
            ${buildTriadWbwHtml(data.ending)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'Last Word' : 'Son Kelime'}: <strong>${data.ending.last_word}</strong></span>
              <span class="pos-pill">${isEn ? 'Last Letter' : 'Son Harf'}: <strong>${data.ending.last_letter} (Sîn)</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.ending.last_word, isEn ? 'Last Word Letters' : 'Son Kelime Harf Simetrisi')}
          </div>
          ` : ''}
        </div>
      `;
    } else if (level === 'juz') {
      const vCount = data.verse_count || data.total_verses || (data.verses ? data.verses.length : 0);
      const startPage = data.start_page || (data.first_verse ? data.first_verse.page : '-');
      const endPage = data.end_page || (data.last_verse ? data.last_verse.page : '-');
      const startKey = data.start_key || (data.first_verse ? data.first_verse.key : '-');
      const endKey = data.end_key || (data.last_verse ? data.last_verse.key : '-');

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem;">
          <h4>📖 ${data.juz_number}. ${isEn ? 'Juz Symmetry' : 'Cüz Simetrisi'} (${vCount} ${isEn ? 'Verses' : 'Ayet'}, ${isEn ? 'Pages' : 'Sayfa'}: ${startPage} - ${endPage})</h4>
          <span class="badge-emerald">${startKey} ➔ ${endKey}</span>
        </div>
        <div class="position-triad-grid">
          ${!centerOnly ? `
          <div class="position-block">
            <span class="pos-badge start">${isEn ? 'JUZ BEGINNING' : 'CÜZÜN BAŞLANGICI'}</span>
            <h5 class="pos-block-title">[${data.first_verse.key}]</h5>
            <div class="pos-block-ar">${data.first_verse.text_uthmani}</div>
            ${getPosVerseMealHtml(data.first_verse, null, 'jfirst')}
            ${buildTriadWbwHtml(data.first_verse)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'First Word' : 'İlk Kelime'}: <strong>${data.first_verse.first_word}</strong></span>
              <span class="pos-pill">${isEn ? 'First Letter' : 'İlk Harf'}: <strong>${data.first_verse.first_letter}</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.first_verse.first_word, isEn ? 'First Word Letters' : 'İlk Kelimenin Harf Simetrisi')}
          </div>
          ` : ''}

          <div class="position-block center-block">
            <span class="pos-badge center">${isEn ? 'JUZ CENTRAL VERSE (VASAT)' : 'CÜZÜN MERKEZ AYETİ (VASAT)'}</span>
            <h5 class="pos-block-title">[${data.middle_verse.key}]</h5>
            <div class="pos-block-ar">${data.middle_verse.text_uthmani}</div>
            ${getPosVerseMealHtml(data.middle_verse, null, 'jmid')}
            ${buildTriadWbwHtml(data.middle_verse)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'Center Word' : 'Merkez Kelime'}: <strong>${data.middle_verse.middle_word}</strong></span>
              <span class="pos-pill">${isEn ? 'Center Letter' : 'Orta Harf'}: <strong>${data.middle_verse.middle_letter}</strong></span>
              ${primeHighlight && data.middle_verse.is_prime_verse ? `<span class="badge-prime-yes">${isEn ? 'Prime Verse No' : 'Ayet No Asal'}</span>` : ''}
            </div>
            ${buildWordLetterSymmetryPill(data.middle_verse.middle_word, isEn ? 'Center Word Letters' : 'Merkez Kelimenin Harf Simetrisi')}
          </div>

          ${!centerOnly ? `
          <div class="position-block">
            <span class="pos-badge end">${isEn ? 'JUZ CONCLUSION' : 'CÜZÜN SON AYETİ (HİTAM)'}</span>
            <h5 class="pos-block-title">[${data.last_verse.key}]</h5>
            <div class="pos-block-ar">${data.last_verse.text_uthmani}</div>
            ${getPosVerseMealHtml(data.last_verse, null, 'jlast')}
            ${buildTriadWbwHtml(data.last_verse)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'Last Word' : 'Son Kelime'}: <strong>${data.last_verse.last_word}</strong></span>
              <span class="pos-pill">${isEn ? 'Last Letter' : 'Son Harf'}: <strong>${data.last_verse.last_letter}</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.last_verse.last_word, isEn ? 'Last Word Letters' : 'Son Kelimenin Harf Simetrisi')}
          </div>
          ` : ''}
        </div>
      `;
    } else if (level === 'surah') {
      const sName = isEn ? (data.name_en || data.name_tr) : data.name_tr;

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem;">
          <h4>📜 ${data.surah_number}. ${sName} ${isEn ? 'Surah' : 'Suresi'} (${data.verse_count} ${isEn ? 'Verses' : 'Ayet'})</h4>
          ${data.special_note ? `<div style="background:rgba(245,158,11,0.15); border:1px solid var(--border-gold); padding:0.4rem 0.8rem; border-radius:8px; color:var(--gold-light); font-size:0.82rem;">✨ <strong>MUCİZE:</strong> ${data.special_note}</div>` : ''}
        </div>
        <div class="position-triad-grid">
          ${!centerOnly ? `
          <div class="position-block">
            <span class="pos-badge start">${isEn ? 'FIRST VERSE (START)' : 'İLK AYET (BAŞI)'}</span>
            <h5 class="pos-block-title">[${data.first_verse.key}]</h5>
            <div class="pos-block-ar">${data.first_verse.text_uthmani}</div>
            ${getPosVerseMealHtml(data.first_verse, null, 'sfirst')}
            ${buildTriadWbwHtml(data.first_verse)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'First Word' : 'İlk Kelime'}: <strong>${data.first_verse.first_word}</strong></span>
              <span class="pos-pill">${isEn ? 'First Letter' : 'İlk Harf'}: <strong>${data.first_verse.first_letter}</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.first_verse.first_word, isEn ? 'First Word Letters' : 'İlk Kelime Harf Simetrisi')}
          </div>
          ` : ''}

          <div class="position-block center-block">
            <span class="pos-badge center">${isEn ? 'CENTRAL VERSE (VASAT)' : 'MERKEZ AYETİ (VASAT / ORTA)'}</span>
            <h5 class="pos-block-title">[${data.middle_verse.key}]</h5>
            <div class="pos-block-ar">${data.middle_verse.text_uthmani}</div>
            ${getPosVerseMealHtml(data.middle_verse, null, 'smid')}
            ${buildTriadWbwHtml(data.middle_verse)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'Center Word' : 'Merkez Kelime'}: <strong>${data.middle_verse.middle_word}</strong></span>
              <span class="pos-pill">${isEn ? 'Center Letter' : 'Orta Harf'}: <strong>${data.middle_verse.middle_letter}</strong></span>
              ${primeHighlight && data.middle_verse.is_prime_verse ? `<span class="badge-prime-yes">${isEn ? 'Prime Verse No' : 'Ayet No Asal'}</span>` : ''}
            </div>
            ${buildWordLetterSymmetryPill(data.middle_verse.middle_word, isEn ? 'Center Word Letters' : 'Merkez Kelime Harf Simetrisi')}
          </div>

          ${!centerOnly ? `
          <div class="position-block">
            <span class="pos-badge end">${isEn ? 'LAST VERSE (CONCLUSION)' : 'SON AYET (HİTAM / SON)'}</span>
            <h5 class="pos-block-title">[${data.last_verse.key}]</h5>
            <div class="pos-block-ar">${data.last_verse.text_uthmani}</div>
            ${getPosVerseMealHtml(data.last_verse, null, 'slast')}
            ${buildTriadWbwHtml(data.last_verse)}
            <div class="pos-meta-pills">
              <span class="pos-pill">${isEn ? 'Last Word' : 'Son Kelime'}: <strong>${data.last_verse.last_word}</strong></span>
              <span class="pos-pill">${isEn ? 'Last Letter' : 'Son Harf'}: <strong>${data.last_verse.last_letter}</strong></span>
            </div>
            ${buildWordLetterSymmetryPill(data.last_verse.last_word, isEn ? 'Last Word Letters' : 'Son Kelime Harf Simetrisi')}
          </div>
          ` : ''}
        </div>
      `;
    } else if (level === 'verse' || level === 'word') {
      container.innerHTML = `
        <div class="position-block" style="max-width: 960px; margin: 0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <h4>${isEn ? 'Verse-Level Word & Letter Symmetry' : 'Ayet Düzeyinde Kelime ve Harf Simetrisi'}: [${data.key}]</h4>
            <div style="display:flex; gap:0.4rem;">
              <span class="kpi-prime-badge ${data.is_prime_verse_num ? 'badge-prime-yes' : 'badge-prime-no'}">No: ${data.is_prime_verse_num ? (isEn ? 'Prime' : 'Asal') : (isEn ? 'Comp' : 'Bileşik')}</span>
              <span class="kpi-prime-badge ${data.is_prime_words ? 'badge-prime-yes' : 'badge-prime-no'}">${isEn ? 'Words' : 'Kelime'}: ${data.is_prime_words ? (isEn ? 'Prime' : 'Asal') : (isEn ? 'Comp' : 'Bileşik')}</span>
              <span class="kpi-prime-badge ${data.is_prime_letters ? 'badge-prime-yes' : 'badge-prime-no'}">${isEn ? 'Letters' : 'Harf'}: ${data.is_prime_letters ? (isEn ? 'Prime' : 'Asal') : (isEn ? 'Comp' : 'Bileşik')}</span>
            </div>
          </div>

          <div class="pos-block-ar" style="font-size:2rem; line-height:2.2; margin-bottom:1rem;">${data.text_uthmani}</div>
          ${getPosVerseMealHtml(data, null, 'vpos')}

          ${buildTriadWbwHtml(data)}

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; background:rgba(0,0,0,0.3); padding:1.25rem; border-radius:10px; border:1px solid var(--border-subtle); margin-top:1.25rem;">
            ${!centerOnly ? `
            <div>
              <span style="font-size:0.72rem; color:var(--emerald-light); font-weight:800; text-transform:uppercase;">🟢 ${isEn ? 'FIRST WORD (START)' : 'İLK KELİME (BAŞI)'}</span>
              <div style="font-family:var(--font-arabic-clean); font-size:1.5rem; color:#fff; font-weight:700; margin:0.3rem 0;">${data.first_word}</div>
              <div style="font-size:0.8rem; color:#94a3b8;">${isEn ? 'First Letter' : 'İlk Harf'}: <strong>${data.first_letter}</strong></div>
              ${buildWordLetterSymmetryPill(data.first_word, isEn ? 'Letters' : 'Harfler')}
            </div>
            ` : ''}
            <div>
              <span style="font-size:0.72rem; color:var(--gold-light); font-weight:800; text-transform:uppercase;">🟡 ${isEn ? 'CENTER WORD (VASAT)' : 'MERKEZ KELİME (VASAT)'}</span>
              <div style="font-family:var(--font-arabic-clean); font-size:1.5rem; color:var(--gold-light); font-weight:700; margin:0.3rem 0;">${data.middle_word}</div>
              <div style="font-size:0.8rem; color:#94a3b8;">${isEn ? 'Center Letter' : 'Orta Harf'}: <strong>${data.middle_letter}</strong></div>
              ${buildWordLetterSymmetryPill(data.middle_word, isEn ? 'Letters' : 'Harfler')}
            </div>
            ${!centerOnly ? `
            <div>
              <span style="font-size:0.72rem; color:#c084fc; font-weight:800; text-transform:uppercase;">🔴 ${isEn ? 'LAST WORD (HITAM)' : 'SON KELİME (HİTAM)'}</span>
              <div style="font-family:var(--font-arabic-clean); font-size:1.5rem; color:#fff; font-weight:700; margin:0.3rem 0;">${data.last_word}</div>
              <div style="font-size:0.8rem; color:#94a3b8;">${isEn ? 'Last Letter' : 'Son Harf'}: <strong>${data.last_letter}</strong></div>
              ${buildWordLetterSymmetryPill(data.last_word, isEn ? 'Letters' : 'Harfler')}
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Attach click listeners to triad word cards to trigger Math Inspector
    container.querySelectorAll('.triad-wbw-card').forEach(cardEl => {
      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const verseKey = cardEl.dataset.verseKey;
        const wordIdx = parseInt(cardEl.dataset.idx, 10);
        let verseObj = null;
        if (data.first_verse && data.first_verse.key === verseKey) verseObj = data.first_verse;
        else if (data.middle_verse && data.middle_verse.key === verseKey) verseObj = data.middle_verse;
        else if (data.last_verse && data.last_verse.key === verseKey) verseObj = data.last_verse;
        else if (data.key === verseKey) verseObj = data;
        else if (data.beginning && data.beginning.key === verseKey) verseObj = data.beginning;
        else if (data.ending && data.ending.key === verseKey) verseObj = data.ending;

        if (verseObj && verseObj.words) {
          const wordObj = verseObj.words.find(w => w.idx === wordIdx) || verseObj.words[wordIdx - 1];
          if (wordObj) {
            inspectWord(wordObj, verseObj);
            openInspectorDrawer();
          }
        }
      });
    });

  } catch (e) {
    console.error('loadPositions error:', e);
    container.innerHTML = `<div style="color:#f87171; text-align:center;">Pozisyon verileri yüklenemedi.</div>`;
  }
}


// =================================================================
// TAB 4: EBCED & CİFİR HESAPLAYICI (ABJAD)
// =================================================================
function initAbjadModule() {
  const textInput = document.getElementById('abjad-text-input');
  const daggerChk = document.getElementById('abjad-chk-dagger');

  let debounceTimer;
  textInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculateAbjad, 200);
  });

  daggerChk.addEventListener('change', calculateAbjad);

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      textInput.value = btn.dataset.text;
      calculateAbjad();
    });
  });

  const keypadToggle = document.getElementById('btn-toggle-keypad');
  const keypadGrid = document.getElementById('arabic-keys-grid');

  ARABIC_ALPHABET.forEach(char => {
    const kBtn = document.createElement('button');
    kBtn.className = 'arabic-key-btn';
    kBtn.innerText = char;
    kBtn.addEventListener('click', () => {
      textInput.value += char;
      calculateAbjad();
      textInput.focus();
    });
    keypadGrid.appendChild(kBtn);
  });

  keypadToggle.addEventListener('click', () => {
    keypadGrid.classList.toggle('hidden');
  });

  textInput.value = "بسم الله الرحمن الرحيم";
  calculateAbjad();
}

async function calculateAbjad() {
  const text = document.getElementById('abjad-text-input').value;
  const includeDagger = document.getElementById('abjad-chk-dagger').checked;

  try {
    const res = await fetch('/api/abjad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, include_dagger_alif: includeDagger })
    });
    const data = await res.json();

    document.getElementById('kpi-kebir').innerText = data.total_kebir.toLocaleString('tr-TR');
    document.getElementById('kpi-sagir').innerText = data.total_sagir.toLocaleString('tr-TR');
    document.getElementById('kpi-letters').innerText = data.total_letters.toLocaleString('tr-TR');
    document.getElementById('kpi-words').innerText = data.total_words.toLocaleString('tr-TR');

    renderAbjadTable(data.breakdown, data.total_kebir);
  } catch (e) {
    console.error('Ebced hesabı hatası:', e);
  }
}

function renderAbjadTable(breakdown, grandTotal) {
  const tbody = document.getElementById('abjad-table-body');
  tbody.innerHTML = '';

  if (!breakdown || breakdown.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Hesaplanacak harf bulunamadı.</td></tr>`;
    return;
  }

  const charNames = {
    'ا': 'Elif', 'أ': 'Elif-i Mehmûze', 'إ': 'Elif-i Maksûre', 'آ': 'Medli Elif', 'ء': 'Hemze', 'ٱ': 'Elif-i Vasl',
    'ب': 'Bâ', 'ج': 'Cîm', 'د': 'Dâl', 'ه': 'Hâ', 'ة': 'Tâ-i Merbûta', 'و': 'Vâv', 'ؤ': 'Vâv-ı Mehmûze',
    'ز': 'Zâ', 'ح': 'Hâ (Ha-i Muhmele)', 'ط': 'Tâ', 'ي': 'Yâ', 'ى': 'Yâ-i Maksûre', 'ئ': 'Hemzeli Yâ',
    'ك': 'Kâf', 'ل': 'Lâm', 'م': 'Mîm', 'ن': 'Nûn', 'س': 'Sîn', 'ع': 'Ayn',
    'ف': 'Fâ', 'ص': 'Sâd', 'ق': 'Kâf', 'ر': 'Râ', 'ش': 'Şîn', 'ت': 'Tâ',
    'ث': 'Sâ (Pelik)', 'خ': 'Hı', 'ذ': 'Zâl (Pelik)', 'ض': 'Dâd', 'ظ': 'Zâ', 'غ': 'Gayn'
  };

  breakdown.forEach(item => {
    const row = document.createElement('tr');
    const ratio = grandTotal > 0 ? ((item.subtotal / grandTotal) * 100).toFixed(1) : 0;
    row.innerHTML = `
      <td class="char-cell">${item.char}</td>
      <td>${charNames[item.char] || 'Harf'}</td>
      <td><strong>${item.unit_val}</strong></td>
      <td>${item.count} kez</td>
      <td style="color:var(--gold-light); font-weight:700;">${item.subtotal.toLocaleString('tr-TR')}</td>
      <td><span style="color:var(--emerald-light); font-size:0.8rem;">%${ratio}</span></td>
    `;
    tbody.appendChild(row);
  });
}


// =================================================================
// TAB 5: DETAYLI ARAMA (SEARCH HUB)
// =================================================================
function initSearchModule() {
  const searchInput = document.getElementById('global-search-input');
  const searchBtn = document.getElementById('btn-exec-search');

  searchBtn.addEventListener('click', executeGlobalSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeGlobalSearch();
  });

  document.getElementById('btn-quick-search').addEventListener('click', () => {
    switchTab('search');
    searchInput.focus();
  });
}

function populateSearchSurahSelect(surahs) {
  const select = document.getElementById('search-surah-select');
  surahs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.number;
    opt.innerText = `${s.number}. ${s.name_tr} (${s.name_ar})`;
    select.appendChild(opt);
  });
}

async function executeGlobalSearch() {
  const query = document.getElementById('global-search-input').value.trim();
  const field = document.getElementById('search-field-select').value;
  const surah = document.getElementById('search-surah-select').value;

  if (!query) {
    showToast('Lütfen aramak istediğiniz bir kelime girin.');
    return;
  }

  const listEl = document.getElementById('search-results-list');
  const metaHeader = document.getElementById('search-meta-header');
  const countLabel = document.getElementById('search-count-label');

  listEl.innerHTML = `<div class="loader-spinner"></div>`;
  metaHeader.classList.add('hidden');

  try {
    const url = `/api/search?q=${encodeURIComponent(query)}&field=${field}&surah=${surah}`;
    const res = await fetch(url);
    const data = await res.json();

    metaHeader.classList.remove('hidden');
    countLabel.innerText = `'${query}' için toplam ${data.total} ayet bulundu:`;

    if (data.results.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-muted);">Hiçbir sonuç bulunamadı. Lütfen farklı kelimeler deneyin.</div>`;
      return;
    }

    listEl.innerHTML = '';
    data.results.forEach(v => {
      const card = document.createElement('div');
      card.className = 'verse-card';
      
      const highlightedSnippet = highlightText(v.matched_text || v.diyanet, query);

      card.innerHTML = `
        <div class="verse-card-header">
          <div class="verse-badge-group">
            <span class="verse-no-badge">${v.surah_name_tr} [${v.key}]</span>
          </div>
          <div class="verse-top-actions">
            <button class="btn-verse-tool btn-search-play">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Dinle</span>
            </button>
            <button class="btn-verse-tool btn-search-goto">
              <span>Mushafta Aç</span>
            </button>
          </div>
        </div>

        <div class="verse-arabic-uthmani" style="font-size: 22px;">
          ${v.text_uthmani}
        </div>

        <div class="translation-block diyanet" style="margin-top:0.75rem;">
          ${highlightedSnippet}
        </div>
      `;

      card.querySelector('.btn-search-play').addEventListener('click', () => {
        playVerse(v);
      });

      card.querySelector('.btn-search-goto').addEventListener('click', async () => {
        switchTab('reader');
        await loadSurah(v.surah_number);
        setTimeout(() => {
          const targetCard = document.getElementById(`verse-card-${v.id}`);
          if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });

      listEl.appendChild(card);
    });

  } catch (e) {
    listEl.innerHTML = `<div style="color:#f87171;">Arama sırasında hata oluştu.</div>`;
  }
}

function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}


// =================================================================
// UTILITIES: TOAST & SHORTCUTS
// =================================================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  const translated = (typeof QuranLanguageModel !== 'undefined') ? QuranLanguageModel.t(message, AppState.language) : message;
  toast.innerText = translated;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function initFocusMode() {
  const isFocus = localStorage.getItem('quran_focus_mode') === '1';
  if (isFocus) {
    document.body.classList.add('focus-mode-active');
    const btnPill = document.getElementById('btn-focus-pill');
    const btnHeader = document.getElementById('btn-toggle-focus');
    if (btnPill) btnPill.classList.add('active');
    if (btnHeader) btnHeader.classList.add('active');
  }

  const btnHeader = document.getElementById('btn-toggle-focus');
  const btnPill = document.getElementById('btn-focus-pill');
  const btnExit = document.getElementById('focus-exit-badge');

  const handler = () => {
    toggleFocusMode();
  };

  if (btnHeader) btnHeader.addEventListener('click', handler);
  if (btnPill) btnPill.addEventListener('click', handler);
  if (btnExit) btnExit.addEventListener('click', () => toggleFocusMode(false));
}

function toggleFocusMode(forceState) {
  const willBeActive = forceState !== undefined ? forceState : !document.body.classList.contains('focus-mode-active');
  document.body.classList.toggle('focus-mode-active', willBeActive);
  localStorage.setItem('quran_focus_mode', willBeActive ? '1' : '0');

  const btnPill = document.getElementById('btn-focus-pill');
  const btnHeader = document.getElementById('btn-toggle-focus');

  if (btnPill) btnPill.classList.toggle('active', willBeActive);
  if (btnHeader) btnHeader.classList.toggle('active', willBeActive);

  showToast(willBeActive ? '🎯 Minimal Odak Modu Açıldı. Odak kelimelerde.' : 'Normal görünüme dönüldü.');
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K for search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchTab('search');
      const input = document.getElementById('global-search-input');
      if (input) input.focus();
    }
    // Space for audio play/pause
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      togglePlayPause();
    }
    // 'F' key toggles Minimal Focus Mode
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      toggleFocusMode();
    }
    // 'M' key toggles Math Inspector Drawer
    if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      toggleInspectorDrawer();
    }
    // 'J' key opens Quick Verse Outreach Jump
    if ((e.key.toLowerCase() === 'j' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j')) {
      e.preventDefault();
      openVerseJumpModal();
    }
    // Escape key closes modals and drawers
    if (e.key === 'Escape') {
      closeVerseJumpModal();
      closeNavDrawer();
      if (window.innerWidth <= 1360) {
        closeInspectorDrawer();
      }
      if (document.body.classList.contains('focus-mode-active')) {
        toggleFocusMode(false);
      }
    }
  });
}


// =================================================================
// AYET & KELİME MATEMATİK MÜFETTİŞİ (DUAL-MODE DRAWER)
// =================================================================
function openInspectorDrawer() {
  const drawer = document.getElementById('math-inspector-drawer');
  const backdrop = document.getElementById('inspector-backdrop');
  if (drawer) {
    drawer.classList.remove('hidden');
    drawer.classList.add('open');
  }
  if (backdrop && window.innerWidth <= 1360) {
    backdrop.classList.add('open');
  }
}

function closeInspectorDrawer() {
  const drawer = document.getElementById('math-inspector-drawer');
  const backdrop = document.getElementById('inspector-backdrop');
  if (drawer) {
    drawer.classList.remove('open');
  }
  if (backdrop) {
    backdrop.classList.remove('open');
  }
}

function toggleInspectorDrawer() {
  const drawer = document.getElementById('math-inspector-drawer');
  if (drawer && drawer.classList.contains('open')) {
    closeInspectorDrawer();
  } else {
    openInspectorDrawer();
  }
}

function initMathInspector() {
  const drawer = document.getElementById('math-inspector-drawer');
  const closeBtn = document.getElementById('btn-close-inspector');
  const pinBtn = document.getElementById('btn-pin-inspector');
  const floatingToggle = document.getElementById('btn-floating-inspector-toggle');
  const backdrop = document.getElementById('inspector-backdrop');

  if (floatingToggle) {
    floatingToggle.addEventListener('click', () => {
      toggleInspectorDrawer();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeInspectorDrawer();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeInspectorDrawer();
    });
  }

  if (pinBtn && drawer) {
    pinBtn.addEventListener('click', () => {
      AppState.mathInspector.pinned = !AppState.mathInspector.pinned;
      pinBtn.classList.toggle('active', AppState.mathInspector.pinned);
      showToast(AppState.mathInspector.pinned ? 'Müfettiş paneli sabitlendi.' : 'Müfettiş paneli serbest bırakıldı.');
    });
  }

  // Unlock focus button listener
  const unlockBtn = document.getElementById('btn-unlock-inspector');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => {
      unlockInspectorFocus();
    });
  }

  // Inspector Subtabs Navigation (Morfoloji, Diyanet Tefsiri, Hadisler, Tefekkür)
  document.querySelectorAll('.insp-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.inspTab;
      switchInspectorSubtab(tabName);
    });
  });
}


// =================================================================
// HAMBURGER MENU & OFF-CANVAS RESPONSIVE DRAWER
// =================================================================
function openNavDrawer() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('nav-drawer-backdrop');
  const btn = document.getElementById('btn-hamburger-menu');
  if (drawer) {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  if (backdrop) backdrop.classList.add('open');
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function closeNavDrawer() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('nav-drawer-backdrop');
  const btn = document.getElementById('btn-hamburger-menu');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) backdrop.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function initHamburgerMenu() {
  const hamburgerBtn = document.getElementById('btn-hamburger-menu');
  const closeBtn = document.getElementById('btn-close-nav-drawer');
  const backdrop = document.getElementById('nav-drawer-backdrop');

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      const drawer = document.getElementById('mobile-nav-drawer');
      if (drawer && drawer.classList.contains('open')) {
        closeNavDrawer();
      } else {
        openNavDrawer();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeNavDrawer);
  if (backdrop) backdrop.addEventListener('click', closeNavDrawer);

  // Drawer Nav Items
  document.querySelectorAll('.m-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      if (tabId) {
        document.querySelectorAll('.m-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        switchTab(tabId);
        closeNavDrawer();
      }
    });
  });

  // Drawer Theme Buttons
  document.querySelectorAll('.m-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      document.querySelectorAll('.m-theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Drawer Language Buttons
  document.querySelectorAll('.m-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      document.querySelectorAll('.m-lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Drawer Preferences & Focus
  const mCalcPrefBtn = document.getElementById('btn-m-open-calc-prefs');
  if (mCalcPrefBtn) {
    mCalcPrefBtn.addEventListener('click', () => {
      closeNavDrawer();
      const modal = document.getElementById('calc-pref-modal');
      if (modal) modal.classList.add('open');
    });
  }

  const mFocusBtn = document.getElementById('btn-m-toggle-focus');
  if (mFocusBtn) {
    mFocusBtn.addEventListener('click', () => {
      closeNavDrawer();
      toggleFocusMode();
    });
  }

  // Drawer Verse Jump Input
  const mJumpInput = document.getElementById('m-verse-jump-input');
  const mJumpGo = document.getElementById('btn-m-verse-jump-go');
  const executeMJump = () => {
    if (!mJumpInput) return;
    const val = mJumpInput.value.trim();
    if (!val) return;
    parseAndJumpVerse(val);
    closeNavDrawer();
  };
  if (mJumpGo) mJumpGo.addEventListener('click', executeMJump);
  if (mJumpInput) {
    mJumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeMJump();
    });
  }

  // Drawer Preset Pills
  document.querySelectorAll('.m-v-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const sNum = parseInt(pill.dataset.surah, 10);
      const aNum = parseInt(pill.dataset.ayah, 10);
      jumpToVerse(sNum, aNum);
      closeNavDrawer();
    });
  });
}


// =================================================================
// AYET BAZLI OUTREACH & QUICK VERSE JUMP
// =================================================================
function openVerseJumpModal() {
  const modal = document.getElementById('verse-jump-modal');
  if (modal) {
    modal.classList.add('open');
    const input = document.getElementById('vj-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 80);
    }
  }
}

function closeVerseJumpModal() {
  const modal = document.getElementById('verse-jump-modal');
  if (modal) modal.classList.remove('open');
}

function parseAndJumpVerse(inputStr) {
  if (!inputStr) return;
  const parts = inputStr.replace(/\s+/g, '').split(/[:,\-\/.]/);
  let sNum = AppState.currentSurahId;
  let aNum = 1;

  if (parts.length >= 2) {
    sNum = parseInt(parts[0], 10) || AppState.currentSurahId;
    aNum = parseInt(parts[1], 10) || 1;
  } else if (parts.length === 1) {
    const parsed = parseInt(parts[0], 10);
    if (!isNaN(parsed)) {
      if (parsed > 0 && parsed <= 114 && inputStr.toLowerCase().includes('s')) {
        sNum = parsed;
        aNum = 1;
      } else {
        aNum = parsed;
      }
    }
  }

  if (sNum < 1 || sNum > 114) {
    showToast('Geçersiz sure numarası (1 - 114 arası olmalıdır).');
    return;
  }

  jumpToVerse(sNum, aNum);
}

async function jumpToVerse(surahNum, ayahNum) {
  switchTab('reader');

  if (surahNum !== AppState.currentSurahId) {
    await loadSurah(surahNum);
  }

  setTimeout(() => {
    let targetCard = null;
    const cards = document.querySelectorAll('.verse-card');
    cards.forEach(c => {
      const keySpan = c.querySelector('.verse-key-badge');
      if (keySpan && keySpan.innerText.trim() === `${surahNum}:${ayahNum}`) {
        targetCard = c;
      }
    });

    if (!targetCard && cards.length > 0) {
      const idx = Math.min(ayahNum - 1, cards.length - 1);
      targetCard = cards[Math.max(0, idx)];
    }

    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.classList.add('pulse-gold-highlight');
      setTimeout(() => targetCard.classList.remove('pulse-gold-highlight'), 3200);

      // Select first word and inspect
      const firstWord = targetCard.querySelector('.ar-word, .wbw-card');
      if (firstWord) {
        document.querySelectorAll('.ar-word.selected, .wbw-card.selected').forEach(el => el.classList.remove('selected'));
        firstWord.classList.add('selected');
      }

      if (AppState.currentSurahData && AppState.currentSurahData.verses) {
        const vObj = AppState.currentSurahData.verses.find(v => v.verse_number === ayahNum || v.key === `${surahNum}:${ayahNum}`);
        if (vObj && vObj.words && vObj.words.length > 0) {
          inspectWord(vObj.words[0], vObj);
        }
      }

      showToast(`📍 [${surahNum}:${ayahNum}] ayetine intikal edildi.`);
    } else {
      showToast(`[${surahNum}:${ayahNum}] ayeti bulunamadı.`);
    }
  }, 160);
}

function initVerseOutreach() {
  const openBtn = document.getElementById('btn-quick-verse');
  const closeBtn = document.getElementById('btn-close-vj-modal');
  const modal = document.getElementById('verse-jump-modal');
  const submitBtn = document.getElementById('btn-vj-submit');
  const input = document.getElementById('vj-input');

  if (openBtn) openBtn.addEventListener('click', openVerseJumpModal);
  if (closeBtn) closeBtn.addEventListener('click', closeVerseJumpModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVerseJumpModal();
    });
  }

  const handleJump = () => {
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    parseAndJumpVerse(val);
    closeVerseJumpModal();
  };

  if (submitBtn) submitBtn.addEventListener('click', handleJump);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleJump();
    });
  }

  // Preset buttons
  document.querySelectorAll('.vj-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sNum = parseInt(btn.dataset.surah, 10);
      const aNum = parseInt(btn.dataset.ayah, 10);
      jumpToVerse(sNum, aNum);
      closeVerseJumpModal();
    });
  });
}


// =================================================================
// SEÇİLİ METİN OTOMATİK EBCED ROZETİ (SELECTION BADGE)
// =================================================================
function initSelectionEbced() {
  const pill = document.getElementById('selection-ebced-pill');
  if (!pill) return;

  const pillTitleText = document.getElementById('pill-title-text');
  const pillTextAr = document.getElementById('pill-text-ar');
  const pillEbcedKebir = document.getElementById('pill-ebced-kebir');
  const pillEbcedSagir = document.getElementById('pill-ebced-sagir');
  const pillLetterCount = document.getElementById('pill-letter-count');
  const pillTagsRow = document.getElementById('pill-tags-row');
  const pillCloseBtn = document.getElementById('pill-btn-close');
  const pillInspectBtn = document.getElementById('pill-btn-send-inspector');
  const pillCopyBtn = document.getElementById('pill-btn-copy-stats');

  const pillMeaningCard = document.getElementById('pill-meaning-card');
  const pillMeaningBadge = document.getElementById('pill-meaning-badge');
  const pillTranslit = document.getElementById('pill-translit');
  const pillMeaningText = document.getElementById('pill-meaning-text');

  const pillRootCard = document.getElementById('pill-root-card');
  const pillRootVal = document.getElementById('pill-root-val');
  const pillRootMeaning = document.getElementById('pill-root-meaning');

  const pillHarekeCard = document.getElementById('pill-hareke-card');
  const pillGramType = document.getElementById('pill-gram-type');
  const pillHarekeChips = document.getElementById('pill-hareke-chips');

  const pillPhraseWordsBox = document.getElementById('pill-phrase-words-box');
  const pillPhraseWordsList = document.getElementById('pill-phrase-words-list');

  let currentSelectedText = '';
  let currentSelectionMetrics = null;
  let currentMatchedWords = [];
  let currentMatchedVerse = null;

  if (pillCloseBtn) {
    pillCloseBtn.addEventListener('click', () => {
      pill.classList.add('hidden');
    });
  }

  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  function handleTextSelection(e) {
    if (pill.contains(e.target)) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      if (!pill.contains(e.target)) {
        pill.classList.add('hidden');
      }
      return;
    }

    const selectedStr = sel.toString().trim();
    if (!selectedStr) {
      pill.classList.add('hidden');
      return;
    }

    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    if (!arabicRegex.test(selectedStr)) {
      pill.classList.add('hidden');
      return;
    }

    const metrics = computeArabicMetrics(selectedStr);
    if (metrics.letters === 0) {
      pill.classList.add('hidden');
      return;
    }

    currentSelectedText = selectedStr;
    currentSelectionMetrics = metrics;

    let range = null;
    try {
      range = sel.getRangeAt(0);
    } catch(err) {
      return;
    }

    let matchedWords = [];
    let matchedVerse = null;

    if (range) {
      let container = range.commonAncestorContainer;
      if (container.nodeType !== Node.ELEMENT_NODE) container = container.parentElement;

      // 1. Try finding within verse card
      const verseCard = container.closest('.verse-card');
      if (verseCard) {
        const verseKey = verseCard.getAttribute('data-key');
        if (AppState.currentSurahData && AppState.currentSurahData.verses) {
          matchedVerse = AppState.currentSurahData.verses.find(x => x.key === verseKey);
        }
        if (matchedVerse && matchedVerse.words) {
          const wordEls = verseCard.querySelectorAll('.ar-word, .wbw-card');
          const intersecting = [...wordEls].filter(el => {
            try {
              return range.intersectsNode(el);
            } catch(e) {
              return false;
            }
          });

          matchedWords = intersecting.map(el => {
            const wIdx = parseInt(el.dataset.wordIdx, 10);
            return matchedVerse.words[wIdx - 1] || {
              idx: wIdx,
              uth: el.dataset.uth || el.innerText,
              clean: el.dataset.clean || '',
              tr: el.dataset.tr || '',
              en: el.dataset.en || '',
              root: el.dataset.root || '',
              translit: el.dataset.translit || '',
              abjad: parseInt(el.dataset.abjad, 10) || 0
            };
          });
        }
      }

      // 2. Fallback: Search in current surah verses if not resolved
      if (matchedWords.length === 0) {
        const selWordsArr = selectedStr.split(/\s+/).filter(Boolean);
        const searchVerses = (AppState.currentSurahData && AppState.currentSurahData.verses) ? AppState.currentSurahData.verses : [];
        for (const vItem of searchVerses) {
          if (!vItem.words) continue;
          const matches = [];
          for (const sw of selWordsArr) {
            const swClean = sw.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
            const found = vItem.words.find(w => {
              const wClean = (w.clean_bare || w.clean || w.uth || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
              return wClean === swClean || w.uth === sw;
            });
            if (found) matches.push(found);
          }
          if (matches.length === selWordsArr.length && matches.length > 0) {
            matchedWords = matches;
            matchedVerse = vItem;
            break;
          }
        }
      }
    }

    currentMatchedWords = matchedWords;
    currentMatchedVerse = matchedVerse;

    // Populate Arabic text & metrics
    pillTextAr.innerText = selectedStr;
    pillEbcedKebir.innerText = metrics.kebir.toLocaleString('tr-TR');
    pillEbcedSagir.innerText = metrics.sagir.toLocaleString('tr-TR');
    pillLetterCount.innerText = metrics.letters.toLocaleString('tr-TR');

    // Populate Title, Meaning, Root, Hareke, and Phrase
    if (matchedWords.length > 1) {
      if (pillTitleText) pillTitleText.innerText = `✨ Cümle / Kelime Öbeği Tahlili (${matchedWords.length} Kelime)`;
      if (pillMeaningCard) pillMeaningCard.style.display = 'flex';
      if (pillMeaningBadge) pillMeaningBadge.innerText = '✨ CÜMLE ÖBEĞİ MANASI';
      if (pillTranslit) pillTranslit.innerText = matchedWords.map(w => w.translit).filter(Boolean).join(' ');
      if (pillMeaningText) pillMeaningText.innerText = matchedWords.map(w => w.tr || w.en).filter(Boolean).join(' ');
    } else if (matchedWords.length === 1) {
      const w0 = matchedWords[0];
      if (pillTitleText) pillTitleText.innerText = 'Seçili Kelime Ebced & Sarf Tahlili';
      if (pillMeaningCard) pillMeaningCard.style.display = 'flex';
      if (pillMeaningBadge) pillMeaningBadge.innerText = '📖 AYET İÇİ MANASI';
      if (pillTranslit) pillTranslit.innerText = w0.translit ? `[ ${w0.translit} ]` : '';
      if (pillMeaningText) pillMeaningText.innerText = w0.tr || w0.en || 'Ayet içi kelime meali';
    } else {
      if (pillTitleText) pillTitleText.innerText = 'Seçili Metin Ebcedi & Tahlili';
      if (pillMeaningCard) pillMeaningCard.style.display = 'none';
    }

    // Root card
    if (matchedWords.length === 1 && matchedWords[0].root && matchedWords[0].root !== '-' && matchedWords[0].root !== '—') {
      const w0 = matchedWords[0];
      if (pillRootCard) pillRootCard.style.display = 'flex';
      if (pillRootVal) pillRootVal.innerText = w0.root;
      const rd = w0.root_dossier;
      if (pillRootMeaning) {
        if (rd && rd.core_meaning) {
          pillRootMeaning.innerHTML = `<strong>Kök Anlamı:</strong> "${escapeHtml(rd.core_meaning)}" ${rd.reading ? `<em>(${rd.reading})</em>` : ''}`;
        } else {
          pillRootMeaning.innerText = `Kur'an Sülâsî Kökü: ${w0.root}`;
        }
      }
    } else if (matchedWords.length > 1) {
      const withRoots = matchedWords.filter(w => w.root && w.root !== '-' && w.root !== '—');
      if (withRoots.length > 0 && pillRootCard) {
        pillRootCard.style.display = 'flex';
        if (pillRootVal) pillRootVal.innerText = `${withRoots.length} Kök`;
        if (pillRootMeaning) {
          pillRootMeaning.innerHTML = withRoots.map(w => {
            const m = w.root_dossier?.core_meaning || w.tr || '';
            return `<span style="display:inline-block; margin-right:0.4rem;"><strong>${escapeHtml(w.root)}:</strong> ${escapeHtml(m)}</span>`;
          }).join(' • ');
        }
      } else if (pillRootCard) {
        pillRootCard.style.display = 'none';
      }
    } else if (pillRootCard) {
      pillRootCard.style.display = 'none';
    }

    // Hareke & Morfoloji
    const voc = analyzeArabicVocalization(selectedStr);
    if (pillHarekeCard) {
      pillHarekeCard.style.display = 'flex';
      if (pillGramType) pillGramType.innerText = voc.gramType;
      if (pillHarekeChips) pillHarekeChips.innerHTML = renderHarekeChipsHtml(voc);
    }

    // Phrase words list
    if (matchedWords.length > 1 && pillPhraseWordsBox && pillPhraseWordsList) {
      pillPhraseWordsBox.classList.remove('hidden');
      pillPhraseWordsList.innerHTML = matchedWords.map(w => {
        const rootTag = (w.root && w.root !== '-') ? `<span class="ppw-item-root">${escapeHtml(w.root)}</span>` : '';
        return `
          <div class="ppw-item">
            <span class="ppw-item-ar">${escapeHtml(w.uth)}</span>
            <span class="ppw-item-tr">${escapeHtml(w.tr || w.en || '')}</span>
            ${rootTag}
          </div>
        `;
      }).join('');
    } else if (pillPhraseWordsBox) {
      pillPhraseWordsBox.classList.add('hidden');
    }

    // Tags
    pillTagsRow.innerHTML = '';
    if (metrics.is_prime_kebir) {
      pillTagsRow.innerHTML += `<span class="badge-prime-yes" style="font-size:0.65rem;">Ebced Asal</span>`;
    }
    if (metrics.is_prime_letters) {
      pillTagsRow.innerHTML += `<span class="badge-prime-yes" style="font-size:0.65rem;">Harf Asal</span>`;
    }
    if (metrics.kebir % 19 === 0) {
      pillTagsRow.innerHTML += `<span class="badge-gold" style="font-size:0.65rem;">19 × ${metrics.kebir / 19}</span>`;
    }
    if (metrics.kebir % 7 === 0) {
      pillTagsRow.innerHTML += `<span class="badge-emerald" style="font-size:0.65rem;">7 × ${metrics.kebir / 7}</span>`;
    }

    try {
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;

      pill.style.left = `${Math.max(160, Math.min(window.innerWidth - 170, x))}px`;
      pill.style.top = `${Math.max(80, y - 10)}px`;
      pill.classList.remove('hidden');
    } catch (err) {}
  }

  if (pillInspectBtn) {
    pillInspectBtn.addEventListener('click', () => {
      pill.classList.add('hidden');
      if (currentMatchedWords.length > 1) {
        inspectPhrase(currentMatchedWords, currentMatchedVerse, currentSelectionMetrics);
      } else if (currentMatchedWords.length === 1) {
        lockInspectorOnWord(currentMatchedWords[0], currentMatchedVerse, null);
      } else if (currentSelectionMetrics) {
        inspectCustomText(currentSelectedText, currentSelectionMetrics);
      }
      openInspectorDrawer();
    });
  }

  if (pillCopyBtn) {
    pillCopyBtn.addEventListener('click', () => {
      if (currentSelectionMetrics) {
        let copyStr = `${currentSelectedText}\nHarf: ${currentSelectionMetrics.letters} | Ebced: ${currentSelectionMetrics.kebir} | Küçük: ${currentSelectionMetrics.sagir}`;
        if (currentMatchedWords.length > 0) {
          const meaning = currentMatchedWords.map(w => w.tr || w.en).filter(Boolean).join(' ');
          copyStr += `\nMeal: "${meaning}"`;
          const roots = currentMatchedWords.map(w => w.root).filter(r => r && r !== '-').join(', ');
          if (roots) copyStr += `\nKökler: ${roots}`;
        }
        navigator.clipboard.writeText(copyStr).then(() => {
          showToast('Seçilen metin, mana ve kök tahlili panoya kopyalandı.');
        });
      }
    });
  }
}


// =================================================================
// TAB 5: ESRÂR-I HURÛF & NUR MUHAMMAD (NURMUHAMMAD.COM)
// =================================================================
function initNurMuhammadModule() {
  // Subtab navigation
  const navBtns = document.querySelectorAll('.nm-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sub = btn.dataset.nmsub;
      AppState.nurmuhammad.subtab = sub;

      document.querySelectorAll('.nm-subview').forEach(p => p.classList.add('hidden'));
      const activeP = document.getElementById(`nmsub-${sub}`);
      if (activeP) activeP.classList.remove('hidden');
    });
  });

  // Letter filter input
  const letterFilter = document.getElementById('nm-letter-filter-input');
  if (letterFilter) {
    letterFilter.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      filterNurMuhammadLetters(q);
    });
  }

  // Close letter detail card
  const closeNld = document.getElementById('btn-close-nld');
  if (closeNld) {
    closeNld.addEventListener('click', () => {
      const card = document.getElementById('nm-letter-detail-card');
      if (card) card.classList.add('hidden');
    });
  }

  // Asma filter input
  const asmaFilter = document.getElementById('asma-filter-input');
  if (asmaFilter) {
    asmaFilter.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      filterAsmaTables(q);
    });
  }

  // Numbers tab switcher (Secrets vs Understanding vs Math)
  const numTabBtns = document.querySelectorAll('.nm-num-tab-btn');
  numTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      numTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.numtab;
      AppState.nurmuhammad.activeNumTab = target;

      document.querySelectorAll('.nm-num-content-pane').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('active');
      });
      const activeP = document.getElementById(`pane-num-${target}`);
      if (activeP) {
        activeP.classList.remove('hidden');
        activeP.classList.add('active');
      }
    });
  });

  // Custom number input & analyze button
  const customNumInput = document.getElementById('nm-custom-number-input');
  const customNumBtn = document.getElementById('btn-nm-analyze-number');
  if (customNumBtn && customNumInput) {
    const handleCustomNum = () => {
      const val = parseInt(customNumInput.value, 10);
      if (!isNaN(val) && val > 0) {
        selectNumberDetail(val);
      } else {
        showToast('Lütfen geçerli bir pozitif sayı girin.');
      }
    };
    customNumBtn.addEventListener('click', handleCustomNum);
    customNumInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCustomNum();
    });
  }
}

async function loadNurMuhammadData() {
  if (AppState.nurmuhammad.loaded && AppState.nurmuhammad.data) return;

  try {
    // 1. Sayıların Sırları & İlm-i Hurûf Verilerini Yükle
    await loadIlmHuroofNumbers();

    // 2. Ana Nurmuhammad Verilerini Yükle
    const res = await fetch('/api/nurmuhammad');
    const data = await res.json();
    AppState.nurmuhammad.data = data;
    AppState.nurmuhammad.loaded = true;

    renderNurMuhammadLetters(data.letters_28);
    renderNurMuhammadLataif(data.nine_points_enneagram.lataif);
    renderAsmaHusnaTable(data.asma_ul_husna);
    renderAsmaNabiTable(data.asma_un_nabi);

    if (data.naqshbandi_realities) {
      if (data.naqshbandi_realities.principles_11) {
        render11Principles(data.naqshbandi_realities.principles_11);
      }
      if (data.naqshbandi_realities.angelic_healing) {
        renderAngelicHealing(data.naqshbandi_realities.angelic_healing);
      }
    }
  } catch (err) {
    console.error('NurMuhammad verileri yüklenemedi:', err);
  }
}

async function loadIlmHuroofNumbers() {
  try {
    const res = await fetch('/api/ilm-huroof/numbers');
    const data = await res.json();
    AppState.nurmuhammad.numbersData = data;
    renderNumbersPills(data.numbers || []);
    if (data.letters_teachings) {
      renderLettersTheses(data.letters_teachings);
    }
    const initNum = AppState.nurmuhammad.activeNumber || 1;
    selectNumberDetail(initNum);
  } catch (err) {
    console.error('İlm-i Hurûf sayı verisi yüklenemedi:', err);
  }
}

function renderNumbersPills(numbers) {
  const container = document.getElementById('nm-numbers-pills-bar');
  if (!container || !numbers) return;
  container.innerHTML = '';

  numbers.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `nm-num-pill ${item.number === (AppState.nurmuhammad.activeNumber || 1) ? 'active' : ''}`;
    btn.dataset.num = item.number;
    btn.innerHTML = `
      <span class="num-digit">${item.number}</span>
      <span class="num-name">${item.geometric_symbol ? item.geometric_symbol.split('(')[0].trim() : ''}</span>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nm-num-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectNumberDetail(item.number);
    });
    container.appendChild(btn);
  });
}

async function selectNumberDetail(num) {
  AppState.nurmuhammad.activeNumber = num;

  // Highlight pill if exists
  document.querySelectorAll('.nm-num-pill').forEach(b => {
    if (parseInt(b.dataset.num, 10) === num) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  const numbers = (AppState.nurmuhammad.numbersData && AppState.nurmuhammad.numbersData.numbers) || [];
  let item = numbers.find(x => x.number === num);

  // If custom number not in static articles, generate placeholder and focus on math
  if (!item) {
    item = {
      number: num,
      title_tr: `Sayı ${num}: Özel Matematiksel & Sembolik Keşif`,
      title_ar: `العدد ${num}`,
      hijri_month: `${num}. Makam / Mertebe`,
      asma_allah: 'El-Alîm & El-Muhsî',
      asma_nabi: 'Seyyidinâ Muhammed (ﷺ)',
      geometric_symbol: `Sayısal Mertebe (${num})`,
      formula: `Mod 9: ${((num - 1) % 9) + 1}`,
      secrets: {
        summary: `${num} sayısı için canlı matematiksel prosessör çalıştırıldı. Asal çarpanlar, dijital kök (mod 9), 19/7 ilahi mührü ve Kur'an sureleri ile olan irtibatı aşağıda hesaplanmıştır.`,
        points: [
          `Dijital Kök Sırrı: Sayı ${num}, rakamları toplamıyla mod 9'da ${((num - 1) % 9) + 1} Sultan makamına rücu eder.`,
          `Kur'an Simetrisi: Eğer sayı 1 ile 114 arasında ise, doğrudan Kur'an'ın bir suresinin anahtarıdır.`,
          `19 Mührü İrtibatı: Sayı 19'un tam katı mı, yoksa kalan nedir matematik sekmesinden inceleyin.`
        ],
        quran_verses: []
      },
      understanding: {
        summary: `${num} Sayısının İlm-i Hurûf ve Matematiksel Tefekkürü:`,
        translation: `Her sayı, kâinatın matematiksel nizamında ilahi bir frekansı ve tecelliyi temsil eder. İlm-i Hurûf ve Esrârü'l-Erkâm'da sayılar tesadüfî semboller değil, Cenâb-ı Hakk'ın 'Muhsî' (her şeyi sayısıyla kuşatan) isminin zuhurlarıdır.\n\n${num} sayısını tefekkür eden bir salik, bu sayının köklerine ve çarpanlarına bakarak vahdet (birlik) ile kesret (çokluk) arasındaki köprüyü müşahede eder. Rakamların mod 9 indirgemesi daima 9 Sultanü'l-Evliyâ makamına varır; zira 9 kemâliyetin dairesidir.`
      }
    };
  }

  // Update Hero panel
  const elNum = document.getElementById('nm-nh-num');
  const elSymbol = document.getElementById('nm-nh-symbol');
  const elArTitle = document.getElementById('nm-nh-ar-title');
  const elTrTitle = document.getElementById('nm-nh-tr-title');
  const elMonth = document.getElementById('nm-nh-month');
  const elAsmaAllah = document.getElementById('nm-nh-asma-allah');
  const elAsmaNabi = document.getElementById('nm-nh-asma-nabi');
  const elFormula = document.getElementById('nm-nh-formula');

  if (elNum) elNum.textContent = item.number;
  if (elSymbol) elSymbol.textContent = item.geometric_symbol || 'İlahi Geometri';
  if (elArTitle) elArTitle.textContent = item.title_ar || '';
  if (elTrTitle) elTrTitle.textContent = item.title_tr || '';
  if (elMonth) elMonth.textContent = `🌙 ${item.hijri_month || ''}`;
  if (elAsmaAllah) elAsmaAllah.textContent = `✨ ${item.asma_allah || ''}`;
  if (elAsmaNabi) elAsmaNabi.textContent = `🌹 ${item.asma_nabi || ''}`;
  if (elFormula) elFormula.textContent = `📐 ${item.formula || ''}`;

  // Update Secrets Tab
  const secSummary = document.getElementById('nm-secrets-summary');
  const secPoints = document.getElementById('nm-secrets-points');
  const secVerses = document.getElementById('nm-secrets-verses');

  if (secSummary) {
    secSummary.innerHTML = `
      <div class="secrets-summary-card">
        <div class="summary-badge">HAKÎKAT & MANEVÎ ÖZET</div>
        <p>${escapeHtml(item.secrets ? item.secrets.summary : '')}</p>
      </div>
    `;
  }

  if (secPoints) {
    const points = (item.secrets && item.secrets.points) || [];
    secPoints.innerHTML = points.map((p, idx) => `
      <div class="secret-point-item">
        <span class="point-index">${idx + 1}</span>
        <div class="point-text">${escapeHtml(p)}</div>
      </div>
    `).join('');
  }

  if (secVerses) {
    const verses = (item.secrets && item.secrets.quran_verses) || [];
    if (verses.length > 0) {
      secVerses.innerHTML = `
        <h4 class="verses-block-title">📖 İlgili Kur'an-ı Kerîm Ayetleri & Şahitlikleri</h4>
        <div class="secrets-verses-grid">
          ${verses.map(v => `
            <div class="verse-proof-card">
              <div class="vproof-header">
                <span class="vproof-ref">${escapeHtml(v.ref)}</span>
              </div>
              <div class="vproof-arabic" dir="rtl">${escapeHtml(v.ar)}</div>
              <div class="vproof-turkish">"${escapeHtml(v.tr)}"</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      secVerses.innerHTML = '';
    }
  }

  // Update Understanding Tab (Tam Tercüme)
  const undArticle = document.getElementById('nm-understanding-article');
  if (undArticle) {
    const und = item.understanding || {};
    const paragraphs = (und.translation || '').split('\n\n').filter(Boolean);
    undArticle.innerHTML = `
      <div class="understanding-hero-block">
        <span class="und-source-badge">NURMUHAMMAD.COM BİREBİR TÜRKÇE TERCÜME</span>
        <h3>${escapeHtml(item.title_tr)}</h3>
        <p class="und-summary-lead">${escapeHtml(und.summary || '')}</p>
      </div>
      <div class="understanding-body-text">
        ${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
      <div class="understanding-footer-note">
        <p>
          <em>Kaynak:</em> Mevlânâ Şeyh Nâzım el-Hakkânî ve Mevlânâ Şeyh Hişâm Kabbânî sohbetlerinden 
          Şeyh Nûrjan Mîrahmedî (<a href="https://nurmuhammad.com" target="_blank" rel="noopener">NurMuhammad.com</a>).
        </p>
      </div>
    `;
  }

  // Load Math Processor
  loadLiveMathAnalysis(num);
}

async function loadLiveMathAnalysis(num) {
  const container = document.getElementById('nm-math-processor-container');
  if (!container) return;
  container.innerHTML = '<div class="loader-spinner"></div>';

  try {
    const res = await fetch(`/api/math/analyze-number?n=${num}`);
    const data = await res.json();

    const primeFactorTree = data.prime_factors && data.prime_factors.length > 0 
      ? data.prime_factors.join(' × ')
      : 'Asal Çarpan Yok (1)';

    const divisorsList = (data.divisors || []).join(', ');
    const stepsList = (data.digital_root_steps && data.digital_root_steps.length > 0)
      ? data.digital_root_steps.join(' ➔ ')
      : `${num} (Zaten tek haneli kök)`;

    const surahCard = data.matching_surah ? `
      <div class="math-card math-surah-card">
        <div class="math-card-badge">KUR'AN SURESİ EŞLEŞMESİ</div>
        <h4>${data.matching_surah.number}. Sure: ${data.matching_surah.name_tr} (${data.matching_surah.name_ar})</h4>
        <div class="math-surah-stats">
          <span>📜 Ayet Sayısı: <strong>${data.matching_surah.verse_count}</strong> ${data.matching_surah.is_prime_verse_count ? '<span class="badge-mini">Asal</span>' : ''}</span>
          <span>🔤 Harf Sayısı: <strong>${data.matching_surah.total_letters.toLocaleString('tr-TR')}</strong></span>
          <span>🔠 Kelime Sayısı: <strong>${data.matching_surah.total_words.toLocaleString('tr-TR')}</strong></span>
          ${data.matching_surah.mukattaa ? `<span>✨ Mukattaa: <strong style="color:var(--gold-light); font-size:1.1rem;">${data.matching_surah.mukattaa}</strong></span>` : ''}
        </div>
      </div>
    ` : '';

    const lettersCard = (data.matched_letters && data.matched_letters.length > 0) ? `
      <div class="math-card math-letters-card">
        <div class="math-card-badge">EBCED HARF EŞLEŞMESİ</div>
        <div class="math-matched-letters">
          ${data.matched_letters.map(l => `
            <div class="matched-letter-pill">
              <span class="ml-char">${l.char}</span>
              <span class="ml-name">${l.name}</span>
              <span class="ml-abjad">Ebced: ${l.abjad}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <!-- Row 1: Asallık & Çarpanlar -->
      <div class="math-card">
        <div class="math-card-badge">ASALLIK & ÇARPANLAR AĞACI</div>
        <div class="math-card-main-val">
          <span class="math-val-number">${num}</span>
          <span class="kpi-prime-badge ${data.is_prime ? 'badge-prime-yes' : 'badge-prime-no'}">
            ${data.is_prime ? 'ASAL SAYI' : 'ASAL DEĞİL (Bileşik)'}
          </span>
        </div>
        <div class="math-detail-row">
          <span class="md-lbl">Asal Çarpanlar:</span>
          <strong class="md-val" style="color:var(--gold-light); font-family:monospace; font-size:1rem;">${primeFactorTree}</strong>
        </div>
        <div class="math-detail-row">
          <span class="md-lbl">Benzersiz Asallar:</span>
          <span class="md-val">${(data.prime_factors_unique || []).join(', ') || '-'}</span>
        </div>
      </div>

      <!-- Row 2: Dijital Kök & 9 Sultan İndirgemesi -->
      <div class="math-card">
        <div class="math-card-badge">DİJİTAL KÖK (MOD 9) İNDİRGEMESİ</div>
        <div class="math-card-main-val">
          <span class="math-val-number" style="color:var(--gold-primary);">${data.digital_root}</span>
          <span class="badge-mini" style="background:rgba(212,175,55,0.2); color:var(--gold-light);">9 Sultan Makamı #${data.digital_root}</span>
        </div>
        <div class="math-detail-row">
          <span class="md-lbl">İndirgeme Adımları:</span>
          <span class="md-val" style="color:#fef08a;">${stepsList}</span>
        </div>
        <p class="math-subtext">Her sayı mod 9'da 9 Sultanü'l-Evliyâ makamından birine bağlanır ve nihai teslimiyete erer.</p>
      </div>

      <!-- Row 3: 19 ve 7 İlahi Mühür Testi -->
      <div class="math-card">
        <div class="math-card-badge">19 VE 7 İLAHİ MÜHÜR TESTİ</div>
        <div class="math-dual-status">
          <div class="math-status-box ${data.mod_19 && data.mod_19.is_divisible ? 'success' : ''}">
            <span class="ms-lbl">19 Mührü:</span>
            <strong class="ms-val">${data.mod_19 && data.mod_19.is_divisible ? '✓ 19\'un Tam Katı (' + data.mod_19.multiple + 'x)' : 'Kalan: ' + (data.mod_19 ? data.mod_19.remainder : 0)}</strong>
          </div>
          <div class="math-status-box ${data.mod_7 && data.mod_7.is_divisible ? 'success' : ''}">
            <span class="ms-lbl">7 Mührü:</span>
            <strong class="ms-val">${data.mod_7 && data.mod_7.is_divisible ? '✓ 7\'nin Tam Katı (' + data.mod_7.multiple + 'x)' : 'Kalan: ' + (data.mod_7 ? data.mod_7.remainder : 0)}</strong>
          </div>
        </div>
      </div>

      <!-- Row 4: Bölenler & Mükemmel Sayı -->
      <div class="math-card">
        <div class="math-card-badge">BÖLENLER & SAYISAL TÜR</div>
        <div class="math-detail-row">
          <span class="md-lbl">Toplam Bölen Sayısı:</span>
          <strong class="md-val">${data.divisors_count} adet</strong>
        </div>
        <div class="math-detail-row">
          <span class="md-lbl">Öz Bölenler Toplamı:</span>
          <strong class="md-val">${data.proper_divisors_sum}</strong>
        </div>
        <div class="math-detail-row">
          <span class="md-lbl">Sayı Durumu:</span>
          <span class="badge-mini" style="font-weight:700;">
            ${data.is_perfect ? '🌟 Mükemmel Sayı' : (data.is_abundant ? 'Zengin (Abundant) Sayı' : 'Kıt (Deficient) Sayı')}
          </span>
        </div>
        <div class="math-divisors-pills">
          <span class="md-lbl" style="display:block; margin-bottom:4px;">Bölenler Listesi:</span>
          <span style="font-size:0.8rem; color:#cbd5e1; word-break:break-all;">${divisorsList}</span>
        </div>
      </div>

      <!-- Row 5: İkili Kod (Binary) & Hex -->
      <div class="math-card">
        <div class="math-card-badge">İKİLİ (BİNARY) & ONALTILIK (HEX)</div>
        <div class="math-detail-row">
          <span class="md-lbl">Binary (0 ve 1):</span>
          <code class="md-code">${data.binary}</code>
        </div>
        <div class="math-detail-row">
          <span class="md-lbl">Hexadecimal:</span>
          <code class="md-code">0x${data.hex}</code>
        </div>
        <p class="math-subtext">Şeyh Nûrjan Mîrahmedî: '10 sayısı kâinatın binary kodudur; 1 Allah, 0 ise yokluktaki kuldur.'</p>
      </div>

      ${lettersCard}
      ${surahCard}
    `;

  } catch (err) {
    container.innerHTML = `<div style="color:#f87171; padding:1.5rem;">Matematiksel analiz motoru çalıştırılamadı.</div>`;
  }
}

function renderLettersTheses(teachings) {
  const container = document.getElementById('nm-letters-theses-grid');
  if (!container || !teachings || !teachings.core_theses) return;

  container.innerHTML = teachings.core_theses.map((t, idx) => `
    <div class="thesis-card">
      <div class="thesis-idx">Tez #${idx + 1}</div>
      <h4>${escapeHtml(t.topic)}</h4>
      <p>${escapeHtml(t.content_tr)}</p>
    </div>
  `).join('');
}

function render11Principles(principles) {
  const grid = document.getElementById('principles-11-grid');
  if (!grid || !principles) return;
  grid.innerHTML = '';

  principles.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'principle-card';
    card.innerHTML = `
      <div class="principle-num">${idx + 1}</div>
      <div class="principle-name">${p.name}</div>
      <div class="principle-tr">${p.tr}</div>
      <p class="principle-desc">${p.meaning}</p>
    `;
    grid.appendChild(card);
  });
}

function renderAngelicHealing(angels) {
  const grid = document.getElementById('angelic-healing-grid');
  if (!grid || !angels) return;
  grid.innerHTML = '';

  angels.forEach(a => {
    const card = document.createElement('div');
    card.className = 'angel-card';
    card.innerHTML = `
      <div class="angel-badge">MALA'IKA / MALAKUT</div>
      <h4>${a.angel}</h4>
      <div class="angel-title">${a.title_tr}</div>
      <div class="angel-dim">✨ <strong>Şifa Boyutu:</strong> ${a.healing_dimension}</div>
      <div class="angel-color">🌈 <strong>Nûranî Renk:</strong> ${a.color}</div>
      <div class="angel-dhikr">📿 <strong>Vird & Zikir:</strong> ${a.dhikr}</div>
      <p class="angel-desc">${a.desc}</p>
    `;
    grid.appendChild(card);
  });
}

function renderNurMuhammadLetters(letters) {
  const grid = document.getElementById('nm-letters-grid');
  if (!grid || !letters) return;
  grid.innerHTML = '';

  letters.forEach(t => {
    const tile = document.createElement('div');
    tile.className = 'nm-letter-tile';
    tile.dataset.char = t.char;
    tile.dataset.name = t.name.toLowerCase();
    tile.dataset.planet = (t.planet || '').toLowerCase();
    tile.innerHTML = `
      <div class="tile-char">${t.char}</div>
      <div class="tile-name">${t.name}</div>
      <div class="tile-abjad">Ebced: ${t.abjad}</div>
      <div class="tile-planet">${t.planet || ''}</div>
    `;

    tile.addEventListener('click', () => {
      document.querySelectorAll('.nm-letter-tile').forEach(x => x.classList.remove('active'));
      tile.classList.add('active');
      openLetterDetail(t);
    });

    grid.appendChild(tile);
  });
}

function filterNurMuhammadLetters(query) {
  document.querySelectorAll('.nm-letter-tile').forEach(tile => {
    if (!query) {
      tile.style.display = 'flex';
      return;
    }
    const match = tile.dataset.char.includes(query) ||
                  tile.dataset.name.includes(query) ||
                  tile.dataset.planet.includes(query);
    tile.style.display = match ? 'flex' : 'none';
  });
}

function openLetterDetail(t) {
  const card = document.getElementById('nm-letter-detail-card');
  if (!card) return;

  document.getElementById('nld-char').innerText = t.char;
  document.getElementById('nld-name').innerText = `${t.name} (${t.char})`;
  document.getElementById('nld-abjad').innerText = t.abjad;
  document.getElementById('nld-planet').innerText = `Kozmik Felek: ${t.planet || '-'}`;
  document.getElementById('nld-organ').innerText = `Beden Letâifi: ${t.body_latifa || '-'}`;
  document.getElementById('nld-asma-allah').innerText = `${t.asma_allah || '-'} (Ebced: ${t.asma_allah_abjad || '-'})`;
  document.getElementById('nld-asma-nabi').innerText = `${t.asma_nabi || '-'} (Ebced: ${t.asma_nabi_abjad || '-'})`;
  document.getElementById('nld-secret').innerText = t.secret || '';

  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderNurMuhammadLataif(lataif) {
  const grid = document.getElementById('nm-lataif-grid');
  if (!grid || !lataif) return;
  grid.innerHTML = '';

  lataif.forEach(pt => {
    const card = document.createElement('div');
    card.className = 'lataif-card';
    card.innerHTML = `
      <div class="lataif-top-row">
        <span class="lataif-pt-num">${pt.point}. Nokta</span>
        <span class="lataif-color-pill" style="background:rgba(255,255,255,0.08); color:var(--gold-light);">Nûr: ${pt.color}</span>
      </div>
      <h5>${pt.name}</h5>
      <p>${pt.description}</p>
    `;
    grid.appendChild(card);
  });
}

function renderAsmaHusnaTable(list) {
  const tbody = document.getElementById('tbody-asma-husna');
  if (!tbody || !list) return;
  AppState.asmaHusnaList = list;
  tbody.innerHTML = '';
  const isEn = AppState.language === 'en';

  const titleEl = document.getElementById('title-asma-husna');
  const badgeEl = document.getElementById('badge-asma-husna');
  if (titleEl) titleEl.innerText = isEn ? "Allah's 99 Most Beautiful Names (Asma-ul Husna)" : "Cenâb-ı Allah'ın 99 İsmi (Esma-ül Hüsna)";
  if (badgeEl) badgeEl.innerText = isEn ? `${list.length} Names` : `${list.length} İsim`;

  const thAr = document.getElementById('th-ah-ar');
  const thName = document.getElementById('th-ah-name');
  const thMeaning = document.getElementById('th-ah-meaning');
  const thAbjad = document.getElementById('th-ah-abjad');
  const thPrime = document.getElementById('th-ah-prime');
  if (thAr) thAr.innerText = isEn ? 'Arabic' : 'Arapça';
  if (thName) thName.innerText = isEn ? 'Name' : 'İsim';
  if (thMeaning) thMeaning.innerText = isEn ? 'Theological Meaning' : 'Anlamı & Sırrı';
  if (thAbjad) thAbjad.innerText = isEn ? 'Abjad' : 'Ebced';
  if (thPrime) thPrime.innerText = isEn ? 'Prime' : 'Asal';

  list.forEach(a => {
    const tr = document.createElement('tr');
    const arText = a.arabic || a.ar || '';
    const nameStr = isEn ? (a.name_en || a.en_name || a.name_tr || a.name) : (a.name_tr || a.name || a.name_en);
    const meaningStr = isEn ? (a.meaning_en || a.meaning_tr || a.meaning) : (a.meaning_tr || a.meaning || a.meaning_en);

    tr.dataset.ar = arText;
    tr.dataset.tr = (a.name_tr || a.name || '').toLowerCase();
    tr.dataset.en = (a.name_en || '').toLowerCase();
    tr.dataset.meaning = meaningStr.toLowerCase();
    tr.dataset.abjad = (a.abjad || 0).toString();

    tr.innerHTML = `
      <td>${a.number || a.id}</td>
      <td style="font-family:var(--font-arabic-clean); font-size:1.25rem; color:var(--gold-light);">${arText}</td>
      <td><strong>${escapeHtml(nameStr)}</strong></td>
      <td style="font-size:0.8rem; color:#cbd5e1;">${escapeHtml(meaningStr)}</td>
      <td><strong style="color:var(--emerald-light); font-size:0.95rem;">${a.abjad}</strong></td>
      <td><span class="kpi-prime-badge ${a.is_prime ? 'badge-prime-yes' : 'badge-prime-no'}" style="font-size:0.6rem;">${a.is_prime ? (isEn ? 'Prime' : 'Asal') : (isEn ? 'Composite' : 'Bileşik')}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAsmaNabiTable(list) {
  const tbody = document.getElementById('tbody-asma-nabi');
  if (!tbody || !list) return;
  AppState.asmaNabiList = list;
  tbody.innerHTML = '';
  const isEn = AppState.language === 'en';

  const titleEl = document.getElementById('title-asma-nabi');
  const badgeEl = document.getElementById('badge-asma-nabi');
  if (titleEl) titleEl.innerText = isEn ? "Sacred Names of Prophet Muhammad ﷺ (Asma-i Nabi)" : "Resûlullah (s.a.v.)'in Mübârek İsimleri (Esma-i Nebi)";
  if (badgeEl) badgeEl.innerText = isEn ? `${list.length} Names` : `${list.length} İsim`;

  const thAr = document.getElementById('th-an-ar');
  const thName = document.getElementById('th-an-name');
  const thAbjad = document.getElementById('th-an-abjad');
  const thMeaning = document.getElementById('th-an-meaning');
  if (thAr) thAr.innerText = isEn ? 'Arabic' : 'Arapça';
  if (thName) thName.innerText = isEn ? 'Name' : 'Mübarek İsim';
  if (thAbjad) thAbjad.innerText = isEn ? 'Abjad' : 'Ebced';
  if (thMeaning) thMeaning.innerText = isEn ? 'Meaning / Spiritual Attribute' : 'Delâil & Marifet Manası';

  list.forEach(a => {
    const tr = document.createElement('tr');
    const arText = a.arabic || a.ar || '';
    const nameStr = isEn ? (a.name_en || a.name_tr || a.name) : (a.name_tr || a.name || a.name_en);
    const meaningStr = isEn ? (a.meaning_en || a.meaning_tr || a.meaning) : (a.meaning_tr || a.meaning || a.meaning_en);

    tr.dataset.ar = arText;
    tr.dataset.tr = (a.name_tr || a.name || '').toLowerCase();
    tr.dataset.en = (a.name_en || '').toLowerCase();
    tr.dataset.meaning = meaningStr.toLowerCase();
    tr.dataset.abjad = (a.abjad || 0).toString();

    tr.innerHTML = `
      <td style="font-family:var(--font-arabic-clean); font-size:1.25rem; color:var(--gold-light);">${arText}</td>
      <td><strong>${escapeHtml(nameStr)}</strong></td>
      <td><strong style="color:var(--emerald-light); font-size:0.95rem;">${a.abjad}</strong></td>
      <td style="font-size:0.8rem; color:#e2e8f0;">${escapeHtml(meaningStr)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterAsmaTables(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('#tbody-asma-husna tr').forEach(tr => {
    if (!q) { tr.style.display = ''; return; }
    const match = (tr.dataset.ar && tr.dataset.ar.includes(q)) ||
                  (tr.dataset.tr && tr.dataset.tr.includes(q)) ||
                  (tr.dataset.en && tr.dataset.en.includes(q)) ||
                  (tr.dataset.meaning && tr.dataset.meaning.includes(q)) ||
                  (tr.dataset.abjad && tr.dataset.abjad.includes(q));
    tr.style.display = match ? '' : 'none';
  });

  document.querySelectorAll('#tbody-asma-nabi tr').forEach(tr => {
    if (!q) { tr.style.display = ''; return; }
    const match = (tr.dataset.ar && tr.dataset.ar.includes(q)) ||
                  (tr.dataset.tr && tr.dataset.tr.includes(q)) ||
                  (tr.dataset.en && tr.dataset.en.includes(q)) ||
                  (tr.dataset.meaning && tr.dataset.meaning.includes(q)) ||
                  (tr.dataset.abjad && tr.dataset.abjad.includes(q));
    tr.style.display = match ? '' : 'none';
  });
}


// =================================================================
// TAB: DELÂİLÜ'L-HAYRÂT & DİJİTAL SALAVAT ZİKİRMATİĞİ
// =================================================================
function initDelailModule() {
  // Subtab navigation (hizib, asma_nabi, asma_husna, fazilet)
  const subBtns = document.querySelectorAll('.delail-sub-btn');
  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetSub = btn.dataset.delailsub;
      AppState.delail.subtab = targetSub;

      document.querySelectorAll('.delail-subview').forEach(v => v.classList.add('hidden'));
      const activeV = document.getElementById(`delailsub-${targetSub}`);
      if (activeV) activeV.classList.remove('hidden');
    });
  });

  // Day selector buttons (1..8)
  const dayBtns = document.querySelectorAll('.delail-day-btn');
  dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dayBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dayId = parseInt(btn.dataset.day, 10);
      AppState.delail.activeDay = dayId;
      renderDelailHizb(dayId);
    });
  });

  // Tasbeeh circle tap button
  const tasbeehBtn = document.getElementById('btn-tasbeeh-tap');
  if (tasbeehBtn) {
    tasbeehBtn.addEventListener('click', () => {
      tapTasbeeh();
    });
  }

  // Preset buttons (33, 99, 100, 313, 1000)
  document.querySelectorAll('.tasbeeh-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tasbeeh-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = parseInt(btn.dataset.target, 10);
      AppState.delail.tasbeeh.target = target;
      const targetLbl = document.getElementById('tasbeeh-target-lbl');
      if (targetLbl) targetLbl.innerText = `Hedef: ${target}`;
    });
  });

  // Tasbeeh reset button
  const resetBtn = document.getElementById('btn-tasbeeh-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetTasbeeh();
    });
  }

  // Tasbeeh sound toggle button
  const audioBtn = document.getElementById('btn-tasbeeh-audio');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      AppState.delail.tasbeeh.sound = !AppState.delail.tasbeeh.sound;
      audioBtn.innerText = AppState.delail.tasbeeh.sound ? '🔔 Ses: Açık' : '🔕 Ses: Kapalı';
      audioBtn.style.color = AppState.delail.tasbeeh.sound ? 'var(--gold-light)' : 'var(--text-muted)';
    });
  }

  // Search filter for Asma-i Nabi
  const searchAsmaNabi = document.getElementById('input-search-asma-nabi');
  if (searchAsmaNabi) {
    searchAsmaNabi.addEventListener('input', (e) => {
      filterDelailAsmaNabi(e.target.value.toLowerCase().trim());
    });
  }

  // Search filter for Asma-ul Husna
  const searchAsmaHusna = document.getElementById('input-search-asma-husna');
  if (searchAsmaHusna) {
    searchAsmaHusna.addEventListener('input', (e) => {
      filterDelailAsmaHusna(e.target.value.toLowerCase().trim());
    });
  }

  // Keyboard shortcut: Spacebar to tap tasbeeh when in Delail tab
  window.addEventListener('keydown', (e) => {
    if (AppState.currentTab === 'delail' && e.code === 'Space') {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        tapTasbeeh();
      }
    }
  });
}

let tasbeehAudioCtx = null;
function playTasbeehClickTone() {
  if (!AppState.delail.tasbeeh.sound) return;
  try {
    if (!tasbeehAudioCtx) {
      tasbeehAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (tasbeehAudioCtx.state === 'suspended') {
      tasbeehAudioCtx.resume();
    }
    const osc = tasbeehAudioCtx.createOscillator();
    const gain = tasbeehAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, tasbeehAudioCtx.currentTime); // A5 tone
    osc.frequency.exponentialRampToValueAtTime(440, tasbeehAudioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, tasbeehAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, tasbeehAudioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(tasbeehAudioCtx.destination);
    osc.start();
    osc.stop(tasbeehAudioCtx.currentTime + 0.05);
  } catch (err) {}
}

function tapTasbeeh() {
  AppState.delail.tasbeeh.count += 1;
  const countEl = document.getElementById('tasbeeh-counter-val');
  if (countEl) {
    countEl.innerText = AppState.delail.tasbeeh.count;
    countEl.style.transform = 'scale(1.15)';
    setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 100);
  }

  playTasbeehClickTone();

  // Hedefe ulaşıldığında kutlama animasyonu
  if (AppState.delail.tasbeeh.count === AppState.delail.tasbeeh.target) {
    showToast(`Mübârek olsun! ${AppState.delail.tasbeeh.target} adet salavât-ı şerîfe hedefine ulaştınız.`);
    const btn = document.getElementById('btn-tasbeeh-tap');
    if (btn) {
      btn.style.boxShadow = '0 0 45px rgba(245, 158, 11, 0.9)';
      setTimeout(() => { btn.style.boxShadow = ''; }, 800);
    }
  }
}

function resetTasbeeh() {
  AppState.delail.tasbeeh.count = 0;
  const countEl = document.getElementById('tasbeeh-counter-val');
  if (countEl) countEl.innerText = '0';
  showToast('Zikirmatik sıfırlandı.');
}

async function loadDelailData() {
  if (AppState.delail.loaded && AppState.delail.data) return;

  const stream = document.getElementById('delail-reading-stream');
  if (stream) stream.innerHTML = `<div class="loader-spinner"></div>`;

  try {
    const res = await fetch('/api/delail');
    const data = await res.json();
    AppState.delail.data = data;
    AppState.delail.loaded = true;

    renderDelailHizb(AppState.delail.activeDay);
    renderDelailAsmaNabi(data.asma_un_nabi);
    renderDelailAsmaHusna(data.asma_ul_husna);
  } catch (err) {
    if (stream) stream.innerHTML = `<div style="padding:2rem;color:#f87171;">Delâilü'l-Hayrât yüklenemedi.</div>`;
  }
}

function renderDelailHizb(dayId) {
  const stream = document.getElementById('delail-reading-stream');
  if (!stream || !AppState.delail.data || !AppState.delail.data.hizibs) return;

  const hizb = AppState.delail.data.hizibs.find(h => h.day_id === dayId);
  if (!hizb) {
    stream.innerHTML = `<div style="padding:2rem;color:#f87171;">Hizib verisi bulunamadı.</div>`;
    return;
  }

  let sectionsHtml = '';
  hizb.sections.forEach((sec, idx) => {
    sectionsHtml += `
      <article class="prayer-section-card" id="hizb-sec-${idx + 1}">
        <div class="prayer-section-header">
          <span class="prayer-section-num">${idx + 1}. Bölüm</span>
          <h4 class="prayer-section-title">${escapeHtml(sec.title)}</h4>
        </div>

        <div class="prayer-arabic-block" style="font-size: ${Math.max(24, AppState.fontSize)}px;">
          ${escapeHtml(sec.arabic)}
        </div>

        <div class="prayer-translit-block">
          <span class="ps-label">Okunuş (Transkripsiyon):</span>
          <p>${escapeHtml(sec.translit)}</p>
        </div>

        <div class="prayer-translation-block tr">
          <span class="ps-label">Türkçe Meali:</span>
          <p>${escapeHtml(sec.translation_tr)}</p>
        </div>

        <div class="prayer-translation-block en">
          <span class="ps-label">English Translation:</span>
          <p>${escapeHtml(sec.translation_en)}</p>
        </div>

        <div class="prayer-card-footer">
          <button class="btn-prayer-action btn-copy-prayer" data-sec-idx="${idx}" title="Bu duayı kopyala">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Kopyala</span>
          </button>
          <button class="btn-prayer-action btn-inspect-delail" data-sec-idx="${idx}" title="Bu duanın kelime, kök ve harf analizini aç">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
            <span>Kök & Harf Analizi</span>
          </button>
          <button class="btn-prayer-action btn-add-tasbeeh" title="Zikirmatiğe 1 salavat ekle">
            <span>+1 Zikir</span>
          </button>
        </div>
      </article>
    `;
  });

  stream.innerHTML = `
    <div class="hizb-header-card">
      <div class="hizb-meta-tags">
        <span class="badge-gold">${hizb.day}</span>
        <span class="badge-emerald">${hizb.salawat_count} Salavat-ı Şerîfe</span>
        <span class="badge-mini">Vird-i Şerîf</span>
      </div>
      <h3 class="hizb-arabic-title">${hizb.name_ar}</h3>
      <h2 class="hizb-title-tr">${hizb.name_tr}</h2>
      <p class="hizb-theme-desc">🌿 <strong>Manevi Tecelli:</strong> ${hizb.theme}</p>
    </div>
    <div class="hizb-sections-list">
      ${sectionsHtml}
    </div>
  `;

  // Attach copy & tasbeeh buttons
  stream.querySelectorAll('.btn-copy-prayer').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.secIdx, 10);
      const sec = hizb.sections[idx];
      const textToCopy = `${sec.title}\n\n${sec.arabic}\n\n${sec.translit}\n\n${sec.translation_tr}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Dua metni panoya kopyalandı.');
      });
    });
  });

  stream.querySelectorAll('.btn-inspect-delail').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.secIdx, 10);
      const sec = hizb.sections[idx];
      inspectHadithSentence(sec.arabic);
    });
  });

  stream.querySelectorAll('.btn-add-tasbeeh').forEach(btn => {
    btn.addEventListener('click', () => {
      tapTasbeeh();
    });
  });
}

function renderDelailAsmaNabi(list) {
  const grid = document.getElementById('asma-nabi-grid');
  if (!grid || !list) return;
  grid.innerHTML = '';

  list.forEach(a => {
    const card = document.createElement('div');
    card.className = 'asma-item-card';
    card.dataset.ar = a.ar;
    card.dataset.tr = a.tr_name.toLowerCase();
    card.dataset.meaning = (a.meaning_tr + ' ' + a.meaning_en).toLowerCase();
    card.dataset.abjad = a.abjad.toString();

    card.innerHTML = `
      <div class="asma-item-top">
        <span class="asma-num-badge">#${a.id}</span>
        <span class="asma-abjad-pill">Ebced: <strong>${a.abjad}</strong></span>
      </div>
      <div class="asma-arabic-calligraphy">${a.ar}</div>
      <div class="asma-name-tr">${a.tr_name}</div>
      <div class="asma-translit-en">${a.en_name}</div>
      <div class="asma-meaning-text">${a.meaning_tr}</div>
      <div class="asma-en-meaning-sub">${a.meaning_en}</div>
    `;

    grid.appendChild(card);
  });
}

function renderDelailAsmaHusna(list) {
  const grid = document.getElementById('asma-husna-grid');
  if (!grid || !list) return;
  grid.innerHTML = '';

  list.forEach(a => {
    const card = document.createElement('div');
    card.className = 'asma-item-card husna';
    card.dataset.ar = a.ar;
    card.dataset.tr = a.tr_name.toLowerCase();
    card.dataset.meaning = (a.meaning_tr + ' ' + a.meaning_en).toLowerCase();
    card.dataset.abjad = a.abjad.toString();

    card.innerHTML = `
      <div class="asma-item-top">
        <span class="asma-num-badge gold">#${a.id}</span>
        <span class="asma-abjad-pill gold">Ebced: <strong>${a.abjad}</strong></span>
      </div>
      <div class="asma-arabic-calligraphy gold-glow">${a.ar}</div>
      <div class="asma-name-tr">${a.tr_name}</div>
      <div class="asma-translit-en">${a.en_name}</div>
      <div class="asma-meaning-text">${a.meaning_tr}</div>
      <div class="asma-en-meaning-sub">${a.meaning_en}</div>
    `;

    grid.appendChild(card);
  });
}

function filterDelailAsmaNabi(q) {
  document.querySelectorAll('#asma-nabi-grid .asma-item-card').forEach(c => {
    if (!q) { c.style.display = 'flex'; return; }
    const match = c.dataset.ar.includes(q) ||
                  c.dataset.tr.includes(q) ||
                  c.dataset.meaning.includes(q) ||
                  c.dataset.abjad.includes(q);
    c.style.display = match ? 'flex' : 'none';
  });
}

function filterDelailAsmaHusna(q) {
  document.querySelectorAll('#asma-husna-grid .asma-item-card').forEach(c => {
    if (!q) { c.style.display = 'flex'; return; }
    const match = c.dataset.ar.includes(q) ||
                  c.dataset.tr.includes(q) ||
                  c.dataset.meaning.includes(q) ||
                  c.dataset.abjad.includes(q);
    c.style.display = match ? 'flex' : 'none';
  });
}


// =================================================================
// TAB: GÖRSELLEŞTİRMELER (SACRED GEOMETRY & INTERACTIVE CANVASES)
// =================================================================
function initVisualizerModule() {
  const visBtns = document.querySelectorAll('.vis-sub-btn');
  visBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      visBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sub = btn.dataset.vissub;
      AppState.visualizer.activeSub = sub;

      document.querySelectorAll('.vis-subview').forEach(v => v.classList.add('hidden'));
      const activeV = document.getElementById(`vissub-${sub}`);
      if (activeV) activeV.classList.remove('hidden');

      renderActiveVisualizerCanvas();
    });
  });

  window.addEventListener('resize', () => {
    if (AppState.currentTab === 'visualizer') {
      renderActiveVisualizerCanvas();
    }
  });
}

function renderActiveVisualizerCanvas() {
  const sub = AppState.visualizer.activeSub;
  if (sub === 'parity') {
    drawParityWaveCanvas();
  } else if (sub === 'letters') {
    drawLettersWheelCanvas();
  } else if (sub === 'lataif') {
    drawLataifHealingCanvas();
  } else if (sub === 'duality') {
    drawDualityRadarCanvas();
  }
}

// 1. 114 Sure Parite Dalgası (57 Çift / 57 Tek Simetrisi) Canvas
function drawParityWaveCanvas() {
  const canvas = document.getElementById('canvas-parity-wave');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Background
  ctx.fillStyle = '#0a101d';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 40; y < h - 40; y += 40) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
  }

  // Draw 114 surah bars & wave
  const surahs = AppState.surahs || [];
  if (surahs.length === 0) return;

  const barW = (w - 100) / 114;
  const maxAyahs = 286;
  const startX = 50;
  const baseH = h - 60;

  // Baseline
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, baseH);
  ctx.lineTo(w - 50, baseH);
  ctx.stroke();

  // Wave points
  const points = [];

  surahs.forEach((s, i) => {
    const x = startX + i * barW;
    const barHeight = (s.verse_count / maxAyahs) * (h - 140);
    const y = baseH - barHeight;
    const sum = s.number + s.verse_count;
    const isEven = sum % 2 === 0;

    // Draw Bar
    ctx.fillStyle = isEven ? 'rgba(16, 185, 129, 0.65)' : 'rgba(56, 189, 248, 0.65)';
    ctx.fillRect(x + 1, y, Math.max(2, barW - 2), barHeight);

    points.push({ x: x + barW / 2, y, surah: s, isEven, sum });
  });

  // Connecting golden harmonic spline curve
  ctx.beginPath();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
  ctx.shadowBlur = 10;

  points.forEach((pt, i) => {
    if (i === 0) {
      ctx.moveTo(pt.x, pt.y);
    } else {
      const prev = points[i - 1];
      const cx = (prev.x + pt.x) / 2;
      const cy = (prev.y + pt.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
    }
  });
  ctx.stroke();
  ctx.shadowBlur = 0; // reset shadow

  // Axis and Title Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1. Fâtiha', startX, h - 35);
  ctx.fillText('57. Hadîd (Merkez)', startX + 56 * barW, h - 35);
  ctx.fillText('114. Nâs', startX + 113 * barW, h - 35);

  ctx.fillStyle = '#10b981';
  ctx.textAlign = 'left';
  ctx.fillText('● 57 Çift Simetri Suresi (Toplam = 6236)', 50, 25);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('● 57 Tek Simetri Suresi (Toplam = 6555)', 330, 25);
}

// 2. 28 Harf Kozmik Geometri Çarkı (Celestial Mandala) Canvas
let wheelAngle = 0;
function drawLettersWheelCanvas() {
  const canvas = document.getElementById('canvas-letters-wheel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 50;

  ctx.clearRect(0, 0, w, h);

  // Cosmic Background
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, r + 40);
  bgGrad.addColorStop(0, '#111a2c');
  bgGrad.addColorStop(0.7, '#080d17');
  bgGrad.addColorStop(1, '#03060a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Concentric Orbit Circles
  const orbitRadii = [r * 0.35, r * 0.6, r * 0.82, r];
  ctx.lineWidth = 1;
  orbitRadii.forEach((rad, idx) => {
    ctx.strokeStyle = idx === 1 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 28 Harf Listesi
  const letters = (AppState.nurmuhammad && AppState.nurmuhammad.data && AppState.nurmuhammad.data.letters_28) 
    ? AppState.nurmuhammad.data.letters_28 
    : [
        {char:'ا', name:'Elif', abjad:1}, {char:'ب', name:'Bâ', abjad:2}, {char:'ت', name:'Tâ', abjad:400},
        {char:'ث', name:'Sâ', abjad:500}, {char:'ج', name:'Cîm', abjad:3}, {char:'ح', name:'Hâ', abjad:8},
        {char:'خ', name:'Hâ', abjad:600}, {char:'د', name:'Dâl', abjad:4}, {char:'ذ', name:'Zâl', abjad:700},
        {char:'ر', name:'Râ', abjad:200}, {char:'ز', name:'Zâ', abjad:7}, {char:'س', name:'Sîn', abjad:60},
        {char:'ش', name:'Şîn', abjad:300}, {char:'ص', name:'Sâd', abjad:90}, {char:'ض', name:'Dâd', abjad:800},
        {char:'ط', name:'Tı', abjad:9}, {char:'ظ', name:'Zı', abjad:900}, {char:'ع', name:'Ayn', abjad:70},
        {char:'غ', name:'Gayn', abjad:1000}, {char:'ف', name:'Fâ', abjad:80}, {char:'ق', name:'Kâf', abjad:100},
        {char:'ك', name:'Kef', abjad:20}, {char:'ل', name:'Lâm', abjad:30}, {char:'م', name:'Mîm', abjad:40},
        {char:'ن', name:'Nûn', abjad:50}, {char:'و', name:'Vâv', abjad:6}, {char:'ه', name:'Hâ', abjad:5},
        {char:'ي', name:'Yâ', abjad:10}
      ];

  const total = letters.length;
  const angleStep = (Math.PI * 2) / total;

  letters.forEach((l, idx) => {
    const angle = idx * angleStep + wheelAngle;
    const lx = cx + Math.cos(angle) * (r * 0.85);
    const ly = cy + Math.sin(angle) * (r * 0.85);

    // Radial ray line to center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.stroke();

    // Letter Node Circle
    ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
    ctx.strokeStyle = idx % 2 === 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lx, ly, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Arabic Character
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Traditional Arabic", Amiri, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.char, lx, ly - 2);

    // Abjad Value pill
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.font = '10px monospace';
    ctx.fillText(l.abjad.toString(), lx, ly + 14);
  });

  // Glowing Center: Sırr-ı Nuqta (Nuqta-i Bâ)
  const centerPulse = Math.sin(wheelAngle * 4) * 4;
  const centerGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 45 + centerPulse);
  centerGrad.addColorStop(0, '#f59e0b');
  centerGrad.addColorStop(0.4, 'rgba(217, 119, 6, 0.6)');
  centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 45 + centerPulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Traditional Arabic", Amiri, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('نُقْطَة', cx, cy - 2);

  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('NUQTA-I BÂ', cx, cy + 18);
}

// 3. 9 Kalp Noktası & Melekî Şifa Enerji Ağı Canvas
function drawLataifHealingCanvas() {
  const canvas = document.getElementById('canvas-lataif-healing');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 - 20;

  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);

  // 4 Archangels (Outer Corner Pillars)
  const archangels = [
    { name: "Cebrail (a.s.)", title: "Vahiy & Akıl", color: "#38bdf8", x: 120, y: 100 },
    { name: "Mikail (a.s.)", title: "Rızık & Beden", color: "#10b981", x: w - 120, y: 100 },
    { name: "İsrafil (a.s.)", title: "Sûr & Hayat", color: "#ef4444", x: 120, y: h - 100 },
    { name: "Azrail (a.s.)", title: "Kabz & Tasfiye", color: "#a855f7", x: w - 120, y: h - 100 }
  ];

  // Draw 5 Heart Lataif Nodes
  const lataifNodes = [
    { name: "Qalb (Kalp)", color: "#facc15", x: cx - 140, y: cy + 40, prophet: "Hz. Nûh" },
    { name: "Ruh (Ruh)", color: "#ef4444", x: cx + 140, y: cy + 40, prophet: "Hz. İbrâhîm" },
    { name: "Sirr (Sır)", color: "#ffffff", x: cx - 90, y: cy - 90, prophet: "Hz. Mûsâ" },
    { name: "Khafa (Hafî)", color: "#10b981", x: cx + 90, y: cy - 90, prophet: "Hz. Îsâ" },
    { name: "Akhfa (Ahfâ)", color: "#c084fc", x: cx, y: cy, prophet: "Hz. Muhammed (s.a.v.)" }
  ];

  // Draw connecting sacred lines between Archangels and Heart Centers
  ctx.lineWidth = 1.5;
  archangels.forEach(a => {
    lataifNodes.forEach(node => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    });
  });

  // Connecting Pentagram lines among 5 lataif
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const n1 = lataifNodes[i];
    const n2 = lataifNodes[(i + 2) % 5];
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
  }
  ctx.stroke();

  // Draw Archangel Pillars
  archangels.forEach(a => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.name, a.x, a.y - 6);

    ctx.fillStyle = a.color;
    ctx.font = '10px sans-serif';
    ctx.fillText(a.title, a.x, a.y + 12);
  });

  // Draw Heart Lataif Nodes
  lataifNodes.forEach((node, i) => {
    const isCenter = i === 4;
    const radius = isCenter ? 38 : 30;

    // Glowing aura
    const aura = ctx.createRadialGradient(node.x, node.y, 5, node.x, node.y, radius + 15);
    aura.addColorStop(0, node.color);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Node body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = node.color;
    ctx.lineWidth = isCenter ? 3 : 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = isCenter ? 'bold 13px sans-serif' : 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, node.x, node.y - 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '9px sans-serif';
    ctx.fillText(node.prophet, node.x, node.y + 11);
  });
}

// 4. Kur'an Kelime Çiftleri Dengesi (Duality Radar Canvas)
function drawDualityRadarCanvas() {
  const canvas = document.getElementById('canvas-duality-radar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#090e1a';
  ctx.fillRect(0, 0, w, h);

  const pairs = [
    { word1: "Dünya (الدنيا)", count1: 115, word2: "Âhiret (الآخرة)", count2: 115, color: "#10b981" },
    { word1: "Melek (الملائكة)", count1: 88, word2: "Şeytan (الشيطان)", count2: 88, color: "#f59e0b" },
    { word1: "Hayat (الحياة)", count1: 145, word2: "Ölüm (الموت)", count2: 145, color: "#38bdf8" },
    { word1: "Fayda (النفع)", count1: 50, word2: "Fesat / Zarar (الفساد)", count2: 50, color: "#a855f7" },
    { word1: "İblis (إبليس)", count1: 11, word2: "İsti'âze (الاستعاذة)", count2: 11, color: "#ec4899" },
    { word1: "Seyyiat (Kötülük)", count1: 167, word2: "Salihat (İyilik)", count2: 167, color: "#14b8a6" }
  ];

  const midX = w / 2;
  const rowH = (h - 70) / pairs.length;
  const maxCount = 180;
  const maxBarW = (w / 2) - 150;

  // Center vertical dividing axis
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, 40);
  ctx.lineTo(midX, h - 30);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚖️ MÜKEMMEL SAYISAL EŞİTLİK MERKEZİ', midX, 25);

  pairs.forEach((p, idx) => {
    const y = 60 + idx * rowH;
    const barW1 = (p.count1 / maxCount) * maxBarW;
    const barW2 = (p.count2 / maxCount) * maxBarW;

    // Left Bar (Word 1)
    ctx.fillStyle = p.color;
    ctx.fillRect(midX - barW1, y + 8, barW1, 20);

    // Right Bar (Word 2)
    ctx.fillRect(midX, y + 8, barW2, 20);

    // Left label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.word1} (${p.count1})`, midX - barW1 - 12, y + 22);

    // Right label
    ctx.textAlign = 'left';
    ctx.fillText(`(${p.count2}) ${p.word2}`, midX + barW2 + 12, y + 22);

    // Center Golden Equal Sign
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('=', midX, y + 22);
  });
}

// =================================================================
// 1. COMPACT MODULAR WORKSPACE TOOLBAR RIBBON
// =================================================================
function initQuranWorkspaceToolbar() {
  const tbSelect = document.getElementById('tb-surah-select');
  const tbInput = document.getElementById('tb-verse-input');
  const tbGoBtn = document.getElementById('btn-tb-verse-go');
  const tbAudioBtn = document.getElementById('tb-btn-audio-play');
  const tbInspBtn = document.getElementById('tb-btn-inspector-toggle');
  const tbExpBtn = document.getElementById('tb-btn-explorer-toggle');
  const tbLibBtn = document.getElementById('btn-tb-open-library');

  // Surah Dropdown Change
  if (tbSelect) {
    tbSelect.addEventListener('change', () => {
      const sNum = parseInt(tbSelect.value, 10);
      if (sNum && sNum >= 1 && sNum <= 114) {
        loadSurah(sNum);
      }
    });
  }

  // Ayah Jump
  const jumpToVerseInCurrent = () => {
    if (!tbInput) return;
    const vNum = parseInt(tbInput.value, 10);
    if (!vNum || isNaN(vNum)) return;
    const targetCard = document.querySelector(`.verse-card[data-verse-number="${vNum}"]`) || 
                       document.getElementById(`verse-card-${vNum}`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.85)';
      setTimeout(() => { targetCard.style.boxShadow = ''; }, 2200);
    } else {
      showToast(`${AppState.currentSurahData ? AppState.currentSurahData.name_tr : 'Sure'} içinde ${vNum}. ayet bulunamadı.`);
    }
  };

  if (tbGoBtn) tbGoBtn.addEventListener('click', jumpToVerseInCurrent);
  if (tbInput) {
    tbInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') jumpToVerseInCurrent();
    });
  }

  // Script Mode (Harekeli vs Yalın)
  const tbUth = document.getElementById('tb-mode-uthmani');
  const tbClean = document.getElementById('tb-mode-clean');
  if (tbUth && tbClean) {
    tbUth.addEventListener('click', () => {
      AppState.readerMode.scriptType = 'uthmani';
      tbUth.classList.add('active');
      tbClean.classList.remove('active');
      const bV = document.getElementById('btn-mode-vocalized');
      const bU = document.getElementById('btn-mode-unvocalized');
      if (bV) bV.classList.add('active');
      if (bU) bU.classList.remove('active');
      if (AppState.currentSurahData) renderVersesStream(AppState.currentSurahData.verses);
    });
    tbClean.addEventListener('click', () => {
      AppState.readerMode.scriptType = 'clean';
      tbClean.classList.add('active');
      tbUth.classList.remove('active');
      const bV = document.getElementById('btn-mode-vocalized');
      const bU = document.getElementById('btn-mode-unvocalized');
      if (bU) bU.classList.add('active');
      if (bV) bV.classList.remove('active');
      if (AppState.currentSurahData) renderVersesStream(AppState.currentSurahData.verses);
    });
  }

  // Layout Mode (Kelime Kelime vs Sülâsî Kök Modu vs Akıcı Mushaf)
  ['wbw', 'root', 'flowing'].forEach(l => {
    const tb = document.getElementById(`tb-layout-${l}`);
    if (tb) {
      tb.addEventListener('click', () => setReaderLayout(l));
    }
  });

  // Font Scaler
  const tbFontDec = document.getElementById('tb-btn-font-dec');
  const tbFontInc = document.getElementById('tb-btn-font-inc');
  if (tbFontDec && tbFontInc) {
    tbFontDec.addEventListener('click', () => {
      if (AppState.fontSize > 20) {
        AppState.fontSize -= 2;
        updateWorkspaceFontSize();
      }
    });
    tbFontInc.addEventListener('click', () => {
      if (AppState.fontSize < 56) {
        AppState.fontSize += 2;
        updateWorkspaceFontSize();
      }
    });
  }

  // Audio Play
  if (tbAudioBtn) {
    tbAudioBtn.addEventListener('click', () => {
      const heroPlayBtn = document.getElementById('btn-play-surah');
      if (heroPlayBtn) heroPlayBtn.click();
    });
  }

  // Inspector Toggle
  if (tbInspBtn) {
    tbInspBtn.addEventListener('click', () => {
      const floatingInsp = document.getElementById('btn-floating-inspector-toggle');
      if (floatingInsp) floatingInsp.click();
    });
  }

  // Keşif Toggle
  if (tbExpBtn) {
    tbExpBtn.addEventListener('click', () => {
      openExplorerDrawer();
    });
  }

  // Library Modal
  if (tbLibBtn) {
    tbLibBtn.addEventListener('click', () => {
      openLibraryModal();
    });
  }

  // Header Explorer Button
  const headerExpBtn = document.getElementById('btn-header-explorer');
  if (headerExpBtn) {
    headerExpBtn.addEventListener('click', () => {
      openExplorerDrawer();
    });
  }
}

function updateWorkspaceFontSize() {
  const fontValEl = document.getElementById('tb-font-size-val');
  const heroFontValEl = document.getElementById('font-size-val');
  if (fontValEl) fontValEl.innerText = `${AppState.fontSize}px`;
  if (heroFontValEl) heroFontValEl.innerText = `${AppState.fontSize}px`;
  document.documentElement.style.setProperty('--arabic-font-size', `${AppState.fontSize}px`);
  document.querySelectorAll('.verse-arabic-uthmani').forEach(el => {
    el.style.fontSize = `${AppState.fontSize}px`;
  });
}

function populateWorkspaceToolbarSurahSelect(surahs) {
  const tbSelect = document.getElementById('tb-surah-select');
  if (!tbSelect) return;
  tbSelect.innerHTML = '';
  surahs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.number;
    opt.innerText = `${s.number}. ${s.name_tr} (${s.name_ar})`;
    if (s.number === AppState.currentSurahId) opt.selected = true;
    tbSelect.appendChild(opt);
  });
}

// =================================================================
// 2. CONTEXTUAL LLM & QURANIC SIGN EXPLORER ENGINE (SIYAQ & SIBAK)
// =================================================================
function initSemanticExplorer() {
  const drawer = document.getElementById('explorer-drawer');
  const backdrop = document.getElementById('explorer-backdrop');
  const closeBtn = document.getElementById('btn-close-explorer');
  const searchInput = document.getElementById('exp-query-input');
  const searchBtn = document.getElementById('btn-exp-search');

  if (closeBtn) closeBtn.addEventListener('click', closeExplorerDrawer);
  if (backdrop) backdrop.addEventListener('click', closeExplorerDrawer);

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim();
      if (q) executeSignSearch(q);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) executeSignSearch(q);
      }
    });
  }

  // Concept Chips
  document.querySelectorAll('.exp-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const concept = chip.dataset.concept;
      if (searchInput) searchInput.value = concept;
      executeSignSearch(concept);
    });
  });
}

function openExplorerDrawer(initialQuery) {
  const drawer = document.getElementById('explorer-drawer');
  const backdrop = document.getElementById('explorer-backdrop');
  if (drawer && backdrop) {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  const input = document.getElementById('exp-query-input');
  if (initialQuery && input) {
    input.value = initialQuery;
    executeSignSearch(initialQuery);
  } else if (input) {
    input.focus();
  }
}

function closeExplorerDrawer() {
  const drawer = document.getElementById('explorer-drawer');
  const backdrop = document.getElementById('explorer-backdrop');
  if (drawer && backdrop) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
}

async function executeSignSearch(query) {
  const stage = document.getElementById('exp-results-stage');
  if (!stage) return;
  stage.innerHTML = `
    <div style="text-align:center; padding: 3rem 1rem;">
      <div class="loader-spinner" style="margin: 0 auto 1rem;"></div>
      <div style="color: var(--text-secondary); font-size:0.88rem; font-weight:600;">Bağlamsal Siyaq ve Sibak Ayet Akışı Çözümleniyor...</div>
      <div style="color: var(--text-muted); font-size:0.75rem; margin-top:0.3rem;">Morfolojik kökler ve tematik hikmet haritası çıkarılıyor</div>
    </div>
  `;

  try {
    const res = await fetch(`/api/explore?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderExplorerResults(data);
  } catch (err) {
    stage.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;">Bağlamsal keşif motoru sorgulanırken hata oluştu.</div>`;
  }
}

function renderExplorerResults(data) {
  const stage = document.getElementById('exp-results-stage');
  if (!stage) return;

  let html = `
    <div class="exp-result-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.85rem; margin-bottom: 1rem;">
      <div style="font-size: 0.72rem; color:#10b981; font-weight:800; letter-spacing:0.05em; text-transform:uppercase;">KEŞİF & İŞARET ANALİZİ</div>
      <h3 style="margin:0.25rem 0 0.5rem; font-size:1.15rem; color:var(--gold-light);">${escapeHtml(data.thematic_title)}</h3>
      <p style="margin:0; font-size:0.84rem; color:var(--text-secondary); line-height:1.5;">${escapeHtml(data.context_notes)}</p>
    </div>
  `;

  // Morfolojik Kök Analizi (İştikak)
  if (data.roots_breakdown && data.roots_breakdown.length > 0) {
    html += `
      <div style="margin-bottom: 1rem;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.4rem;">🌱 MORFOLOJİK KÖK ANALİZİ (İŞTİKAK):</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem;">
    `;
    data.roots_breakdown.forEach(r => {
      html += `
        <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:0.6rem 0.75rem;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.25rem;">
            <span style="font-family:var(--font-uthmani); font-size:1.1rem; color:var(--gold-primary);">${r.root}</span>
            <span style="font-size:0.7rem; font-weight:700; background:rgba(245,158,11,0.15); color:var(--gold-light); padding:0.1rem 0.35rem; border-radius:4px;">${r.translit}</span>
          </div>
          <div style="font-size:0.78rem; font-weight:600; color:var(--text-primary);">${escapeHtml(r.meaning)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem;">${escapeHtml(r.detail)}</div>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  // Clusters: Siyaq (n-1), Target (n), Sibak (n+1)
  if (data.clusters && data.clusters.length > 0) {
    html += `<div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.6rem;">📜 SİYAQ & SİBAK BAĞLAMSAL AYET KÜMELERİ:</div>`;
    data.clusters.forEach(c => {
      html += `
        <div class="exp-cluster-card">
          <div class="exp-cluster-header">
            <div class="exp-cluster-title">${escapeHtml(c.cluster_name)} (${c.surah_name_tr} ${c.target_verse_number}. Ayet Odaklı)</div>
            <button class="tb-btn primary" onclick="loadSurah(${c.surah_number}); closeExplorerDrawer();" style="padding:0.25rem 0.6rem; font-size:0.74rem;">Sureye Git</button>
          </div>
      `;

      // Siyaq
      if (c.siyaq) {
        html += `
          <div class="triad-box siyaq">
            <div class="triad-role">🔵 ${escapeHtml(c.siyaq.role)} (Ayet ${c.siyaq.verse_number})</div>
            <div class="triad-arabic">${c.siyaq.text_uthmani}</div>
            <div class="triad-trans">${escapeHtml(c.siyaq.translation_tr)}</div>
          </div>
        `;
      }

      // Target
      if (c.target) {
        html += `
          <div class="triad-box target">
            <div class="triad-role">⭐ ${escapeHtml(c.target.role)} (Ayet ${c.target.verse_number})</div>
            <div class="triad-arabic" style="font-size:1.45rem; color:var(--gold-light);">${c.target.text_uthmani}</div>
            <div class="triad-trans" style="font-weight:600; color:var(--text-primary); margin-bottom:0.4rem;">${escapeHtml(c.target.translation_tr)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Elmalılı: ${escapeHtml(c.target.translation_yazir || '')}</div>
          </div>
        `;
      }

      // Sibak
      if (c.sibak) {
        html += `
          <div class="triad-box sibak">
            <div class="triad-role">🟢 ${escapeHtml(c.sibak.role)} (Ayet ${c.sibak.verse_number})</div>
            <div class="triad-arabic">${c.sibak.text_uthmani}</div>
            <div class="triad-trans">${escapeHtml(c.sibak.translation_tr)}</div>
          </div>
        `;
      }

      if (c.cluster_notes) {
        html += `<div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; margin-top:0.5rem; line-height:1.4;">${escapeHtml(c.cluster_notes)}</div>`;
      }

      html += `</div>`;
    });
  }

  // Hermeneutic Synthesis
  if (data.hermeneutic_synthesis) {
    html += `
      <div class="exp-synthesis-box">
        <div style="font-weight:700; color:#34d399; margin-bottom:0.35rem; font-size:0.82rem;">💎 SEMANTİK & DERÛNÎ HİKMET SENTEZİ:</div>
        <div>${escapeHtml(data.hermeneutic_synthesis)}</div>
      </div>
    `;
  }

  stage.innerHTML = html;
}

// =================================================================
// 3. DYNAMIC LIBRARY & COMPARATIVE EXEGESIS ARCHITECTURE
// =================================================================
AppState.activeLibrarySources = ['meal_diyanet_tr', 'meal_yazir_tr', 'meal_sahih_en', 'tefsir_celaleyn_ar'];

function initDynamicLibrary() {
  const modal = document.getElementById('library-modal');
  const closeBtn = document.getElementById('btn-close-library-modal');
  const applyBtn = document.getElementById('btn-apply-library-sources');

  if (closeBtn) closeBtn.addEventListener('click', closeLibraryModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLibraryModal();
    });
  }

  // Type filter buttons
  document.querySelectorAll('#lib-type-filter .lib-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lib-type-filter .lib-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterLibrarySources(btn.dataset.type);
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      closeLibraryModal();
      showToast('Kütüphane ve karşılaştırmalı kaynaklar başarıyla güncellendi.');
      updateActiveSourcesBadge();
    });
  }

  updateActiveSourcesBadge();
}

function updateActiveSourcesBadge() {
  const badge = document.getElementById('tb-active-sources-count');
  if (badge) {
    badge.innerText = `${AppState.activeLibrarySources.length} Kaynak`;
  }
}

async function openLibraryModal() {
  const modal = document.getElementById('library-modal');
  if (!modal) return;
  modal.classList.add('open');

  const grid = document.getElementById('lib-sources-grid');
  grid.innerHTML = `<div class="loader-spinner" style="margin: 2rem auto;"></div>`;

  try {
    const res = await fetch('/api/library/sources');
    const data = await res.json();
    AppState.allLibrarySources = data.sources || [];
    renderLibrarySourcesGrid(AppState.allLibrarySources);
    renderComparativePreview(AppState.currentSurahId, 1);
  } catch (err) {
    grid.innerHTML = `<div style="color:#f87171; padding:1rem;">Kütüphane kaynakları yüklenemedi.</div>`;
  }
}

function closeLibraryModal() {
  const modal = document.getElementById('library-modal');
  if (modal) modal.classList.remove('open');
}

function filterLibrarySources(type) {
  if (!AppState.allLibrarySources) return;
  const filtered = (type === 'all') 
    ? AppState.allLibrarySources 
    : AppState.allLibrarySources.filter(s => s.type === type);
  renderLibrarySourcesGrid(filtered);
}

function renderLibrarySourcesGrid(sources) {
  const grid = document.getElementById('lib-sources-grid');
  if (!grid) return;
  grid.innerHTML = '';

  sources.forEach(s => {
    const isChecked = AppState.activeLibrarySources.includes(s.id);
    const card = document.createElement('label');
    card.className = 'lib-source-card';
    card.innerHTML = `
      <input type="checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} />
      <div class="lib-source-info">
        <div class="lib-source-name">${escapeHtml(s.name)}</div>
        <div class="lib-source-meta">
          <span style="text-transform:uppercase; font-weight:700; color:var(--gold-primary);">${s.type}</span> • 
          <span>${escapeHtml(s.author)}</span> • 
          <span style="font-weight:600;">[${s.lang_code}]</span>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!AppState.activeLibrarySources.includes(s.id)) {
          AppState.activeLibrarySources.push(s.id);
        }
      } else {
        AppState.activeLibrarySources = AppState.activeLibrarySources.filter(id => id !== s.id);
      }
      renderComparativePreview(AppState.currentSurahId, 1);
      updateActiveSourcesBadge();
    });

    grid.appendChild(card);
  });
}

async function renderComparativePreview(surahId, verseId) {
  const stream = document.getElementById('lib-comparisons-stream');
  const targetLabel = document.getElementById('lib-preview-verse-target');
  if (!stream) return;

  const surahName = AppState.currentSurahData ? AppState.currentSurahData.name_tr : `Sure ${surahId}`;
  if (targetLabel) targetLabel.innerText = `${surahName} ${verseId}. Ayet`;

  if (AppState.activeLibrarySources.length === 0) {
    stream.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem;">Karşılaştırma için en az bir kaynak seçin.</div>`;
    return;
  }

  stream.innerHTML = `<div class="loader-spinner" style="margin: 1rem auto;"></div>`;

  try {
    const sourcesParam = AppState.activeLibrarySources.join(',');
    const res = await fetch(`/api/library/compare?surah=${surahId}&verse=${verseId}&sources=${encodeURIComponent(sourcesParam)}`);
    const data = await res.json();
    
    stream.innerHTML = '';
    (data.comparisons || []).forEach(comp => {
      const card = document.createElement('div');
      card.className = 'lib-comp-card';
      card.innerHTML = `
        <div class="lib-comp-source-name">📚 ${escapeHtml(comp.source_name)} [${comp.lang_code}]</div>
        <div class="lib-comp-text">${escapeHtml(comp.content)}</div>
      `;
      stream.appendChild(card);
    });
  } catch (e) {
    stream.innerHTML = `<div style="color:#f87171; font-size:0.8rem;">Karşılaştırmalı meal verisi yüklenirken hata.</div>`;
  }
}


// =================================================================
// 4-LAYER MORPHOLOGY, DIALECTIC HELPERS & INSPECTOR SUBTABS
// =================================================================

function cleanArabicDiacriticsClient(text) {
  if (!text) return '';
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').trim();
}

function extractArabicRootClient(text) {
  if (!text) return '-';
  const clean = cleanArabicDiacriticsClient(text);
  const bare = clean.replace(/[^ء-ي]/g, '');
  if (bare.length === 3) {
    return bare.split('').join('-');
  }
  return '-';
}

function breakoutLettersClient(text) {
  if (!text) return [];
  const clean = cleanArabicDiacriticsClient(text).replace(/[^ء-ي]/g, '');
  const letters = clean.split('');
  const n = letters.length;
  return letters.map((ch, idx) => {
    let pos = 'body';
    if (idx === 0) pos = 'baş';
    else if (idx === n - 1) pos = 'hitam';
    else if (n % 2 === 1 && idx === Math.floor(n / 2)) pos = 'vasat';
    else if (n % 2 === 0 && (idx === n / 2 - 1 || idx === n / 2)) pos = 'vasat';

    const abjad = ABJAD_TABLE[ch] || 0;
    return {
      char: ch,
      name: typeof getArabicLetterName === 'function' ? getArabicLetterName(ch) : ch,
      abjad: abjad,
      position: pos,
      is_prime: isPrimeNumber(abjad)
    };
  });
}

function switchInspectorSubtab(tabName) {
  if (!tabName) tabName = 'morphology';
  AppState.mathInspector.activeSubtab = tabName;

  // Toggle active class on tab buttons
  document.querySelectorAll('.insp-subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.inspTab === tabName);
  });

  // Toggle active/hidden on panes
  const panes = {
    morphology: document.getElementById('insp-pane-morphology'),
    tefsir: document.getElementById('insp-pane-tefsir'),
    hadith: document.getElementById('insp-pane-hadith'),
    reflection: document.getElementById('insp-pane-reflection')
  };

  Object.keys(panes).forEach(k => {
    const pane = panes[k];
    if (pane) {
      if (k === tabName) {
        pane.classList.add('active');
        pane.classList.remove('hidden');
      } else {
        pane.classList.remove('active');
        pane.classList.add('hidden');
      }
    }
  });

  // Load contextual data for target tab
  const v = AppState.mathInspector.activeVerse;
  const w = AppState.mathInspector.activeWord;
  const sNum = v ? (v.surah_id || AppState.currentSurahId) : AppState.currentSurahId;
  const vNum = v ? (v.verse_number || 1) : 1;

  if (tabName === 'tefsir') {
    loadInspectorTefsir(sNum, vNum);
  } else if (tabName === 'hadith') {
    loadInspectorHadiths(sNum, vNum);
  } else if (tabName === 'reflection') {
    loadInspectorReflections(sNum, vNum, w);
  }
}

async function loadInspectorTefsir(surahNum, verseNum) {
  const titleEl = document.getElementById('insp-tefsir-title');
  const badgeEl = document.getElementById('insp-tefsir-ayah-badge');
  const authorEl = document.getElementById('insp-tefsir-author');
  const nuzulEl = document.getElementById('insp-tefsir-nuzul');
  const contentEl = document.getElementById('insp-tefsir-content');

  if (badgeEl) badgeEl.innerText = `[${surahNum}:${verseNum}]`;
  if (contentEl) contentEl.innerHTML = `<div class="loader-spinner" style="margin:1.5rem auto;"></div>`;

  try {
    const res = await fetch(`/api/tefsir/${surahNum}/${verseNum}`);
    const data = await res.json();

    if (titleEl) titleEl.innerText = `${data.source_name || "Diyanet Kur'an Yolu Tefsiri"}`;
    if (authorEl) authorEl.innerText = data.author || "Diyanet İşleri Heyeti";
    if (nuzulEl) nuzulEl.innerText = data.nuzul || "Bu ayet için özel nüzul sebebi kaydı bulunmamaktadır.";
    
    if (contentEl) {
      const paragraphs = (data.content || '').split('\n\n').filter(p => p.trim());
      if (paragraphs.length > 0) {
        contentEl.innerHTML = paragraphs.map(p => `<p class="tefsir-p">${escapeHtml(p)}</p>`).join('');
      } else {
        contentEl.innerHTML = `<p class="tefsir-p">${escapeHtml(data.content || 'Tefsir açıklaması bulunamadı.')}</p>`;
      }
    }
  } catch (err) {
    if (contentEl) contentEl.innerHTML = `<div style="color:#f87171; padding:1rem;">Diyanet tefsiri yüklenirken hata oluştu.</div>`;
  }
}

async function loadInspectorHadiths(surahNum, verseNum) {
  const streamEl = document.getElementById('insp-hadith-stream');
  if (!streamEl) return;
  streamEl.innerHTML = `<div class="loader-spinner" style="margin:1.5rem auto;"></div>`;

  try {
    const res = await fetch(`/api/hadith/related?surah=${surahNum}&verse=${verseNum}`);
    const data = await res.json();
    const hadiths = data.hadiths || [];

    if (hadiths.length === 0) {
      streamEl.innerHTML = `
        <div class="hadith-empty-notice">
          <p>Bu ayetle [${surahNum}:${verseNum}] doğrudan eşleşen Sahihayn hadisi bulunamadı.</p>
          <button class="btn-goto-hadith-lib" onclick="switchTab('hadith')">Hadis Kütüphanesinde Ara</button>
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    hadiths.forEach(h => {
      const collClass = h.collection === 'bukhari' ? 'bukhari' : 'muslim';
      const exactBadge = h.is_exact_verse_match ? `<span class="badge-mini" style="background:var(--emerald-deep); color:#fff; padding:2px 6px; border-radius:4px;">Tam Âyet Eşleşmesi</span>` : '';
      cardsHtml += `
        <div class="insp-hadith-card">
          <div class="hadith-card-header">
            <span class="hadith-coll-badge ${collClass}">${escapeHtml(h.collection_title)}</span>
            <span class="hadith-num-badge">No: ${h.hadith_number}</span>
            ${exactBadge}
          </div>
          <div class="hadith-book-bab">${escapeHtml(h.book_name_tr)}</div>
          <div class="hadith-narrator-line">🎙️ <strong>Râvi:</strong> ${escapeHtml(h.narrator)}</div>
          <div class="hadith-card-ar">${escapeHtml(h.arabic_text)}</div>
          <div class="hadith-card-tr"><strong>🇹🇷 Tercüme:</strong> ${escapeHtml(h.translation_tr)}</div>
          ${h.translation_en ? `<div class="hadith-card-en"><strong>🇬🇧 English:</strong> ${escapeHtml(h.translation_en)}</div>` : ''}
          <div class="hadith-card-actions">
            <button class="btn-hadith-inspect-words" onclick="inspectHadithSentence('${escapeHtml(h.arabic_text.replace(/'/g, "\\'"))}')">
              🔍 Hadis Kelimelerini İncele
            </button>
          </div>
        </div>
      `;
    });

    streamEl.innerHTML = cardsHtml;
  } catch (err) {
    streamEl.innerHTML = `<div style="color:#f87171; padding:1rem;">İlgili hadisler yüklenemedi.</div>`;
  }
}

async function loadInspectorReflections(surahNum, verseNum, wordObj) {
  const lettersGrid = document.getElementById('insp-reflection-letters-grid');
  const mukattaaCard = document.getElementById('insp-mukattaa-card');
  const mukattaaBadge = document.getElementById('insp-mukattaa-letters-badge');
  const mukattaaText = document.getElementById('insp-mukattaa-text');
  const mukattaaMurakabe = document.getElementById('insp-mukattaa-murakabe');
  const principlesList = document.getElementById('insp-murakabe-principles-list');

  // 1. Fetch verse reflections (Mukatta'a + Sufi principles)
  try {
    const res = await fetch(`/api/reflections/verse/${surahNum}/${verseNum}`);
    const data = await res.json();

    if (data.mukattaa && mukattaaCard) {
      mukattaaCard.classList.remove('hidden');
      if (mukattaaBadge) mukattaaBadge.innerText = `${data.mukattaa.letters_clean} (Ebced: ${data.mukattaa.abjad_total})`;
      if (mukattaaText) mukattaaText.innerText = data.mukattaa.tefsir_ozeti || '';
      if (mukattaaMurakabe) {
        mukattaaMurakabe.innerHTML = `
          <strong style="color:var(--gold-light);">🌿 Murakabe & Tefekkür Boyutu:</strong>
          <p style="margin-top:0.3rem;">${escapeHtml(data.mukattaa.murakabe_boyutu || '')}</p>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;"><em>Kaynak: ${escapeHtml(data.mukattaa.kitap_referansi || '')}</em></div>
        `;
      }
    } else if (mukattaaCard) {
      mukattaaCard.classList.add('hidden');
    }

    if (data.principles && principlesList) {
      principlesList.innerHTML = data.principles.map(p => `
        <div class="murakabe-principle-item">
          <h5>✨ ${escapeHtml(p.ad)} [${escapeHtml(p.ar)}]</h5>
          <p>${escapeHtml(p.izah)}</p>
          <div class="principle-sub"><em>Makam: ${escapeHtml(p.makam || '')} • Vird: ${escapeHtml(p.zikir || '')}</em></div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.warn('Verse reflection error:', e);
  }

  // 2. Fetch letter secrets for unique letters in wordObj
  if (lettersGrid && wordObj) {
    lettersGrid.innerHTML = `<div class="loader-spinner" style="margin:1rem auto;"></div>`;
    const cleanWord = wordObj.clean_bare || (typeof cleanArabicDiacriticsClient === 'function' ? cleanArabicDiacriticsClient(wordObj.clean || wordObj.uth) : (wordObj.clean || wordObj.uth));
    const uniqueChars = Array.from(new Set(cleanWord.replace(/[\s\d]/g, '').split(''))).filter(ch => ch.trim());

    if (uniqueChars.length === 0) {
      lettersGrid.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">Harf bulunamadı.</div>`;
      return;
    }

    const cards = [];
    for (const ch of uniqueChars) {
      try {
        const lRes = await fetch(`/api/reflections/letter/${encodeURIComponent(ch)}`);
        const lData = await lRes.json();
        const l = lData.letter;
        if (l) {
          cards.push(`
            <div class="refl-letter-card" id="refl-card-${encodeURIComponent(ch)}">
              <div class="refl-header-row">
                <span class="refl-letter-char">${l.char}</span>
                <div class="refl-letter-info">
                  <div class="refl-letter-title">${escapeHtml(l.name)} Harfi • Ebced: <strong>${l.abjad_kebir}</strong></div>
                  <div class="refl-letter-element">🔥 Unsur: ${escapeHtml(l.element)}</div>
                </div>
              </div>
              <div class="refl-row"><strong>👼 Meleki Felek:</strong> ${escapeHtml(l.angelic_sphere)}</div>
              <div class="refl-row"><strong>📿 İsm-i Şerîf:</strong> ${escapeHtml(l.esma_irtibati)} (Zikir: ${l.zikir_adedi})</div>
              <div class="refl-nur-box"><strong>🌟 Nur Muhammad Hakikati:</strong> ${escapeHtml(l.nurmuhammad_reality)}</div>
              <div class="refl-murakabe-text"><strong>🕊️ Murakabe Notu:</strong> ${escapeHtml(l.tefekkur_notu)}</div>
            </div>
          `);
        }
      } catch (err) {
        console.warn('Letter reflection load error:', err);
      }
    }

    lettersGrid.innerHTML = cards.join('') || `<div style="color:var(--text-muted); font-size:0.85rem;">Harf sırrı bilgisi bulunamadı.</div>`;
  }
}

async function loadInspectorLetterSecret(char) {
  const lettersGrid = document.getElementById('insp-reflection-letters-grid');
  if (!lettersGrid) return;
  const existingCard = document.getElementById(`refl-card-${encodeURIComponent(char)}`);
  if (existingCard) {
    existingCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    existingCard.classList.add('spotlight-pulse');
    setTimeout(() => existingCard.classList.remove('spotlight-pulse'), 1500);
    return;
  }

  try {
    const res = await fetch(`/api/reflections/letter/${encodeURIComponent(char)}`);
    const data = await res.json();
    const l = data.letter;
    if (l) {
      const cardHtml = `
        <div class="refl-letter-card spotlight-pulse" id="refl-card-${encodeURIComponent(char)}">
          <div class="refl-header-row">
            <span class="refl-letter-char">${l.char}</span>
            <div class="refl-letter-info">
              <div class="refl-letter-title">${escapeHtml(l.name)} Harfi • Ebced: <strong>${l.abjad_kebir}</strong></div>
              <div class="refl-letter-element">🔥 Unsur: ${escapeHtml(l.element)}</div>
            </div>
          </div>
          <div class="refl-row"><strong>👼 Meleki Felek:</strong> ${escapeHtml(l.angelic_sphere)}</div>
          <div class="refl-row"><strong>📿 İsm-i Şerîf:</strong> ${escapeHtml(l.esma_irtibati)} (Zikir: ${l.zikir_adedi})</div>
          <div class="refl-nur-box"><strong>🌟 Nur Muhammad Hakikati:</strong> ${escapeHtml(l.nurmuhammad_reality)}</div>
          <div class="refl-murakabe-text"><strong>🕊️ Murakabe Notu:</strong> ${escapeHtml(l.tefekkur_notu)}</div>
        </div>
      `;
      lettersGrid.insertAdjacentHTML('afterbegin', cardHtml);
    }
  } catch (e) {
    console.warn('Load letter secret error:', e);
  }
}

async function inspectHadithSentence(sentence) {
  try {
    const res = await fetch('/api/delail/analyze-phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase: sentence })
    });
    const data = await res.json();
    if (data.words && data.words.length > 0) {
      const firstWord = data.words[0];
      firstWord.position = 'start';
      firstWord.idx = 1;
      firstWord.word_total = data.words.length;
      openInspectorDrawer();
      switchInspectorSubtab('morphology');
      inspectWord(firstWord, { key: "Hadis / Vird", text_uthmani: sentence, words: data.words });
    }
  } catch (err) {
    showToast('Kelime analizi açılamadı.');
  }
}


// =================================================================
// HADİTH MODULE (SAHİH-İ BUHÂRÎ & SAHİH-İ MÜSLİM - SAHİHAYN)
// =================================================================

function initHadithModule() {
  // Check Sunnah API connection status
  checkSunnahApiStatus();

  // Collection pills
  document.querySelectorAll('.hadith-coll-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hadith-coll-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.hadith.activeCollection = btn.dataset.coll;
      AppState.hadith.activeBook = null;
      loadHadithStream();
    });
  });

  // Search input & button
  const searchInput = document.getElementById('hadith-search-input');
  const searchBtn = document.getElementById('btn-hadith-search-submit');

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      AppState.hadith.searchQuery = (searchInput ? searchInput.value : '').trim();
      AppState.hadith.activeBook = null;
      loadHadithStream();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        AppState.hadith.searchQuery = searchInput.value.trim();
        AppState.hadith.activeBook = null;
        loadHadithStream();
      }
    });
  }
}

async function loadHadithModule() {
  if (AppState.hadith.loaded) {
    loadHadithStream();
    return;
  }

  const booksListEl = document.getElementById('hadith-books-list');
  if (booksListEl) booksListEl.innerHTML = `<div class="loader-spinner" style="margin:2rem auto;"></div>`;

  try {
    const res = await fetch('/api/hadith/collections');
    const data = await res.json();
    AppState.hadith.collections = data.collections || [];
    AppState.hadith.loaded = true;

    renderHadithBooksSidebar(AppState.hadith.collections);
    loadHadithStream();
  } catch (err) {
    if (booksListEl) booksListEl.innerHTML = `<div style="color:#f87171; padding:1rem;">Koleksiyonlar yüklenemedi.</div>`;
  }
}

function renderHadithBooksSidebar(collections) {
  const booksListEl = document.getElementById('hadith-books-list');
  if (!booksListEl) return;
  booksListEl.innerHTML = '';

  collections.forEach(coll => {
    const section = document.createElement('div');
    section.className = 'hadith-sidebar-section';
    section.innerHTML = `
      <div class="hadith-sidebar-coll-title">
        <span>${escapeHtml(coll.name_tr)}</span>
        <span class="badge-mini">${coll.total_count} Hadis</span>
      </div>
      <div class="hadith-sidebar-coll-books" id="books-group-${coll.id}"></div>
    `;

    const groupEl = section.querySelector(`#books-group-${coll.id}`);
    (coll.books || []).forEach(b => {
      const bItem = document.createElement('div');
      bItem.className = 'hadith-book-item';
      bItem.innerHTML = `
        <span class="h-book-num">${b.number}</span>
        <span class="h-book-name">${escapeHtml(b.name_tr)}</span>
      `;
      bItem.addEventListener('click', () => {
        document.querySelectorAll('.hadith-book-item').forEach(i => i.classList.remove('active'));
        bItem.classList.add('active');
        AppState.hadith.activeCollection = coll.id;
        AppState.hadith.activeBook = b.number;
        loadHadithByBook(coll.id, b.number);
      });
      groupEl.appendChild(bItem);
    });

    booksListEl.appendChild(section);
  });
}

async function loadHadithByBook(collection, bookNumber) {
  const streamEl = document.getElementById('hadith-cards-stream');
  if (!streamEl) return;
  streamEl.innerHTML = `<div class="loader-spinner" style="margin:2rem auto;"></div>`;

  try {
    const res = await fetch(`/api/hadith/${collection}?book=${bookNumber}`);
    const data = await res.json();
    renderHadithCards(data.hadiths || [], streamEl);
  } catch (err) {
    streamEl.innerHTML = `<div style="color:#f87171; padding:2rem;">Hadisler yüklenemedi.</div>`;
  }
}

async function loadHadithStream() {
  const streamEl = document.getElementById('hadith-cards-stream');
  if (!streamEl) return;
  streamEl.innerHTML = `<div class="loader-spinner" style="margin:2rem auto;"></div>`;

  try {
    const coll = AppState.hadith.activeCollection || 'all';
    const q = encodeURIComponent(AppState.hadith.searchQuery || '');
    const res = await fetch(`/api/hadith/search?query=${q}&collection=${coll}`);
    const data = await res.json();
    renderHadithCards(data.results || [], streamEl);
  } catch (err) {
    streamEl.innerHTML = `<div style="color:#f87171; padding:2rem;">Hadis arama sonuçları yüklenemedi.</div>`;
  }
}

function renderHadithCards(hadiths, container) {
  if (!container) return;
  if (!hadiths || hadiths.length === 0) {
    container.innerHTML = `
      <div class="hadith-workspace-empty">
        <h4>Arama kriterine uygun hadis bulunamadı</h4>
        <p>Lütfen farklı bir anahtar kelime veya bâb seçerek tekrar deneyin.</p>
      </div>
    `;
    return;
  }

  const cardsHtml = hadiths.map(h => {
    const rawColl = (h.collection || 'bukhari').toLowerCase();
    let collClass = 'bukhari';
    if (rawColl.includes('muslim')) collClass = 'muslim';
    else if (rawColl.includes('dawud')) collClass = 'abudawud';
    else if (rawColl.includes('tirmidhi')) collClass = 'tirmidhi';
    else if (rawColl.includes('nasai')) collClass = 'nasai';
    else if (rawColl.includes('majah')) collClass = 'ibnmajah';
    else if (rawColl.includes('nawawi')) collClass = 'nawawi';

    const collTitle = h.collection_title || (collClass.charAt(0).toUpperCase() + collClass.slice(1));
    const bookTitle = h.book_name_tr || h.book_name_ar || h.book || 'Hadis-i Şerîf';
    const narratorTxt = h.narrator || 'Râvi-i Şerîf';

    return `
      <article class="hadith-card-item hadith-card-full">
        <div class="hadith-card-header hadith-card-top">
          <div class="hadith-header-left">
            <span class="hadith-coll-badge ${collClass}">📖 ${escapeHtml(collTitle)}</span>
            <span class="hadith-num-badge">No: ${h.hadith_number}</span>
            <span class="hadith-book-badge">${escapeHtml(bookTitle)}</span>
          </div>
          <div class="hadith-header-right">
            <span class="hadith-narrator-badge hadith-narrator-txt">🎙️ ${escapeHtml(narratorTxt)}</span>
          </div>
        </div>

        <div class="hadith-arabic-text hadith-ar-matn" dir="rtl">
          ${escapeHtml(h.arabic_text)}
        </div>

        <div class="hadith-translation-block hadith-tr-matn tr">
          <span class="hadith-trans-lbl">🇹🇷 Türkçe Tercüme & İzah:</span>
          <p class="hadith-trans-text">${escapeHtml(h.translation_tr)}</p>
        </div>

        ${h.translation_en ? `
          <div class="hadith-translation-block hadith-en-matn en">
            <span class="hadith-trans-lbl">🇬🇧 English Translation:</span>
            <p class="hadith-trans-text">${escapeHtml(h.translation_en)}</p>
          </div>
        ` : ''}

        <div class="hadith-card-footer hadith-actions-row">
          <button class="btn-hadith-action btn-hadith-analyze" onclick="inspectHadithSentence('${escapeHtml(h.arabic_text.replace(/'/g, "\\'"))}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span>Kelimeleri & Kökleri İncele</span>
          </button>
          <button class="btn-hadith-action btn-hadith-copy" onclick="copyHadithText('${escapeHtml(collTitle.replace(/'/g, "\\'"))}', ${h.hadith_number}, '${escapeHtml(h.arabic_text.replace(/'/g, "\\'"))}', '${escapeHtml(h.translation_tr.replace(/'/g, "\\'"))}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Hadisi Kopyala</span>
          </button>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = cardsHtml;
}

function copyHadithText(collTitle, num, arabic, turkish) {
  const text = `[${collTitle} - No: ${num}]\n\n${arabic}\n\n${turkish}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${collTitle} #${num} panoya kopyalandı.`);
  });
}

// =================================================================
// SUNNAH.COM DEVELOPER API & LIVE HADITH EXPLORER
// =================================================================

let sunnahApiStatus = {
  has_key: false,
  key_masked: '',
  portal_url: 'https://sunnah.com/developers'
};

async function checkSunnahApiStatus() {
  try {
    const res = await fetch('/api/hadith/sunnah/status');
    const data = await res.json();
    sunnahApiStatus = data;

    const dotEl = document.getElementById('sunnah-status-dot');
    if (dotEl) {
      if (data.has_key) {
        dotEl.classList.add('has-key');
        dotEl.title = `Sunnah.com X-API-KEY Aktif (${data.key_masked})`;
      } else {
        dotEl.classList.remove('has-key');
        dotEl.title = 'Açık CDN Mirror Aktif (Anahtar Girilmedi)';
      }
    }

    const badgeEl = document.getElementById('sunnah-modal-status-badge');
    if (badgeEl) {
      if (data.has_key) {
        badgeEl.textContent = `Resmi API Aktif (${data.key_masked})`;
        badgeEl.className = 'modal-badge-emerald';
      } else {
        badgeEl.textContent = 'Açık CDN Aktif (Anahtarsız)';
        badgeEl.className = 'modal-badge-gold';
      }
    }

    const inputEl = document.getElementById('sunnah-api-key-input');
    if (inputEl && data.has_key) {
      inputEl.placeholder = data.key_masked || 'API Anahtarı Tanımlı';
    }
  } catch (err) {
    console.warn('Sunnah API durumu kontrol edilemedi:', err);
  }
}

function openSunnahApiModal() {
  const modal = document.getElementById('sunnah-api-modal');
  if (modal) {
    modal.classList.remove('hidden');
    checkSunnahApiStatus();
  }
}

function closeSunnahApiModal() {
  const modal = document.getElementById('sunnah-api-modal');
  if (modal) modal.classList.add('hidden');
}

function toggleSunnahKeyVisibility() {
  const inputEl = document.getElementById('sunnah-api-key-input');
  if (!inputEl) return;
  inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
}

async function saveSunnahApiKey() {
  const inputEl = document.getElementById('sunnah-api-key-input');
  const msgEl = document.getElementById('sunnah-key-status-msg');
  if (!inputEl) return;

  const keyVal = inputEl.value.trim();
  if (!keyVal) {
    if (msgEl) {
      msgEl.textContent = 'Lütfen geçerli bir anahtar girin veya "Temizle"ye tıklayın.';
      msgEl.style.color = '#f87171';
    }
    return;
  }

  try {
    const res = await fetch('/api/hadith/sunnah/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: keyVal })
    });
    const result = await res.json();

    if (result.success) {
      showToast('Sunnah.com API Anahtarı başarıyla kaydedildi.');
      inputEl.value = '';
      if (msgEl) {
        msgEl.textContent = '✓ Anahtar kaydedildi ve aktif hale getirildi.';
        msgEl.style.color = '#34d399';
      }
      checkSunnahApiStatus();
    } else {
      if (msgEl) {
        msgEl.textContent = result.message || 'Kaydetme başarısız.';
        msgEl.style.color = '#f87171';
      }
    }
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = 'Sunucuya bağlanılamadı.';
      msgEl.style.color = '#f87171';
    }
  }
}

async function clearSunnahApiKey() {
  const inputEl = document.getElementById('sunnah-api-key-input');
  const msgEl = document.getElementById('sunnah-key-status-msg');
  if (inputEl) inputEl.value = '';

  try {
    const res = await fetch('/api/hadith/sunnah/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: '' })
    });
    const result = await res.json();
    showToast('Sunnah.com API Anahtarı temizlendi. CDN modu devrede.');
    if (msgEl) {
      msgEl.textContent = 'Anahtar temizlendi. Sistem açık CDN moduna döndü.';
      msgEl.style.color = '#94a3b8';
    }
    checkSunnahApiStatus();
  } catch (err) {
    console.error(err);
  }
}

function onSunnahCollectionChange() {
  const collSelect = document.getElementById('sunnah-exp-coll');
  const bookInput = document.getElementById('sunnah-exp-book');
  if (!collSelect || !bookInput) return;

  const coll = collSelect.value;
  if (coll === 'nawawi40') {
    bookInput.value = 1;
    bookInput.disabled = true;
  } else {
    bookInput.disabled = false;
  }
}

async function fetchLiveSunnahHadiths() {
  const collSelect = document.getElementById('sunnah-exp-coll');
  const bookInput = document.getElementById('sunnah-exp-book');
  const limitSelect = document.getElementById('sunnah-exp-limit');
  const resultsContainer = document.getElementById('sunnah-live-results');

  if (!resultsContainer) return;

  const coll = collSelect ? collSelect.value : 'bukhari';
  const book = bookInput ? (parseInt(bookInput.value) || 1) : 1;
  const limit = limitSelect ? (parseInt(limitSelect.value) || 5) : 5;

  resultsContainer.innerHTML = `<div class="loader-spinner" style="margin:2rem auto;"></div>`;

  try {
    const url = `/api/hadith/sunnah/hadiths?collection=${coll}&book=${book}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();

    const items = data.data || [];
    if (items.length === 0) {
      resultsContainer.innerHTML = `
        <div class="sunnah-empty-callout">
          Bu koleksiyon veya kitap numarası için sonuç bulunamadı. Lütfen kitap numarasını (Örn: 1) kontrol edin.
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    items.forEach(it => {
      const hNumber = it.hadithNumber || '?';
      const hadithList = it.hadith || [];
      const arObj = hadithList.find(x => x.lang === 'ar') || {};
      const enObj = hadithList.find(x => x.lang === 'en') || {};

      const arText = arObj.body || '(Arapça metin çekilemedi)';
      const enText = enObj.body || '';

      cardsHtml += `
        <div class="sunnah-result-card">
          <div class="sunnah-rc-header">
            <span class="sunnah-rc-coll">${escapeHtml(coll.toUpperCase())}</span>
            <span class="sunnah-rc-num">Hadis No: ${hNumber}</span>
          </div>
          <div class="sunnah-rc-ar" dir="rtl">${escapeHtml(arText)}</div>
          ${enText ? `<div class="sunnah-rc-en"><strong>İngilizce Çeviri (Sunnah.com):</strong> ${escapeHtml(enText)}</div>` : ''}
          <div class="sunnah-rc-actions">
            <button class="btn-hadith-action" onclick="inspectHadithSentence('${escapeHtml(arText.replace(/'/g, "\\'"))}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>Kelimeleri & Ebcedi Tahlil Et</span>
            </button>
            <button class="btn-hadith-action" onclick="copyHadithText('${escapeHtml(coll.toUpperCase())}', '${hNumber}', '${escapeHtml(arText.replace(/'/g, "\\'"))}', '${escapeHtml(enText.replace(/'/g, "\\'"))}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Metni Kopyala</span>
            </button>
          </div>
        </div>
      `;
    });

    resultsContainer.innerHTML = cardsHtml;
  } catch (err) {
    resultsContainer.innerHTML = `
      <div class="sunnah-empty-callout" style="color:#f87171;">
        Hadisler getirilirken bir hata oluştu: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

// =================================================================
// 1,248 KUR'ANİ KÖK SÖZLÜĞÜ (ROOT LEXICON & MORPHOLOGY ENGINE)
// =================================================================

const ARABIC_ALPHABET_28 = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
];

let rootsModuleInitialized = false;
let currentRootsFilter = {
  letter: '',
  query: '',
  sort: 'frequency'
};

function initRootsLexicon() {
  if (rootsModuleInitialized) return;
  rootsModuleInitialized = true;

  // 1. Render Alphabet Chips
  renderRootsAlphabetChips();

  // 2. Search & Filter Input Listeners
  const searchInput = document.getElementById('roots-search-input');
  const clearBtn = document.getElementById('btn-roots-clear-search');

  let debounceTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentRootsFilter.query = q;
        loadRootsLexicon();
      }, 250);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearBtn.style.display = 'none';
      currentRootsFilter.query = '';
      loadRootsLexicon();
    });
  }

  // 3. Sort Mode Toggles
  const sortFreqBtn = document.getElementById('sort-roots-freq');
  const sortAlphaBtn = document.getElementById('sort-roots-alpha');

  if (sortFreqBtn) {
    sortFreqBtn.addEventListener('click', () => {
      sortFreqBtn.classList.add('active');
      if (sortAlphaBtn) sortAlphaBtn.classList.remove('active');
      currentRootsFilter.sort = 'frequency';
      loadRootsLexicon();
    });
  }

  if (sortAlphaBtn) {
    sortAlphaBtn.addEventListener('click', () => {
      sortAlphaBtn.classList.add('active');
      if (sortFreqBtn) sortFreqBtn.classList.remove('active');
      currentRootsFilter.sort = 'alpha';
      loadRootsLexicon();
    });
  }

  // 4. Modal Close Listener (Kapatıldığında okunan Mushaf kısmına geri dön)
  const closeBtn = document.getElementById('btn-close-root-modal');
  const returnReaderBtn = document.getElementById('btn-root-return-reader');
  const returnHeroBtn = document.getElementById('btn-return-reader-hero');
  const modalEl = document.getElementById('root-dossier-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeRootDossierModal);
  }
  if (returnReaderBtn) {
    returnReaderBtn.addEventListener('click', returnToLastReadingPosition);
  }
  if (returnHeroBtn) {
    returnHeroBtn.addEventListener('click', returnToLastReadingPosition);
  }
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeRootDossierModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById('root-dossier-modal');
      if (m && !m.classList.contains('hidden')) {
        closeRootDossierModal();
      }
    }
  });

  // Load initial root lexicon
  loadRootsLexicon();
}

function renderRootsAlphabetChips() {
  const container = document.getElementById('roots-alphabet-chips');
  if (!container) return;

  container.innerHTML = '';

  // "Tümü" / All Chip
  const allChip = document.createElement('button');
  allChip.className = `alphabet-chip ${!currentRootsFilter.letter ? 'active' : ''}`;
  allChip.innerText = 'Tümü';
  allChip.style.fontSize = '0.78rem';
  allChip.style.fontFamily = 'inherit';
  allChip.addEventListener('click', () => {
    currentRootsFilter.letter = '';
    updateActiveAlphabetChip('');
    loadRootsLexicon();
  });
  container.appendChild(allChip);

  ARABIC_ALPHABET_28.forEach(ch => {
    const chip = document.createElement('button');
    const bareLetter = ch === 'هـ' ? 'ه' : ch;
    chip.className = `alphabet-chip ${currentRootsFilter.letter === bareLetter ? 'active' : ''}`;
    chip.innerText = ch;
    chip.setAttribute('data-letter', bareLetter);
    chip.addEventListener('click', () => {
      if (currentRootsFilter.letter === bareLetter) {
        currentRootsFilter.letter = '';
        updateActiveAlphabetChip('');
      } else {
        currentRootsFilter.letter = bareLetter;
        updateActiveAlphabetChip(bareLetter);
      }
      loadRootsLexicon();
    });
    container.appendChild(chip);
  });
}

function updateActiveAlphabetChip(selected) {
  document.querySelectorAll('.alphabet-chip').forEach(btn => {
    if (!selected && btn.innerText === 'Tümü') {
      btn.classList.add('active');
    } else {
      btn.classList.toggle('active', btn.getAttribute('data-letter') === selected);
    }
  });
}

async function loadRootsLexicon() {
  const grid = document.getElementById('roots-cards-grid');
  const statusState = document.getElementById('roots-status-state');
  const summaryBadge = document.getElementById('roots-summary-badge');

  if (grid) grid.innerHTML = '';
  if (statusState) {
    statusState.style.display = 'block';
    statusState.querySelector('.status-msg').innerText = 'Kökler yükleniyor...';
  }

  try {
    const params = new URLSearchParams();
    if (currentRootsFilter.letter) params.set('letter', currentRootsFilter.letter);
    if (currentRootsFilter.query) params.set('q', currentRootsFilter.query);
    params.set('sort', currentRootsFilter.sort || 'frequency');
    params.set('limit', '1500');

    const res = await fetch(`/api/roots?${params.toString()}`);
    const data = await res.json();

    if (statusState) statusState.style.display = 'none';

    if (summaryBadge) {
      summaryBadge.innerText = `${data.total.toLocaleString('tr-TR')} Kök Bulundu`;
    }

    if (!data.roots || data.roots.length === 0) {
      if (statusState) {
        statusState.style.display = 'block';
        statusState.querySelector('.status-spinner').style.display = 'none';
        statusState.querySelector('.status-msg').innerText = 'Arama kriterlerine uygun kök bulunamadı.';
      }
      return;
    }

    renderRootsCards(data.roots);
  } catch (err) {
    console.error('Kökler yüklenirken hata:', err);
    if (statusState) {
      statusState.style.display = 'block';
      statusState.querySelector('.status-spinner').style.display = 'none';
      statusState.querySelector('.status-msg').innerText = 'Kökler yüklenirken bir bağlantı hatası oluştu.';
    }
  }
}

function renderRootsCards(roots) {
  const grid = document.getElementById('roots-cards-grid');
  if (!grid) return;

  grid.innerHTML = roots.map(r => {
    const miniForms = [
      r.madi && r.madi !== '—' ? `Mazi: ${r.madi}` : '',
      r.mudari && r.mudari !== '—' ? `Muzari: ${r.mudari}` : '',
      r.masdar && r.masdar !== '—' ? `Masdar: ${r.masdar}` : '',
      r.fail && r.fail !== '—' ? `Fâil: ${r.fail}` : ''
    ].filter(Boolean);

    return `
      <div class="root-card">
        <div class="root-card-top">
          <div class="root-glyph-wrap">
            <span class="root-glyph">${escapeHtml(r.root)}</span>
            <span class="root-reading-badge">${escapeHtml(r.reading || '')}</span>
          </div>
          <span class="root-freq-tag">${(r.frequency || 0).toLocaleString('tr-TR')} Geçiş</span>
        </div>
        <div class="root-card-meaning">
          ${escapeHtml(r.core_meaning || '—')}
        </div>
        <div class="root-card-forms-row">
          ${miniForms.map(f => `<span class="dossier-mini-chip">${escapeHtml(f)}</span>`).join('')}
        </div>
        <div class="root-card-actions">
          <button class="btn-root-detail" onclick="openRootDossierModal('${escapeHtml(r.root)}')">
            📖 9 Bâb & Ayetleri İncele
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function openRootDossierModal(rootStr) {
  if (!rootStr) return;
  const modalEl = document.getElementById('root-dossier-modal');
  if (!modalEl) return;

  // Kullanıcının kök dosyasına girmeden önceki okuma pozisyonunu kaydet
  AppState.previousTabBeforeRoot = AppState.currentTab || 'reader';
  if (AppState.lastReadPosition && AppState.lastReadPosition.key) {
    AppState.previousVerseKeyBeforeRoot = AppState.lastReadPosition.key;
    AppState.lastReadVerseKey = AppState.lastReadPosition.key;
  } else if (AppState.mathInspector && AppState.mathInspector.activeVerse) {
    AppState.previousVerseKeyBeforeRoot = AppState.mathInspector.activeVerse.key;
    AppState.lastReadVerseKey = AppState.mathInspector.activeVerse.key;
  }

  modalEl.classList.remove('hidden');

  // Set loading placeholder
  document.getElementById('root-modal-arabic').innerText = rootStr;
  document.getElementById('root-modal-reading').innerText = 'Yükleniyor...';
  document.getElementById('root-modal-meaning').innerText = 'Kök bilgileri ve ayetler çekiliyor...';
  document.getElementById('root-modal-freq-badge').innerText = '...';
  document.getElementById('root-modal-forms-tbody').innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1.25rem; color:#cbd5e1;">Yükleniyor...</td></tr>';
  document.getElementById('root-modal-verses-list').innerHTML = '<div style="text-align:center; padding:2rem; color:#cbd5e1;">Ayetler taranıyor...</div>';

  try {
    const res = await fetch(`/api/root/${encodeURIComponent(rootStr)}`);
    const data = await res.json();
    if (data.error) {
      document.getElementById('root-modal-reading').innerText = 'Hata';
      document.getElementById('root-modal-meaning').innerText = data.error;
      return;
    }

    // Hero Header
    document.getElementById('root-modal-arabic').innerText = data.root;
    document.getElementById('root-modal-reading').innerText = `${data.reading} (${data.root_bare})`;
    document.getElementById('root-modal-meaning').innerText = data.core_meaning || '—';
    document.getElementById('root-modal-freq-badge').innerText = `${(data.frequency || 0).toLocaleString('tr-TR')} Geçiş`;

    // 9 Bâb Çekim Tablosu
    const forms = [
      { name: 'Mazi (Geçmiş Zaman)', ar: data.madi, tr: data.madi_tr },
      { name: 'Muzari (Geniş/Şimdiki Zaman)', ar: data.mudari, tr: data.mudari_tr },
      { name: 'Emir', ar: data.amr, tr: data.amr_tr },
      { name: 'Nehiy (Yasaklama)', ar: data.nahy, tr: data.nahy_tr },
      { name: 'Masdar (Fiil Kökü)', ar: data.masdar, tr: data.masdar_tr },
      { name: 'İsm-i Fâil (Özne/Yapan)', ar: data.fail, tr: data.fail_tr },
      { name: 'İsm-i Mef\'ûl (Nesne/Yapılan)', ar: data.maful, tr: data.maful_tr },
      { name: 'İsm-i Mekân (Mekân İsmi)', ar: data.makan, tr: data.makan_tr },
      { name: 'İsm-i Zamân (Zaman İsmi)', ar: data.zaman, tr: data.zaman_tr }
    ];

    const tbody = document.getElementById('root-modal-forms-tbody');
    tbody.innerHTML = forms.map(f => `
      <tr>
        <td class="form-name-cell">${escapeHtml(f.name)}</td>
        <td class="arabic-cell" style="direction:rtl;">${escapeHtml(f.ar || '—')}</td>
        <td class="form-meaning-cell">${escapeHtml(f.tr || '—')}</td>
      </tr>
    `).join('');

    // Sample Verses
    const versesList = document.getElementById('root-modal-verses-list');
    const versesCount = document.getElementById('root-modal-verses-count');
    const sampleVerses = data.sample_verses || [];

    if (versesCount) {
      versesCount.innerText = `${sampleVerses.length} Örnek Ayet Listeleniyor`;
    }

    if (sampleVerses.length === 0) {
      versesList.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#cbd5e1;">Bu kök için doğrudan ayet kaydı bulunamadı.</div>';
    } else {
      versesList.innerHTML = sampleVerses.map(v => `
        <div class="root-verse-item">
          <div class="root-verse-top">
            <span class="root-verse-key">${escapeHtml(v.surah_name)} ${v.surah_number}:${v.verse_number}</span>
            <button class="root-verse-btn-jump" onclick="jumpToVerseFromRoot(${v.surah_number}, ${v.verse_number})">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Mushaf'ta Aç</span>
            </button>
          </div>
          <div class="root-verse-ar">${highlightRootInVerse(v.text_uthmani || v.text_clean, data.root)}</div>
          <div class="root-verse-tr">${escapeHtml(v.translation_diyanet || '')}</div>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Kök detayı yüklenirken hata:', err);
    document.getElementById('root-modal-reading').innerText = 'Bağlantı Hatası';
  }
}

function highlightRootInVerse(text, rootStr) {
  if (!text || !rootStr) return escapeHtml(text || '');

  // Extract pure Arabic root letters, e.g. "ن-ع-م" -> ["ن", "ع", "م"]
  const cleanLetters = rootStr.replace(/[^ء-ي]/g, '').split('');
  if (cleanLetters.length === 0) return escapeHtml(text);

  const words = text.split(/\s+/);
  return words.map(w => {
    // Strip diacritics and normalize for sequential root checking
    const wNorm = w
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');

    let match = true;
    let idx = 0;
    for (const ch of cleanLetters) {
      const pos = wNorm.indexOf(ch, idx);
      if (pos === -1) {
        match = false;
        break;
      }
      idx = pos + 1;
    }

    if (match) {
      return `<mark class="root-match-highlight">${escapeHtml(w)}</mark>`;
    }
    return escapeHtml(w);
  }).join(' ');
}

function updateReadingPosition(pos, saveLocal = true) {
  if (!pos) return;
  const key = pos.key || (pos.surahNumber && pos.verseNumber ? `${pos.surahNumber}:${pos.verseNumber}` : null);
  if (!key) return;

  const surahNum = pos.surahNumber || (key.includes(':') ? parseInt(key.split(':')[0], 10) : 1);
  const verseNum = pos.verseNumber || (key.includes(':') ? parseInt(key.split(':')[1], 10) : 1);
  const page = pos.page || 1;
  const juz = pos.juz || 1;
  const id = pos.id || 0;

  AppState.lastReadPosition = {
    surahNumber: surahNum,
    verseNumber: verseNum,
    key: key,
    page: page,
    juz: juz,
    id: id
  };
  AppState.lastReadVerseKey = key;
  AppState.previousVerseKeyBeforeRoot = key;

  if (saveLocal) {
    try {
      localStorage.setItem('quran_reading_position', JSON.stringify(AppState.lastReadPosition));
    } catch (e) {}
  }
}

let readerScrollObserver = null;

function initReaderScrollTracker() {
  if (readerScrollObserver) {
    readerScrollObserver.disconnect();
  }

  const cards = document.querySelectorAll('#verses-stream .verse-card');
  if (cards.length === 0) return;

  readerScrollObserver = new IntersectionObserver((entries) => {
    if (AppState.currentTab !== 'reader') return;

    const visibleEntries = entries.filter(e => e.isIntersecting);
    if (visibleEntries.length === 0) return;

    // Pick topmost visible entry in viewport
    visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    const topCard = visibleEntries[0].target;

    const key = topCard.getAttribute('data-key');
    const surah = parseInt(topCard.getAttribute('data-surah'), 10);
    const verse = parseInt(topCard.getAttribute('data-verse-number'), 10);
    const page = parseInt(topCard.getAttribute('data-page'), 10);
    const juz = parseInt(topCard.getAttribute('data-juz'), 10);
    const id = parseInt(topCard.getAttribute('data-id'), 10);

    if (key && surah && verse) {
      updateReadingPosition({
        surahNumber: surah,
        verseNumber: verse,
        key: key,
        page: page || 1,
        juz: juz || 1,
        id: id || 0
      }, true);
    }
  }, {
    root: null,
    rootMargin: '-10% 0px -60% 0px',
    threshold: [0.05, 0.2]
  });

  cards.forEach(c => readerScrollObserver.observe(c));
}

function scrollToTargetVerse(targetKey, targetVerse, page) {
  let card = null;
  if (targetKey) {
    card = document.querySelector(`.verse-card[data-key="${targetKey}"], .verse-row[data-key="${targetKey}"]`);
  }
  if (!card && targetVerse) {
    card = document.querySelector(`.verse-card[data-verse-number="${targetVerse}"]`);
  }

  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-pulse', 'pulse-gold-highlight');
    void card.offsetWidth; // Force CSS animation restart
    card.classList.add('highlight-pulse', 'pulse-gold-highlight');
    setTimeout(() => {
      card.classList.remove('highlight-pulse', 'pulse-gold-highlight');
    }, 3500);

    const actualKey = targetKey || card.getAttribute('data-key');
    const actualPage = page || card.getAttribute('data-page');
    const pageInfo = actualPage ? ` (Sayfa ${actualPage})` : '';

    if (typeof showToast === 'function') {
      showToast(`📖 Kaldığınız yere dönüldü: [${actualKey}]${pageInfo}`);
    }

    const firstWord = card.querySelector('.ar-word, .wbw-card');
    if (firstWord && typeof inspectWord === 'function') {
      const wIdx = parseInt(firstWord.dataset.wordIdx || '1', 10);
      if (AppState.currentSurahData && AppState.currentSurahData.verses) {
        const vData = AppState.currentSurahData.verses.find(v => v.key === actualKey || v.verse_number === targetVerse);
        if (vData && vData.words) {
          inspectWord(vData.words[wIdx - 1] || vData.words[0], vData, firstWord);
        }
      }
    }
    return true;
  }
  return false;
}

async function returnToLastReadingPosition() {
  // 1. Close root dossier modal
  const modalEl = document.getElementById('root-dossier-modal');
  if (modalEl) modalEl.classList.add('hidden');

  // 2. Switch to reader tab
  if (typeof switchTab === 'function') {
    switchTab('reader');
  }

  // 3. Resolve active/last reading position
  let pos = AppState.lastReadPosition;
  if (!pos || !pos.key) {
    try {
      const saved = localStorage.getItem('quran_reading_position');
      if (saved) pos = JSON.parse(saved);
    } catch(e) {}
  }
  if (!pos && AppState.mathInspector && AppState.mathInspector.activeVerse) {
    const av = AppState.mathInspector.activeVerse;
    pos = {
      surahNumber: av.surah_number,
      verseNumber: av.verse_number,
      key: av.key,
      page: av.page,
      juz: av.juz,
      id: av.id
    };
  }
  if (!pos || !pos.key) {
    pos = { surahNumber: 1, verseNumber: 1, key: '1:1', page: 1, juz: 1 };
  }

  const targetKey = pos.key;
  const targetSurah = pos.surahNumber || (targetKey ? parseInt(targetKey.split(':')[0], 10) : 1);
  const targetVerse = pos.verseNumber || (targetKey ? parseInt(targetKey.split(':')[1], 10) : 1);
  const targetPage = pos.page;

  // If the target surah is currently loaded in DOM
  const existingCard = document.querySelector(`.verse-card[data-key="${targetKey}"], .verse-card[data-verse-number="${targetVerse}"]`);
  if (existingCard && AppState.currentSurahId === targetSurah) {
    setTimeout(() => {
      scrollToTargetVerse(targetKey, targetVerse, targetPage);
    }, 120);
  } else {
    // Load that surah and navigate to the verse
    await loadSurah(targetSurah, targetVerse, targetPage);
  }
}

function closeRootDossierModal() {
  returnToLastReadingPosition();
}

function jumpToVerseFromRoot(surahNum, verseNum) {
  updateReadingPosition({
    surahNumber: surahNum,
    verseNumber: verseNum,
    key: `${surahNum}:${verseNum}`,
    page: null
  }, true);

  const modalEl = document.getElementById('root-dossier-modal');
  if (modalEl) modalEl.classList.add('hidden');

  switchTab('reader');
  loadSurah(surahNum, verseNum);
}

// Global exports
window.updateReadingPosition = updateReadingPosition;
window.initReaderScrollTracker = initReaderScrollTracker;
window.scrollToTargetVerse = scrollToTargetVerse;
window.returnToLastReadingPosition = returnToLastReadingPosition;
window.closeRootDossierModal = closeRootDossierModal;
window.jumpToVerseFromRoot = jumpToVerseFromRoot;




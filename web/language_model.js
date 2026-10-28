/**
 * QuranLanguageModel - Intelligent Multilingual Website Translation Engine (I18N LLM Engine)
 * Strictly conforms to Google Directory API Language Standards (BCP 47 language codes: tr, en, ar, de, fr)
 * Features:
 *  - Standard BCP 47 codes: 'tr' (Turkish), 'en' (English), 'ar' (Arabic), 'de' (German), 'fr' (French)
 *  - Asynchronous dynamic locale loading from /locales/{lang}.json with robust local fallback
 *  - Reactive DOM update for [data-i18n], text nodes, placeholders, titles, aria-labels, buttons
 *  - Preserves Holy Quranic Arabic Uthmani calligraphy & verses untouched
 *  - Standardized terminology:
 *      TR: "Müfettiş & Keşif" / "Müfettiş"
 *      EN: "Inspector & Explorer" / "Inspector"
 *      AR: "المفتش والمستكشف" / "المفتش"
 *      DE: "Inspektor & Erkunder" / "Inspektor"
 *      FR: "Inspecteur & Explorateur" / "Inspecteur"
 *  - Custom reactive event 'quran-language-changed' dispatched on window
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuranLanguageModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Comprehensive Multi-Lingual Lexicon Matrix (TR <-> EN, AR, DE, FR)
  const LEXICON = {
    // Top Brand & Header
    "KUR'ÂN-I KERÎM": { en: "THE HOLY QURAN", ar: "الْقُرْآنُ الْكَرِيمُ", de: "DER HEILIGE KORAN", fr: "LE SAINT CORAN" },
    "İlim, Örüntüler & Mucizeler Laboratuvarı": { en: "Sacred Analytics, Symmetries & Miracles Laboratory", ar: "مختبر علوم القرآن والإعجاز الرقمي والأنماط الإلهية", de: "Labor für Koranische Analytik & Wunder", fr: "Laboratoire d'Analytique & Miracles Coraniques" },
    "İlim, Örüntüler, Delâilü'l-Hayrât & Mucizeler": { en: "Knowledge, Patterns, Dalail al-Khayrat & Miracles", ar: "العلوم والإعجاز ودلائل الخيرات والأنوار المحمدية", de: "Wissen, Muster, Dalail al-Khayrat & Wunder", fr: "Sagesse, Motifs, Dala'il al-Khayrat & Miracles" },

    // Tabs
    "Mushaf & Mealler": { en: "Mushaf & Translations", ar: "المصحف والتفاسير", de: "Mushaf & Übersetzungen", fr: "Moushaf & Traductions" },
    "Delâilü'l-Hayrât": { en: "Dalail al-Khayrat", ar: "دلائل الخيرات", de: "Dalail al-Khayrat", fr: "Dala'il al-Khayrat" },
    "Örüntüler & Simetri": { en: "Patterns & Symmetry", ar: "الأنماط والتماثل", de: "Muster & Symmetrie", fr: "Motifs & Symétrie" },
    "Görselleştirmeler": { en: "Visualizations", ar: "المخططات التفاعلية", de: "Visualisierungen", fr: "Visualisations" },
    "Esrâr-ı Hurûf (Nur Muhammad)": { en: "Mysteries of Letters (Nur Muhammad)", ar: "أسرar الحروف ونور محمد", de: "Geheimnisse der Buchstaben", fr: "Mystères des Lettres (Nur Muhammad)" },
    "Mucizeler & Kelimeler": { en: "Miracles & Words", ar: "الإعجاز والكلمات", de: "Wunder & Wörter", fr: "Miracles & Mots" },
    "Ebced / Cifir": { en: "Abjad / Numerics", ar: "حساب الجمل", de: "Abdschad / Numerik", fr: "Abjad / Numérique" },
    "Arama": { en: "Search", ar: "البحث الشامل", de: "Suche", fr: "Recherche" },
    "Keşif & İşaretler": { en: "Sign Explorer", ar: "المستكشف والإشارات", de: "Erkunder & Zeichen", fr: "Explorateur & Signes" },
    "Kütüphane & Tefsir": { en: "Library & Exegesis", ar: "المكتبة والتفاسير", de: "Bibliothek & Exegese", fr: "Bibliothèque & Exégèse" },
    "8 Hizib / 201 İsim": { en: "8 Hizbs / 201 Names", ar: "٨ أحزاب / ٢٠١ اسم", de: "8 Hizb / 201 Namen", fr: "8 Hizb / 201 Noms" },
    "5 Ölçek": { en: "5 Scales", ar: "٥ مستويات", de: "5 Skalen", fr: "5 Échelles" },
    "Canvas & Dalga": { en: "Canvas & Waves", ar: "الموجات الحسابية", de: "Canvas & Welle", fr: "Canvas & Ondes" },
    "Naqshbandi / Şifa": { en: "Naqshbandi / Healing", ar: "النقشبندية / الشفاء", de: "Naqshbandi / Heilung", fr: "Naqshbandi / Guérison" },

    // Word Inspection Layers
    "layer_vocalized": { tr: "Orijinal Harekeli", en: "Original Vocalized", ar: "الأصل المشكول", de: "Vokalisiert", fr: "Vocalisé" },
    "layer_clean_bare": { tr: "Harekesiz (Sade)", en: "Bare Script", ar: "الرسم المجرد", de: "Grundschrift", fr: "Script Épuré" },
    "layer_root": { tr: "Sülâsî Kök", en: "Triliteral Root", ar: "الجذر الثلاثي", de: "Wurzel", fr: "Racine" },
    "layer_breakout": { tr: "Harf Harf Ayrıştırma & Ebced", en: "Letter Breakout & Abjad", ar: "تفكيك الحروف والجمل", de: "Buchstabenanalyse & Abdschad", fr: "Décomposition des Lettres" },
    "Orijinal (Harekeli)": { tr: "Orijinal (Harekeli)", en: "Original (Vocalized)", ar: "الأصل المشكول", de: "Original (Vokalisiert)", fr: "Original (Vocalisé)" },
    "Harekesiz (Sade)": { tr: "Harekesiz (Sade)", en: "Bare Script", ar: "الرسم المجرد", de: "Grundschrift", fr: "Script Épuré" },
    "Sülâsî Kök": { tr: "Sülâsî Kök", en: "Triliteral Root", ar: "الجذر الثلاثي", de: "Wurzel", fr: "Racine" },
    "Harf Harf Ayrıştırma & Ebced": { tr: "Harf Harf Ayrıştırma & Ebced", en: "Letter Breakout & Abjad", ar: "تفكيك الحروف والجمل", de: "Buchstabenanalyse & Abdschad", fr: "Décomposition des Lettres" },

    // Inspector (Müfettiş) & Floating Controls
    "Müfettiş": { en: "Inspector", ar: "المفتش", de: "Inspektor", fr: "Inspecteur" },
    "Müfettiş & Keşif": { en: "Inspector & Explorer", ar: "المفتش والمستكشف", de: "Inspektor & Erkunder", fr: "Inspecteur & Explorateur" },
    "Canlı": { en: "Live", ar: "مباشر", de: "Live", fr: "En direct" },
    "Matematik & Kelime Müfettişi (Kısayol: M)": { en: "Mathematics & Word Inspector (Shortcut: M)", ar: "مفتش الرياضيات والكلمات (اختصار: M)", de: "Mathematik- & Wortinspektor (Taste: M)", fr: "Inspecteur Mathématique & Mots (Raccourci: M)" },
    "Matematik & Kelime Müfettişi": { en: "Mathematics & Word Inspector", ar: "مفتش الرياضيات والكلمات", de: "Mathematik- & Wortinspektor", fr: "Inspecteur Mathématique & Mots" },
    "CANLI MATEMATİK": { en: "LIVE MATHEMATICS", ar: "التحليل الرقمي الحي", de: "LIVE-MATHEMATIK", fr: "MATHÉMATIQUES EN DIRECT" },
    "Ayet & Kelime Müfettişi": { en: "Ayah & Word Inspector", ar: "مفتش الآيات والكلمات", de: "Vers- & Wort-Inspektor", fr: "Inspecteur de Verset & Mot" },
    "Müfettişi Sabitle / Otomatik Gizle": { en: "Pin Inspector / Auto Hide", ar: "تثبيت لوحة المفتش / إخفاء تلقائي", de: "Inspektor fixieren", fr: "Épingler l'inspecteur" },
    "Müfettişi Sabitle": { en: "Pin Inspector", ar: "تثبيت المفتش", de: "Inspektor fixieren", fr: "Épingler l'inspecteur" },
    "Müfettişe Aktar": { en: "Send to Inspector", ar: "إرسال إلى المفتش", de: "An Inspektor senden", fr: "Envoyer à l'inspecteur" },
    "Müfettiş paneli sabitlendi.": { en: "Inspector panel has been pinned.", ar: "تم تثبيت لوحة المفتش بنجاح.", de: "Inspektor-Bereich fixiert.", fr: "Panneau de l'inspecteur épinglé." },
    "Müfettiş paneli serbest bırakıldı.": { en: "Inspector panel released.", ar: "تم إلغاء تثبيت لوحة المفتش.", de: "Inspektor-Bereich freigegeben.", fr: "Panneau de l'inspecteur libéré." },
    "Kelime veya Ayet Seçin": { en: "Select a Word or Ayah", ar: "اختر كلمة أو آية كريمة", de: "Wählen Sie ein Wort oder einen Vers", fr: "Sélectionnez un mot ou un verset" },
    "Suredeki herhangi bir kelimenin üzerine gelin (hover) veya tıklayın; ya da farenizle metin seçin. Sayısal DNA ve simetri noktaları anında dökülür.": {
      en: "Hover or click on any word in the Surah, or select text with your mouse. Numerical DNA and symmetry points will be analyzed instantly.",
      ar: "مرر الفأرة فوق أي كلمة في السورة أو انقر عليها لتحليل الشيفرات الرقمية والتماثل فوراً.",
      de: "Bewegen Sie den Mauszeiger über ein beliebiges Wort oder klicken Sie darauf. Numerische DNA wird sofort berechnet.",
      fr: "Survolez ou cliquez sur n'importe quel mot dans la sourate. L'ADN numérique sera analysé instantanément."
    },

    // Word Position & Triads
    "🟢 Başı": { en: "🟢 Start", ar: "🟢 البداية", de: "🟢 Anfang", fr: "🟢 Début" },
    "🟡 Ortası (Vasat)": { en: "🟡 Center (Vasat)", ar: "🟡 واسطة العقد", de: "🟡 Zentrum (Vasat)", fr: "🟡 Centre (Vasat)" },
    "🔴 Sonu": { en: "🔴 End", ar: "🔴 الختام", de: "🔴 Ende", fr: "🔴 Fin" },
    "🟢 Baş": { en: "🟢 Start", ar: "🟢 البداية", de: "🟢 Anfang", fr: "🟢 Début" },
    "🟡 Vasat": { en: "🟡 Center", ar: "🟡 الوسط", de: "🟡 Zentrum", fr: "🟡 Centre" },
    "🔴 Hitam": { en: "🔴 End", ar: "🔴 الختام", de: "🔴 Ende", fr: "🔴 Fin" },
    "⚪ Gövde": { en: "⚪ Body", ar: "⚪ المتن", de: "⚪ Körper", fr: "⚪ Corps" },

    // Math & Numbers
    "Asal Sayı": { en: "Prime Number", ar: "عدد أولي", de: "Primzahl", fr: "Nombre Premier" },
    "Bileşik Sayı": { en: "Composite Number", ar: "عدد مركب", de: "Zusammengesetzte Zahl", fr: "Nombre Composé" },
    "✨ Asal Sayı": { en: "✨ Prime Number", ar: "✨ عدد أولي", de: "✨ Primzahl", fr: "✨ Nombre Premier" },
    "Çift Sayı": { en: "Even Number", ar: "عدد زوجي", de: "Gerade Zahl", fr: "Nombre Pair" },
    "Tek Sayı": { en: "Odd Number", ar: "عدد فردي", de: "Ungerade Zahl", fr: "Nombre Impair" },
    "19 Sayısal Kodu": { en: "19 Numerical Code", ar: "الشيفرة الرقمية ١٩", de: "19 Numerischer Code", fr: "Code Numérique 19" },
    "7 Sayısal Kodu": { en: "7 Numerical Code", ar: "الشيفرة الرقمية ٧", de: "7 Numerischer Code", fr: "Code Numérique 7" },
    "19 & 7 Katı": { en: "Multiple of 19 & 7", ar: "مضاعف ١٩ و ٧ معاً", de: "Vielfaches von 19 & 7", fr: "Multiple de 19 & 7" },

    // Themes & Reading Modes
    "📜 Kağıt": { en: "📜 Parchment", ar: "📜 ورق مخطوط", de: "📜 Pergament", fr: "📜 Parchemin" },
    "🌌 Gece": { en: "🌌 Night", ar: "🌌 ليلي", de: "🌌 Nacht", fr: "🌌 Nuit" },
    "🕯️ Sepya": { en: "🕯️ Sepia", ar: "🕯️ بني داكن", de: "🕯️ Sepia", fr: "🕯️ Sépia" },
    "Harekeli (Osmanî)": { en: "Vocalized (Uthmani)", ar: "بالتشكيل (عثماني)", de: "Vokalisiert (Uthmani)", fr: "Vocalisé (Othmani)" },
    "Harekesiz (Yalın)": { en: "Unvocalized (Simple)", ar: "بدون تشكيل (رسم قديم)", de: "Unvokalisiert (Einfach)", fr: "Non-vocalisé (Simple)" },
    "Kelime Kelime Meal": { en: "Word-by-Word Interlinear", ar: "ترجمة كلمة بكلمة", de: "Wort-für-Wort-Übersetzung", fr: "Traduction Mot à Mot" },
    "Akıcı Mushaf": { en: "Flowing Mushaf", ar: "قراءة متصلة", de: "Fließender Mushaf", fr: "Moushaf Continu" },
    "Kaynak / Meal:": { en: "Source / Translation:", ar: "المصدر / الترجمة:", de: "Quelle / Übersetzung:", fr: "Source / Traduction:" },
    "Karşılaştırmalı Kaynaklar": { en: "Comparative Sources", ar: "مقارنة المصادر", de: "Vergleichende Quellen", fr: "Sources Comparatives" },

    // Actions & Buttons
    "Ayet Git": { en: "Jump", ar: "انتقال", de: "Gehe zu", fr: "Aller" },
    "Odak": { en: "Focus", ar: "تركيز", de: "Fokus", fr: "Focus" },
    "✨ Keşif & İşaretler": { en: "✨ Sign Explorer", ar: "✨ المستكشف والإشارات", de: "✨ Erkunder & Zeichen", fr: "✨ Explorateur & Signes" },
    "Bağlamsal Keşfet": { en: "Contextual Explore", ar: "استكشاف سياقي", de: "Kontextuell erkunden", fr: "Explorer en contexte" },
    "Dinamik Kütüphane & Kaynaklar": { en: "Dynamic Library & Sources", ar: "المكتبة الديناميكية والمصادر", de: "Dynamische Bibliothek & Quellen", fr: "Bibliothèque Dynamique & Sources" },
    "Kapat": { en: "Close", ar: "إغلاق", de: "Schließen", fr: "Fermer" }
  };

  function isQuranArabic(text) {
    if (!text || typeof text !== 'string') return false;
    const arabicMatch = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
    if (!arabicMatch) return false;
    return (arabicMatch.length / text.trim().length) > 0.65;
  }

  const QuranLanguageModel = {
    currentLang: 'tr',
    isTranslating: false,
    observer: null,
    locales: {},
    supportedLangs: ['tr', 'en', 'ar', 'de', 'fr', 'es', 'ru'],

    /**
     * Initialize language model
     */
    init: function () {
      const savedLang = localStorage.getItem('quran_lang');
      if (savedLang) {
        this.currentLang = savedLang;
      }
      this.loadLocale(this.currentLang);
      this.initObserver();
      this.translateDom(document.body, this.currentLang);
    },

    /**
     * Dynamically fetch locale JSON
     */
    loadLocale: function (lang) {
      if (!lang || typeof lang !== 'string') return;
      if (this.locales[lang]) return;

      const self = this;
      fetch(`/locales/${lang}.json`)
        .then(function (r) {
          if (!r.ok) throw new Error('Locale not found');
          return r.json();
        })
        .then(function (data) {
          self.locales[lang] = data;
          if (!self.supportedLangs.includes(lang)) {
            self.supportedLangs.push(lang);
          }
          if (self.currentLang === lang) {
            self.translateDom(document.body, lang);
          }
        })
        .catch(function () {
          // Local fallback is maintained via LEXICON
        });
    },

    /**
     * Translation lookup
     */
    t: function (key, lang) {
      if (!key) return '';
      lang = lang || this.currentLang;
      if (lang === 'tr') return key;

      // 1. Direct match in loaded JSON locale
      if (this.locales[lang] && this.locales[lang][key]) {
        return this.locales[lang][key];
      }

      // 2. Direct match in LEXICON
      const trimmed = key.trim();
      if (LEXICON[trimmed] && LEXICON[trimmed][lang]) {
        return key.replace(trimmed, LEXICON[trimmed][lang]);
      }

      // 3. Normalized case-insensitive lookup
      const lower = trimmed.toLowerCase();
      for (let k in LEXICON) {
        if (k.toLowerCase() === lower && LEXICON[k][lang]) {
          return key.replace(trimmed, LEXICON[k][lang]);
        }
      }

      return key;
    },

    /**
     * Translates DOM subtree
     */
    translateDom: function (root, lang) {
      if (!root) return;
      this.isTranslating = true;
      lang = lang || this.currentLang;

      // 1. Set HTML direction & lang attribute
      if (root === document.body || root === document.documentElement) {
        document.documentElement.lang = lang;
        const isRtl = ['ar', 'fa', 'ur', 'he', 'ps'].includes(lang);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      }

      // 2. Process [data-i18n] declarative elements
      const i18nElements = root.querySelectorAll ? root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria]') : [];
      i18nElements.forEach(el => {
        if (el.dataset.i18n) {
          el.innerText = this.t(el.dataset.i18n, lang);
        }
        if (el.dataset.i18nPlaceholder) {
          el.placeholder = this.t(el.dataset.i18nPlaceholder, lang);
        }
        if (el.dataset.i18nTitle) {
          el.title = this.t(el.dataset.i18nTitle, lang);
        }
        if (el.dataset.i18nAria) {
          el.setAttribute('aria-label', this.t(el.dataset.i18nAria, lang));
        }
      });

      // 3. Process common attributes (title, placeholder, aria-label)
      const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      allElements.forEach(el => {
        if (el.classList && (
          el.classList.contains('verse-arabic-uthmani') ||
          el.classList.contains('wbw-arabic') ||
          el.classList.contains('ar-word') ||
          el.classList.contains('arabic-key-btn') ||
          el.classList.contains('tile-char') ||
          el.getAttribute('lang') === 'ar-quran'
        )) {
          return;
        }

        if (el.title) {
          if (!el.dataset.origTitle) el.dataset.origTitle = el.title;
          el.title = (lang === 'tr') ? el.dataset.origTitle : this.t(el.dataset.origTitle, lang);
        }
        if (el.placeholder) {
          if (!el.dataset.origPlaceholder) el.dataset.origPlaceholder = el.placeholder;
          el.placeholder = (lang === 'tr') ? el.dataset.origPlaceholder : this.t(el.dataset.origPlaceholder, lang);
        }
        if (el.getAttribute('aria-label')) {
          if (!el.dataset.origAria) el.dataset.origAria = el.getAttribute('aria-label');
          el.setAttribute('aria-label', (lang === 'tr') ? el.dataset.origAria : this.t(el.dataset.origAria, lang));
        }

        // Special Inspector Title & Pill Sync
        if (el.id === 'btn-floating-inspector-toggle') {
          const pillText = el.querySelector('.f-pill-text');
          const pillBadge = el.querySelector('#f-pill-badge');
          const terms = {
            tr: { text: "Müfettiş", live: "Canlı" },
            en: { text: "Inspector", live: "Live" },
            ar: { text: "المفتش", live: "مباشر" },
            de: { text: "Inspektor", live: "Live" },
            fr: { text: "Inspecteur", live: "Direct" }
          };
          const t = terms[lang] || terms.tr;
          if (pillText) pillText.innerText = t.text;
          if (pillBadge) pillBadge.innerText = t.live;
        }

        if (el.classList && el.classList.contains('inspector-title')) {
          const titles = {
            tr: "Ayet & Kelime Müfettişi",
            en: "Ayah & Word Inspector",
            ar: "مفتش الآيات والكلمات",
            de: "Vers- & Wort-Inspektor",
            fr: "Inspecteur de Verset & Mot"
          };
          el.innerText = titles[lang] || titles.tr;
        }
      });

      // 4. TreeWalker for regular text nodes
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            if (!node || !node.nodeValue || !node.nodeValue.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            const tag = parent.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'noscript') {
              return NodeFilter.FILTER_REJECT;
            }

            // Exclude Arabic Quran calligraphy
            if (parent.classList && (
              parent.classList.contains('verse-arabic-uthmani') ||
              parent.classList.contains('wbw-arabic') ||
              parent.classList.contains('ar-word') ||
              parent.classList.contains('triad-wbw-ar') ||
              parent.classList.contains('pos-block-ar') ||
              parent.classList.contains('arabic-key-btn') ||
              parent.classList.contains('tile-char') ||
              parent.classList.contains('wls-char') ||
              parent.classList.contains('char-cell') ||
              parent.getAttribute('lang') === 'ar-quran'
            )) {
              return NodeFilter.FILTER_REJECT;
            }

            if (isQuranArabic(node.nodeValue)) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          }
        },
        false
      );

      let currentNode;
      while ((currentNode = walker.nextNode())) {
        if (!currentNode._origText) {
          currentNode._origText = currentNode.nodeValue;
        }

        if (lang === 'tr') {
          currentNode.nodeValue = currentNode._origText;
        } else {
          currentNode.nodeValue = this.t(currentNode._origText, lang);
        }
      }

      this.isTranslating = false;
    },

    /**
     * Initializes MutationObserver for dynamically added views
     */
    initObserver: function () {
      if (this.observer) return;
      const self = this;

      this.observer = new MutationObserver(function (mutations) {
        if (self.isTranslating || self.currentLang === 'tr') return;

        mutations.forEach(function (m) {
          if (m.type === 'childList' && m.addedNodes && m.addedNodes.length > 0) {
            m.addedNodes.forEach(function (node) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                self.translateDom(node, self.currentLang);
              }
            });
          }
        });
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    /**
     * Switch active language
     */
    setLanguage: function (lang) {
      if (!lang || typeof lang !== 'string') lang = 'tr';
      if (!this.supportedLangs.includes(lang)) {
        this.supportedLangs.push(lang);
      }
      this.currentLang = lang;
      localStorage.setItem('quran_lang', lang);

      const isRtl = ['ar', 'fa', 'ur', 'he', 'ps'].includes(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

      this.loadLocale(lang);
      this.translateDom(document.body, lang);

      // Dispatch event to inform all web app components
      window.dispatchEvent(new CustomEvent('quran-language-changed', {
        detail: { lang: lang }
      }));
    }
  };

  return QuranLanguageModel;
}));

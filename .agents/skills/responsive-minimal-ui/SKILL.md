---
name: responsive-minimal-ui
description: >-
  Minimalist, accessible, distraction-free UI/UX architecture for Quran study:
  responsive hamburger navigation, slide-out drawer inspectors, optical typography,
  verse outreach workflows, and zero-clutter reading modes.
---

# Responsive Minimal UI & Accessible Study Architecture

This skill provides design patterns and implementation guidelines for creating high-retention, distraction-free, and accessible study interfaces for the Holy Quran.

## 1. Minimal Header & Adaptive Viewport Strategy
Headers must never wrap awkwardly or display crowded rows of badges when the viewport shrinks:
- **Desktop Mode (> 1360px)**:
  - Dignified, compact brand identity (Golden Book emblem + title).
  - Main tab navigation neatly centered with subtle typography.
  - Essential quick actions right-aligned (Theme, Language, Focus Mode, Quick Search).
- **Compact & Mobile Viewport (< 1360px)**:
  - Collapse wide navigation bars into a single, highly accessible **Hamburger Menu (`☰ Menü`)**.
  - Show only high-priority tools in the header: Brand, Theme Switcher, Quick Verse Jump, and Hamburger Menu.
  - Prevent multi-line wrapping and horizontal scrollbars on `app-header`.

## 2. Dual-Mode Inspector Pattern (Docked Desktop vs Floating Slide-Over Drawer)
- **Desktop Wide (> 1360px)**:
  - Inspector is docked alongside verses (`width: 380px; flex-shrink: 0; min-width: 380px;`).
  - Uses `position: sticky; top: calc(var(--header-height) + 1rem);` with its own contained scrollbar.
- **Narrow Desktop & Tablets (< 1360px)**:
  - Never push the inspector below long surahs (like Bakara's 286 verses, which causes thousands of pixels of scroll blindness).
  - Convert the inspector into an accessible **Slide-Over Drawer**:
    - Floating trigger tab docked to right edge: `📐 Müfettiş [M]`.
    - Clicking any word or pressing `M` / `Alt+M` smoothly slides open the drawer overlay from the right.
    - Dismissable with `Esc`, click outside, or the close button `✕`.
    - Retains scroll position and updates live as words/verses are selected.

## 3. Verse-Centric Outreach & Focus Workflows
- **Direct Verse Jump**: Accessible shortcut (`Ctrl+G` or quick input) to immediately jump to `Surah:Verse` (e.g. `2:255` Ayet-el Kürsi) with smooth scroll and golden highlight pulse.
- **Micro-Actions on Every Verse**:
  - Play recitation with highlighted word synchronization.
  - Copy verse in multi-format (Arabic Uthmani + Transliteration + Translations).
  - Send directly to offline Abjad calculator or Letter Frequency Analyzer.
  - Deep root and morphology inspection.
- **Minimal Focus Mode**:
  - Hide all sidebars, headers, and auxiliary panels.
  - Maximize legible Quranic typography in center stage.
  - Floating minimal exit pill (`Esc` or `F`).

## 4. Optical Typography & Diacritic Clearance
- Arabic text must never collide with transliteration or translation text.
- Generous line heights (`line-height: 2.2` - `2.5`) for Uthmani script to accommodate multi-level diacritics (Tanwin, Shaddah, Damma, Kasrah, Maddah).
- Transliteration and Turkish/English word glosses placed in distinct pill containers with explicit padding and borders to ensure optical clarity.

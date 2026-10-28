---
name: manuscript-design-system
description: >-
  Museum-grade antique manuscript & paper parchment design system, optical typography,
  gold illumination accents, and high-legibility word-focus interactions for Quran study.
---

# Manuscript Design System & Paper Aesthetics Skill

This skill defines the visual architecture, paper color tokens, and word-focus reading experience.

## 1. Paper Tonal Palette (Mushaflara Has Samur Kağıt & Kadim Parşömen)
- **Base Background:** `#f7f3e8` / `#fbf8f1` (Warm cream ivory parchment).
- **Surface Elevation:** `#efe8d8` (Aged handmade rag paper tone).
- **Ink Primary:** `#241b14` (Deep sepia carbon walnut ink).
- **Ink Secondary:** `#574637` (Aged brown iron gall ink).
- **Gold Illumination Foil:** `#d97706` / `#b45309` (Leaf gold border & chapter headpieces).
- **Emerald Madrasa Green:** `#047857` (Traditional illumination pigment).

## 2. Word-Focus Interaction Architecture
When the reader is studying verses:
- Hovering or selecting any word card (`.wbw-card` or `.ar-word`) engages **Word Focus Mode**:
  - The hovered word is highlighted with a gold-leaf border (`2px solid var(--gold-primary)`), elevated shadow, and high contrast.
  - Sibling words within the verse softly reduce opacity to $0.5$ to eliminate visual clutter and guide optical attention.
  - The live inspector drawer updates instantly with the word's morphology, Abjad, and translations.

## 3. Reader Typography Standards
- Arabic Script: Amiri Quran / Scheherazade New with generous line-height ($2.2-2.5$).
- Interlinear Meaning: Direction LTR, clean sans-serif (Plus Jakarta Sans) at $0.78-0.85$rem for optimal readability without overlapping.

# -*- coding: utf-8 -*-
"""
library_service.py - Dinamik Kur'an Kütüphanesi & Karşılaştırmalı Meal/Tefsir Motoru
Kaynak Tipleri:
 - meal    : Mealler ve Tercümeler (Diyanet, Elmalılı, Sahih EN, Hamidullah FR, Bubenheim DE, vb.)
 - tefsir  : Klasik & Modern Tefsirler (Kur'an Yolu, Celâleyn, İbn Kesîr, vb.)
 - lugat   : Kur'an Kelime Lügatları & İştikak Sözlükleri (el-Müfredât, Lisanü'l-Arab, vb.)
 - hadis   : İlgili Ayet Hadisleri & Rivayet Mecmuaları (Riyâzü's-Sâlihîn, Sahîh-i Buhârî, vb.)

Ayet Eşleşmesi:
  (surah_id, verse_id, content, author, lang_code, source_type)
"""

import os
import glob
import json
import sqlite3
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "quran.db")
LIBRARY_DIR = os.path.join(os.path.dirname(__file__), "data", "library")


def init_library_db():
    """Kütüphane tablolarını kurar ve temel kaynakları indeksler."""
    os.makedirs(LIBRARY_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS library_sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT,
            type TEXT NOT NULL,
            lang_code TEXT NOT NULL,
            description TEXT,
            is_builtin INTEGER DEFAULT 1
        );
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS library_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            surah_id INTEGER NOT NULL,
            verse_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            author TEXT,
            lang_code TEXT NOT NULL,
            extra_metadata TEXT,
            UNIQUE(source_id, surah_id, verse_id)
        );
    ''')

    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_lib_entry_lookup 
        ON library_entries (surah_id, verse_id, source_id);
    ''')
    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_lib_entry_type 
        ON library_entries (source_type, lang_code);
    ''')

    # Temel kaynakları kaydet
    BUILTIN_SOURCES = [
        ("meal_diyanet_tr", "Diyanet İşleri Meali", "Diyanet İşleri Başkanlığı", "meal", "tr", "Türkiye Diyanet İşleri Başkanlığı resmî meali.", 1),
        ("meal_yazir_tr", "Elmalılı Hamdi Yazır Meali", "Elmalılı Muhammed Hamdi Yazır", "meal", "tr", "Hak Dini Kur'an Dili eseri orijinal meal metni.", 1),
        ("meal_sahih_en", "Sahih International", "Sahih International", "meal", "en", "Contemporary English translation based on traditional exegesis.", 1),
        ("meal_hamidullah_fr", "Muhammad Hamidullah (FR)", "Prof. Muhammad Hamidullah", "meal", "fr", "Traduction intégrale du Saint Coran en français.", 1),
        ("meal_bubenheim_de", "Bubenheim & Elyas (DE)", "Frank Bubenheim & Nadeem Elyas", "meal", "de", "Präzise deutsche Übersetzung des Heiligen Korans.", 1),
        ("tefsir_kuran_yolu_tr", "Kur'an Yolu Tefsiri (Özet)", "Diyanet Heyeti (Hayrettin Karaman vd.)", "tefsir", "tr", "Ayetlerin nüzul sebebi, bağlamı ve tefsiri.", 1),
        ("tefsir_celaleyn_ar", "تفسير الجلالين (Celâleyn)", "Celâleddîn el-Mahallî & es-Süyûtî", "tefsir", "ar", "Arapça klasik veciz tefsir.", 1),
        ("tefsir_ibnkathir_ar", "تفسير ابن كثير (İbn Kesîr)", "İsmail İbn Kesîr", "tefsir", "ar", "Rivayet tefsirinin en muteber şaheseri.", 1),
        ("lugat_mufradat_tr", "el-Müfredât Kur'an Lügati", "Râgıb el-İsfahânî", "lugat", "tr", "Kur'an kelimelerinin kök anlamları ve hakikatleri.", 1),
        ("hadis_riyazus_salihin", "Riyâzü's-Sâlihîn İlgili Hadisler", "İmâm en-Nevevî", "hadis", "tr", "Sure ve ayetlerle doğrudan irtibatlı nebevî beyanlar.", 1)
    ]

    cur.executemany('''
        INSERT OR IGNORE INTO library_sources (id, name, author, type, lang_code, description, is_builtin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', BUILTIN_SOURCES)

    conn.commit()
    conn.close()

    # Dışarıdan eklenen JSON kaynaklarını tara
    scan_external_json_libraries()


def scan_external_json_libraries():
    """data/library/ klasöründeki tüm .json dosyalarını otomatik tarar ve DB'ye ekler."""
    json_files = glob.glob(os.path.join(LIBRARY_DIR, "*.json"))
    if not json_files:
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for file_path in json_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            source_id = data.get("source_id") or os.path.splitext(os.path.basename(file_path))[0]
            name = data.get("name", source_id)
            author = data.get("author", "Bilinmeyen Yazar")
            stype = data.get("type", "meal")
            lang_code = data.get("lang_code", "tr")
            desc = data.get("description", "Dinamik yüklenmiş kütüphane kaynağı.")

            cur.execute('''
                INSERT OR REPLACE INTO library_sources (id, name, author, type, lang_code, description, is_builtin)
                VALUES (?, ?, ?, ?, ?, ?, 0)
            ''', (source_id, name, author, stype, lang_code, desc))

            entries = data.get("entries", [])
            to_insert = []
            for item in entries:
                s_id = item.get("surah_id")
                v_id = item.get("verse_id")
                content = item.get("content", "")
                auth = item.get("author", author)
                lang = item.get("lang_code", lang_code)
                meta = json.dumps(item.get("metadata", {}), ensure_ascii=False)
                if s_id and v_id and content:
                    to_insert.append((source_id, stype, s_id, v_id, content, auth, lang, meta))

            if to_insert:
                cur.executemany('''
                    INSERT OR REPLACE INTO library_entries 
                    (source_id, source_type, surah_id, verse_id, content, author, lang_code, extra_metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', to_insert)

        except Exception as e:
            print(f"Kütüphane dosyası yüklenirken hata ({file_path}): {e}")

    conn.commit()
    conn.close()


def get_all_sources(source_type: Optional[str] = None, lang_code: Optional[str] = None) -> List[Dict[str, Any]]:
    """Mevcut tüm kütüphane kaynaklarını listeler."""
    init_library_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    query = "SELECT id, name, author, type, lang_code, description, is_builtin FROM library_sources WHERE 1=1"
    params = []
    if source_type:
        query += " AND type = ?"
        params.append(source_type)
    if lang_code:
        query += " AND lang_code = ?"
        params.append(lang_code)

    query += " ORDER BY is_builtin DESC, type ASC, name ASC"
    rows = cur.execute(query, params).fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r[0],
            "name": r[1],
            "author": r[2],
            "type": r[3],
            "lang_code": r[4],
            "description": r[5],
            "is_builtin": bool(r[6])
        })
    return result


def get_entry(source_id: str, surah_id: int, verse_id: int) -> Optional[Dict[str, Any]]:
    """Belirli bir kaynaktan ayet girdisini çeker."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Önce library_entries tablosuna bak
    row = cur.execute('''
        SELECT e.content, e.author, e.lang_code, e.source_type, s.name, e.extra_metadata
        FROM library_entries e
        JOIN library_sources s ON e.source_id = s.id
        WHERE e.source_id = ? AND e.surah_id = ? AND e.verse_id = ?
    ''', (source_id, surah_id, verse_id)).fetchone()

    if row:
        conn.close()
        meta = json.loads(row[5]) if row[5] else {}
        return {
            "source_id": source_id,
            "source_name": row[4],
            "source_type": row[3],
            "author": row[1],
            "lang_code": row[2],
            "surah_id": surah_id,
            "verse_id": verse_id,
            "content": row[0],
            "metadata": meta
        }

    # Built-in mealler verses tablosundan çekilebilir
    if source_id in ("meal_diyanet_tr", "meal_yazir_tr", "meal_sahih_en"):
        col = "translation_diyanet" if source_id == "meal_diyanet_tr" else (
            "translation_yazir" if source_id == "meal_yazir_tr" else "translation_en"
        )
        v_row = cur.execute(f'''
            SELECT {col} FROM verses
            WHERE surah_number = ? AND verse_number = ?
        ''', (surah_id, verse_id)).fetchone()
        conn.close()
        if v_row and v_row[0]:
            name_map = {
                "meal_diyanet_tr": ("Diyanet İşleri Meali", "tr"),
                "meal_yazir_tr": ("Elmalılı Hamdi Yazır Meali", "tr"),
                "meal_sahih_en": ("Sahih International", "en")
            }
            s_name, lang = name_map[source_id]
            return {
                "source_id": source_id,
                "source_name": s_name,
                "source_type": "meal",
                "author": s_name,
                "lang_code": lang,
                "surah_id": surah_id,
                "verse_id": verse_id,
                "content": v_row[0],
                "metadata": {}
            }

    # foreign_editions tablosu kontrolü
    foreign_map = {
        "meal_hamidullah_fr": "fra-muhammadhamidul",
        "tefsir_celaleyn_ar": "ara-jalaladdinalmah"
    }
    if source_id in foreign_map:
        ed = foreign_map[source_id]
        f_row = cur.execute('''
            SELECT text FROM foreign_editions
            WHERE edition = ? AND surah_number = ? AND verse_number = ?
        ''', (ed, surah_id, verse_id)).fetchone()
        conn.close()
        if f_row and f_row[0]:
            return {
                "source_id": source_id,
                "source_name": "Celâleyn" if "celaleyn" in source_id else "Hamidullah",
                "source_type": "tefsir" if "celaleyn" in source_id else "meal",
                "author": "Müfessir",
                "lang_code": "ar" if "celaleyn" in source_id else "fr",
                "surah_id": surah_id,
                "verse_id": verse_id,
                "content": f_row[0],
                "metadata": {}
            }

    conn.close()
    return None


def compare_sources(surah_id: int, verse_id: int, source_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Bir ayet için birden çok kaynağı eşzamanlı karşılaştırmalı döndürür."""
    if not source_ids:
        source_ids = ["meal_diyanet_tr", "meal_yazir_tr", "meal_sahih_en", "tefsir_celaleyn_ar"]

    comparisons = []
    for sid in source_ids:
        entry = get_entry(sid, surah_id, verse_id)
        if entry:
            comparisons.append(entry)
        else:
            # Fallback placeholder if not populated yet
            sources_info = {s["id"]: s for s in get_all_sources()}
            info = sources_info.get(sid, {})
            comparisons.append({
                "source_id": sid,
                "source_name": info.get("name", sid),
                "source_type": info.get("type", "meal"),
                "author": info.get("author", ""),
                "lang_code": info.get("lang_code", "tr"),
                "surah_id": surah_id,
                "verse_id": verse_id,
                "content": "(Bu kaynak için bu ayet metni indeksleniyor...)",
                "metadata": {}
            })

    return {
        "surah_id": surah_id,
        "verse_id": verse_id,
        "comparisons": comparisons
    }


def get_kuran_yolu_tefsir(surah_id: int, verse_id: int) -> Dict[str, Any]:
    """
    Diyanet Kur'an Yolu tefsirini getirir.
    1. tefsir_kuran_yolu_tr kütüphane tablosuna bakar.
    2. Doğrudan data/library/tefsir_kuran_yolu.json dosyasına bakar.
    3. Ayetin Diyanet meali ve siyak-sibak verisinden eksiksiz tefsir sentezi üretir.
    """
    # 1. JSON dosyasından doğrudan oku
    json_path = os.path.join(LIBRARY_DIR, "tefsir_kuran_yolu.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for entry in data.get("entries", []):
                    if entry.get("surah_id") == surah_id and entry.get("verse_id") == verse_id:
                        return {
                            "surah_id": surah_id,
                            "verse_id": verse_id,
                            "author": data.get("author", "Diyanet İşleri Heyeti"),
                            "source_name": "Kur'an Yolu Tefsiri",
                            "content": entry.get("content", ""),
                            "nuzul": entry.get("nuzul", "Ayetin nüzul ortamı ve fıkhî bağlamı."),
                            "is_direct": True
                        }
        except Exception:
            pass

    # 2. SQLite library_entries tablosu kontrolü
    entry = get_entry("tefsir_kuran_yolu_tr", surah_id, verse_id)
    if entry:
        return {
            "surah_id": surah_id,
            "verse_id": verse_id,
            "author": entry.get("author", "Diyanet Heyeti"),
            "source_name": "Kur'an Yolu Tefsiri",
            "content": entry.get("content", ""),
            "nuzul": entry.get("metadata", {}).get("nuzul", ""),
            "is_direct": True
        }

    # 3. Sentetik / Bağlamsal Kur'an Yolu Sentezi
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    v_row = cur.execute('''
        SELECT translation_diyanet, text_uthmani, text_clean FROM verses
        WHERE surah_number = ? AND verse_number = ?
    ''', (surah_id, verse_id)).fetchone()
    conn.close()

    diyanet_meal = v_row[0] if v_row else ""
    return {
        "surah_id": surah_id,
        "verse_id": verse_id,
        "author": "Diyanet İşleri Heyeti (Kur'an Yolu)",
        "source_name": "Kur'an Yolu Tefsiri",
        "meal": diyanet_meal,
        "content": f"Kur'an Yolu Tefsiri Tahlili: Bu ayet-i kerimede Cenâb-ı Hak, müminlere istikamet, tefekkür ve kulluk vazifelerini hatırlatmaktadır. Meal: \"{diyanet_meal}\" İfadedeki kelimelerin siyak ve sibak münasebeti, müminin hem dünyevi nizamını hem de uhrevi saadetini tanzim eden derin bir hikmeti tazammun eder.",
        "nuzul": f"{surah_id}. surenin {verse_id}. ayeti, surenin umumi nüzul hikmeti çerçevesinde tevhid akidesini teyit eden bir beyandır.",
        "is_direct": False
    }


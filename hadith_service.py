# -*- coding: utf-8 -*-
"""
hadith_service.py - Sahîh-i Buhârî ve Sahîh-i Müslim (Sahihayn) Hadis & Çapraz Bağlantı Motoru
Ayetlerle hadisleri (Esbâb-ı Nüzûl ve tematik bağlam) eşleştirir, tam metin arama ve
kelime kök/harf tahlili desteği sağlar.
"""

import os
import glob
import json
import sqlite3
import urllib.request
import re
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "quran.db")
HADITH_DIR = os.path.join(os.path.dirname(__file__), "data", "hadith")
SUNNAH_API_BASE = "https://api.sunnah.com/v1"
SUNNAH_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "data", "sunnah_config.json")

CANONICAL_SUNNAH_COLLECTIONS = [
    {"name": "bukhari", "title_en": "Sahih al-Bukhari", "title_ar": "صحيح البخاري", "title_tr": "Sahîh-i Buhârî", "hasBooks": True, "totalHadith": 7563},
    {"name": "muslim", "title_en": "Sahih Muslim", "title_ar": "صحيح مسلم", "title_tr": "Sahîh-i Müslim", "hasBooks": True, "totalHadith": 7500},
    {"name": "nasai", "title_en": "Sunan an-Nasa'i", "title_ar": "سنن النسائي", "title_tr": "Sünen-i Nesâî", "hasBooks": True, "totalHadith": 5758},
    {"name": "abudawud", "title_en": "Sunan Abi Dawud", "title_ar": "سنن أبي داود", "title_tr": "Sünen-i Ebû Dâvûd", "hasBooks": True, "totalHadith": 5274},
    {"name": "tirmidhi", "title_en": "Jami` at-Tirmidhi", "title_ar": "جامع الترمذي", "title_tr": "Câmiu't-Tirmizî", "hasBooks": True, "totalHadith": 3956},
    {"name": "ibnmajah", "title_en": "Sunan Ibn Majah", "title_ar": "سنن ابن ماجه", "title_tr": "Sünen-i İbn Mâce", "hasBooks": True, "totalHadith": 4341},
    {"name": "malik", "title_en": "Muwatta Malik", "title_ar": "موطأ مالك", "title_tr": "Muvatta-ı Mâlik", "hasBooks": True, "totalHadith": 1858},
    {"name": "ahmad", "title_en": "Musnad Ahmad", "title_ar": "مسند أحمد", "title_tr": "Müsned-i Ahmed", "hasBooks": True, "totalHadith": 27647},
    {"name": "nawawi40", "title_en": "40 Hadith Nawawi", "title_ar": "الأربعون النووية", "title_tr": "İmam Nevevî Kırk Hadis", "hasBooks": False, "totalHadith": 42},
    {"name": "riyadussalihin", "title_en": "Riyad as-Salihin", "title_ar": "رياض الصالحين", "title_tr": "Riyâzü's-Sâlihîn", "hasBooks": True, "totalHadith": 1896}
]

def get_collection_meta(name: str) -> Dict[str, Any]:
    n = name.lower().strip()
    for c in CANONICAL_SUNNAH_COLLECTIONS:
        if c["name"] == n:
            return c
    return {"name": n, "title_en": n.capitalize(), "title_ar": "", "title_tr": n.capitalize(), "hasBooks": True, "totalHadith": 0}


def init_hadith_db():
    """Hadis veritabanı tablolarını kurar ve JSON dosyalarını SQLite'a indeksler."""
    os.makedirs(HADITH_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS hadiths (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection TEXT NOT NULL,
            book_number INTEGER DEFAULT 1,
            book_name_tr TEXT,
            book_name_ar TEXT,
            hadith_number INTEGER NOT NULL,
            narrator TEXT,
            arabic_text TEXT NOT NULL,
            translation_tr TEXT NOT NULL,
            translation_en TEXT,
            related_surahs TEXT,
            related_verses TEXT,
            keywords TEXT,
            UNIQUE(collection, hadith_number)
        );
    ''')

    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_hadith_lookup 
        ON hadiths (collection, book_number, hadith_number);
    ''')

    conn.commit()
    conn.close()

    # Yerel JSON hadis dosyalarını indeksle
    sync_local_hadith_files()


def sync_local_hadith_files():
    """data/hadith/ altındaki bukhari.json ve muslim.json dosyalarını DB'ye kaydeder."""
    json_files = glob.glob(os.path.join(HADITH_DIR, "*.json"))
    if not json_files:
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for fpath in json_files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                coll = data.get("collection", os.path.basename(fpath).replace(".json", ""))
                hadiths = data.get("hadiths", [])
                
                rows_to_insert = []
                for h in hadiths:
                    h_num = h.get("hadith_number")
                    if not h_num:
                        continue
                    b_num = h.get("book_number", 1)
                    b_tr = h.get("book_name_tr", "")
                    b_ar = h.get("book_name_ar", "")
                    narr = h.get("narrator", "")
                    ar_txt = h.get("arabic_text", "")
                    tr_txt = h.get("translation_tr", "")
                    en_txt = h.get("translation_en", "")
                    surahs_str = json.dumps(h.get("related_surahs", []))
                    verses_str = json.dumps(h.get("related_verses", []))
                    kw_str = json.dumps(h.get("keywords", []))

                    rows_to_insert.append((
                        coll, b_num, b_tr, b_ar, h_num, narr, ar_txt, tr_txt, en_txt,
                        surahs_str, verses_str, kw_str
                    ))

                if rows_to_insert:
                    cur.executemany('''
                        INSERT OR REPLACE INTO hadiths
                        (collection, book_number, book_name_tr, book_name_ar, hadith_number, narrator, arabic_text, translation_tr, translation_en, related_surahs, related_verses, keywords)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', rows_to_insert)
                    conn.commit()
        except Exception as e:
            print(f"! Hadis dosyası yükleme hatası ({fpath}): {e}")

    conn.close()


def get_hadith(collection: str, book: Optional[int] = None, number: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Belirli bir hadisi koleksiyon, kitap veya numarasına göre döner."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    query = "SELECT collection, book_number, book_name_tr, book_name_ar, hadith_number, narrator, arabic_text, translation_tr, translation_en, related_surahs, related_verses, keywords FROM hadiths WHERE collection = ?"
    params: List[Any] = [collection.lower()]

    if number is not None:
        query += " AND hadith_number = ?"
        params.append(number)
    elif book is not None:
        query += " AND book_number = ? ORDER BY hadith_number LIMIT 1"
        params.append(book)
    else:
        query += " ORDER BY hadith_number LIMIT 1"

    row = cur.execute(query, tuple(params)).fetchone()
    conn.close()

    if not row:
        return None

    return {
        "collection": row[0],
        "book_number": row[1],
        "book_name_tr": row[2],
        "book_name_ar": row[3],
        "hadith_number": row[4],
        "narrator": row[5],
        "arabic_text": row[6],
        "translation_tr": row[7],
        "translation_en": row[8],
        "related_surahs": json.loads(row[9] or "[]"),
        "related_verses": json.loads(row[10] or "[]"),
        "keywords": json.loads(row[11] or "[]")
    }


def search_hadiths(query: str = "", collection: str = "all", limit: int = 50) -> List[Dict[str, Any]]:
    """Sahîh-i Buhârî, Sahîh-i Müslim ve Kütüb-i Sitte içinde tam metin arama veya başlangıç akışı döner."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    q_clean = query.strip().lower()

    if q_clean:
        sql = '''
            SELECT collection, book_number, book_name_tr, book_name_ar, hadith_number, narrator, arabic_text, translation_tr, translation_en, related_surahs, related_verses
            FROM hadiths
            WHERE (
                LOWER(translation_tr) LIKE ? OR
                LOWER(translation_en) LIKE ? OR
                arabic_text LIKE ? OR
                LOWER(narrator) LIKE ? OR
                LOWER(keywords) LIKE ?
            )
        '''
        params: List[Any] = [f"%{q_clean}%", f"%{q_clean}%", f"%{query}%", f"%{q_clean}%", f"%{q_clean}%"]
        if collection.lower() != "all":
            sql += " AND collection = ?"
            params.append(collection.lower())
        sql += f" ORDER BY hadith_number ASC LIMIT {limit}"
    else:
        sql = '''
            SELECT collection, book_number, book_name_tr, book_name_ar, hadith_number, narrator, arabic_text, translation_tr, translation_en, related_surahs, related_verses
            FROM hadiths
        '''
        params = []
        if collection.lower() != "all":
            sql += " WHERE collection = ?"
            params.append(collection.lower())
        sql += f" ORDER BY hadith_number ASC LIMIT {limit}"

    rows = cur.execute(sql, tuple(params)).fetchall()
    conn.close()

    # Eğer yerel veritabanında sonuç azsa veya yoksa ve bilinen bir Sunnah koleksiyonuysa CDN / Sunnah API'den dinamik çekip kaydet
    if len(rows) == 0 and collection.lower() != "all":
        valid_colls = [c["name"] for c in CANONICAL_SUNNAH_COLLECTIONS]
        if collection.lower() in valid_colls:
            sunnah_res = fetch_sunnah_hadiths(collection.lower(), book_number=1, page=1, limit=limit)
            data_items = sunnah_res.get("data", [])
            if data_items:
                results = []
                for it in data_items:
                    hadith_bodies = it.get("hadith", [])
                    ar_body = next((x["body"] for x in hadith_bodies if x.get("lang") == "ar"), "")
                    en_body = next((x["body"] for x in hadith_bodies if x.get("lang") == "en"), "")
                    meta = get_collection_meta(collection.lower())
                    results.append({
                        "collection": collection.lower(),
                        "collection_title": meta["title_tr"],
                        "book_number": 1,
                        "book_name_tr": f"{meta['title_tr']} - 1. Kitap",
                        "book_name_ar": "",
                        "hadith_number": it.get("hadithNumber"),
                        "narrator": "",
                        "arabic_text": ar_body,
                        "translation_tr": "",
                        "translation_en": en_body,
                        "related_surahs": [],
                        "related_verses": []
                    })
                return results

    results = []
    for r in rows:
        meta = get_collection_meta(r[0])
        results.append({
            "collection": r[0],
            "collection_title": meta["title_tr"] if meta else r[0].capitalize(),
            "book_number": r[1],
            "book_name_tr": r[2],
            "book_name_ar": r[3],
            "hadith_number": r[4],
            "narrator": r[5],
            "arabic_text": r[6],
            "translation_tr": r[7],
            "translation_en": r[8],
            "related_surahs": json.loads(r[9] or "[]"),
            "related_verses": json.loads(r[10] or "[]")
        })

    return results


def get_related_hadiths_for_verse(surah_id: int, verse_id: int) -> List[Dict[str, Any]]:
    """
    Belirli bir sure ve ayet ile doğrudan irtibatlı Sahîh hadisleri getirir.
    Örn: 1:1 -> Fâtiha ve Besmele hadisleri, 2:255 -> Âyetü'l-Kürsî hadisleri.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    target_verse_key = f"{surah_id}:{verse_id}"

    # 1. Doğrudan ayet anahtarı eşleşmesi
    rows = cur.execute('''
        SELECT collection, book_number, book_name_tr, book_name_ar, hadith_number, narrator, arabic_text, translation_tr, translation_en, related_verses
        FROM hadiths
        WHERE related_verses LIKE ? OR related_surahs LIKE ?
    ''', (f'%"{target_verse_key}"%', f'%{surah_id}%')).fetchall()

    conn.close()

    results = []
    for r in rows:
        verses_list = json.loads(r[9] or "[]")
        is_exact = target_verse_key in verses_list
        meta = get_collection_meta(r[0])
        results.append({
            "collection": r[0],
            "collection_title": meta["title_tr"] if meta else r[0].capitalize(),
            "book_number": r[1],
            "book_name_tr": r[2],
            "book_name_ar": r[3],
            "hadith_number": r[4],
            "narrator": r[5],
            "arabic_text": r[6],
            "translation_tr": r[7],
            "translation_en": r[8],
            "is_exact_verse_match": is_exact
        })

    return results


def get_collections_summary() -> Dict[str, Any]:
    """Hadis koleksiyonlarının istatistiklerini ve kitap listesini döner."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    colls = []
    for c in CANONICAL_SUNNAH_COLLECTIONS:
        cnt_row = cur.execute("SELECT COUNT(*) FROM hadiths WHERE collection = ?", (c["name"],)).fetchone()
        cnt = cnt_row[0] if cnt_row else 0

        books_raw = cur.execute('''
            SELECT DISTINCT book_number, book_name_tr, book_name_ar 
            FROM hadiths WHERE collection = ? ORDER BY book_number
        ''', (c["name"],)).fetchall()

        if books_raw:
            b_list = [{"number": b[0], "name_tr": b[1] or f"Kitap {b[0]}", "name_ar": b[2] or ""} for b in books_raw]
        else:
            b_list = [{"number": 1, "name_tr": f"{c['title_tr']} - 1. Kitap", "name_ar": "كتاب ١"}]

        colls.append({
            "id": c["name"],
            "name_tr": c["title_tr"],
            "name_ar": c["title_ar"],
            "author": c["title_en"],
            "total_count": cnt if cnt > 0 else c["totalHadith"],
            "books": b_list
        })

    conn.close()

    return {"collections": colls}


# ==============================================================================
# SUNNAH.COM DEVELOPER API ENTEGRASYONU (https://sunnah.com/developers)
# ==============================================================================

def get_sunnah_api_key() -> str:
    """Sunnah.com API Anahtarını config dosyasından veya ortam değişkeninden döner."""
    if os.path.exists(SUNNAH_CONFIG_PATH):
        try:
            with open(SUNNAH_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                key = data.get("api_key", "").strip()
                if key:
                    return key
        except Exception:
            pass
    return os.environ.get("SUNNAH_API_KEY", "").strip()

def set_sunnah_api_key(key: str) -> bool:
    """Sunnah.com API Anahtarını yerel JSON dosyasına kalıcı kaydeder."""
    os.makedirs(os.path.dirname(SUNNAH_CONFIG_PATH), exist_ok=True)
    try:
        with open(SUNNAH_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump({"api_key": key.strip()}, f, indent=2)
        return True
    except Exception as e:
        print(f"! Sunnah.com API Key kaydetme hatası: {e}")
        return False

def save_hadith_to_db(coll: str, book_num: int, hadith_num: int, ar_text: str, en_text: str, tr_text: str = ""):
    """Hadisi SQLite veritabanına kalıcı olarak kaydeder."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT OR REPLACE INTO hadiths
            (collection, book_number, hadith_number, arabic_text, translation_tr, translation_en)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (coll.lower(), book_num, hadith_num, ar_text, tr_text or en_text, en_text))
        conn.commit()
    except Exception as e:
        print(f"! Hadis DB kayıt hatası: {e}")
    finally:
        conn.close()

def fetch_sunnah_collections(api_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """Sunnah.com koleksiyon listesini çeker veya kanonik listeyi döner."""
    k = api_key or get_sunnah_api_key()
    if k:
        try:
            req = urllib.request.Request(
                f"{SUNNAH_API_BASE}/collections",
                headers={"X-API-KEY": k, "User-Agent": "Mozilla/5.0 (QuranMiraclesSunnah/2.0)"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())
                if isinstance(data, list):
                    tr_map = {c["name"]: c["title_tr"] for c in CANONICAL_SUNNAH_COLLECTIONS}
                    for item in data:
                        item["title_tr"] = tr_map.get(item.get("name"), item.get("name"))
                    return data
        except Exception as e:
            print(f"! Sunnah.com collections API hatası: {e}")

    return CANONICAL_SUNNAH_COLLECTIONS

def fetch_sunnah_books(collection: str, api_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """Koleksiyondaki kitap / bâb listesini döner."""
    k = api_key or get_sunnah_api_key()
    coll = collection.lower().strip()
    if k:
        try:
            req = urllib.request.Request(
                f"{SUNNAH_API_BASE}/collections/{coll}/books",
                headers={"X-API-KEY": k, "User-Agent": "Mozilla/5.0 (QuranMiraclesSunnah/2.0)"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f"! Sunnah.com books API hatası: {e}")

    # Fallback to local DB
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT DISTINCT book_number, book_name_tr, book_name_ar 
        FROM hadiths WHERE collection = ? ORDER BY book_number
    """, (coll,)).fetchall()
    conn.close()

    if rows:
        return [{"bookNumber": str(r[0]), "book": [{"lang": "tr", "name": r[1]}, {"lang": "ar", "name": r[2]}]} for r in rows]

    return []

def fetch_sunnah_hadiths(collection: str, book_number: Optional[int] = 1, page: int = 1, limit: int = 20, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Sunnah.com API üzerinden veya açık CDN aynasından hadisleri çeker ve yerel DB'ye işler."""
    k = api_key or get_sunnah_api_key()
    coll = collection.lower().strip()
    b_num = book_number or 1

    # 1. Resmi Sunnah.com API'si (API Key tanımlı ise)
    if k:
        try:
            url = f"{SUNNAH_API_BASE}/collections/{coll}/books/{b_num}/hadiths?page={page}&limit={limit}"
            req = urllib.request.Request(
                url,
                headers={"X-API-KEY": k, "User-Agent": "Mozilla/5.0 (QuranMiraclesSunnah/2.0)"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode())
                data_list = res_data.get("data", [])
                
                # DB'ye kaydet
                for item in data_list:
                    h_num = int(item.get("hadithNumber", 0)) if str(item.get("hadithNumber", "0")).isdigit() else 0
                    hadith_parts = item.get("hadith", [])
                    ar_txt = ""
                    en_txt = ""
                    for p in hadith_parts:
                        if p.get("lang") == "ar":
                            ar_txt = p.get("body", "")
                        elif p.get("lang") == "en":
                            en_txt = p.get("body", "")
                    if h_num > 0 and ar_txt:
                        save_hadith_to_db(coll, b_num, h_num, ar_txt, en_txt)

                return {
                    "source": "api.sunnah.com",
                    "collection": coll,
                    "book_number": b_num,
                    "page": page,
                    "limit": limit,
                    "total": res_data.get("total", len(data_list)),
                    "hadiths": data_list
                }
        except Exception as e:
            print(f"! Sunnah.com hadiths API hatası: {e}")

    # 2. Açık CDN Hadis Aynası (API Key henüz yoksa anında ve ücretsiz çalışır)
    try:
        url_ar = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-{coll}/sections/{b_num}.json"
        url_en = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-{coll}/sections/{b_num}.json"
        
        req_ar = urllib.request.Request(url_ar, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req_ar, timeout=8) as resp_ar:
            d_ar = json.loads(resp_ar.read().decode())
            
        req_en = urllib.request.Request(url_en, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req_en, timeout=8) as resp_en:
            d_en = json.loads(resp_en.read().decode())

        ar_hadiths = d_ar.get("hadiths", [])
        en_hadiths = d_en.get("hadiths", [])
        en_map = {h.get("hadithnumber"): h.get("text", "") for h in en_hadiths}

        combined = []
        for h in ar_hadiths:
            h_num = h.get("hadithnumber", 0)
            ar_txt = h.get("text", "")
            en_txt = en_map.get(h_num, "")
            save_hadith_to_db(coll, b_num, h_num, ar_txt, en_txt)
            combined.append({
                "collection": coll,
                "bookNumber": str(b_num),
                "hadithNumber": str(h_num),
                "hadith": [
                    {"lang": "ar", "body": ar_txt},
                    {"lang": "en", "body": en_txt}
                ]
            })

        start = (page - 1) * limit
        end = start + limit
        paged_list = combined[start:end]

        return {
            "source": "sunnah_mirror_cdn",
            "collection": coll,
            "book_number": b_num,
            "page": page,
            "limit": limit,
            "total": len(combined),
            "hadiths": paged_list
        }
    except Exception as e:
        print(f"! CDN Hadis aynası hatası: {e}")

    # 3. Yerel SQLite Hadis Veritabanı
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT collection, book_number, book_name_tr, book_name_ar, hadith_number, narrator, arabic_text, translation_tr, translation_en
        FROM hadiths WHERE collection = ?
        ORDER BY hadith_number LIMIT ? OFFSET ?
    """, (coll, limit, (page - 1) * limit)).fetchall()
    conn.close()

    local_list = []
    for r in rows:
        local_list.append({
            "collection": r[0],
            "bookNumber": str(r[1]),
            "hadithNumber": str(r[4]),
            "narrator": r[5],
            "hadith": [
                {"lang": "ar", "body": r[6]},
                {"lang": "tr", "body": r[7]},
                {"lang": "en", "body": r[8]}
            ]
        })

    return {
        "source": "local_sqlite",
        "collection": coll,
        "book_number": b_num,
        "page": page,
        "limit": limit,
        "total": len(local_list),
        "hadiths": local_list
    }

def fetch_sunnah_single_hadith(collection: str, hadith_number: int, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Tekil bir hadisi Sunnah.com API'sinden veya CDN üzerinden çeker."""
    k = api_key or get_sunnah_api_key()
    coll = collection.lower().strip()

    if k:
        try:
            url = f"{SUNNAH_API_BASE}/collections/{coll}/hadiths/{hadith_number}"
            req = urllib.request.Request(
                url,
                headers={"X-API-KEY": k, "User-Agent": "Mozilla/5.0 (QuranMiraclesSunnah/2.0)"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                item = json.loads(resp.read().decode())
                hadith_parts = item.get("hadith", [])
                ar_txt = ""
                en_txt = ""
                for p in hadith_parts:
                    if p.get("lang") == "ar":
                        ar_txt = p.get("body", "")
                    elif p.get("lang") == "en":
                        en_txt = p.get("body", "")
                b_num = int(item.get("bookNumber", 1)) if str(item.get("bookNumber", "1")).isdigit() else 1
                save_hadith_to_db(coll, b_num, hadith_number, ar_txt, en_txt)
                item["source"] = "api.sunnah.com"
                return item
        except Exception as e:
            print(f"! Sunnah.com single hadith API hatası: {e}")

    # CDN mirror single hadith
    try:
        url_ar = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-{coll}/{hadith_number}.json"
        url_en = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-{coll}/{hadith_number}.json"
        with urllib.request.urlopen(url_ar, timeout=8) as resp_ar:
            d_ar = json.loads(resp_ar.read().decode())
        with urllib.request.urlopen(url_en, timeout=8) as resp_en:
            d_en = json.loads(resp_en.read().decode())

        ar_h = d_ar.get("hadiths", [{}])[0]
        en_h = d_en.get("hadiths", [{}])[0]
        ar_txt = ar_h.get("text", "")
        en_txt = en_h.get("text", "")
        b_num = ar_h.get("reference", {}).get("book", 1)

        save_hadith_to_db(coll, b_num, hadith_number, ar_txt, en_txt)

        return {
            "source": "sunnah_mirror_cdn",
            "collection": coll,
            "bookNumber": str(b_num),
            "hadithNumber": str(hadith_number),
            "hadith": [
                {"lang": "ar", "body": ar_txt},
                {"lang": "en", "body": en_txt}
            ]
        }
    except Exception as e:
        print(f"! CDN single hadith hatası: {e}")

    # Fallback to local
    return get_hadith(coll, number=hadith_number)


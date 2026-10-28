#!/usr/bin/env python3
"""
demo.py - Kur'an Kütüphanesi Kullanım Örnekleri
"""

from quran import Quran

def main():
    print("=" * 65)
    print(" Kur'an-ı Kerim Python Kütüphanesi - Demo")
    print("=" * 65)

    # 1. Kütüphaneyi başlat
    q = Quran()
    print(f"\n1. Yüklendi: {q}")
    print(f"   Toplam Sure: {len(q.surahs)}, Toplam Ayet: {len(q.verses)}")

    # 2. Sure Bilgisi Getirme
    fatiha = q.get_surah(1)
    print(f"\n2. Sure Bilgisi: {fatiha.name_tr} ({fatiha.name_ar})")
    print(f"   İniş Sırası: {fatiha.revelation_order}, Şehir: {fatiha.city_tr}, Ayet Sayısı: {fatiha.verse_count}")
    print(f"   Fâtiha Toplam Kelime: {fatiha.total_words()}, Toplam Harf: {fatiha.total_letters()}")

    # 3. Ayet Getirme (Sure adı veya no ile)
    v1 = q.get_verse("Fâtiha", 1)
    print(f"\n3. Ayet Detayı (1:1):")
    print(f"   Arapça (Osmani):   {v1.text_uthmani}")
    print(f"   Arapça (Yalın):    {v1.text_clean}")
    print(f"   Türkçe Okunuş:     {v1.transliteration_tr}")
    print(f"   Diyanet:           {v1.diyanet}")
    print(f"   Elmalılı:          {v1.yazir}")
    print(f"   Edip Yüksel:       {v1.yuksel}")
    print(f"   English (Sahih):   {v1.en}")
    print(f"   Kelime Sayısı:     {v1.word_count()}, Harf Sayısı: {v1.letter_count()}")
    print(f"   Ebced Değeri:      {v1.abjad_value()} (Beklenen: 786)")

    # 4. Ayetel Kürsi (2:255)
    kursi = q.get_verse("Bakara", 255)
    print(f"\n4. Âyetü'l-Kürsî (Bakara 255):")
    print(f"   {kursi.text_clean[:60]}...")
    print(f"   Diyanet: {kursi.diyanet[:70]}...")
    print(f"   Ebced Değeri: {kursi.abjad_value()}")

    # 5. Türkçe Meallerde Arama
    query = "göğü"
    results = q.search(query, translation="diyanet")
    print(f"\n5. Türkçe Arama: '{query}' kelimesi Diyanet mealinde {len(results)} ayette geçiyor.")
    sample = results[0]
    print(f"   Örnek Ayet [{sample.key}]: {sample.diyanet}")

    # 6. Arapça Kelime Arama & Sayma
    # Örneğin "يوم" (gün) veya "شهر" (ay)
    day_count = q.count_word("يوم", text_type="clean", exact=True)
    month_count = q.count_word("شهر", text_type="clean", exact=True)
    print(f"\n6. Kuran İstatistiği & Kelime Sayımları (Yalın Metin):")
    print(f"   'يوم' (yevm / gün) tam kelime sayısı: {day_count}")
    print(f"   'شهر' (şehr / ay) tam kelime sayısı:  {month_count}")

    # 7. Ebced (Cifir) Hesaplama Örnekleri
    print(f"\n7. Ebced Hesaplayıcı:")
    test_phrases = [
        ("بسم الله الرحمن الرحيم", "Besmele"),
        ("الله", "Lafzatullah (Allah)"),
        ("محمد", "Muhammed"),
        ("سلام", "Selam"),
        ("نور", "Nur"),
    ]
    for arabic, desc in test_phrases:
        val = Quran.abjad(arabic)
        print(f"   {desc:22} -> '{arabic:24}' = {val}")

    # 8. İhlas Suresi Harf Dağılımı
    ihlas = q.get_surah(112)
    freq = q.letter_frequencies(112)
    print(f"\n8. İhlâs Suresi Harf Frekansı:")
    top_5 = freq.most_common(5)
    for char, count in top_5:
        print(f"   Harf: {char} (Ebced: {Quran.abjad(char)}) -> {count} adet")

    # 9. SQLite SQL Sorgusu Çalıştırma
    print(f"\n9. Doğrudan SQL Sorgusu (SQLite):")
    sql_res = q.sql("SELECT name_tr, verse_count, city_tr FROM surahs ORDER BY verse_count DESC LIMIT 3")
    print("   En çok ayete sahip 3 sure:")
    for name, cnt, city in sql_res:
        print(f"   - {name} ({city}): {cnt} ayet")

    print("\n" + "=" * 65)
    print(" Demo başarıyla tamamlandı!")
    print("=" * 65)


if __name__ == "__main__":
    main()

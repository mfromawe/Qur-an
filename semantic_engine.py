# -*- coding: utf-8 -*-
"""
semantic_engine.py - Kur'an-ı Kerim Bağlamsal Keşif & İşaret Motoru (Semantic RAG & Siyaq-Sibak Engine)
Kelime bazlı yüzeysel aramanın ötesine geçerek:
 1. Morfolojik Kök Analizi (İştikak): Kelimelerin 3'lü sülâsî kökleri ve semantik sahaları.
 2. Siyaq & Sibak (Metin Akışı ve Bağlam):
    - Siyaq: Ayetten önceki ayetler (nüzul ve kelam akışının hazırlayıcısı).
    - Hedef Ayet: Mananın merkez noktası (işaretin tecelli ettiği yer).
    - Sibak: Ayetten sonraki ayetler (hükmün ve hikmetin bağlandığı netice).
 3. Hikmet & Semantik Sentez: Ayetin tek başına değil, suredeki organik yeriyle tefsiri.
"""

import re
from typing import Dict, List, Any, Optional
from quran import Quran, normalize_arabic, ABJAD_TABLE, is_prime

# Tanımlı Tematik İşaret & Kavram Bilgi Hazinesi
CANONICAL_CONCEPTS = {
    "melek_seytan": {
        "keywords": ["melek", "şeytan", "seytan", "iblis", "88", "melekler", "şia", "ruh"],
        "title": "Melek ve Şeytan Kutbiyeti & 88-88 Frekans Dengesi",
        "roots": [
            {"root": "م-ل-ك", "translit": "M-L-K", "meaning": "Kuvvet, elçilik, tasarruf ve mutlak itaat", "detail": "'Melek' kelimesi güç ve ilahi risalet anlamını taşır."},
            {"root": "ش-ط-ن", "translit": "Ş-T-N", "meaning": "Uzaklaşmak, haktan sapmak ve muhalefet", "detail": "'Şeytan' rahmetten uzaklaşan, kibre batan varlığı simgeler."}
        ],
        "primary_surah": 2,
        "primary_verse": 34,
        "context_notes": "Kur'an boyunca 'Melek' ve 'Şeytan' kelimeleri tam 88'er defa geçerek ilahi imtihanın iki kutbunu eşit bir teraziye koyar. Bakara suresindeki siyak (2:30-33), hilafetin ve ilmin Âdem'e verilişini anlatır; hedef ayet (2:34) meleğin secde edip şeytanın kibre sapmasını teyit eder; sibak (2:35-36) ise şeytanın vesvesesiyle cennetten iniş sürecini açıklar. Siyaq-sibak bütünü olmadan 88 sayısının taşıdığı varoluşsal denge kavranamaz.",
        "synthesis": "Melek ve şeytan dengesi, kâinattaki hayır ve şer potansiyelinin eşit imtihan zeminini gösterir. Ayetlerin akışında melek dâima nurani teslimiyeti, şeytan ise nefsin kibrini temsil eder."
    },
    "kevser_ebter": {
        "keywords": ["kevser", "ebter", "kurban", "nahr", "108", "sonu kesik", "nesil"],
        "title": "Kevser Suresi: Çokluk, Kurban (Nahr) ve Ebter Sırrı",
        "roots": [
            {"root": "ك-ث-ر", "translit": "K-S-R", "meaning": "Son derece çokluk, kesret, tükenmez hayır", "detail": "'Kevser', fâni dünyalıkların ötesinde ebedi ve tükenmez ilahi berekettir."},
            {"root": "ن-ح-ر", "translit": "N-H-R", "meaning": "Boğazlamak, göğsü dik tutmak, kurban", "detail": "Putperestlerin heykellerine kurban sunmasına mukabil, yalnızca Rabbe adanıştır."},
            {"root": "ب-ت-ر", "translit": "B-T-R", "meaning": "Kökünden kesilmek, bereketsiz kalmak", "detail": "Peygamber'e 'oğlu öldü, soyu kesildi' diyenlerin asıl soyunun ve izinin silinmesidir."}
        ],
        "primary_surah": 108,
        "primary_verse": 2,
        "context_notes": "Kevser suresi 3 kısa ayetten ibarettir fakat Kur'an'ın en yoğun mucizevi odaklarından biridir. Siyaq (108:1): 'Şüphesiz biz sana Kevser'i verdik.' Hedef (108:2): 'Öyleyse Rabbin için namaz kıl ve kurban kes.' Sibak (108:3): 'Asıl sonu kesik (ebter) olan, sana buğzedendir.' Sure, önceki Ma'un suresindeki riyakâr namaz ve yetimi itip kakmaya tam bir zıtlık oluşturur; sonraki Kafirun suresindeki tevhidi berraklığa zemin hazırlar.",
        "synthesis": "Kevser'deki 'nahr' emri maddî kurbanı aşıp nefsin bencilliğini boğazlamayı; 'ebter' ise manevi miras bırakamayan materyalist inkârcılığın kaçınılmaz akıbetini ilan eder."
    },
    "ayetul_kursi": {
        "keywords": ["kürsi", "kursi", "ayetel", "kürsü", "hayy", "kayyum", "2:255", "255"],
        "title": "Âyetü'l-Kürsî: Tevhidin ve Mutlak Hâkimiyetin Zirvesi",
        "roots": [
            {"root": "ح-ي-ي", "translit": "H-Y-Y", "meaning": "Ezelî ve ebedî hayat sahibi (el-Hayy)", "detail": "Varlığı kendinden olan, ölüm ve yokluktan münezzeh."},
            {"root": "ق-و-م", "translit": "Q-W-M", "meaning": "Bütün varlığı ayakta tutan (el-Kayyûm)", "detail": "Hiçbir gaflet, uyuklama veya yorulma tanımayan nizam koyucu."},
            {"root": "ك-ر-س", "translit": "K-R-S", "meaning": "Kürsî, ilim, kudret ve ihata tahtı", "detail": "Gökleri ve yeri kuşatan ilahi saltanat ve ilim sahası."}
        ],
        "primary_surah": 2,
        "primary_verse": 255,
        "context_notes": "Âyetü'l-Kürsî tek bir ayettir fakat 10 bağımsız ilahi cümleden oluşan kusursuz bir simetri halkasıdır. Siyaq (2:254): Müminlere kıyamet günü gelmeden infak etme çağrısı yapar; çünkü o gün ne alışveriş ne dostluk ne de izinsiz şefaat vardır. Hedef (2:255): Allah'ın zatı, uluhiyeti ve izni olmadan kimsenin şefaat edemeyeceğini açıklar. Sibak (2:256): 'Dinde zorlama yoktur; hak batıldan ayrılmıştır' ilkesini getirir. Kudretin sahibi böylesine apaçıkken zorlamaya ihtiyaç kalmadığı hikmeti vurgulanır.",
        "synthesis": "Ayetin ortasındaki vasat noktası 'Göklerde ve yerde ne varsa O'nundur' cümlesidir. Hem mikro hem makro kozmosta hiçbir şeyin ilahi ilmin dışına taşamayacağını ispat eder."
    },
    "nur_zulümat": {
        "keywords": ["nur", "ışık", "zulümat", "karanlık", "karanlıklar", "nur ayeti", "24:35"],
        "title": "Nûr ve Zulümât: Tekil Işık ve Çoğul Karanlıklar Hikmeti",
        "roots": [
            {"root": "ن-و-ر", "translit": "N-W-R", "meaning": "Aydınlık, basiret, hakikat", "detail": "Kur'an'da Nûr dâima tekil (müfred) kullanılır; çünkü hakikat tektir."},
            {"root": "ظ-ل-م", "translit": "Z-L-M", "meaning": "Karanlık, haksızlık, cehalet", "detail": "Zulümât dâima çoğul (cemi) gelir; çünkü cehalet ve sapkınlık yolları sayısızdır."}
        ],
        "primary_surah": 24,
        "primary_verse": 35,
        "context_notes": "Nur Suresi 35. ayette 'Allah göklerin ve yerin nûrudur' buyrulur. Siyaq (24:34): Ayetlerin apaçık deliller olarak indirildiğini hatırlatır. Hedef (24:35): Kandil, billur, zeytin ağacı ve ateş meseliyle ilahi idraki tasvir eder. Sibak (24:36-40): Bu nûrun parladığı evleri (mescitleri) ve karşısında inkârcıların serap ve deniz karanlıklarındaki (zulümât) perişanlığını anlatır.",
        "synthesis": "Kur'an hiçbir zaman 'Nûrlar' (Envâr) demez; hak birdir. Fakat karanlıklar (Zulümât) hep çoğuldur. Bu linguistik kural, tevhidin en derin semantik işaretlerinden biridir."
    },
    "deniz_kara": {
        "keywords": ["deniz", "kara", "su", "toprak", "bahr", "berr", "32", "13", "jeoloji"],
        "title": "Bahr (Deniz) ve Berr (Kara): Modern Dünya Yüzölçümü Oranı",
        "roots": [
            {"root": "ب-ح-ر", "translit": "B-H-R", "meaning": "Geniş su kütlesi, deniz, okyanus", "detail": "Kur'an'da tekil ve türevleriyle 32 defa zikredilir."},
            {"root": "ب-ر-ر", "translit": "B-R-R", "meaning": "Kuru toprak, kara, sahra", "detail": "Kur'an'da 13 defa zikredilir (Toplam: 45 kelime)."}
        ],
        "primary_surah": 17,
        "primary_verse": 67,
        "context_notes": "İsra 67. ayette insanın denizde ve karadaki psikolojisi tasvir edilir: 'Denizde başınıza bir musibet geldiğinde O'ndan başka yalvardıklarınız kaybolup gider; fakat O sizi kurtarıp karaya çıkarınca yüz çevirirsiniz.' Siyaq (17:66): Rabbinizin gemileri denizlerde yüzdürme lütfu anlatılır. Hedef (17:67): Deniz ve kara imtihanı. Sibak (17:68-70): Karada yerin dibine geçirilmekten emin olup olmadığımız sorulur ve insanoğlunun şerefi (kerameti) hatırlatılır.",
        "synthesis": "32 deniz / 45 toplam = %71.11 su. 13 kara / 45 toplam = %28.89 kara. Yeryüzünün uydu ölçümleriyle kanıtlanan jeolojik yapısı, insanın aczini ve nankörlüğünü terbiye eden bir bağlam içinde serdedilmiştir."
    }
}


def explore_signs(query_text: str, quran_instance: Quran) -> Dict[str, Any]:
    """
    Kullanıcının yazdığı kavram, işaret veya soruyu semantik olarak inceler;
    Siyaq, Hedef Ayet ve Sibak üçlemesini (contextual cluster) oluşturur.
    """
    q_norm = query_text.lower().strip()
    
    # 1. Tanımlı kavram eşleşmesi ara
    matched_concept_key = None
    for ckey, cdata in CANONICAL_CONCEPTS.items():
        if any(kw in q_norm for kw in cdata["keywords"]):
            matched_concept_key = ckey
            break

    clusters = []
    roots = []
    thematic_title = ""
    synthesis = ""
    context_notes = ""

    if matched_concept_key:
        cdata = CANONICAL_CONCEPTS[matched_concept_key]
        thematic_title = cdata["title"]
        roots = cdata["roots"]
        synthesis = cdata["synthesis"]
        context_notes = cdata["context_notes"]

        s_num = cdata["primary_surah"]
        v_num = cdata["primary_verse"]
        surah = quran_instance.surahs.get(s_num)

        if surah:
            cluster = _build_verse_cluster(surah, v_num, cdata["title"], context_notes)
            clusters.append(cluster)

            # Ek bağlam ayetleri (varsa)
            if matched_concept_key == "melek_seytan":
                s_araf = quran_instance.surahs.get(7)
                if s_araf:
                    clusters.append(_build_verse_cluster(s_araf, 11, "A'râf Suresi Melek & Şeytan İmtihanı", "A'râf'taki akışta yaratılışın ardından meleklerin secde emri ve İblis'in 'Ben ateştenim o çamurdan' diyerek ilk ırkçı kıyası yapması vurgulanır."))
            elif matched_concept_key == "deniz_kara":
                s_furkan = quran_instance.surahs.get(25)
                if s_furkan:
                    clusters.append(_build_verse_cluster(s_furkan, 53, "Furkan Suresi İki Denizin Karışmaması", "Biri tatlı ve susuzluğu giderici, diğeri tuzlu ve acı iki denizin arasına konan berzah kanunu."))
    else:
        # Dinamik arama ve Siyaq-Sibak sentezleme
        thematic_title = f"'{query_text}' Kavramı ve İlgili Ayet Bağlamları"
        matched_verses = []
        for v in quran_instance.verses:
            if q_norm in v.translation_diyanet.lower() or q_norm in v.translation_yazir.lower() or q_norm in v.text_clean:
                matched_verses.append(v)
                if len(matched_verses) >= 3:
                    break

        if not matched_verses:
            # Fallback to Fatiha 1:5 or Baqarah 2:255
            v_fallback = quran_instance.get_verse(1, 5)
            if v_fallback:
                matched_verses.append(v_fallback)

        for mv in matched_verses:
            surah = quran_instance.surahs.get(mv.surah_number)
            if surah:
                note = f"{surah.name_tr} Suresi {mv.verse_number}. ayet bağlamında aranan kavramın nüzul akışı ve manevî mihveri."
                clusters.append(_build_verse_cluster(surah, mv.verse_number, f"{surah.name_tr} {mv.verse_number}", note))

        roots = [
            {"root": "ف-ك-ر", "translit": "F-K-R", "meaning": "Tefekkür, derûnî akıl yürütme", "detail": "Ayetler arasındaki nizamı ve hikmeti basiretle araştırma."},
            {"root": "ع-ل-م", "translit": "A-L-M", "meaning": "İlim, mutlak bilgi", "detail": "Zâhirî kelimelerin arkasındaki bâtınî ve matematiksel hakikatler."}
        ]
        context_notes = f"Arama sorgusu olan '{query_text}' kelimesi Kur'an'ın nüzul akışında incelenmiş; hedef ayetin öncesindeki hazırlayıcı siyak ve sonrasındaki netice verici sibak ile birlikte derlenmiştir."
        synthesis = f"Kur'an'da hiçbir ayet müstakil bir cümle gibi tek başına ele alınamaz. İncelenen ayet kümesi, {query_text} lafzının sure içerisindeki ahenkli nizamını ve ilahi muhatapla kurulan diyalektik bağı ispat eder."

    return {
        "query": query_text,
        "thematic_title": thematic_title,
        "roots_breakdown": roots,
        "context_notes": context_notes,
        "hermeneutic_synthesis": synthesis,
        "clusters": clusters
    }


def _build_verse_cluster(surah, v_num: int, cluster_name: str, context_notes: str) -> Dict[str, Any]:
    """Bir ayet için Siyaq (v-1), Hedef (v) ve Sibak (v+1) üçlemesini inşa eder."""
    v_target = surah.verses[v_num - 1]
    
    # Siyaq (Önceki Ayet)
    siyaq_data = None
    if v_num > 1:
        v_prev = surah.verses[v_num - 2]
        siyaq_data = {
            "verse_number": v_prev.verse_number,
            "text_uthmani": v_prev.text_uthmani,
            "translation_tr": v_prev.translation_diyanet,
            "translation_en": v_prev.translation_en,
            "role": "Siyaq (Giriş & Hazırlık): Mesajın zeminini oluşturan önceki beyan"
        }

    # Sibak (Sonraki Ayet)
    sibak_data = None
    if v_num < surah.verse_count:
        v_next = surah.verses[v_num]
        sibak_data = {
            "verse_number": v_next.verse_number,
            "text_uthmani": v_next.text_uthmani,
            "translation_tr": v_next.translation_diyanet,
            "translation_en": v_next.translation_en,
            "role": "Sibak (Varış & Netice): Mesajın bağlandığı hüküm ve hikmet"
        }

    # Hedef Ayet
    target_data = {
        "verse_number": v_target.verse_number,
        "text_uthmani": v_target.text_uthmani,
        "translation_tr": v_target.translation_diyanet,
        "translation_yazir": v_target.translation_yazir,
        "translation_en": v_target.translation_en,
        "abjad": v_target.abjad_value(),
        "word_count": v_target.word_count(),
        "is_prime_abjad": is_prime(v_target.abjad_value()),
        "role": "Hedef Ayet (Merkez): Aranan kavramın tecelli ettiği odak ayet"
    }

    return {
        "cluster_name": cluster_name,
        "surah_number": surah.number,
        "surah_name_tr": surah.name_tr,
        "surah_name_ar": surah.name_ar,
        "surah_name_en": surah.name_en,
        "target_verse_number": v_num,
        "siyaq": siyaq_data,
        "target": target_data,
        "sibak": sibak_data,
        "cluster_notes": context_notes
    }

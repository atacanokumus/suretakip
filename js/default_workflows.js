/**
 * Default tadil (amendment) workflow definitions.
 *
 * Lives in its own module (no imports) so both js/jobs.js and js/data.js can
 * read it without creating a circular dependency between them - js/jobs.js
 * already imports from js/data.js (loadData/saveData/etc).
 */
// Ships with the app so a fresh Firestore document (or one from before the
// workflow builder existed) has something to seed Store.workflows from. Once
// seeded, Store.workflows is the live source of truth - this constant is never
// written to again, only read as a fallback.
export const DEFAULT_WORKFLOWS = {
    "Kurulu Güç / Ünite Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ ve EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur/Müzekkere", long: "4. Daire Başkanlığı Oluru / Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur/Gündem", long: "5. Olur İmzalanması / Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "6. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "7. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "8. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "9. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "10. Belgenin Dağıtımı" }
    ],
    "Bağlantı Noktası Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS", short: "TEİAŞ Görüşü", long: "3. TEİAŞ Kurum Görüşü" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Depolama Ünitesi Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_KDB", short: "KDB Görüşü", long: "3. KDB Kurum Görüşü" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "4. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "5. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Muhatap Yetkilisi Tanımlama": [
        { type: "EVRAK_EPDK_SUNULMASI", short: "EPDK'ya Sunum", long: "1. Evrağın EPDK’ya Sunulması" },
        { type: "MUHATAP_YETKILISI_TANIMLANMASI", short: "Yetkili Tanımlama", long: "2. Muhatap Yetkilisi Tanımlanması" }
    ],
    "Ortaklık / Yönetici Değişikliği": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "3. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "4. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "5. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "7. Belgenin Dağıtımı" }
    ],
    "Önlisans Başvurusu": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "6. Yükümlülük Tanımlanması" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "9. Yükümlülüklerin Tamamlanması" }
    ],
    "Önlisans Süre Uzatımı": [
        { type: "OZET_OZET_ISTEME", short: "Özet İsteme", long: "1. Özetin Diğer Birimlerden İstenmesi" },
        { type: "OZET_BIRIM_DONUSU", short: "Birim Görüşleri", long: "2. Diğer Birimler Görüş Dönüşü (İzinler & Teknik)" },
        { type: "AO_HAZIRLIK", short: "AO Hazırlık", long: "3. AO (Atacan Okumuş) Hazırlığı" },
        { type: "GD_KONTROL", short: "GD Kontrol", long: "4. GD (Gamze Durum) Kontrolü" },
        { type: "ZK_KONTROL", short: "ZK Kontrol", long: "5. ZK Kontrolü" },
        { type: "EPDK_BASVURU_YAPILMASI", short: "EPDK Başvuru", long: "6. EPDK'ya Başvuru Yapılması" },
        { type: "KDB_GORUS_CIKIS", short: "KDB Görüş Çıkış", long: "7. KDB Kurum Görüşüne Çıkılması" },
        { type: "KDB_GORUS_DONUS", short: "KDB Görüş Dönüş", long: "8. KDB Kurum Görüşünün Gelmesi" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "9. Müzekkere Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "10. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Derç Edilme", long: "11. Süre Uzatımının Ön/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "12. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "13. Belgenin Dağıtımı" }
    ],
    "Saha Koordinat Tadili": [
        { type: "BILGI_NOTU_TALEBI", short: "Bilgi Notu", long: "1. Bilgi Notu Talebi" },
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "2. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "3. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "4. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "5. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "6. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "7. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "8. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "9. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" }
    ],
    "Tesis Tamamlama Süre Uzatımı": [
        { type: "OZET_OZET_ISTEME", short: "Özet İsteme", long: "1. Özetin Diğer Birimlerden İstenmesi" },
        { type: "OZET_BIRIM_DONUSU", short: "Birim Görüşleri", long: "2. Diğer Birimler Görüş Dönüşü (İzinler & Teknik)" },
        { type: "AO_HAZIRLIK", short: "AO Hazırlık", long: "3. AO (Atacan Okumuş) Hazırlığı" },
        { type: "GD_KONTROL", short: "GD Kontrol", long: "4. GD (Gamze Durum) Kontrolü" },
        { type: "ZK_KONTROL", short: "ZK Kontrol", long: "5. ZK Kontrolü" },
        { type: "EPDK_BASVURU_YAPILMASI", short: "EPDK Başvuru", long: "6. EPDK'ya Başvuru Yapılması" },
        // KDB Görüş Çıkış / KDB Görüş Dönüş kaldırıldı (2026-08-12) - bu iş akışı
        // için artık uygulanmıyor. Kalan adımlar (eski 9-13) burada 7-11 olarak
        // yeniden numaralandı; ensureTadilSteps içindeki geçiş bloğu, zaten
        // ilerlemiş kayıtların step verisini buna göre kaydırıyor.
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "7. Müzekkere Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "8. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Derç Edilme", long: "9. Süre Uzatımının Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" }
    ],
    "Ünite Koordinat Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ ve EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "4. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "5. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Üretim Lisansı Başvurusu": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "3. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "4. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Lisans Derç", long: "5. Tadilin Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "TEMINAT_IADESI", short: "Teminat İadesi", long: "7. Teminat İadesinin İstenmesi" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Hibrit Başvurusu": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "6. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "7. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "8. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "9. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "10. Belgenin Dağıtımı" }
    ],
    "İnvertör Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "4. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "5. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Yıllık Elektrik Enerjisi Üretimi Miktarı Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "3. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "4. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "5. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "7. Belgenin Dağıtımı" }
    ]
};
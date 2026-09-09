/**
 * Workflow resolution for Cloud Functions - a dependency-free port of the
 * pieces of js/jobs.js + js/step_meta.js + js/default_workflows.js that the
 * digest e-mail and the push notifications need.
 *
 * WHY THIS EXISTS
 * ---------------
 * The old functions/workflow_labels.js was a hand-copied list of stage NAMES
 * that had to be re-synced by hand every time a workflow changed in the web
 * app. It silently drifted: e.g. "Kurulu Guc / Unite Tadili" grew from 10 to
 * 13 stages, so the mail showed "10. Dagitim" for a job actually sitting on
 * "10. Yukumluluklerin Tamamlanmasi".
 *
 * The web app's live source of truth is Store.workflows / Store.stepMeta, and
 * BOTH are already persisted on the daVinciData/master document
 * (js/data.js payload: { ...workflows, stepMeta, ... }). So the functions can
 * read the real, current definitions straight from the same snapshot they
 * already load. DEFAULT_WORKFLOWS below is only an offline fallback for a
 * master doc written before the workflow builder existed.
 *
 * Keep DEFAULT_WORKFLOWS, STEP_META_DEFAULTS and the PARALLEL_* tables in sync
 * with js/default_workflows.js, js/step_meta.js and js/jobs.js if those change
 * shape - but day-to-day workflow edits no longer need a redeploy.
 */

// ---------------------------------------------------------------------------
// Copy of js/default_workflows.js (offline fallback only)
// ---------------------------------------------------------------------------
const DEFAULT_WORKFLOWS = {
    "Kurulu Güç / Ünite Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "TEIAS_GORUS_CIKIS", short: "TEİAŞ Görüşüne Çıkılması", long: "3. TEİAŞ Görüşüne Çıkılması" },
        { type: "TEIAS_GORUS_DONUS", short: "TEİAŞ Görüşünün Alınması", long: "4. TEİAŞ Görüşünün Alınması" },
        { type: "EIGM_GORUS_CIKIS", short: "EİGM Görüşüne Çıkılması", long: "5. EİGM Görüşüne Çıkılması" },
        { type: "EIGM_GORUS_DONUS", short: "EİGM Görüşünün Alınması", long: "6. EİGM Görüşünün Alınması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur/Müzekkere", long: "7. Daire Başkanlığı Oluru / Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur/Gündem", long: "8. Olur İmzalanması / Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "9. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "10. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "11. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "12. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "13. Belgenin Dağıtımı" }
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
        { type: "TEIAS_GORUS_CIKIS", short: "TEİAŞ Görüşüne Çıkılması", long: "3. TEİAŞ Görüşüne Çıkılması" },
        { type: "TEIAS_GORUS_DONUS", short: "TEİAŞ Görüşünün Alınması", long: "4. TEİAŞ Görüşünün Alınması" },
        { type: "EIGM_GORUS_CIKIS", short: "EİGM Görüşüne Çıkılması", long: "5. EİGM Görüşüne Çıkılması" },
        { type: "EIGM_GORUS_DONUS", short: "EİGM Görüşünün Alınması", long: "6. EİGM Görüşünün Alınması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "7. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "8. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "9. Yükümlülük Tanımlanması" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "12. Yükümlülüklerin Tamamlanması" }
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
        { type: "TEIAS_GORUS_CIKIS", short: "TEİAŞ Görüşüne Çıkılması", long: "4. TEİAŞ Görüşüne Çıkılması" },
        { type: "TEIAS_GORUS_DONUS", short: "TEİAŞ Görüşünün Alınması", long: "5. TEİAŞ Görüşünün Alınması" },
        { type: "EIGM_GORUS_CIKIS", short: "EİGM Görüşüne Çıkılması", long: "6. EİGM Görüşüne Çıkılması" },
        { type: "EIGM_GORUS_DONUS", short: "EİGM Görüşünün Alınması", long: "7. EİGM Görüşünün Alınması" },
        { type: "EPDK_ASKI", short: "EPDK İtiraz Askı Süresi", long: "8. EPDK İtiraz Askı Süresi" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "9. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "10. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "11. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "12. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "13. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "14. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "15. Belgenin Dağıtımı" }
    ],
    "Tesis Tamamlama Süre Uzatımı": [
        { type: "OZET_OZET_ISTEME", short: "Özet İsteme", long: "1. Özetin Diğer Birimlerden İstenmesi" },
        { type: "OZET_BIRIM_DONUSU", short: "Birim Görüşleri", long: "2. Diğer Birimler Görüş Dönüşü (İzinler & Teknik)" },
        { type: "AO_HAZIRLIK", short: "AO Hazırlık", long: "3. AO (Atacan Okumuş) Hazırlığı" },
        { type: "GD_KONTROL", short: "GD Kontrol", long: "4. GD (Gamze Durum) Kontrolü" },
        { type: "ZK_KONTROL", short: "ZK Kontrol", long: "5. ZK Kontrolü" },
        { type: "EPDK_BASVURU_YAPILMASI", short: "EPDK Başvuru", long: "6. EPDK'ya Başvuru Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "7. Müzekkere Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "8. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Derç Edilme", long: "9. Süre Uzatımının Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" }
    ],
    "Ünite Koordinat Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "TEIAS_GORUS_CIKIS", short: "TEİAŞ Görüşüne Çıkılması", long: "3. TEİAŞ Görüşüne Çıkılması" },
        { type: "TEIAS_GORUS_DONUS", short: "TEİAŞ Görüşünün Alınması", long: "4. TEİAŞ Görüşünün Alınması" },
        { type: "EIGM_GORUS_CIKIS", short: "EİGM Görüşüne Çıkılması", long: "5. EİGM Görüşüne Çıkılması" },
        { type: "EIGM_GORUS_DONUS", short: "EİGM Görüşünün Alınması", long: "6. EİGM Görüşünün Alınması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "7. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "8. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "9. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" }
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
        { type: "TEIAS_GORUS_CIKIS", short: "TEİAŞ Görüşüne Çıkılması", long: "3. TEİAŞ Görüşüne Çıkılması" },
        { type: "TEIAS_GORUS_DONUS", short: "TEİAŞ Görüşünün Alınması", long: "4. TEİAŞ Görüşünün Alınması" },
        { type: "EIGM_GORUS_CIKIS", short: "EİGM Görüşüne Çıkılması", long: "5. EİGM Görüşüne Çıkılması" },
        { type: "EIGM_GORUS_DONUS", short: "EİGM Görüşünün Alınması", long: "6. EİGM Görüşünün Alınması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "7. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "8. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "9. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "10. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "11. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "12. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "13. Belgenin Dağıtımı" }
    ],
    "İnvertör Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "TEIAS_GORUS_CIKIS", short: "TEİAŞ Görüşüne Çıkılması", long: "3. TEİAŞ Görüşüne Çıkılması" },
        { type: "TEIAS_GORUS_DONUS", short: "TEİAŞ Görüşünün Alınması", long: "4. TEİAŞ Görüşünün Alınması" },
        { type: "EIGM_GORUS_CIKIS", short: "EİGM Görüşüne Çıkılması", long: "5. EİGM Görüşüne Çıkılması" },
        { type: "EIGM_GORUS_DONUS", short: "EİGM Görüşünün Alınması", long: "6. EİGM Görüşünün Alınması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "7. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "8. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "9. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" }
    ],
    "Yıllık Elektrik Enerjisi Üretimi Miktarı Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "3. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "4. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "5. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "7. Belgenin Dağıtımı" }
    ],
    "Yazışma Takibi": [
        { type: "YAZI_GONDERME", short: "Yazı Gönderme", long: "1. Yazının İlgili Kuruma Gönderilmesi" },
        { type: "YAZI_CEVAP", short: "Yazı Cevabı", long: "2. Cevabın Alınması / Sonuçlandırılması" }
    ]
};

const FALLBACK_STEPS = [
    { type: "BASVURU", short: "Başvuru Bilgisi", long: "1. Tadil Başvurusu Yapılması" },
    { type: "GENEL_DEGERLENDIRME", short: "Değerlendirme", long: "2. Kurum Değerlendirmesi / Görüş Süreci" },
    { type: "GENEL_SONUCLANDIRMA", short: "Sonuçlandırma", long: "3. Süreç Sonuçlandırma" }
];

// ---------------------------------------------------------------------------
// Copy of js/step_meta.js (owner / difficulty defaults)
// ---------------------------------------------------------------------------
const OWNER_US = "us";
const OWNER_EXTERNAL = "external";
const SCRUM_POINTS = [1, 2, 3, 5, 8, 13];
const FALLBACK_STEP_META = { owner: OWNER_US, difficulty: 3 };

const STEP_META_DEFAULTS = {
    TADIL_BEDELI: { owner: OWNER_US, difficulty: 1 },
    BILGI_NOTU_TALEBI: { owner: OWNER_US, difficulty: 2 },
    TEIAS_GORUS_CIKIS: { owner: OWNER_US, difficulty: 1 },
    EIGM_GORUS_CIKIS: { owner: OWNER_US, difficulty: 1 },
    BASVURU: { owner: OWNER_US, difficulty: 13 },
    EPDK_BASVURU_HAZIRLIK: { owner: OWNER_US, difficulty: 8 },
    EPDK_BASVURU_YAPILMASI: { owner: OWNER_US, difficulty: 8 },
    EVRAK_EPDK_SUNULMASI: { owner: OWNER_US, difficulty: 2 },
    OZET_OZET_ISTEME: { owner: OWNER_US, difficulty: 1 },
    AO_HAZIRLIK: { owner: OWNER_US, difficulty: 8 },
    GD_KONTROL: { owner: OWNER_US, difficulty: 3 },
    ZK_KONTROL: { owner: OWNER_US, difficulty: 2 },
    YUKUMLULUK_TANIMLAMA: { owner: OWNER_US, difficulty: 3 },
    YUKUMLULUK_TAMAMLAMA: { owner: OWNER_US, difficulty: 8 },
    BELGE_TESLIM: { owner: OWNER_US, difficulty: 1 },
    DAGITIM: { owner: OWNER_US, difficulty: 1 },
    TEMINAT_IADESI: { owner: OWNER_US, difficulty: 2 },
    GENEL_SONUCLANDIRMA: { owner: OWNER_US, difficulty: 2 },

    OZET_BIRIM_DONUSU: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_TEIAS_EIGM: { owner: OWNER_EXTERNAL, difficulty: 3 },
    TEIAS_GORUS_DONUS: { owner: OWNER_EXTERNAL, difficulty: 3 },
    EIGM_GORUS_DONUS: { owner: OWNER_EXTERNAL, difficulty: 3 },
    EPDK_ASKI: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_TEIAS: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_EIGM: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KURUM_GORUS_KDB: { owner: OWNER_EXTERNAL, difficulty: 2 },
    KDB_GORUS_CIKIS: { owner: OWNER_EXTERNAL, difficulty: 1 },
    KDB_GORUS_DONUS: { owner: OWNER_EXTERNAL, difficulty: 3 },
    OLUR_MUZEKKERE_YAZIMI: { owner: OWNER_EXTERNAL, difficulty: 5 },
    OLUR_IMZALANMASI_VE_GUNDEM: { owner: OWNER_EXTERNAL, difficulty: 3 },
    DERC_EDILME: { owner: OWNER_EXTERNAL, difficulty: 2 },
    MUHATAP_YETKILISI_TANIMLANMASI: { owner: OWNER_EXTERNAL, difficulty: 1 },
    GENEL_DEGERLENDIRME: { owner: OWNER_EXTERNAL, difficulty: 3 }
};

function normalizeOwner(value) {
    return value === OWNER_EXTERNAL ? OWNER_EXTERNAL : (value === OWNER_US ? OWNER_US : null);
}

function normalizeDifficulty(value) {
    const n = Number(value);
    return SCRUM_POINTS.includes(n) ? n : null;
}

/**
 * Effective owner/difficulty of a workflow step.
 * Precedence: step-conf override > global stepMeta override > built-in default.
 * @param {{type?: string, owner?: string, difficulty?: number}} stepConf
 * @param {Object} stepMetaOverrides - data.stepMeta from the master doc
 */
function resolveStepMeta(stepConf, stepMetaOverrides) {
    const type = stepConf && stepConf.type;
    const custom = (stepMetaOverrides || {})[type] || {};
    const fallback = STEP_META_DEFAULTS[type] || FALLBACK_STEP_META;
    const base = {
        owner: normalizeOwner(custom.owner) || fallback.owner,
        difficulty: normalizeDifficulty(custom.difficulty) || fallback.difficulty
    };
    const ownerOverride = normalizeOwner(stepConf && stepConf.owner);
    const difficultyOverride = normalizeDifficulty(stepConf && stepConf.difficulty);
    return {
        owner: ownerOverride || base.owner,
        difficulty: difficultyOverride || base.difficulty
    };
}

// ---------------------------------------------------------------------------
// Copy of the parallel-group logic from js/jobs.js
// ---------------------------------------------------------------------------
const PARALLEL_STEP_GROUPS = {
    teias_eigm_gorusleri: [
        "TEIAS_GORUS_CIKIS", "TEIAS_GORUS_DONUS",
        "EIGM_GORUS_CIKIS", "EIGM_GORUS_DONUS",
        "EPDK_ASKI"
    ]
};

const PARALLEL_GROUP_TRACKS = {
    teias_eigm_gorusleri: [
        ["TEIAS_GORUS_CIKIS", "TEIAS_GORUS_DONUS"],
        ["EIGM_GORUS_CIKIS", "EIGM_GORUS_DONUS"],
        ["EPDK_ASKI"]
    ]
};

function getParallelGroupIdForType(type) {
    for (const groupId of Object.keys(PARALLEL_STEP_GROUPS)) {
        if (PARALLEL_STEP_GROUPS[groupId].includes(type)) return groupId;
    }
    return null;
}

function getTrackPosition(type) {
    const groupId = getParallelGroupIdForType(type);
    if (!groupId) return null;
    const tracks = PARALLEL_GROUP_TRACKS[groupId];
    if (!tracks) return null;
    for (let row = 0; row < tracks.length; row++) {
        const col = tracks[row].indexOf(type);
        if (col !== -1) return { groupId, row, col };
    }
    return null;
}

function getParallelGroupBounds(stepsConf, stepNum) {
    const stepConf = stepsConf[stepNum - 1];
    if (!stepConf) return null;
    const groupId = getParallelGroupIdForType(stepConf.type);
    if (!groupId) return null;

    let minPos = null;
    let maxPos = null;
    stepsConf.forEach((s, idx) => {
        if (getParallelGroupIdForType(s.type) === groupId) {
            const pos = idx + 1;
            if (minPos === null || pos < minPos) minPos = pos;
            if (maxPos === null || pos > maxPos) maxPos = pos;
        }
    });
    return minPos === null ? null : { groupId, minPos, maxPos };
}

function isStepCompleted(job, stepNum) {
    const s = (job.steps || {})[`step${stepNum}`];
    return !!(s && s.completed);
}

function isStepReachable(job, stepsConf, stepNum) {
    const currentStep = job.currentStep || 1;
    if (stepNum <= currentStep) return true;
    const bounds = getParallelGroupBounds(stepsConf, stepNum);
    if (!bounds) return false;
    if (currentStep < bounds.minPos || currentStep > bounds.maxPos) return false;

    const track = getTrackPosition(stepsConf[stepNum - 1].type);
    if (track && track.col > 0) {
        for (let p = bounds.minPos; p <= bounds.maxPos; p++) {
            if (p === stepNum) continue;
            const pTrack = getTrackPosition(stepsConf[p - 1].type);
            if (pTrack && pTrack.row === track.row && pTrack.col < track.col && !isStepCompleted(job, p)) {
                return false;
            }
        }
    }
    return true;
}

/**
 * "Which stage is really pending right now" - normally job.currentStep, but at
 * the mouth of a parallel group it points at the fixed first member even after
 * we've finished our part, so prefer a still-open member we own.
 */
function getEffectiveCurrentStepNum(job, stepsConf, stepMetaOverrides) {
    const stepCount = stepsConf.length;
    const currentStep = Math.min(Math.max(1, job.currentStep || 1), stepCount);
    const bounds = getParallelGroupBounds(stepsConf, currentStep);
    if (!bounds || bounds.minPos !== currentStep) return currentStep;

    const pending = [];
    for (let p = bounds.minPos; p <= bounds.maxPos; p++) {
        if (isStepCompleted(job, p)) continue;
        if (!isStepReachable(job, stepsConf, p)) continue;
        pending.push(p);
    }
    if (pending.length === 0) return currentStep;

    const oursStep = pending.find(
        (p) => resolveStepMeta(stepsConf[p - 1], stepMetaOverrides).owner === OWNER_US
    );
    return oursStep !== undefined ? oursStep : pending[0];
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Ordered step definitions for a job. Prefers the live definition from the
 * master doc (`workflows` arg), falls back to the bundled DEFAULT_WORKFLOWS.
 */
function getWorkflowSteps(job, workflows) {
    if (!job || !job.title) return FALLBACK_STEPS;
    const title = String(job.title).trim();
    const steps = (workflows && workflows[title]) || DEFAULT_WORKFLOWS[title] || FALLBACK_STEPS;
    if (job.revisionCount && job.revisionCount > 0) {
        return steps.map((step) =>
            step.type === "BASVURU"
                ? { ...step, short: "Revizyon", long: `${job.revisionCount}. Revizyon Yapılması` }
                : step
        );
    }
    return steps;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function latestDateIn(obj, acc) {
    if (!obj) return acc;
    if (typeof obj === "string") {
        if (ISO_DATE_RE.test(obj)) {
            const d = new Date(obj);
            if (!isNaN(d.getTime()) && (!acc || d > acc)) return d;
        }
        return acc;
    }
    if (typeof obj === "object") {
        let best = acc;
        for (const key of Object.keys(obj)) best = latestDateIn(obj[key], best);
        return best;
    }
    return acc;
}

/** Newest date entered up to (and including) the current stage, else createdAt. */
function getCurrentStageDate(job) {
    if (!job) return null;
    const current = Math.max(1, job.currentStep || 1);
    let latest = null;
    for (let i = 1; i <= current; i++) {
        latest = latestDateIn((job.steps || {})[`step${i}`], latest);
    }
    if (latest) return latest;
    const fallback = job.updatedAt || job.createdAt;
    if (!fallback) return null;
    const d = fallback instanceof Date ? fallback : new Date(fallback);
    return isNaN(d.getTime()) ? null : d;
}

/** Whole days the job has been sitting on its current stage (null if unknown). */
function getStageWaitingDays(job) {
    const d = getCurrentStageDate(job);
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - target) / (1000 * 60 * 60 * 24)));
}

/**
 * Everything the digest / push needs to describe where a job stands:
 * the human stage label, stage number, total stages, who holds the ball,
 * and how long it has been waiting.
 *
 * @param {Object} job
 * @param {Object} [opts]
 * @param {Object} [opts.workflows]  data.workflows from the master doc
 * @param {Object} [opts.stepMeta]   data.stepMeta from the master doc
 */
function describeJobStage(job, opts) {
    const workflows = opts && opts.workflows;
    const stepMeta = opts && opts.stepMeta;
    const stepsConf = getWorkflowSteps(job, workflows);
    const total = stepsConf.length || null;

    if (!stepsConf.length) {
        const n = job && job.currentStep ? job.currentStep : 1;
        return { stepNum: n, label: `Aşama ${n}`, totalStages: null, owner: OWNER_US, ours: true, waitingDays: null };
    }

    const stepNum = getEffectiveCurrentStepNum(job, stepsConf, stepMeta);
    const conf = stepsConf[stepNum - 1] || {};
    const label = conf.long || (conf.short ? `${stepNum}. ${conf.short}` : `Aşama ${stepNum}`);
    const meta = resolveStepMeta(conf, stepMeta);

    return {
        stepNum,
        label,
        totalStages: total,
        owner: meta.owner,
        ours: meta.owner === OWNER_US,
        waitingDays: getStageWaitingDays(job)
    };
}

/** Short stage names for a title (legacy shape used by push.js fallbacks). */
function stageLabelsForTitle(title, workflows) {
    const key = String(title || "").trim();
    const steps = (workflows && workflows[key]) || DEFAULT_WORKFLOWS[key];
    return steps ? steps.map((s) => s.short) : null;
}

module.exports = {
    OWNER_US,
    OWNER_EXTERNAL,
    DEFAULT_WORKFLOWS,
    getWorkflowSteps,
    resolveStepMeta,
    getEffectiveCurrentStepNum,
    getCurrentStageDate,
    getStageWaitingDays,
    describeJobStage,
    stageLabelsForTitle
};

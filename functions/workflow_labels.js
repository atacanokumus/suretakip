/**
 * Stage names per amendment type, keyed by job.title.
 *
 * GENERATED from the WORKFLOWS object in js/jobs.js - the web app owns the
 * workflow definitions, and only the display labels are needed here. Cloud
 * Functions are deployed from functions/ alone, so it cannot read that file at
 * runtime; this is the copy. If a workflow gains, loses or renames a stage in
 * js/jobs.js, regenerate this file or the digest will show stale stage names.
 * Unknown titles and out-of-range steps fall back to "Asama N" at render time.
 */
const WORKFLOW_STAGE_LABELS = {
    "Kurulu Güç / Ünite Tadili": [
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ/EİGM Görüşü",
        "Olur/Müzekkere",
        "Olur/Gündem",
        "Yükümlülük Tanımlama",
        "Yükümlülük Tamamlama",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Bağlantı Noktası Tadili": [
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ Görüşü",
        "Müzekkere",
        "Gündem",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Depolama Ünitesi Tadili": [
        "Tadil Bedeli",
        "Başvuru",
        "KDB Görüşü",
        "Olur Hazırlama",
        "Olur İmzalanması",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Muhatap Yetkilisi Tanımlama": [
        "EPDK'ya Sunum",
        "Yetkili Tanımlama"
    ],
    "Ortaklık / Yönetici Değişikliği": [
        "Tadil Bedeli",
        "Başvuru",
        "Müzekkere",
        "Gündem",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Önlisans Başvurusu": [
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ/EİGM Görüşü",
        "Müzekkere",
        "Gündem",
        "Yükümlülük Tanımlama",
        "Belge Teslim",
        "Dağıtım",
        "Yükümlülük Tamamlama"
    ],
    "Önlisans Süre Uzatımı": [
        "Özet İsteme",
        "Birim Görüşleri",
        "AO Hazırlık",
        "GD Kontrol",
        "Başvuru Hazırlık",
        "EPDK Başvuru",
        "KDB Görüş Çıkış",
        "KDB Görüş Dönüş",
        "Müzekkere",
        "Gündem",
        "Derç Edilme",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Saha Koordinat Tadili": [
        "Bilgi Notu",
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ/EİGM Görüşü",
        "Müzekkere",
        "Gündem",
        "Yükümlülük Tanımlama",
        "Yükümlülük Tamamlama",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Tesis Tamamlama Süre Uzatımı": [
        "Özet İsteme",
        "Birim Görüşleri",
        "AO Hazırlık",
        "GD Kontrol",
        "Başvuru Hazırlık",
        "EPDK Başvuru",
        "KDB Görüş Çıkış",
        "KDB Görüş Dönüş",
        "Müzekkere",
        "Gündem",
        "Derç Edilme",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Ünite Koordinat Tadili": [
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ/EİGM Görüşü",
        "Olur Hazırlama",
        "Olur İmzalanması",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Üretim Lisansı Başvurusu": [
        "Tadil Bedeli",
        "Başvuru",
        "Müzekkere",
        "Gündem",
        "Lisans Derç",
        "Belge Teslim",
        "Teminat İadesi",
        "Dağıtım"
    ],
    "Hibrit Başvurusu": [
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ/EİGM Görüşü",
        "Müzekkere",
        "Gündem",
        "Yükümlülük Tanımlama",
        "Yükümlülük Tamamlama",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "İnvertör Tadili": [
        "Tadil Bedeli",
        "Başvuru",
        "TEİAŞ/EİGM Görüşü",
        "Olur Hazırlama",
        "Olur İmzalanması",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ],
    "Yıllık Elektrik Enerjisi Üretimi Miktarı Tadili": [
        "Tadil Bedeli",
        "Başvuru",
        "Olur Hazırlama",
        "Olur İmzalanması",
        "Tadil Derç",
        "Belge Teslim",
        "Dağıtım"
    ]
};

module.exports = { WORKFLOW_STAGE_LABELS };

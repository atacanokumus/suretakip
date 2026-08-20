/* ==========================================
   TEA Başvuruları - Seed Data
   TÜBİTAK RAPSİM Teknik Etkileşim Analizi başvuru geçmişi.
   "EPDK Takip Listesi.xlsx" > "TEA Listesi" sayfasından (Haz.2024 - Ağu.2026
   arası) bire bir taşındı. Her satır bir proje/ay-yıl başvurusudur; mFiles
   linkleri henüz girilmediği için boş bırakıldı - kullanıcı UI üzerinden
   ekleyecek. "result" alanı Excel'deki hücre renklerinden (kırmızı=negative,
   yeşil=positive, gri=pending) okunarak taşındı. Bu dosya sadece js/data.js
   içindeki tek seferlik göçe (migration) kaynaklık eder; Firestore'a bir kez
   yazıldıktan sonra gerçek kaynak Firestore olur, bu dosya bir daha okunmaz.
   ========================================== */

export const TEA_SEED_DATA = [
    { monthYear: '2024-06', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 20', result: 'negative' },
    { monthYear: '2024-06', projectName: 'ALAPINAR RES', label: 'Alapınar RES 9', result: 'positive' },
    { monthYear: '2024-06', projectName: 'YAZIR RES', label: 'Yazır RES 2', result: 'negative' },
    { monthYear: '2024-06', projectName: 'EVRENCİK RES', label: 'Evrencik RES 17', result: 'negative' },

    { monthYear: '2024-07', projectName: 'AKBELEN RES', label: 'Akbelen RES 2', result: 'positive' },
    { monthYear: '2024-07', projectName: 'YAKUPLAR RES', label: 'Yakuplar RES 2', result: 'positive' },
    { monthYear: '2024-07', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 21', result: 'negative' },

    { monthYear: '2024-08', projectName: 'ÇATAL RES', label: 'Çatal RES 1', result: 'negative' },
    { monthYear: '2024-08', projectName: 'ISPARTA RES', label: 'Isparta RES 2', result: 'positive' },
    { monthYear: '2024-08', projectName: 'YAZIR RES', label: 'Yazır RES 3', result: 'negative' },
    { monthYear: '2024-08', projectName: 'AKSALUR RES', label: 'Aksalur RES 2', result: 'negative' },
    { monthYear: '2024-08', projectName: 'ADARES RES', label: 'Adares RES 8', result: 'positive' },
    { monthYear: '2024-08', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 22', result: 'negative' },

    { monthYear: '2024-09', projectName: 'SEYDAN RES', label: 'Seydan RES 2', result: 'negative' },
    { monthYear: '2024-09', projectName: 'KARLIK RES', label: 'Karlık RES 3', result: 'positive' },
    { monthYear: '2024-09', projectName: 'DAĞAHMETÇE RES', label: 'Dağahmetçe RES 3', result: 'positive' },
    { monthYear: '2024-09', projectName: 'YARIŞ RES', label: 'Yarış RES 5', result: 'negative' },

    { monthYear: '2024-10', projectName: 'SERMAYECİK RES', label: 'Sermayecik RES 3', result: 'positive' },
    { monthYear: '2024-10', projectName: 'ÇAVUŞKÖY RES', label: 'Çavuşköy RES 2', result: 'positive' },
    { monthYear: '2024-10', projectName: 'POZANTI RES', label: 'Pozantı RES 2', result: 'positive' },
    { monthYear: '2024-10', projectName: 'KARATAY RES', label: 'Karatay RES 3', result: 'positive' },
    { monthYear: '2024-10', projectName: 'GÜNEYLİ RES', label: 'Güneyli RES 4', result: 'positive' },

    { monthYear: '2024-11', projectName: 'YAHYALI RES', label: 'Yahyalı RES 8', result: 'positive' },
    { monthYear: '2024-11', projectName: 'ÇATAL RES', label: 'Çatal RES 2', result: 'positive' },
    { monthYear: '2024-11', projectName: 'KURTULUŞ RES', label: 'Kurtuluş RES 2', result: 'negative' },

    { monthYear: '2024-12', projectName: 'AKSALUR RES', label: 'Aksalur RES 3', result: 'positive' },
    { monthYear: '2024-12', projectName: 'KARLIK RES', label: 'Karlık RES 4', result: 'positive' },
    { monthYear: '2024-12', projectName: 'SEYDAN RES', label: 'Seydan RES 3', result: 'negative' },
    { monthYear: '2024-12', projectName: 'ISPARTA RES', label: 'Isparta RES 3', result: 'positive' },
    { monthYear: '2024-12', projectName: 'İNDERESİ RES', label: 'İnderesi RES 2', result: 'positive' },
    { monthYear: '2024-12', projectName: 'CAMİLİYAYLA RES', label: 'Camiliyayla RES 2', result: 'positive' },
    { monthYear: '2024-12', projectName: 'KORUKÖY RES', label: 'Koruköy RES 3', result: 'positive' },
    { monthYear: '2024-12', projectName: 'BAKACAK RES', label: 'Bakacak RES 2', result: 'negative' },

    { monthYear: '2025-01', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 23', result: 'positive' },

    { monthYear: '2025-03', projectName: 'ÇATAL RES', label: 'Çatal RES 3', result: 'positive' },
    { monthYear: '2025-03', projectName: 'YARIŞ RES', label: 'Yarış RES 6', result: 'positive' },
    { monthYear: '2025-03', projectName: 'YAZIR RES', label: 'Yazır RES 4', result: 'positive' },

    { monthYear: '2025-04', projectName: 'EVRENCİK RES', label: 'Evrencik RES 18', result: 'positive' },
    { monthYear: '2025-04', projectName: 'UĞRAK RES', label: 'Uğrak RES 2', result: 'positive' },

    { monthYear: '2025-05', projectName: 'YELLİCE RES', label: 'Yellice RES 4', result: 'positive' },

    { monthYear: '2025-06', projectName: 'SÜRMELİ RES', label: 'Sürmeli RES 2', result: 'positive' },
    { monthYear: '2025-06', projectName: 'ÇATAL RES', label: 'Çatal RES 4', result: 'positive' },

    { monthYear: '2025-07', projectName: 'TURGUTTEPE RES', label: 'Turguttepe RES 5', result: 'positive' },
    { monthYear: '2025-07', projectName: 'TURGUTTEPE RES', label: 'Turguttepe DHMİ', result: 'negative' },
    { monthYear: '2025-07', projectName: 'ALAPINAR RES', label: 'Alapınar RES 10', result: 'positive' },
    { monthYear: '2025-07', projectName: 'EVRENCİK RES', label: 'Evrencik RES 19', result: 'positive' },
    { monthYear: '2025-07', projectName: 'GÜNEYLİ RES', label: 'Güneyli RES 5', result: 'positive' },
    { monthYear: '2025-07', projectName: 'FULACIK RES', label: 'Fulacık RES 2', result: 'positive' },

    { monthYear: '2025-08', projectName: 'AKBELEN RES', label: 'Akbelen RES 3', result: 'positive' },

    { monthYear: '2025-09', projectName: 'ALAPINAR RES', label: 'Alapınar RES 11', result: 'positive' },

    { monthYear: '2025-10', projectName: 'ŞAH RES', label: 'Şah RES 3?', result: 'positive' },
    { monthYear: '2025-10', projectName: 'AKBELEN RES', label: 'Akbelen RES 4', result: 'positive' },
    { monthYear: '2025-10', projectName: 'FULACIK RES', label: 'Fulacık RES 3', result: 'positive' },

    { monthYear: '2025-12', projectName: 'EVRENCİK RES', label: 'Evrencik RES 20', result: 'positive' },

    { monthYear: '2026-01', projectName: 'YAZIR RES', label: 'Yazır RES 5', result: 'negative' },

    { monthYear: '2026-02', projectName: 'AKSALUR RES', label: 'Aksalur RES 4', result: 'negative' },
    { monthYear: '2026-02', projectName: 'CAMİLİYAYLA RES', label: 'Camiliyayla RES 3', result: 'positive' },
    { monthYear: '2026-02', projectName: 'ÇAVUŞKÖY RES', label: 'Çavuşköy RES 3', result: 'positive' },
    { monthYear: '2026-02', projectName: 'ÇUBUK RES', label: 'Çubuk RES 2', result: 'negative' },
    { monthYear: '2026-02', projectName: 'GÜNEYLİ RES', label: 'Güneyli RES 6', result: 'positive' },
    { monthYear: '2026-02', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 24', result: 'positive' },
    { monthYear: '2026-02', projectName: 'KARLIK RES', label: 'Karlık RES 5', result: 'positive' },
    { monthYear: '2026-02', projectName: 'POZANTI RES', label: 'Pozantı RES 3', result: 'positive' },
    { monthYear: '2026-02', projectName: 'SERMAYECİK RES', label: 'Sermayecik RES 4', result: 'positive' },
    { monthYear: '2026-02', projectName: 'SEYDAN RES', label: 'Seydan RES 4', result: 'positive' },
    { monthYear: '2026-02', projectName: 'UĞRAK RES', label: 'Uğrak RES 3', result: 'positive' },

    { monthYear: '2026-03', projectName: 'ISPARTA RES', label: 'Isparta RES 4', result: 'positive' },
    { monthYear: '2026-03', projectName: 'İNDERESİ RES', label: 'İnderesi RES 3', result: 'positive' },
    { monthYear: '2026-03', projectName: 'KARATAY RES', label: 'Karatay RES 4', result: 'positive' },
    { monthYear: '2026-03', projectName: 'UMURLAR RES', label: 'Umurlar RES 6', result: 'positive' },

    { monthYear: '2026-04', projectName: 'SERMAYECİK RES', label: 'Sermayecik DHMİ 1', result: 'negative' },
    { monthYear: '2026-04', projectName: 'DAĞAHMETÇE RES', label: 'Dağahmetçe RES 4', result: 'positive' },

    { monthYear: '2026-05', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 25', result: 'pending' },

    { monthYear: '2026-08', projectName: 'POZANTI RES', label: 'Pozantı RES 4', result: 'pending' },
    { monthYear: '2026-08', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 26', result: 'pending' },
    { monthYear: '2026-08', projectName: 'ILGARDERE RES', label: 'Ilgardere RES 27', result: 'pending' },
    { monthYear: '2026-08', projectName: 'BAKACAK RES', label: 'Bakacak RES 3', result: 'pending' },
    { monthYear: '2026-08', projectName: 'ÇAMLICA RES', label: 'Çamlıca RES 3', result: 'pending' },
    { monthYear: '2026-08', projectName: 'KURTULUŞ RES', label: 'Kurtuluş RES 3', result: 'pending' },
    { monthYear: '2026-08', projectName: 'YAKUPLAR RES', label: 'Yakuplar RES 3', result: 'pending' }
];

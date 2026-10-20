/**
 * Sürüm geçmişi ("Neler Yeni").
 *
 * Her yayından (canlıya alma) önce EN ÜSTE yeni bir kayıt ekleyin. Ana sayfadaki
 * "Son güncelleme" kartı ve Kılavuz'daki "Neler Yeni" sekmesi bu listeden
 * beslenir. Her kullanıcı, en üstteki kaydı ilk gördüğünde kart bir kez
 * gösterilir; `id` değişmedikçe tekrar çıkmaz.
 *
 * Kurallar:
 *  - `id`    : benzersiz ve değişmez ("YYYY.AA.GG", aynı gün ikinci yayın için
 *              "-2" eklenir). Sıralama için değil, "görüldü mü?" kontrolü içindir.
 *  - `date`  : "YYYY-AA-GG".
 *  - `title` : kullanıcıya tek cümlelik başlık.
 *  - added / changed / removed / fixed : kısa, sade Türkçe maddeler. Kod diliyle
 *    değil, ekipten birinin anlayacağı dille yazın ("Firestore" değil "bulut").
 */
export const RELEASES = [
    {
        id: '2026.10.20',
        date: '2026-10-20',
        title: 'Yepyeni kullanım kılavuzu ve "Neler Yeni" kartı',
        added: [
            'Kullanım Kılavuzu baştan yazıldı: yeni başlayan biri için adım adım, her sayfanın ne işe yaradığını anlatıyor.',
            'Kılavuz cihazına göre açılıyor: bilgisayarda web sürümü, telefonda (uygulama veya tarayıcı) mobil sürümü. Üstteki düğmeyle diğerine de bakılabilir.',
            'Bu kart: her güncellemeden sonra siteye ilk girişinizde neyin eklendiği, değiştiği ve çıkarıldığı ana sayfada görünür.',
            'Mail Hazırlığı: tüm EPDK tadil maillerine dekont açıklaması ve banka bilgileri tablosu eklendi.',
            'Mail Hazırlığı: "📝 Taslak Ayarları" ile mailin konu ve metni sayfa içinden düzenlenebiliyor.'
        ],
        changed: [
            'Saha / KGÜT / ÜKT mailindeki tadil metni düzeltildi.',
            'Mail taslak ayarları Ayarlar sayfasından Mail Hazırlığı sayfasına, Bedel Ayarları\'nın yanına taşındı.'
        ],
        removed: [
            'Eski, güncel olmayan kılavuz içeriği (artık kaldırılmış aşamaları da anlatıyordu).'
        ],
        fixed: []
    },
    {
        id: '2026.10.15',
        date: '2026-10-15',
        title: 'Mail Hazırlığı sayfası geldi, GD Kontrolü ve Müzekkere aşamaları kalktı',
        added: [
            'Yeni "✉️ Mail Hazırlığı" sayfası: tadil / süre uzatımı bedelini hesaplar ve hazır mail taslağını üretir (Tesis Tamamlama, Önlisans Süre Uzatımı, TEA, Saha/KGÜT/ÜKT, diğer tadiller).',
            'Kurul Kararı bedelleri ve TEA birim fiyatları "⚙️ Bedel Ayarları" penceresinden düzenlenir.',
            'TEİAŞ görüşü aşamasına "EPDK\'ya döndü, tebliğ bekleniyor" durumu eklendi. Tebliğ gelmeden Yükümlülük Tanımlama aşamasında uyarı görünür.',
            'Önlisans Süre Uzatımı oluştururken isteğe bağlı "Özet İsteme Tarihi" alanı: liste bu tarihe göre sıralanır.'
        ],
        changed: [
            'Önlisans Süre Uzatımları matrisi artık aşama türüne göre çalışıyor ve özet isteme tarihine göre sıralanıyor.',
            'Sayfalardaki giriş animasyonları yenilendi.'
        ],
        removed: [
            'İş akışlarından "GD Kontrolü" ve "Müzekkere / Olur Hazırlama" aşamaları kaldırıldı (eski kayıtlardaki bilgiler silinmedi, arşivlendi).',
            'Gamze Durum kullanıcısı pasifleştirildi: atama listelerinde görünmez, bildirim almaz.'
        ],
        fixed: []
    },
    {
        id: '2026.09.09',
        date: '2026-09-09',
        title: 'Günlük özet maili daha okunur oldu',
        added: [],
        changed: [
            'Günlük özet mailinde aktif tadillerin bulunduğu aşama adı artık canlı iş akışından okunuyor (Ayarlar\'da aşama adı değişince mail de değişir).',
            '"Aksiyon bizde" olan tadiller mailde öne alındı.'
        ],
        removed: [
            'Günlük özet mailindeki aktif tadil tablolarından "Aksiyon" kolonu kaldırıldı.'
        ],
        fixed: []
    },
    {
        id: '2026.09.07',
        date: '2026-09-07',
        title: 'Saha Koordinat Tadili\'ne EPDK itiraz askı süresi eklendi',
        added: [
            'Saha Koordinat Tadili: TEİAŞ ve EİGM görüşleriyle paralel yürüyen üçüncü kol olarak "EPDK İtiraz Askı Süresi". Başlangıç ve bitiş tarihini girince süre dolana kadar kendiliğinden takip edilir, bitince aşama kendiliğinden tamamlanır.'
        ],
        changed: [],
        removed: [],
        fixed: []
    },
    {
        id: '2026.08.31',
        date: '2026-08-31',
        title: 'Tarih rozetleri düzeltildi',
        added: [],
        changed: [],
        removed: [],
        fixed: [
            'Tadil kartlarında eski kalmış başlık tarihi gösterilmesi düzeltildi.',
            'Gelecekteki bir tarihe "bugün" yazması düzeltildi.'
        ]
    },
    {
        id: '2026.08.27',
        date: '2026-08-27',
        title: 'Teams bildirimleri ve Yazışma Takibi iş akışı',
        added: [
            'Teams kanal bildirimleri: telefona giden anlık bildirimler Teams sohbetine de yansıtılır.',
            '"Yazışma Takibi" iş akışına özel alanlar eklendi; Tadil Türü listesi artık Ayarlar\'daki iş akışlarından otomatik doluyor.'
        ],
        changed: [
            'Tadil kayıtları buluta yazılırken kayıt kayıt birleştiriliyor: iki kişi aynı anda farklı tadilleri güncellerse biri diğerinin değişikliğini silmez.'
        ],
        removed: [],
        fixed: []
    },
    {
        id: '2026.08.25',
        date: '2026-08-25',
        title: 'Paralel görüşler için çatallı süreç hattı',
        added: [
            'Önlisans matrisinde satır silme ve sürükleyerek kolon genişliği ayarı.'
        ],
        changed: [
            'TEİAŞ / EİGM görüşü 4 ayrı iş kalemine bölündü (çıkılması ve alınması ayrı ayrı); iki kurum birbirini beklemeden yürür.',
            'Tadil kartındaki süreç hattı paralel kısımda iki kola ayrılıp tekrar birleşiyor.',
            'Paralel görüşlerde "top kimde" bilgisi doğru kurumdan okunuyor.'
        ],
        removed: [
            'Paralel kısım bittikten sonra görünen eski düz ilerleme çubuğu kaldırıldı.'
        ],
        fixed: [
            'Önlisans matrisinde proje adının yanlış görünmesi düzeltildi.'
        ]
    },
    {
        id: '2026.08.24',
        date: '2026-08-24',
        title: 'Akıllı sıralama ve aşama sorumluluğu',
        added: [
            'Tadiller sayfasına 3 sıralama: 🧠 Akıllı, Yeniden Eskiye, Eskiden Yeniye.',
            'Her aşama için "🙋 Biz / ⏳ Dış" sorumluluk ve Scrum zorluk puanı (Ayarlar > Aşama Sorumluluk & Zorluk). İlerleme yüzdesi bu puanlara göre ağırlıklandırılır.'
        ],
        changed: [],
        removed: [],
        fixed: []
    },
    {
        id: '2026.08.20',
        date: '2026-08-20',
        title: 'TEA Başvuruları sayfası ve sürükle-bırak iş akışı düzenleyici',
        added: [
            'Yeni "🍵 TEA Başvuruları" sayfası: ay-yıl matrisi, sonuç takibi (Olumlu / Olumsuz / Beklemede) ve şirketlere göre dağılım grafiği.',
            'Ayarlar\'da sürükle-bırak ile tadil iş akışı oluşturma / düzenleme (yalnızca bilgisayarda).',
            'Ana sayfadaki aylık yoğunluk çubuklarına renk geçişli animasyon.'
        ],
        changed: [
            'Önlisans Süre Uzatımı akışında "Başvuru Hazırlık" yerine "ZK Kontrol" aşaması.'
        ],
        removed: [
            'Tesis Tamamlama Süre Uzatımı akışından "KDB Görüş Çıkış / Dönüş" aşamaları kaldırıldı.'
        ],
        fixed: [
            'Ayarlar sayfasında tadil iş akışı listesinin boş görünmesi düzeltildi.',
            'TEA kayıtlarının yanlışlıkla boş listeyle silinmesi engellendi.'
        ]
    },
    {
        id: '2026.08.13',
        date: '2026-08-13',
        title: 'Sabah mailine aktif tadiller bölümü',
        added: [
            'Günlük özet mailine "Aktif Tadiller ve Bulundukları Aşamalar" bölümü.'
        ],
        changed: [
            'Henüz başlamamış önlisans süre uzatımları Tadiller sayfasından ayrıldı; yalnızca Önlisans matrisinde görünür, maillerde ayrı başlıkla anılır.'
        ],
        removed: [],
        fixed: []
    },
    {
        id: '2026.07.29',
        date: '2026-07-29',
        title: 'iPhone uygulaması: bildirimler, Face ID ve rozet',
        added: [
            'iPhone uygulamasına anlık bildirimler (günlük özet, yeni yükümlülük, tadil ilerlemesi).',
            'Face ID kilidi ve uygulama simgesinde bugünkü + gecikmiş yükümlülük rozeti.',
            'Ayarlar > Mobil Bildirimler altında "Bu Cihazın Durumu" tanı paneli.'
        ],
        changed: [],
        removed: [],
        fixed: [
            'Web sitesindeki güncellemeler telefona geç ulaşıyordu; artık her açılışta güncel sürüm yükleniyor.',
            'Bildirimler telefonda görünmüyordu; düzeltildi.',
            'Masaüstünde fare tekerleği kaymıyordu ve yeni proje eklenemiyordu; düzeltildi.'
        ]
    }
];

/** En yeni kayıt (kart bunu gösterir). */
export const LATEST_RELEASE = RELEASES[0];

/** Kısa sürüm etiketi: "v2026.10.20". */
export function releaseLabel(release = LATEST_RELEASE) {
    return 'v' + release.id;
}

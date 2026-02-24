# Süre Takip — iOS App (SwiftUI)

DaVinci Enerji Lisans Müdürlüğü Süre Takip Platformu'nun native iOS uygulaması.

> ⚠️ Bu uygulama, mevcut web uygulamasıyla **tam senkronize** çalışır. Aynı Firebase backend'i (Firestore + Auth) kullanır.

## 📱 Özellikler

- **Dashboard**: İstatistikler, yaklaşan süreler, son işler
- **Yükümlülükler**: Filtreleme, arama, detay görünümü, yorum, durum değiştirme
- **İşler (Jobs)**: Oluşturma, düzenleme, öncelik, proje bağlama, yükümlülük bağlama
- **Projeler**: Proje bazlı görünüm, uzman bilgisi
- **Ayarlar**: Profil, bildirim ayarları, çıkış
- **Push Bildirimleri**: Yaklaşan süreler için otomatik hatırlatma
- **Gerçek Zamanlı Senkronizasyon**: Web'deki değişiklikler anında iOS'a yansır

## 🔧 Mac'te Kurulum (Geçiş Rehberi)

### Ön Gereksinimler
- macOS 14 (Sonoma) veya üstü
- Xcode 15.2 veya üstü (App Store'dan indir)
- Apple Developer Account (şirket hesabınız)

### Adımlar

```bash
# 1. Repo'yu klonla
git clone https://github.com/atacanokumus/suretakip.git
cd suretakip/SureTakip-iOS

# 2. Xcode'da aç
open Package.swift
# VEYA Xcode'un File > Open menüsünden SureTakip-iOS klasörünü seç
```

### 3. Firebase Yapılandırması
1. [Firebase Console](https://console.firebase.google.com/) → `sure-takip` projesi
2. **iOS uygulaması ekle** (+ butonuna tıkla)
3. Bundle ID: `com.davincienerji.suretakip` (veya istediğiniz bir ID)
4. `GoogleService-Info.plist` dosyasını indir
5. İndirilen dosyayı `SureTakip-iOS/SureTakip/` klasörüne kopyala
6. Xcode'da proje navigator'dan dosyayı ekle (Add Files to "SureTakip")

### 4. Xcode Projesi Oluşturma
SPM (Package.swift) yerine Xcode projesi ile çalışmak isterseniz:
1. Xcode → File → New → Project → App
2. Product Name: `SureTakip`
3. Team: Şirket Apple Developer hesabınız
4. Bundle Identifier: `com.davincienerji.suretakip`
5. Interface: SwiftUI, Language: Swift
6. Bu dizindeki Swift dosyalarını projeye sürükle-bırak
7. Firebase SPM paketini ekle: File → Add Package Dependencies
   - URL: `https://github.com/firebase/firebase-ios-sdk.git`
   - Seçilecek ürünler: `FirebaseAuth`, `FirebaseFirestore`

### 5. Build & Test
1. Simulator seçin (ör. iPhone 15 Pro)
2. `Cmd + R` ile çalıştırın
3. Web uygulamasındaki e-posta/şifre ile giriş yapın
4. Verilerin web ile senkronize olduğunu doğrulayın

### 6. TestFlight'a Yükleme
1. Xcode → Product → Archive
2. Distribute App → App Store Connect
3. TestFlight'ta yeni uygulama olarak görünecek

## 📂 Dosya Yapısı

```
SureTakip-iOS/
├── Package.swift                     ← SPM bağımlılıklar
├── README.md                         ← Bu dosya
└── SureTakip/
    ├── SureTakipApp.swift            ← App giriş noktası
    ├── AppDelegate.swift             ← Firebase init
    ├── ContentView.swift             ← Root view + Splash
    ├── Models/
    │   ├── Obligation.swift          ← Yükümlülük modeli
    │   ├── Job.swift                 ← İş modeli
    │   ├── Project.swift             ← Proje modeli
    │   └── AppUser.swift             ← Kullanıcı modeli
    ├── Services/
    │   ├── AuthService.swift         ← Firebase Auth
    │   ├── FirestoreService.swift    ← Firestore CRUD + real-time sync
    │   └── NotificationService.swift ← Push bildirimleri
    ├── Views/
    │   ├── Auth/LoginView.swift
    │   ├── MainTabView.swift
    │   ├── Dashboard/DashboardView.swift
    │   ├── Obligations/
    │   │   ├── ObligationListView.swift
    │   │   ├── ObligationRowView.swift
    │   │   └── ObligationDetailView.swift
    │   ├── Jobs/
    │   │   ├── JobListView.swift
    │   │   ├── JobDetailView.swift
    │   │   └── CreateJobView.swift
    │   ├── Projects/ProjectListView.swift
    │   ├── Settings/SettingsView.swift
    │   └── Components/SharedComponents.swift
    └── Extensions/
        └── ColorExtension.swift
```

## 🔗 Web App ile Senkronizasyon

| Firestore Path | Açıklama |
|---|---|
| `daVinciData/master` | Ana veri dokümanı (obligations, jobs, projects) |
| `users/{email}` | Kullanıcı profilleri |

iOS ve Web aynı dokümana yazar/okur → **tam senkronizasyon** sağlanır.

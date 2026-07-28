# Süre Takip — iOS Uygulaması

DaVinci Enerji Lisans Müdürlüğü Süre Takip Platformu'nun iOS uygulaması.
TestFlight ile ekipteki 3 kişiye dağıtılmak üzere hazırlanmıştır.

---

## Bu uygulama nasıl çalışıyor?

Uygulama, **native bir iOS kabuğu** içinde `https://sure-takip.web.app` adresindeki
web uygulamanızı çalıştırır. Yani:

- **Tek bir kod tabanı vardır.** Web sitesinde yaptığımız her değişiklik, telefonda
  da anında görünür — yeni bir TestFlight sürümü yüklemeye gerek kalmaz.
- **%100 senkronizasyon garantidir**, çünkü web ve mobil aynı koddur. Ayrı bir
  mobil veri modeli olmadığı için "web'de var, mobilde yok" durumu oluşamaz.
- **Tüm menüler ve tüm fonksiyonlar** (yükümlülük tanımlama/tamamlama, tadil
  girme, aşama ilerletme, önlisans matrisi, analiz, rapor alma, Excel içe/dışa
  aktarma) olduğu gibi çalışır.

### Neden native (Swift ile sıfırdan) yazılmadı?

Daha önce native bir deneme yapılmıştı (Şubat 2026). O kod, web uygulamasının
veri yapısını tanımıyordu: tadillerin 13 aşamalık iş akışı (`steps`), aşama
numarası (`currentStep`), proje lisans bilgileri gibi alanların hiçbiri yoktu ve
Firestore'daki ana belgeyi **tamamen üzerine yazıyordu**. Yani uygulamada bir
şeye dokunulduğu anda şirketin tüm tadil ilerlemesi silinecekti. Bu kod
kaldırıldı (git geçmişinde `d2bf686` commit'inde duruyor).

Bu, iki ayrı kod tabanı tutmanın gerçek riskidir: aradaki kayma fark edilmeden
birikir. Hibrit yaklaşımda böyle bir kayma **yapısal olarak mümkün değildir**.

### Kabuğun native olarak eklediği özellikler

| Özellik | Açıklama |
|---|---|
| Açılış ekranı | Logo + yükleniyor animasyonu |
| Oturum kalıcılığı | Her açılışta şifre sorulmaz |
| Aşağı çekip yenileme | Sayfayı yenilemek için |
| Çevrimdışı uyarısı | İnternet kesilince üstte kırmızı şerit |
| **PDF rapor paylaşımı** | "Rapor Al" → iOS paylaşım ekranı (Dosyalar'a kaydet, mail at) |
| Güvenli alan desteği | Çentik ve alt çubukla içerik çakışmaz |
| Dış bağlantılar | M-Files linkleri Safari'de açılır |
| Geri kaydırma | Ekranın solundan kaydırarak geri gitme |

> **Not:** iOS'ta WKWebView, jsPDF'in ürettiği PDF indirmesini sessizce yok sayar.
> Bu yüzden `js/reports.js` içine bir köprü eklendi: uygulama içinde çalışırken
> PDF, native tarafa aktarılıp iOS paylaşım ekranıyla sunulur. Tarayıcıda ise
> eskisi gibi normal indirme yapılır.

---

## Mac'te Kurulum

### Ön gereksinimler
- macOS (Sonoma 14 veya üstü)
- Xcode 15 veya üstü — App Store'dan ücretsiz
- Apple Developer hesabınız (mevcut)

### 1. Projeyi indirin

```bash
git clone https://github.com/atacanokumus/suretakip.git
cd suretakip/SureTakip-iOS
```

### 2. Xcode projesini oluşturun

En kolay yol XcodeGen (tek seferlik kurulum):

```bash
brew install xcodegen
xcodegen generate
open SureTakip.xcodeproj
```

<details>
<summary>XcodeGen kullanmak istemezseniz (elle kurulum)</summary>

1. Xcode → **File → New → Project → iOS → App**
2. Product Name: `SureTakip`, Interface: **SwiftUI**, Language: **Swift**
3. Bundle Identifier: `com.davincienerji.suretakip`
4. Oluşan projedeki hazır dosyaları silin
5. Bu klasördeki `SureTakip/` içeriğini (Swift dosyaları, `Info.plist`,
   `Assets.xcassets`) Xcode'a sürükleyip bırakın — "Copy items if needed" işaretli olsun

Harici paket/kütüphane eklemenize **gerek yok**.
</details>

### 3. İmzalama ayarı (tek seferlik)

Xcode'da sol panelden **SureTakip** projesine tıklayın →
**Signing & Capabilities** sekmesi →
**Team** kutusundan şirket Apple Developer hesabınızı seçin.

### 4. Test edin

Üst çubuktan bir iPhone simülatörü seçip **⌘R** ile çalıştırın.
Web'deki e-posta/şifrenizle giriş yapın; verilerin siteyle aynı olduğunu görün.

### 5. TestFlight'a yükleyin

1. Üst çubukta cihaz olarak **Any iOS Device (arm64)** seçin
2. **Product → Archive**
3. Açılan pencerede **Distribute App → TestFlight & App Store → Upload**
4. [App Store Connect](https://appstoreconnect.apple.com) → TestFlight sekmesi
5. **Internal Testing** grubuna 3 kullanıcıyı e-postalarıyla ekleyin

> İlk yüklemede App Store Connect'te uygulamayı bir kez oluşturmanız istenebilir:
> **My Apps → + → New App**, bundle ID olarak `com.davincienerji.suretakip` seçin.
> Internal Testing kullandığınız için Apple'ın inceleme (review) sürecini
> beklemenize gerek yoktur — dakikalar içinde test edilebilir olur.

---

## Sonraki güncellemeler

Web sitesinde bir değişiklik yaptığımızda (`firebase deploy`), **hiçbir şey
yapmanıza gerek yok** — uygulama bir sonraki açılışta yeni sürümü gösterir.

Yeni bir TestFlight sürümü yalnızca şu durumlarda gerekir:
- Kabuğun kendisi değişirse (uygulama ikonu, açılış ekranı, native özellikler)
- Uygulama adı veya izinleri değişirse

Bu durumda `project.yml` içindeki `CURRENT_PROJECT_VERSION` değerini bir artırıp
2–5. adımları tekrarlamanız yeterlidir.

---

## Dosya yapısı

```
SureTakip-iOS/
├── project.yml                  ← XcodeGen proje tanımı (harici bağımlılık yok)
├── README.md                    ← Bu dosya
└── SureTakip/
    ├── SureTakipApp.swift       ← Uygulama giriş noktası
    ├── RootView.swift           ← Açılış ekranı, çevrimdışı şeridi, hata ekranı, paylaşım
    ├── WebAppView.swift         ← WKWebView kabuğu, PDF köprüsü, link yönlendirme
    ├── Info.plist               ← Uygulama kimliği ve ayarları
    └── Assets.xcassets/         ← Uygulama ikonu, logo, açılış rengi
```

# Süre Takip'i Telefonunuza Yükleme — Adım Adım

Bu rehber, uygulamayı Mac'inizden derleyip TestFlight üzerinden kendi
iPhone'unuza ve ekipteki diğer 2 kişiye indirmenizi anlatır.

Toplam süre: ilk seferde yaklaşık **1–1.5 saat** (çoğu bekleme).
Sonraki güncellemeler 10 dakika.

---

## Bölüm 1 — Bildirim altyapısı (tek seferlik)

> Bu bölümü atlarsanız uygulama çalışır ama **bildirim gelmez**.

### 1.1 Apple'da APNs anahtarı oluşturun

1. [developer.apple.com/account](https://developer.apple.com/account) → giriş yapın
2. **Certificates, Identifiers & Profiles** → sol menüden **Keys**
3. Sağ üstteki **+** butonuna basın
4. **Key Name:** `SureTakip Push`
5. **Apple Push Notifications service (APNs)** kutusunu işaretleyin
6. **Continue** → **Register** → **Download**

`AuthKey_XXXXXXXXXX.p8` adında bir dosya inecek.

> ⚠️ **Bu dosya yalnızca bir kez indirilebilir.** Kaybederseniz yenisini
> oluşturmanız gerekir. Güvenli bir yere kaydedin.
>
> Bu bir kimlik anahtarıdır — kimseye göndermeyin, e-postayla paylaşmayın.
> Sadece aşağıdaki Firebase ekranına yükleyeceksiniz.

Aynı ekranda görünen **Key ID**'yi (10 karakter) not edin.
Sağ üstte hesap adınızın altındaki **Team ID**'yi (10 karakter) de not edin.

### 1.2 Firebase'e iOS uygulamasını tanıtın

1. [console.firebase.google.com](https://console.firebase.google.com) → **sure-takip**
2. Sol üstte ⚙️ → **Project settings**
3. **Your apps** → **Add app** → **iOS** (elma ikonu)
4. **Apple bundle ID:** `com.davincienerji.suretakip`
5. **Register app** → **GoogleService-Info.plist** dosyasını indirin
6. Kalan adımlarda **Next** deyip geçin (kod adımları zaten yapıldı)

### 1.3 APNs anahtarını Firebase'e yükleyin

1. Aynı **Project settings** ekranında üstteki **Cloud Messaging** sekmesi
2. **Apple app configuration** → **APNs Authentication Key** → **Upload**
3. `.p8` dosyasını seçin
4. **Key ID** ve **Team ID** alanlarını doldurun → **Upload**

---

## Bölüm 2 — Mac'te derleme

### 2.1 Kodu güncelleyin

```bash
cd ~/Documents/suretakip && git pull
```

### 2.2 GoogleService-Info.plist dosyasını yerine koyun

İndirdiğiniz dosyayı Finder'da şu klasöre sürükleyin:

```
~/Documents/suretakip/SureTakip-iOS/SureTakip/
```

(`Info.plist` dosyasının yanında durmalı.)

### 2.3 Projeyi üretin ve açın

```bash
cd ~/Documents/suretakip/SureTakip-iOS && xcodegen generate && open SureTakip.xcodeproj
```

Xcode açılınca sol altta **"Resolving Package Versions"** yazacak — Firebase
paketini indiriyor. **Birkaç dakika sürebilir**, bitmesini bekleyin.

### 2.4 İmzalama ve yetkilendirmeler

1. Sol panelden **SureTakip** projesine tıklayın
2. **Signing & Capabilities** sekmesi
3. **Team** kutusundan şirket hesabınızı seçin
4. Aynı ekranda şu ikisinin listede olduğunu doğrulayın:
   - **Push Notifications**
   - **App Groups** (`group.com.davincienerji.suretakip` işaretli olmalı)

Yoksa **+ Capability** ile ekleyin.

> Xcode "provisioning profile" hatası verirse: **Automatically manage signing**
> kutusunun işaretli olduğundan emin olun, Xcode gerisini halleder.

### 2.5 Simülatörde deneyin

Üstten bir iPhone simülatörü seçip **⌘R**.

Bu aşamada göreceğiniz: Face ID ekranı (simülatörde **Features → Face ID →
Enrolled** yapıp **Matching Face** ile geçebilirsiniz) ve normal uygulama.
**Bildirimler simülatörde gelmez**, bu normaldir.

Derleme hatası alırsanız hata metnini bana gönderin.

---

## Bölüm 3 — TestFlight'a yükleme

### 3.1 App Store Connect'te uygulamayı oluşturun

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps**
2. **+** → **New App**
3. **Platforms:** iOS
4. **Name:** `Süre Takip` (App Store'da benzersiz olmalı; doluysa
   `DaVinci Süre Takip` deneyin)
5. **Primary Language:** Turkish
6. **Bundle ID:** listeden `com.davincienerji.suretakip`
7. **SKU:** `suretakip-001` (herhangi bir şey olabilir, sadece sizin referansınız)
8. **Create**

### 3.2 Arşivleyin

Xcode'da:

1. Üst çubukta cihaz seçiciden **Any iOS Device (arm64)** seçin
   (simülatör seçiliyken Archive seçeneği pasif kalır)
2. Menüden **Product → Archive**
3. Derleme birkaç dakika sürer, sonra **Organizer** penceresi açılır

### 3.3 Yükleyin

Organizer'da:

1. **Distribute App**
2. **TestFlight & App Store** → **Distribute**
3. Sorulan seçeneklerde varsayılanları kabul edin (**Next / Upload**)
4. Yükleme birkaç dakika sürer

### 3.4 İşlenmesini bekleyin

App Store Connect → **TestFlight** sekmesinde build'iniz görünecek,
önce **"Processing"** yazacak. **10–30 dakika** sürebilir.

İşlem bitince Apple'dan "export compliance" sorusu gelebilir:
**Does your app use encryption?** → **No** (uygulama sadece HTTPS kullanıyor,
bu standart istisnaya girer).

### 3.5 Test kullanıcılarını ekleyin

1. TestFlight sekmesi → sol menüde **Internal Testing**
2. **+** ile yeni grup oluşturun: `DaVinci Ekip`
3. **Testers** → **+** → 3 kişinin Apple ID e-postalarını ekleyin
4. Build'i gruba atayın

> Internal Testing kullandığınız için **Apple incelemesi beklemenize gerek yok** —
> kişiler dakikalar içinde daveti alır.

### 3.6 Telefonunuza indirin

1. iPhone'unuzda App Store'dan **TestFlight** uygulamasını indirin
2. E-postanıza gelen daveti açın veya TestFlight'ta uygulamayı görün
3. **Install** deyin

---

## Bölüm 4 — Bildirimleri test edin

1. Uygulamayı telefonda açın
2. Face ID ile girin
3. **"Süre Takip size bildirim göndermek istiyor"** → **İzin Ver**
4. Web'deki e-posta/şifrenizle giriş yapın

Giriş yaptıktan sonra telefon otomatik olarak bildirim listesine kaydolur.

**Doğrulama:** Bilgisayarınızdan [sure-takip.web.app](https://sure-takip.web.app)
→ **Ayarlar** → **Mobil Bildirimler** → **Kayıtlı Cihazlar** → **Yenile**.
Telefonunuz listede görünmeli.

Sonra aynı ekrandan bir başlık/mesaj yazıp **Bildirim Gönder** deyin —
telefonunuza gelmeli.

> Gelmezse: uygulamayı telefonda bir kez kapatıp açın (kayıt girişten sonra
> yapılıyor), sonra tekrar deneyin. Hâlâ gelmiyorsa Bölüm 1.3'teki APNs
> anahtarı yüklemesini kontrol edin.

---

## Sonraki güncellemeler

**Web tarafında** bir değişiklik yaptığımızda (arayüz, hesaplama, rapor)
**hiçbir şey yapmanıza gerek yok** — uygulama bir sonraki açılışta yeni
sürümü gösterir.

**Yeni TestFlight sürümü** yalnızca native tarafı değişirse gerekir
(bildirim mantığı, Face ID, ikon, widget). O durumda:

1. `git pull`
2. `project.yml` içindeki `CURRENT_PROJECT_VERSION` değerini 1 artırın
3. `xcodegen generate`
4. Bölüm 3.2–3.3'ü tekrarlayın

---

## Sık karşılaşılan hatalar

| Hata | Çözüm |
|---|---|
| `No such module 'FirebaseMessaging'` | Xcode paketleri indirmeyi bitirmemiş. **File → Packages → Resolve Package Versions** deyip bekleyin. |
| `GoogleService-Info.plist not found` (çalışma anında çöküyor) | Dosyayı 2.2'deki klasöre koyup `xcodegen generate` komutunu tekrar çalıştırın. |
| Archive seçeneği gri | Cihaz seçiciden **Any iOS Device** seçin, simülatör seçiliyken arşivleme yapılamaz. |
| `Provisioning profile doesn't support Push Notifications` | Signing & Capabilities'te **Push Notifications** capability'sini ekleyin, sonra tekrar arşivleyin. |
| Build "Processing"te takıldı | Normal, 30 dakikaya kadar sürebilir. Uzarsa Apple'dan e-posta gelir. |
| Bildirim gelmiyor (TestFlight'ta) | En sık sebep: APNs anahtarı Firebase'e yüklenmemiş (Bölüm 1.3). |

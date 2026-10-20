/**
 * Kullanım Kılavuzu + "Neler Yeni" kartı.
 *
 * - Kılavuz, cihaza göre iki ayrı içerik gösterir: bilgisayar (web) ve telefon
 *   (iPhone uygulaması veya telefon tarayıcısı). Üstteki düğmeyle diğerine de
 *   bakılabilir (panel birine tanıtılırken işe yarar).
 * - İçerikteki sayılar ve tadil tipleri canlı veriden (Store) okunur; Ayarlar'da
 *   bir iş akışı değişince kılavuz da kendiliğinden güncel kalır.
 * - Ana sayfadaki "Son güncelleme" kartı js/changelog.js'ten beslenir ve her
 *   kullanıcıya (bu cihazda) yeni sürüm başına bir kez gösterilir.
 *
 * Buluta hiçbir şey yazmaz; tek kalıcı iz, tarayıcıdaki "hangi sürümü gördü"
 * anahtarıdır.
 */
import { Store } from './store.js';
import { escapeHtml as esc } from './utils.js';
import { DEFAULT_WORKFLOWS } from './default_workflows.js';
import { isDormantPrelicenceJob } from './jobs.js';
import { RELEASES, LATEST_RELEASE, releaseLabel } from './changelog.js';

// ==========================================
// Cihaz algılama
// ==========================================

/** native: iPhone uygulaması içinde mi; mobile: telefon düzeni (uygulama veya dar ekran). */
export function detectPlatform() {
    const native = !!window.SureTakipNative;
    let narrow = false;
    try { narrow = window.matchMedia('(max-width: 768px)').matches; } catch (e) { /* eski tarayıcı */ }
    return { native, mobile: native || narrow };
}

// ==========================================
// Küçük HTML yardımcıları (içerik yazımını kısaltır)
// ==========================================

const H = t => `<h4 class="g-h">${t}</h4>`;
const P = t => `<p class="g-p">${t}</p>`;
const LEAD = t => `<p class="g-lead">${t}</p>`;
const UL = items => `<ul class="g-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const STEPS = items => `<ol class="g-steps">${items.map(([t, d]) => `<li><div class="g-step-t">${t}</div>${d ? `<div class="g-step-d">${d}</div>` : ''}</li>`).join('')}</ol>`;
const CALLOUT = (kind, icon, t) => `<div class="g-callout ${kind}"><span class="g-callout-i">${icon}</span><div>${t}</div></div>`;
const TIP = t => CALLOUT('tip', '💡', t);
const WARN = t => CALLOUT('warn', '⚠️', t);
const NOTE = t => CALLOUT('note', 'ℹ️', t);
const CARDS = items => `<div class="g-cards">${items.map(([i, t, d]) => `<div class="g-card"><div class="g-card-i">${i}</div><div class="g-card-t">${t}</div><div class="g-card-d">${d}</div></div>`).join('')}</div>`;
const TABLE = (head, rows) => `<div class="g-table-wrap"><table class="g-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const GO = (id, label) => `<a href="#" class="g-link" data-g-goto="${id}">${label}</a>`;
const OPEN = (page, label) => `<button type="button" class="g-open-page" data-g-page="${page}">${label} →</button>`;
// Fiilin ekli biçimleri ("tıklayın" + "ınca" gibi birleştirmeler yanlış çıkar).
const tap = p => (p.mobile ? 'dokunun' : 'tıklayın');
const tapWhen = p => (p.mobile ? 'dokununca' : 'tıklayınca');
const TapWhen = p => (p.mobile ? 'Dokununca' : 'Tıklayınca');
const tapBy = p => (p.mobile ? 'dokunarak' : 'tıklayarak');
const tapIf = p => (p.mobile ? 'dokunursanız' : 'tıklarsanız');

/** Renk/durum açıklaması satırları. */
const LEGEND = rows => `<div class="g-legend">${rows.map(([c, t]) => `<div class="g-legend-row"><span class="g-dot ${c}"></span><span>${t}</span></div>`).join('')}</div>`;

/** Akış zinciri: kutu → kutu → kutu. */
const FLOW = items => `<div class="g-flow">${items.map((t, i) => `${i ? '<span class="g-flow-arrow">→</span>' : ''}<span class="g-flow-box">${t}</span>`).join('')}</div>`;

/** Tadil kartındaki süreç hattının küçük bir örneği. */
function metroMock() {
    const st = [
        ['done', '✓', 'Tadil Bedeli'], ['done', '✓', 'Başvuru'], ['active', '🚇', 'TEİAŞ Görüşü'],
        ['todo', '4', 'Olur/Gündem'], ['todo', '5', 'Derç'], ['todo', '6', 'Teslim']
    ];
    return `
    <div class="g-metro" aria-hidden="true">
        <div class="g-metro-rail"></div><div class="g-metro-fill"></div>
        ${st.map(([c, s, l]) => `<div class="g-st ${c}"><span class="g-st-dot">${s}</span><span class="g-st-l">${l}</span></div>`).join('')}
        <span class="g-metro-badge">12 gün</span>
    </div>`;
}

// ==========================================
// Canlı veri
// ==========================================

function liveStats() {
    const jobs = (Store.jobs || []).filter(j => j.status !== 'completed' && !isDormantPrelicenceJob(j));
    const obs = (Store.obligations || []).filter(o => o.status !== 'completed');
    const wf = (Store.workflows && Object.keys(Store.workflows).length) ? Store.workflows : DEFAULT_WORKFLOWS;
    const items = [
        [jobs.length, 'aktif tadil'],
        [obs.length, 'açık yükümlülük'],
        [(Store.projects || []).length, 'proje'],
        [Object.keys(wf).length, 'hazır tadil tipi']
    ];
    return `<div class="g-live" title="Panelden canlı okunur">${items.map(([n, l]) => `<div class="g-live-i"><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;
}

const PARALLEL_TYPES = new Set(['TEIAS_GORUS_CIKIS', 'TEIAS_GORUS_DONUS', 'EIGM_GORUS_CIKIS', 'EIGM_GORUS_DONUS', 'EPDK_ASKI']);

/** Bir iş akışında hangi kurum görüşlerinin geçtiğini aşama tiplerinden çıkarır. */
function workflowTags(steps) {
    const has = re => steps.some(s => re.test(s.type || ''));
    const tags = [];
    if (has(/^OZET_/)) tags.push('Diğer birimlerden özet');
    if (has(/TEIAS/)) tags.push('TEİAŞ görüşü');
    if (has(/EIGM/)) tags.push('EİGM görüşü');
    if (has(/KDB/)) tags.push('KDB görüşü');
    if (has(/^EPDK_ASKI$/)) tags.push('EPDK itiraz askısı');
    if (has(/^YUKUMLULUK_TANIMLAMA$/)) tags.push('Yükümlülük tanımlama');
    if (has(/^TEMINAT_IADESI$/)) tags.push('Teminat iadesi');
    return tags;
}

function workflowList() {
    const wf = (Store.workflows && Object.keys(Store.workflows).length) ? Store.workflows : DEFAULT_WORKFLOWS;
    const names = Object.keys(wf).sort((a, b) => a.localeCompare(b, 'tr'));
    return names.map(n => {
        const steps = wf[n] || [];
        const tags = workflowTags(steps);
        return `
        <details class="g-acc">
            <summary><span class="g-acc-t">${esc(n)}</span><span class="g-acc-n">${steps.length} aşama</span></summary>
            ${tags.length ? `<div class="g-tags">${tags.map(t => `<span class="g-tag">${esc(t)}</span>`).join('')}</div>` : ''}
            <ol class="g-wf">${steps.map(s => `<li>${PARALLEL_TYPES.has(s.type) ? '<span class="g-par" title="Paralel yürür">🔀</span> ' : ''}${esc(String(s.long || s.short || s.type).replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>
        </details>`;
    }).join('');
}

const NAV_HINTS = {
    'dashboard': 'Günün özeti: yaklaşan yükümlülükler, aktif tadiller, 12 aylık yoğunluk',
    'jobs': 'Tüm tadil süreçleri kart kart; aşama aşama ilerletme',
    'prelicence-extensions': 'Önlisans süre uzatımlarını Excel benzeri tabloda izleme',
    'tea-applications': 'TÜBİTAK BİLGEM TEA başvuruları ve sonuçları',
    'obligations': 'Son tarihli yükümlülük listesi, filtreleme, tamamlama',
    'projects': 'Proje kartları; her projenin yükümlülük, tadil ve TEA özeti',
    'mail-prep': 'Tadil bedeli hesabı ve hazır mail taslağı',
    'analytics': 'İki grafiği yan yana karşılaştırma',
    'settings': 'Veri, bildirim, iş akışı ve aşama ayarları'
};

function navMap() {
    const items = [...document.querySelectorAll('.nav-menu .nav-item[data-page]')].map(a => ({
        page: a.dataset.page,
        icon: a.querySelector('.nav-icon')?.textContent?.trim() || '•',
        label: a.querySelector('span:last-child')?.textContent?.trim() || a.dataset.page
    }));
    return `<div class="g-navmap">${items.map(i => `
        <button type="button" class="g-nav-row" data-g-page="${esc(i.page)}">
            <span class="g-nav-i">${esc(i.icon)}</span>
            <span class="g-nav-b"><b>${esc(i.label)}</b><small>${esc(NAV_HINTS[i.page] || '')}</small></span>
            <span class="g-nav-go">→</span>
        </button>`).join('')}</div>`;
}

// ==========================================
// BÖLÜMLER
// ==========================================

function sOzet(p) {
    return `
    ${LEAD(`DaVinci Enerji Lisans Müdürlüğü'nün EPDK ile yürüttüğü <b>lisans, önlisans, tadil, süre uzatımı, TEA ve yükümlülük</b> işlerini tek yerde izlediği ortak çalışma panelidir. Excel tabloları, mail zincirleri ve kişisel notların yerini alır: ekipteki herkes aynı güncel veriye bakar.`)}
    ${liveStats()}
    ${H('Panelin size katkıları')}
    ${CARDS([
        ['🎯', 'Hiçbir süre kaçmaz', 'Her yükümlülüğün son tarihi, kalan günü ve rengi (gecikmiş / bu hafta / bu ay / yaklaşan) görünür. Günlük özet e-postası ve telefon bildirimleri size hatırlatır.'],
        ['🙋', '"Top kimde?" sorusunu yanıtlar', 'Her tadilin hangi aşamada olduğunu, işin bizde mi yoksa kurumda mı beklediğini ve kaç gündür beklediğini kartın üzerinde gösterir. Akıllı sıralama önce sizin harekete geçmeniz gerekenleri listeler.'],
        ['🛤️', 'Süreci standartlaştırır', 'Her tadil tipinin hazır bir iş akışı vardır. Yeni biri bile "sıradaki adım ne?" sorusunun cevabını görür; aşamalar sırayla açılır, atlanamaz.'],
        ['📈', 'İlerlemeyi ölçer', 'Her tadilde yüzde ilerleme, aşamalar arası geçen gün sayısı ve ana sayfada 12 aylık iş yükü görünümü vardır.'],
        ['✉️', 'Bedel ve mail işini hızlandırır', 'Mail Hazırlığı, Kurul Kararı\'na göre tadil bedelini hesaplar ve banka bilgisi ile dekont açıklaması dahil gönderime hazır mail taslağını üretir.'],
        ['🧾', 'Geçmiş kaybolmaz', 'Aşama tarihleri, notlar ve revizyonlar kayıt altındadır. "Bu tadil neden gecikti?" sorusunun cevabı kartın içindedir; kişi değişse bilgi kalır.'],
        ['📄', 'Toplantıya hazır', 'Tek tıkla PDF haftalık bülten (Rapor Al) ve Analiz sayfasında karşılaştırmalı grafikler.'],
        ['📲', 'Her yerden erişim', 'Bilgisayarda web sitesi, telefonda iPhone uygulaması. İkisi aynı veriyi gösterir.']
    ])}
    ${H('Bir tadil panelde nasıl ilerler?')}
    ${FLOW(['Proje + tadil tipi seçilir', 'Aşamalar sırayla açılır', 'Her aşamada tarih / sayı kaydedilir', 'Kurum görüşleri takip edilir', 'Son aşama bitince tadil tamamlanır'])}
    ${P(`Kayıt açıldıktan sonra tek yapmanız gereken, işin her adımında ilgili aşamayı doldurup <b>"Aşamayı Kaydet &amp; İlerlet"</b> demektir. Gerisini (sayaçlar, renkler, sıralama, hatırlatmalar, mail özeti) panel kendisi yapar.`)}
    ${H('Nereden başlamalıyım?')}
    ${P(`${p.mobile ? 'Aşağıdan' : 'Soldaki menüden'} sırayla ilerlemenizi öneririz: ${GO('baslarken', 'Başlarken')} → ${GO('ana-sayfa', 'Ana Sayfa')} → ${GO('tadiller', 'Tadiller')} → ${GO('gorevler', 'Sık yapılan işler')}.`)}
    `;
}

function sBaslarken(p) {
    const girisD = STEPS([
        ['Siteyi açın', 'Tarayıcınızın adres çubuğuna <b>sure-takip.web.app</b> yazın.'],
        ['E-posta ve şifrenizi girin', 'Hesaplar yönetici tarafından tanımlanır. Hesabınız yoksa ya da şifrenizi unuttuysanız yöneticinize başvurun.'],
        ['"Beni Hatırla" tercihini seçin', 'Açıksa bu bilgisayarda oturumunuz açık kalır. Ortak bir bilgisayarda kapatın ya da işiniz bitince menüden <b>Çıkış Yap</b> deyin.'],
        ['<b>Giriş Yap</b>\'a tıklayın', 'Sizi Ana Sayfa karşılar.']
    ]);
    const girisM = p.native ? STEPS([
        ['Uygulamayı açın', 'Açılışta logo ekranı görünür. Cihazınızda Face ID tanımlıysa uygulama kimlik doğrulaması ister.'],
        ['İlk seferde e-posta ve şifrenizi girin', 'Giriş bilgileriniz hatırlanır; sonraki açılışlarda şifre sorulmaz.'],
        ['Ana Sayfa açılır', 'Verileri görmüyorsanız ekranı aşağı çekerek yenileyin.']
    ]) : STEPS([
        ['Siteyi telefon tarayıcınızda açın', 'Adres: <b>sure-takip.web.app</b>. Safari\'de "Paylaş → Ana Ekrana Ekle" ile kısayol oluşturabilirsiniz.'],
        ['E-posta ve şifrenizi girin', 'Hesabınız yoksa yöneticinize başvurun.'],
        ['"Beni Hatırla"yı açık bırakın', 'Her seferinde şifre yazmak zorunda kalmazsınız.']
    ]);

    const duzenD = `
        ${H('Ekran düzeni')}
        ${UL([
            '<b>Sol menü:</b> tüm sayfalar burada. Yukarıdaki listede her birinin ne işe yaradığını görebilirsiniz.',
            '<b>Üst çubuk:</b> sayfanın adı, bugünün tarihi ve sağda o sayfaya özel işlem düğmeleri.',
            '<b>Sol alt köşe:</b> profiliniz (adınıza tıklayınca Profil Ayarları açılır), <b>❓ Nasıl Kullanılır?</b> düğmesi (bu kılavuz) ve sürüm etiketi.'
        ])}
        ${TABLE(['Sayfa', 'Üst çubukta görünen düğmeler'], [
            ['Ana Sayfa', '💼 Yeni Tadil Başvurusu · ➕ Yeni Yükümlülük · 📄 Rapor Al'],
            ['Tadiller &amp; Süreç Takibi, Önlisans Süre Uzatımları', '💼 Yeni Tadil Başvurusu'],
            ['Yükümlülükler', '➕ Yeni Yükümlülük'],
            ['Diğer sayfalar', 'Üst çubukta düğme yok; kendi sayfalarındaki "Ekle" düğmelerini kullanın']
        ])}`;
    const duzenM = `
        ${H('Ekran düzeni')}
        ${UL([
            '<b>☰ (sol üst):</b> menüyü açar. Bir sayfaya dokununca menü kendiliğinden kapanır; menünün dışına dokunursanız da kapanır.',
            '<b>Üst çubuk:</b> sayfanın adı ve sağda küçük ikon düğmeleri: <b>💼</b> Yeni Tadil Başvurusu, <b>➕</b> Yeni Yükümlülük, <b>📄</b> Rapor Al. Hangi ikonun göründüğü sayfaya göre değişir (Ana Sayfa\'da üçü de, Tadiller\'de yalnızca 💼, Yükümlülükler\'de yalnızca ➕).',
            '<b>Menünün en altı:</b> profiliniz, <b>❓ Nasıl Kullanılır?</b> ve sürüm etiketi.'
        ])}
        ${p.native ? UL([
            '<b>Aşağı çekerek yenileme:</b> sayfanın en üstündeyken parmağınızı aşağı sürükleyin.',
            '<b>Geri gitme:</b> ekranın sol kenarından sağa doğru kaydırın.',
            '<b>Çevrimdışı uyarısı:</b> internet kesilirse üstte kırmızı bir şerit çıkar; bağlantı gelince kaybolur.'
        ]) : ''}`;

    return `
    ${LEAD(`Bu bölüm, ilk kez giriş yapan biri için panelin iskeletini anlatır: nasıl girilir, ekranda ne nerede, profil nasıl tamamlanır.`)}
    ${H('1. Giriş yapma')}
    ${p.mobile ? girisM : girisD}
    ${WARN('Şifrenizi kimseyle paylaşmayın ve mail ya da mesajlara yazmayın. Şifre unutulursa yöneticiden yenisi istenir.')}
    ${H('2. Panelin haritası')}
    ${P(`Aşağıdaki her satıra ${tap(p)} ve o sayfaya geçin.`)}
    ${navMap()}
    ${p.mobile ? duzenM : duzenD}
    ${H('3. Profilinizi tamamlayın')}
    ${STEPS([
        [`${p.mobile ? 'Menüyü açıp en alttaki' : 'Sol alttaki'} adınıza ${tap(p)}`, 'Profil Ayarları penceresi açılır.'],
        ['<b>Ad Soyad</b> alanını doldurun (zorunlu)', 'Notlarda ve yorumlarda e-posta yerine bu ad görünür. E-posta adresi değiştirilemez.'],
        ['İsterseniz Ünvan ve fotoğraf ekleyin', ''],
        ['<b>Bilgileri Güncelle</b> deyin', '']
    ])}
    ${H('İlk 10 dakika için önerilen tur')}
    ${STEPS([
        ['Ana Sayfa\'ya bakın', 'Bugün neyin yaklaştığını ve hangi tadillerin aktif olduğunu görün.'],
        ['Tadiller sayfasında bir kartı açın', 'Aşamaları gezin, hiçbir şeyi kaydetmeden kapatın.'],
        ['Yükümlülükler sayfasında "Bu Hafta" filtresini deneyin', 'Haftanın işlerini görün.'],
        ['Mail Hazırlığı\'nda bir taslak oluşturun', 'Bedel hesabının nasıl çalıştığını görün (hiçbir şey gönderilmez).'],
        ['Ayarlar > Bildirim bölümünü kontrol edin', 'Günlük özetin hangi gün ve saatte geleceğini ayarlayın.']
    ])}
    `;
}

function sAnaSayfa(p) {
    return `
    ${LEAD(`Ana Sayfa, panele her girişinizde karşılaştığınız "bugünün özeti"dir. ${p.mobile ? 'Bloklar alt alta dizilir.' : 'Üstte sayaçlar, altta iki sütun halinde yükümlülük listesi ve yoğunluk grafikleri vardır.'}`)}
    ${OPEN('dashboard', 'Ana Sayfa\'yı aç')}
    ${H('Ana Sayfa\'da neler var?')}
    ${CARDS([
        ['🆕', 'Son güncelleme kartı', 'Her güncellemeden sonra siteye ilk girişinizde en üstte çıkar: neler eklendi, değişti, çıkarıldı. Eski güncellemeleri Kılavuz > Neler Yeni sekmesinden okuyabilirsiniz.'],
        ['🗓️', 'Bu Ayki Yükümlülük Sayısı', `Bu ay son tarihi olan yükümlülüklerin sayısı. ${TapWhen(p)} Yükümlülükler sayfası "Bu Ay" filtresiyle açılır.`],
        ['💼', 'Aktif Tadil Sayısı', `Devam eden tadil süreçlerinin sayısı. ${TapWhen(p)} Tadiller sayfası "Aktif Süreçler" filtresiyle açılır.`],
        ['⚡', 'Aktif Tadiller listesi', 'Her aktif tadilin hangi aşamada olduğunu tek bakışta gösterir. En acil olanlar renkli çizgiyle öne çıkar.'],
        ['🔥', 'En Yakın 30 Yükümlülük', `Son tarihi en yakın 30 yükümlülük; kalan gün sayacı ve durum rengiyle. Bir satıra ${tapBy(p)} ayrıntısını, yorumlarını ve "Tamamlandı" düğmesini görürsünüz.`],
        ['📊', 'Yoğunluk Analizi', 'Önümüzdeki 12 ayın her birinde kaç yükümlülük ve tadil olduğunu çubuklarla; ayrıca çeyrek bazlı bakışı gösterir. İş yükünün hangi aylarda sıkışacağını önceden görürsünüz.']
    ])}
    ${H('Durum renkleri')}
    ${P('Yükümlülükler her yerde (liste, tablo, grafik) aynı renklerle gösterilir:')}
    ${LEGEND([['red', '<b>Gecikmiş</b>: son tarihi geçmiş, tamamlanmamış'], ['orange', '<b>Bu hafta</b>: bu hafta içinde dolacak'], ['yellow', '<b>Bu ay</b>: bu ay içinde dolacak'], ['green', '<b>Yaklaşan</b>: daha ilerideki tarih'], ['blue', '<b>Tamamlandı</b>']])}
    ${TIP(`Menüden <b>Ana Sayfa</b>'ya her dönüşünüzde Yükümlülükler sayfasındaki filtreler sıfırlanır; bu yüzden eski bir filtre yüzünden "neden hepsi görünmüyor?" diye şaşırmazsınız.`)}
    ${p.mobile ? '' : TIP('Toplantıya girmeden önce üst çubuktaki <b>📄 Rapor Al</b> ile haftalık bülteni PDF olarak alabilirsiniz (bkz. ' + GO('rapor', 'Rapor Al') + ').')}
    `;
}

function sTadiller(p) {
    return `
    ${LEAD(`Panelin kalbi burasıdır. Her <b>tadil başvurusu</b> (kurulu güç, saha koordinatı, bağlantı noktası vb.) bir <b>kart</b>tır; kartın içinde işin aşamaları sırayla ilerler. ${p.mobile ? 'Kartlar tek sütun halinde alt alta dizilir.' : ''}`)}
    ${OPEN('jobs', 'Tadiller sayfasını aç')}

    ${H('Sayfanın bölümleri')}
    ${UL([
        '<b>Üstteki 3 sayaç:</b> Toplam Başvuru, Aktif Süreçler, Tamamlananlar. Bir kutuya ' + tap(p) + ' ve liste o duruma göre süzülsün.',
        '<b>Filtreler:</b> Şirket, Proje, EPDK Uzmanı, Tadil Tipi, Durum (açılışta "Aktif Süreçler" seçilidir) ve Sıralama.',
        '<b>Kartlar:</b> her tadil için bir kart. Karta ' + tap(p) + ' → tüm ayrıntılar açılır.'
    ])}

    ${H('Sıralama nasıl çalışır?')}
    ${TABLE(['Seçenek', 'Ne yapar?'], [
        ['🧠 <b>Akıllı Sıralama</b> (varsayılan)', 'Önce <b>aksiyon bizde</b> olan tadilleri, sonra <b>dış taraftan dönüş beklenenleri</b> listeler. Her grubun içinde mevcut aşamasında en uzun süredir bekleyen en üstte durur. Yani listenin başı "bugün neye dokunmalıyım?" sorusunun cevabıdır.'],
        ['🔽 Yeniden Eskiye', 'En son açılan tadil en üstte.'],
        ['🔼 Eskiden Yeniye', 'En eski tadil en üstte.']
    ])}
    ${P('Bir aşamanın "bizde" mi "dışta" mı sayılacağı Ayarlar > <i>Aşama Sorumluluk &amp; Zorluk</i> bölümünden belirlenir.')}

    ${H('Bir kartı nasıl okurum?')}
    ${metroMock()}
    ${UL([
        '<b>Sol:</b> şirket etiketi, proje adı ve tadil tipi rozeti.',
        '<b>Orta, süreç hattı (metro):</b> her durak bir aşamadır. <span class="g-inline done">✓ yeşil</span> tamamlandı, <span class="g-inline active">🚇</span> şu an burada, <span class="g-inline todo">gri</span> henüz gelinmedi. Duraklar arasındaki "<b>12 gün</b>" rozeti iki aşama arasında kaç gün geçtiğini gösterir.',
        '<b>Hattın altında:</b> canlı durum cümlesi, ➡️ sıradaki aşama ve bir <b>sorumluluk çipi</b>: <i>"Aksiyon bizde"</i> ya da <i>"Dış taraftan dönüş bekleniyor · 6 gündür bu aşamada"</i>.',
        '<b>Sağ:</b> <b>% İlerleme</b> çemberi, <b>Başvuru</b> tarihi ve son <b>Güncelleme</b> tarihi (ne kadar önce olduğuyla birlikte).'
    ])}
    ${NOTE('Yüzde ilerleme aşama sayısına göre değil, aşamaların <b>zorluk puanlarına</b> göre hesaplanır. 1 puanlık "Tadil Bedeli" ile 13 puanlık hazırlık aşaması aynı ağırlıkta sayılmaz.')}
    ${p.mobile ? NOTE('Telefonda fare olmadığı için durakların üzerinde beliren ipucu kutuları görünmez. Ayrıntı için kartı açın.') : TIP('Durakların üzerine fareyi getirirseniz aşamanın adı, tarihi ve durumu küçük bir ipucu kutusunda görünür.')}

    ${H('Paralel (çatallı) aşamalar')}
    ${P(`Bazı tadillerde <b>TEİAŞ</b> ve <b>EİGM</b> görüşleri birbirini beklemeden aynı anda yürür. Kartta hat bu bölümde iki kola ayrılıp sonra tekrar birleşir; her kolda önce "görüşe çıkılması", sonra "görüşün alınması" gelir. Her ikisi de bitmeden sonraki ortak aşamaya geçilmez.`)}
    ${P(`<b>Saha Koordinat Tadili</b>'nde bu ikiliye bir üçüncü kol eklenir: <b>EPDK İtiraz Askı Süresi</b>. Başlangıç ve bitiş tarihini bir kez girersiniz; süre dolana kadar aşama "yürüyor" görünür ve bitiş tarihi geldiğinde <b>kendiliğinden tamamlanır</b>. Bu aşamada elle "tamamlandı" işaretlemezsiniz.`)}

    ${H('Yeni tadil başvurusu açma')}
    ${STEPS([
        [`${p.mobile ? 'Üst çubuktaki <b>💼</b> ikonuna' : 'Üst çubuktaki <b>Yeni Tadil Başvurusu</b> düğmesine (ya da sayfadaki ➕ düğmesine)'} ${tap(p)}`, 'Ana Sayfa, Tadiller ve Önlisans sayfalarında bulunur.'],
        ['<b>İlgili Proje</b>\'yi seçin', 'Liste, Ayarlar\'da tanımlı projelerden gelir. Proje yoksa önce Ayarlar > Mevcut Proje Tanımları\'ndan ekleyin.'],
        ['<b>Tadil Türü</b>\'nü seçin', 'Liste, Ayarlar\'daki iş akışlarından otomatik dolar. Seçtiğiniz türe göre aşamalar belirlenir (bkz. ' + GO('tadil-tipleri', 'Tadil tipleri') + ').'],
        ['<i>(Yalnızca Önlisans Süre Uzatımı için)</i> Özet İsteme Tarihi', 'İsteğe bağlı. Girerseniz kayıt, Önlisans matrisinde hemen doğru sıraya oturur.'],
        ['İsterseniz bir <b>Açıklama / Not</b> yazın', 'Sonradan da not ekleyebilirsiniz.'],
        ['<b>Tadil Başvurusunu Kaydet</b>', 'Kart listeye eklenir ve ilk aşama açık başlar.']
    ])}

    ${H('Tadil ayrıntı penceresi')}
    ${P(`Bir karta ${tap(p)} ve <b>Tadil İş Akışı Takibi</b> penceresi açılır${p.mobile ? ' (ekranın altından yukarı kayan tam sayfa)' : ''}. İçinde yukarıdan aşağıya şunlar vardır:`)}
    ${UL([
        '<b>Aşama X/N</b> rozeti ve <b>🗑️ Sil</b> düğmesi. Silme tüm süreci kalıcı olarak kaldırır; önce onay sorar.',
        '<b>Proje bilgileri:</b> ana firma, firma, lisans numarası/tarihi ve <b>EPDK uzmanı</b>. Uzmanın telefon ve e-postasına ' + tap(p) + ' ve ' + (p.mobile ? 'arama / mail başlatın.' : 'ara / mail yazın.'),
        '<b>📜 İş Akışı Geçmişi Özeti:</b> şimdiye kadar yapılan her şeyin kısa dökümü (ve uygunsa <b>🔄 Revizyon Yap</b> düğmesi).',
        '<b>Aşama listesi:</b> her aşama bir satırdır. Başlığa ' + tap(p) + ' ve açıp kapatın.',
        '<b>💬 Notlar ve Güncellemeler:</b> kim, ne zaman, ne yazdı. Yeni not yazıp <b>Gönder</b> diyebilirsiniz (emoji seçici vardır).'
    ])}
    ${H('Aşama satırının durumları')}
    ${LEGEND([['gray', '<b>🔒 Kilitli</b>: önceki aşamalar bitmeden açılmaz'], ['purple', '<b>⚡ Aktif</b>: şu an doldurulacak aşama (otomatik açık gelir)'], ['green', '<b>✓ Tamamlandı</b>']])}
    ${P('Her aşama başlığında iki küçük rozet de vardır: <b>🙋 Biz / ⏳ Dış</b> (işin kimde olduğu) ve <b>⚡ N puan</b> (zorluk).')}

    ${H('Bir aşamayı ilerletme (en sık yapacağınız iş)')}
    ${STEPS([
        ['Kartı açın, <b>⚡ Aktif</b> aşamayı bulun', 'Pencere açılınca etkin aşamaya kendiliğinden kayar.'],
        ['Aşamanın alanlarını doldurun', 'Tarih, evrak sayısı, imza durumu gibi alanlar aşamaya göre değişir. Tarih seçicilerini kullanın.'],
        ['<b>Aşamayı Kaydet &amp; İlerlet</b>\'e ' + tap(p), 'Aşama yeşile döner, bir sonraki aşama açılır, kartın hattı ve yüzdesi güncellenir.'],
        ['Gerekirse aşağıya bir not yazın', '"Dilekçe ıslak imzaya gönderildi" gibi kısa notlar ekibe bilgi verir.']
    ])}
    ${TIP('Kilitli bir aşamaya ' + tapIf(p) + ' "Bu aşama henüz kilitli. Önceki aşamaları tamamlayın." uyarısı çıkar. Bu bir hata değil, sürecin sırasını korumak içindir.')}

    ${H('Geri alma ve revizyon')}
    ${UL([
        '<b>🔄 Bu Aşamaya Geri Dön:</b> tamamlanmış bir aşamada görünür. Yanlış ilerlettiyseniz süreci o aşamaya geri çeker.',
        '<b>🔄 Revizyon Yap:</b> başvuru yapıldıktan sonra, kurul kararı çıkana kadar, başvuruda değişiklik gerekirse kullanılır. Süreç <i>Başvuru</i> aşamasına döner, <b>önceki tüm veriler arşivlenir</b> ve geçmiş özetinde "1. Revizyon Başlatıldı" olarak görünür. Bilgi kaybolmaz.'
    ])}

    ${H('TEİAŞ bağlantı görüşü: kabul, itiraz, tebliğ')}
    ${P('TEİAŞ görüşü geldiğinde aşamada üç durumdan birini seçersiniz:')}
    ${TABLE(['Durum', 'Anlamı ve sonraki adım'], [
        ['✅ <b>Kabul Edildi</b>', 'Bağlantı noktası değişmedi / kabul edildi. İsterseniz <i>"Bağlantı Kabul Taahhüt Yükümlülüğü Tanımla"</i> kutusunu işaretleyip taahhüt son günü ve açıklamasını girin; yükümlülük otomatik olarak Yükümlülükler listesine eklenir.'],
        ['⚠️ <b>İtiraz Edildi</b>', 'EPDK/TEİAŞ itiraz tarih ve sayılarını girersiniz. İtiraz cevabı geldiğinde <i>"İtiraz Cevabı Geldi (Süreci Başına Döndür)"</i> kutusuyla süreci tek tıkla başa döndürürsünüz.'],
        ['📨 <b>EPDK\'ya Döndü – Tebliğ Bekleniyor</b>', 'TEİAŞ görüşü EPDK\'ya döndü ama yazı henüz size tebliğ edilmedi. Dönüş yazısının sayı/tarihini kaydedin, aşama tamamlanır. Tebliğ gelince aşamayı yeniden açıp Kabul ya da İtiraz olarak güncelleyin. O güne kadar <i>Yükümlülük Tanımlama</i> aşamasında bir uyarı görünür; taahhüt durumu bilinmeden o aşama sessizce geçilmez.']
    ])}

    ${WARN('Aynı tadilin aynı aşamasını iki kişi aynı anda düzenlemesin. Kayıtlar kayıt bazında birleştirilerek buluta yazılır ama aynı alana aynı anda yazılırsa sonra kaydeden kazanır.')}
    `;
}

function sTadilTipleri(p) {
    return `
    ${LEAD(`Her tadil tipinin kendine ait, sırası belli bir <b>aşama listesi</b> (iş akışı) vardır. Aşağıdaki liste <b>canlı olarak</b> panelin şu anki tanımlarından okunur; Ayarlar'da bir iş akışı değiştirilirse burası da kendiliğinden güncellenir.`)}
    ${P('Bir tipe ' + tap(p) + ' ve aşamalarını görün. <span class="g-par">🔀</span> işaretli aşamalar <b>paralel</b> yürür (birbirini beklemez).')}
    ${workflowList()}
    ${H('İş akışlarını kim değiştirebilir?')}
    ${P(`Ayarlar sayfasındaki <b>🧩 Tadil İş Akışı Yönetimi</b> kartından aşamalar sürükle-bırakla düzenlenir veya yeni tadil tipi oluşturulur. Zaten ilerlemiş kayıtların verisi yeni sıraya otomatik taşınır. ${p.mobile ? '<b>Bu düzenleme yalnızca bilgisayarda yapılabilir</b>; telefonda düğmeler gizlidir.' : ''}`)}
    ${NOTE('Bir aşamayı iş akışından çıkarmak o aşamadaki veriyi silmez; veri arşivlenir (ör. kaldırılan GD Kontrolü ve Müzekkere aşamaları).')}
    `;
}

function sOnlisans(p) {
    return `
    ${LEAD(`<b>Önlisans Süre Uzatımları</b>, tüm projelerin süre uzatımı sürecini Excel'e benzer tek bir tabloda gösterir: satırlar projeler, sütunlar aşamalardır. Onlarca projeyi aynı anda kıyaslamak için idealdir.`)}
    ${OPEN('prelicence-extensions', 'Önlisans sayfasını aç')}
    ${H('Üst sayaçlar ve filtreler')}
    ${UL([
        '<b>Toplam Süre Uzatımı · AO Hazırlığında · ZK Kontrolünde · Tamamlananlar:</b> ' + tap(p) + ' ve tablo o gruba süzülsün.',
        '<b>Arama / Proje</b> kutusu proje veya şirket adına göre arar.',
        '<b>Şirket</b> ve <b>Durum</b> (açılışta "Aktif Devam Edenler") filtreleri.'
    ])}
    ${H(p.mobile ? 'Telefonda: kart listesi' : 'Tablo nasıl kullanılır?')}
    ${p.mobile ? `
        ${P('Geniş tablo telefona sığmadığı için her proje bir <b>kart</b> olarak gösterilir:')}
        ${UL([
            'Kartın başında proje adı (üzerine dokunup başka proje seçebilirsiniz) ve <b>Aşama X/N</b> rozeti.',
            '<b>Süre Bitiş:</b> projenin önlisans süre bitiş tarihi. Tarihe dokunup değiştirebilirsiniz.',
            'Her aşama bir kutudur: <b>tarih</b> alanı ve sağda bir düğme. <b>✓</b> = tamamla, <b>📅</b> = planlı (tarih ileride), <b>✅</b> = tamamlandı. Düğmeye tekrar dokunursanız geri alır.',
            '<b>🔍 Detayları Aç</b> tadilin tam ekranını açar; <b>🗑️ Satırı Sil</b> kaydı kaldırır.'
        ])}` : `
        ${UL([
            '<b>Hücreye tarih girin:</b> aşamanın gerçekleştiği (veya planlandığı) tarihi seçin. Tarih ilerideyse aşama "planlı" görünür.',
            '<b>Tamamlandı işaretleme:</b> hücredeki ✓ düğmesiyle aşamayı tamamlar ya da geri alırsınız.',
            '<b>Süre Bitiş:</b> projenin önlisans süre bitiş tarihi sütunudur, doğrudan düzenlenebilir.',
            '<b>Proje adı</b> hücresi bir açılır listedir; satırın projesini buradan değiştirebilirsiniz.',
            '<b>Sütun genişliği:</b> başlıkların kenarından sürükleyerek ayarlayın; tercihiniz hatırlanır.',
            '<b>Detayları Aç:</b> satırın tam tadil penceresini açar (Tadiller sayfasındaki ile aynı). <b>Satırı Sil</b> kaydı kaldırır.'
        ])}`}
    ${H('Yeni süre uzatımı açma')}
    ${STEPS([
        ['<b>➕ Yeni Süre Uzatımı Aç</b>\'a ' + tap(p), 'Yeni Tadil Başvurusu penceresi açılır.'],
        ['Projeyi seçin, tür olarak <b>Önlisans Süre Uzatımı</b>\'nı bırakın', ''],
        ['İsteğe bağlı <b>Özet İsteme Tarihi</b>\'ni girin', 'Liste bu tarihe göre sıralanır.'],
        ['Kaydedin', 'Satır tabloya eklenir.']
    ])}
    ${H('Aşamalar')}
    ${P(`Süre uzatımının aşamaları sırasıyla: <b>Özet İsteme</b> → <b>Birim Görüşleri</b> → <b>AO Hazırlık</b> → <b>ZK Kontrol</b> → <b>EPDK Başvuru</b> → <b>KDB Görüşü (çıkış / dönüş)</b> → <b>Olur/Gündem</b> → <b>Derç Edilme</b> → <b>Belge Teslim</b> → <b>Dağıtım</b>. Güncel liste için ${GO('tadil-tipleri', 'Tadil tipleri')} bölümüne bakın.`)}
    ${NOTE(`Henüz hiçbir aşaması başlamamış süre uzatımları <b>Tadiller sayfasını kalabalıklaştırmaz</b>; yalnızca bu tabloda görünür. İlk aşamayı işaretlediğiniz anda Tadiller sayfasına da taşınır. Tadiller sayfasında kaç tanesinin gizli olduğunu söyleyen bir bilgi şeridi ve "Matrise Git" düğmesi çıkar.`)}
    ${TIP('Süre uzatımı bedelini hesaplamak için ' + GO('mail', 'Mail Hazırlığı') + '\'nda <i>Önlisans Süre Uzatımı</i> türünü seçin; bedel aralığı mekanik güç + depolama kapasitesine göre belirlenir.')}
    `;
}

function sTea(p) {
    return `
    ${LEAD(`TÜBİTAK BİLGEM'e yapılan <b>TEA başvurularının</b> kaydı, sonuçları ve dağılımı burada tutulur. Sol tarafta ay-yıl matrisi, sağ tarafta istatistikler vardır${p.mobile ? ' (telefonda alt alta)' : ''}.`)}
    ${OPEN('tea-applications', 'TEA sayfasını aç')}
    ${H('Matris')}
    ${UL([
        'Her satır bir <b>ay-yıl</b>, en yeni ay en üstte. O aya yapılan başvurular <b>etiket</b> (çip) olarak yan yana dizilir.',
        'Çipin rengi sonucu gösterir: <b>Olumlu</b>, <b>Olumsuz</b>, <b>Beklemede</b>.',
        'Çipin kendisine ' + tap(p) + ': M-Files bağlantısı girilmişse <b>🔗 bağlantıyı açar</b>, girilmemişse düzenleme penceresini açar.',
        'Çipin yanındaki <b>✏️</b> her zaman düzenleme penceresini açar.',
        'Her ay satırındaki <b>➕</b> o aya hızlıca başvuru ekler.'
    ])}
    ${H('Yeni başvuru ekleme')}
    ${STEPS([
        ['<b>➕ Yeni TEA Başvurusu Ekle</b>\'ye ' + tap(p), ''],
        ['<b>Proje</b>, <b>Ay</b> ve <b>Yıl</b>\'ı seçin', 'Zorunlu alanlardır.'],
        ['<b>Başvuru Etiketi</b> yazın', 'Örn: <i>Ilgardere RES 20</i>. Matriste görünen ad budur.'],
        ['<b>Sonuç</b>\'u seçin', '⏳ Beklemede · ✅ Olumlu · ❌ Olumsuz. Sonuç gelince düzenleyip güncelleyin.'],
        ['İsterseniz <b>M-Files bağlantısı</b> ve not ekleyin', 'Bağlantı varsa çipe ' + tap(p) + ' ve doğrudan arşiv kaydı açılır.'],
        ['<b>Kaydet</b>', 'Yanlış kaydı düzenleme penceresindeki <b>🗑️ Sil</b> ile kaldırabilirsiniz.']
    ])}
    ${H('İstatistik paneli')}
    ${UL([
        '<b>Toplam Başvuru</b> (Haziran 2024\'ten itibaren), <b>Olumlu</b> ve <b>Olumsuz</b> sayaçları. Olumlu/Olumsuz kutusuna ' + tap(p) + ' ve matris yalnızca o sonuçları göstersin; <b>✕ Temizle</b> ile filtre kalkar.',
        '<b>🏢 Şirketlere Göre Dağılım</b> grafiği: hangi şirketin kaç TEA başvurusu olduğunu gösterir.',
        'Üstteki <b>Arama</b> kutusu proje veya başvuru adına göre süzer.'
    ])}
    ${TIP('TEA başvuru <b>bedelini</b> hesaplamak için ' + GO('mail', 'Mail Hazırlığı') + '\'nda <i>TEA Başvurusu</i> türünü kullanın. Birim fiyatlar ve KDV oranı oradaki ⚙️ Bedel Ayarları\'ndan güncellenir.')}
    `;
}

function sYukumlulukler(p) {
    return `
    ${LEAD(`<b>Yükümlülük</b>, bir projenin belirli bir tarihe kadar yapması gereken işlerdir (ruhsat, belge, taahhüt vb.). Bu sayfa hepsini tek listede toplar.`)}
    ${OPEN('obligations', 'Yükümlülükler sayfasını aç')}
    ${H('Filtreler')}
    ${UL([
        '<b>Yükümlülük Türü</b>: türüne göre süzer.',
        '<b>Durum</b>: ✅ Tamamlananlar · 🔴 Gecikmiş · 🟠 Bu Hafta · 🟡 Bu Ay · 🟢 Yaklaşan.',
        '<b>Tarih Aralığı</b>: iki tarih arasındakileri gösterir.'
    ])}
    ${p.mobile ? P('Telefonda her yükümlülük bir kart olarak görünür: önce yükümlülüğün metni, altında proje, tür, son tarih ve kalan gün.') : TABLE(['Sütun', 'Ne gösterir?'], [
        ['Durum', 'Renkli nokta ve etiket'], ['Proje', 'Yükümlülüğün projesi'], ['Yükümlülük Türü / Yükümlülük', 'Neyin yapılacağı'],
        ['Son Tarih', 'Bitiş günü'], ['Kalan Gün', 'Bugüne göre kalan (ya da geçen) gün'], ['Notlar', 'Girilen ek not']
    ])}
    ${H('Yükümlülük ayrıntısı')}
    ${P(`Bir satıra ${tap(p)} ve ayrıntı penceresi açılsın. Proje adı bir M-Files bağlantısıysa ona ${tap(p)} ve arşive gidin.`)}
    ${UL([
        '<b>✅ Tamamlandı Olarak İşaretle</b> / <b>🔄 Bekleyene Al</b>: durumu değiştirir.',
        '<b>📅 Tarihi Değiştir</b>: yeni tarihi seçip <b>Güncelle</b> deyin.',
        '<b>💬 Yorumlar &amp; Yazışmalar</b>: ekip içi notlar; kim yazdığı ve zamanı görünür.',
        'Alt satırda yükümlülüğün oluşturulma zamanı ve son güncelleyen kişi yazar.'
    ])}
    ${H('Yeni yükümlülük ekleme')}
    ${STEPS([
        [`${p.mobile ? '<b>➕</b> ikonuna' : '<b>➕ Yeni Yükümlülük</b> düğmesine'} ${tap(p)}`, 'Ana Sayfa ve Yükümlülükler sayfalarında bulunur.'],
        ['<b>Proje Adı</b>\'nı seçin', ''],
        ['İsterseniz <b>Proje Linki (M-Files)</b> girin', 'Proje adı bu bağlantıya dönüşür.'],
        ['<b>Yükümlülük Türü</b>, <b>Açıklama</b> ve <b>Son Tarih</b>\'i doldurun', 'Yıldızlı alanlar zorunludur.'],
        ['<b>Kaydet</b>', 'Yükümlülük listeye girer, Ana Sayfa\'daki sayaçlar güncellenir.']
    ])}
    ${NOTE('Yükümlülükler ayrıca <b>tadil süreçlerinden de oluşur</b>: ör. bağlantı kabul taahhüdü ya da "Yükümlülük Tanımlama" aşaması. Tadil penceresinden de yükümlülük eklenebilir.')}
    ${TIP(`Çok sayıda yükümlülüğü Excel'den toplu yüklemek için Ayarlar > <i>Excel Dosyası Yükle</i> bölümünü kullanın.`)}
    `;
}

function sProjeler(p) {
    return `
    ${LEAD(`Panelde tanımlı tüm <b>projelerin</b> kartlar halinde listesi. Bir projenin her şeyini tek pencerede görmek için en kolay yoldur.`)}
    ${OPEN('projects', 'Projeler sayfasını aç')}
    ${UL([
        'Üstteki kutudan <b>proje ya da firma adına göre</b> arayın.',
        'Her kartta firma, proje adı ve proje için kayıtlı <b>yükümlülük sayısı</b> vardır.',
        'Karta (ya da <b>Detayları Gör</b>\'e) ' + tap(p) + ' ve proje penceresi açılsın.'
    ])}
    ${H('Proje penceresi')}
    ${UL([
        '<b>Firma, ana firma, lisans bilgisi ve EPDK uzmanı</b> (telefon / e-posta ' + tap(p) + ' ve arayın / yazın).',
        '<b>📜 Yükümlülükler:</b> bugünden itibaren olanlar, tarihe göre. Her satırdaki küçük kutuyla durumunu hızlıca değiştirir; satıra ' + tap(p) + ' ve ayrıntısını açarsınız.',
        '<b>💼 İşler / Görevler:</b> projeye ait tadiller; ' + tap(p) + ' ve tadil ayrıntısı açılır.',
        '<b>🧪 TEA Başvuruları:</b> projenin TEA kayıtları ve sonuçları.'
    ])}
    ${TIP('Yeni bir proje eklemek ya da bir projenin firma / uzman bilgisini değiştirmek için ' + GO('ayarlar', 'Ayarlar') + ' > <i>Mevcut Proje, Firma ve Uzman Tanımları</i> bölümünü kullanın.')}
    `;
}

function sMail(p) {
    return `
    ${LEAD(`<b>Mail Hazırlığı</b>, EPDK'dan istenecek <b>tadil / süre uzatımı bedelini</b> Kurul Kararı'na göre hesaplar ve gönderime hazır mail taslağını (tablolar, banka bilgileri ve dekont açıklamasıyla) üretir. Panel mail <u>göndermez</u>; taslağı kopyalayıp kendi e-posta programınıza yapıştırırsınız.`)}
    ${OPEN('mail-prep', 'Mail Hazırlığı\'nı aç')}
    ${H('Taslak hazırlama')}
    ${STEPS([
        ['<b>Bedel İstenecek Tadil Tipi</b>\'ni seçin', 'Seçince altında o tipe özel açıklama çıkar (hangi yönetmelik maddesi, bedel nasıl bulunur).'],
        ['<b>Proje</b>\'yi seçin', ''],
        ['<b>Mailin Gideceği Kişi (Hitap)</b>\'ni yazın', 'Örn: <i>Emre Bey</i>.'],
        ['Tipe göre çıkan alanları doldurun', 'Örn. kurulu güç, mekanik güç, depolama kapasitesi, eski/yeni güç.'],
        [p.mobile ? 'Aşağıda oluşan sonucu inceleyin' : 'Sağ tarafta oluşan sonucu inceleyin', '<b>Bedel kutusu</b>, <b>Konu</b> ve mail gövdesi anında hazırlanır.'],
        ['Gerekirse metni düzenleyin', 'Önizleme alanı düzenlenebilir; yazdığınız her şey kopyalamaya dahil olur.'],
        ['<b>Konu → Kopyala</b>, sonra <b>📋 Maili Kopyala</b>', 'Mail programınıza yapıştırın; tablolar ve biçim korunur.']
    ])}
    ${WARN('Taslak yönetmelik ve bedel bilgisi içerir. Göndermeden önce metni ve tutarı mutlaka gözden geçirin.')}
    ${H('Taslak türleri')}
    ${TABLE(['Tür', 'Ne için?'], [
        ['<b>Tesis Tamamlama Süre Uzatımı</b>', 'Üretim lisansında tesis tamamlanma süresinin uzatılması; içinde bulunulan yılın lisans alma bedeli esas alınır.'],
        ['<b>Önlisans Süre Uzatımı</b>', 'Önlisans süresinin uzatılması; önlisans alma bedeli, mekanik güç + depolama kapasitesi toplamına göre belirlenen aralıktan bulunur.'],
        ['<b>TEA Başvurusu</b>', 'TÜBİTAK BİLGEM TEA bedeli: ilk başvuruda yeni güç × yeni birim fiyat; güç artıyorsa eski güç × eski fiyat + artış × yeni fiyat; KDV eklenir.'],
        ['<b>Saha / KGÜT / ÜKT</b>', 'Saha koordinat, kurulu güç / ünite ve ünite koordinat tadilleri: asgari tadil bedeli; güç artışı aralığı aşıyorsa alma bedeli farkı.'],
        ['<b>Diğer Tadil (Asgari Tadil Bedeli)</b>', 'Kurul Kararı tablosundaki asgari tadil bedeli.']
    ])}
    ${P('EPDK tadili için hazırlanan her mailde banka / hesap / IBAN tablosu ve <b>dekont açıklaması</b> (ör. "… GES Saha Koordinat Tadil Bedeli") hazır gelir.')}
    ${H('⚙️ Bedel Ayarları (yılda bir güncelleyin)')}
    ${P('Kurul Kararı her yıl yenilenir. Yeni karar çıkınca bu pencereyi açıp şunları güncelleyin; tüm mail şablonları anında yeni değerleri kullanır:')}
    ${UL([
        '<b>Karar Yılı</b>, <b>Asgari Tadil Bedeli</b>, yerli/yenilenebilir tesislerde <b>güç artışı bedeli oranı (%)</b>.',
        '<b>Lisans / Önlisans alma bedeli</b> tablosu (kurulu güç aralıklarına göre). Bir satırın üst sınırını değiştirince sonraki satırın alt sınırı kendiliğinden güncellenir. <b>➕ Aralık Ekle</b> ile satır eklenir.',
        'Mailde görünecek <b>banka / şube, hesap adı ve IBAN</b>.',
        '<b>🍵 TEA birim fiyatları</b>: son başvuru ve yeni başvuru için MW başına tutar, KDV oranı, gönderilen kişi, şube ve IBAN.',
        '<b>↩️ Kurul Kararı 2026 Değerlerini Yükle</b>: hata yaparsanız varsayılan değerleri geri getirir.'
    ])}
    ${H('📝 Taslak Ayarları (mail metnini değiştirme)')}
    ${P('Mailin konusunu ve metnini kod değişikliği gerekmeden buradan düzenlersiniz; <b>kaydedince herkes için anında geçerli olur</b>.')}
    ${UL([
        'Üstten düzenlenecek maili seçin; <b>Konu</b>\'yu ve gövdeyi değiştirin. <b>B / I / U</b> düğmeleriyle biçim verin.',
        'Metindeki <code>{{proje}}</code> gibi <b>yer tutucular</b> mail hazırlanırken gerçek değerle (proje adı, tutar, tablolar…) değişir. Açılır listeden istediğinizi imlecin olduğu yere ekleyebilirsiniz; tam liste "Kullanılabilir değişkenler" başlığı altındadır.',
        '<b>👁 Örnek Önizleme</b> örnek verilerle sonucu gösterir. <b>↩️ Varsayılana Dön</b> orijinal metni geri getirir.'
    ])}
    ${NOTE('Yer tutucuları (çift süslü parantezli kısımlar) silmeyin ya da yazım hatası yapmayın; yanlışsa o bilgi mailde boş görünebilir.')}
    `;
}

function sAnaliz(p) {
    return `
    ${LEAD(`<b>Analiz</b> sayfası, verileri iki grafikle yan yana karşılaştırmanızı sağlar. Her grafiğin ayarı bağımsızdır.`)}
    ${OPEN('analytics', 'Analiz sayfasını aç')}
    ${TABLE(['Ayar', 'Seçenekler'], [
        ['<b>Analiz Türü</b>', 'Çeyrek Bazlı · Yükümlülük Türü · Uzman İş Yükü (Aktif) · Firma · Ana Firma · Aylık'],
        ['<b>Grafik Türü</b>', 'Bar grafik veya Pasta grafik'],
        ['<b>Yıl</b>', '2025 · 2026 · 2027 · Tüm Yıllar']
    ])}
    ${UL([
        'Bir ayarı değiştirdiğinizde grafik <b>kendiliğinden yenilenir</b>.',
        '<b>Pasta grafikte</b> bir dilime ' + tap(p) + ' ve o dilimin ayrıntısına inin; <b>← Genel Özete Dön</b> düğmesiyle geri dönün.',
        '<b>Uzman İş Yükü (Aktif)</b>, her EPDK uzmanına bağlı aktif işlerin dağılımını gösterir; iş yükünü dengelemek için kullanışlıdır.'
    ])}
    ${TIP('Örnek karşılaştırma: Grafik 1\'de "Firma / Bar", Grafik 2\'de "Yükümlülük Türü / Pasta" seçin; hangi firmanın hangi tür işlerle yoğun olduğunu aynı anda görürsünüz.')}
    ${p.mobile ? NOTE('Grafikler telefonda alt alta gösterilir.') : ''}
    `;
}

function sRapor(p) {
    return `
    ${LEAD(`<b>📄 Rapor Al</b>, toplantılarda kullanabileceğiniz çok sayfalı bir <b>Haftalık Bülten</b> PDF'i üretir. ${p.mobile ? 'Ana Sayfa\'da üst çubuktaki 📄 ikonundadır.' : 'Yalnızca Ana Sayfa\'da, üst çubukta görünür.'}`)}
    ${STEPS([
        ['Ana Sayfa\'ya gidin', ''],
        [`<b>${p.mobile ? '📄' : '📄 Rapor Al'}</b> ${p.mobile ? 'ikonuna' : 'düğmesine'} ${tap(p)}`, '"Rapor Hazırlanıyor…" ekranı ve tahmini süre görünür; birkaç saniye sürer.'],
        [p.native ? 'iOS paylaşım ekranı açılır' : 'PDF indirilir', p.native ? '<b>Dosyalar\'a Kaydet</b>, mail ya da başka bir uygulamayla paylaşın.' : 'Dosya adı <code>DaVinci_Haftalik_Bulten_YYYY-AA-GG.pdf</code> biçimindedir.']
    ])}
    ${H('Raporun içeriği')}
    ${UL([
        '<b>Özet sayfası:</b> toplam proje, bu hafta aktif kayıt, haftaya planlanan işler; ana şirket bazlı gelecek yoğunluğu (ilk 8) ve 12 aylık yoğunluk grafiği.',
        '<b>💼 Bekleyen tadil başvuruları</b> (proje bazlı).',
        '<b>✅ Geçen hafta</b> yapılanlar ve tamamlananlar.',
        '<b>📅 Bu hafta</b> yapılan ve yapılacaklar.',
        '<b>⏭️ Gelecek hafta</b> yapılacaklar.',
        '<b>📅 Gelecek yükümlülük listesi</b> (tarih sırasıyla).'
    ])}
    ${p.native ? '' : NOTE('Rapor, tarayıcınız indirmeleri engellemiyorsa dosya olarak iner. İnmezse adres çubuğundaki izin simgesine bakın.')}
    `;
}

function sBildirimler(p) {
    return `
    ${LEAD(`Panelin en değerli yanlarından biri, <b>siz bakmasanız da sizi uyarmasıdır</b>. Üç kanal vardır: e-posta, telefon bildirimi ve (kuruluysa) Teams.`)}
    ${H('📧 Günlük Özet e-postası')}
    ${P('Seçtiğiniz gün ve saatte (varsayılan 08:00, İstanbul saati) gelir. İçeriği:')}
    ${UL([
        '✏️ <b>AO\'nun hazırlayacağı yazılar</b> ve 🔍 <b>ZK\'nın kontrol edeceği yazılar</b>',
        '🚨 <b>Bugün ve gecikmiş yükümlülükler</b>',
        '🗓️ <b>Önümüzdeki 7 gün</b> içinde dolacak yükümlülükler',
        '⚡ <b>Aktif tadiller ve bulundukları aşama</b> (aksiyon bizde olanlar öne alınır)',
        '🔄 <b>Önümüzdeki 7 gün</b> için önlisans süre uzatımı iş kalemleri'
    ])}
    ${P('Bir bölümde gösterilecek iş yoksa o bölüm maile eklenmez.')}
    ${H('📊 Haftalık Yükümlülük Raporu')}
    ${P('Haftalık özet mailidir; gün ve saati ayrı ayarlanır.')}
    ${H('Zamanlamayı değiştirme')}
    ${STEPS([
        [`${p.mobile ? 'Menüden' : 'Soldan'} <b>Ayarlar</b>'a gidin`, ''],
        ['<b>🔔 Bildirim ve E-Posta Ayarları</b> kartını bulun', 'Günlük Hatırlatıcı ve Haftalık Rapor bölümleri açılır/kapanır başlıklardır.'],
        ['Gönderim <b>günlerini</b> ve <b>saatini</b> seçin', 'Saat seçenekleri 06:00 – 18:00 arasındadır.'],
        ['<b>💾 Ayarları Kaydet</b>', 'Kontrol için <b>🔔 Test Gönder</b> ile deneme bildirimi/maili alabilirsiniz.']
    ])}
    ${H('📲 Telefon bildirimleri (iPhone)')}
    ${P('iPhone uygulaması kuruluysa uygulama kapalıyken bile anlık bildirim gelir. Hangilerini alacağınızı Ayarlar > <b>📲 Mobil Bildirimler</b> bölümündeki anahtarlarla seçersiniz:')}
    ${TABLE(['Anahtar', 'Ne zaman bildirim gelir?'], [
        ['Günlük Özet Bildirimi', 'Sabah gönderilen özet mailinin bildirim hali'],
        ['Yeni Yükümlülük', 'Yeni bir yükümlülük tanımlandığında (proje adı + tür)'],
        ['Tadil İlerlemesi', 'Bir tadilde aşama kaydedildiğinde (proje adı + aşama)']
    ])}
    ${UL([
        '<b>Toplu işlemlerde</b> (ör. Excel yüklemesi) onlarca bildirim yağmaz; tek bir özet bildirim gelir.',
        '<b>Manuel Bildirim Gönder:</b> başlık ve mesaj yazıp ekipteki tüm kayıtlı cihazlara anlık bildirim yollayabilirsiniz (toplantı hatırlatması gibi).',
        '<b>Kayıtlı Cihazlar</b> ve <b>Bu Cihazın Durumu</b>: bildirim gelmiyorsa bu bölümü <u>telefondaki uygulamadan</u> açın; zincirin hangi adımında takıldığı görünür. <b>🔁 Bu Cihazı Kaydet</b> ile yeniden kayıt yapabilirsiniz.'
    ])}
    ${H('Teams')}
    ${P('Ekip Teams kanalı bağlıysa telefona giden bildirim akışı Teams sohbetine de yansır; böylece uygulama kurmamış kişiler de gelişmeleri görür.')}
    `;
}

function sAyarlar(p) {
    return `
    ${LEAD(`<b>Ayarlar</b>, verilerin yönetildiği ve panelin kurallarının belirlendiği yerdir. ${p.mobile ? 'Çoğu ayar telefonda da çalışır, ancak <b>iş akışı düzenleme yalnızca bilgisayardadır</b>.' : ''} Kartlar yukarıdan aşağıya şu sırayla gelir.`)}
    ${OPEN('settings', 'Ayarlar\'ı aç')}
    ${H('⚙️ Veri Yönetimi')}
    ${TABLE(['İşlem', 'Ne yapar?'], [
        ['<b>Excel Dosyası Yükle</b>', 'Mevcut Excel (.xlsx, .xls, .csv) dosyanızdaki yükümlülükleri panele aktarır.'],
        ['<b>Verileri Dışa Aktar</b>', 'Tüm verileri Excel olarak indirir.'],
        ['<b>Master Sistem Yedeği</b>', '"DaVinci Arşivi" biçiminde tam yedek alır. <b>Büyük değişikliklerden önce alın.</b>'],
        ['<b>Toplu Veri Güncelleme</b>', 'Proje – Şirket – Ana Şirket – Uzman bilgilerini kopyala-yapıştır ile topluca günceller.'],
        ['<b>Mevcut Proje, Firma ve Uzman Tanımları</b>', 'Projeleri tablo halinde listeler; <b>➕ Yeni Proje Ekle</b>, düzenleme ve silme buradadır.'],
        ['<b>🗑️ Tüm Verileri Sil</b>', '<b>Geri alınamaz.</b> Önce yedek alın; emin değilseniz kullanmayın.']
    ])}
    ${WARN('"Tüm Verileri Sil" ve "Tüm Proje Tanımlarını Temizle" yalnızca gerçekten sıfırdan başlamak için vardır. Yanlışlıkla basarsanız veriyi geri getirmenin tek yolu yedektir.')}
    ${H('📋 Veri Durumu')}
    ${P('Toplam kayıt, proje sayısı ve son güncelleme zamanını gösterir. Bir şey eksikse ilk bakılacak yerdir.')}
    ${H('🔔 Bildirim ve E-Posta · 📲 Mobil Bildirimler')}
    ${P(`Günlük/haftalık mail zamanlaması ve telefon bildirimi anahtarları. Ayrıntısı için ${GO('bildirimler', 'Bildirimler ve e-postalar')}.`)}
    ${H('🧩 Tadil İş Akışı Yönetimi')}
    ${P('Her tadil tipinin aşamalarını düzenlediğiniz yerdir.')}
    ${p.mobile ? NOTE('Telefonda bu kartın düzenleme düğmeleri gizlidir (sürükle-bırak dokunmatik ekranda çalışmaz). İş akışını bilgisayardan düzenleyin.') : STEPS([
        ['Listeden bir tadil tipinin <b>düzenle</b> düğmesine tıklayın ya da <b>➕ Yeni Tadil Tipi</b> deyin', ''],
        ['Sağdaki <b>iş akışı kalemlerini</b> soldaki "Bu Tadilde Olacak Adımlar" listesine sürükleyin', 'Sırayı yine sürükleyerek değiştirebilirsiniz. Yeni kalem gerekiyorsa alttaki <b>+ Ekle</b> ile oluşturun.'],
        ['<b>💾 Kaydet</b>', 'Zaten ilerlemiş kayıtların verisi yeni sıraya otomatik taşınır; hiçbir şey kaybolmaz.']
    ])}
    ${H('🎯 Aşama Sorumluluk &amp; Zorluk')}
    ${UL([
        'Her iş kalemi için topun kimde olduğunu seçersiniz: <b>🙋 Biz</b> (lisans birimi aksiyon alır) veya <b>⏳ Dış</b> (kurum/birim dönüşü beklenir). <b>Akıllı sıralama</b> ve kartlardaki sorumluluk çipi buna dayanır.',
        '<b>Zorluk puanı</b> Scrum planlama pokerindeki gibidir (1 en kolay, 13 en zor) ve kartlardaki <b>% ilerlemeyi</b> ağırlıklandırır.',
        'Üstteki arama kutusu aşamayı adıyla bulur. Buradaki değerler tüm iş akışları için geçerlidir; yalnızca bir tadil tipinde farklı olsun istiyorsanız iş akışı düzenleyicisinden o adıma özel değer verin.'
    ])}
    `;
}

function sGorevler(p) {
    const t = tap(p);
    return `
    ${LEAD(`Günlük işlerin kısa tarifleri. Her biri baştan sona, adım adım. Bir başlığa ${t} ve açın.`)}

    <details class="g-acc" open><summary><span class="g-acc-t">🆕 Yeni bir tadil süreci başlatmak</span></summary>
    ${STEPS([
        [`${p.mobile ? '💼 ikonuna' : 'Yeni Tadil Başvurusu düğmesine'} ${t}`, ''],
        ['Projeyi ve tadil türünü seçin', ''],
        ['Kaydedin', 'Kart Tadiller sayfasında belirir.'],
        ['Karta ' + t + ' ve ilk aşamayı doldurun', '<i>Aşamayı Kaydet &amp; İlerlet</i> deyin.']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">✅ Bir aşamayı tamamlamak</span></summary>
    ${STEPS([
        ['Tadiller sayfasında kartı bulun', 'Akıllı sıralamada acil olanlar üsttedir.'],
        ['Karta ' + t, 'Aktif (⚡) aşama açık gelir.'],
        ['Tarih / sayı gibi alanları doldurun', ''],
        ['<b>Aşamayı Kaydet &amp; İlerlet</b>', 'Yeşile dönerse tamam.']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">📝 Yeni yükümlülük eklemek</span></summary>
    ${STEPS([
        [`${p.mobile ? '➕ ikonuna' : 'Yeni Yükümlülük düğmesine'} ${t}`, ''],
        ['Proje, tür, açıklama ve son tarihi girin', ''],
        ['Kaydedin', 'Hem listede hem Ana Sayfa\'da görünür.']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">⌛ Önlisans süre uzatımı açmak ve ilerletmek</span></summary>
    ${STEPS([
        ['<b>Önlisans Süre Uzatımları</b> sayfasına gidin', ''],
        ['<b>➕ Yeni Süre Uzatımı Aç</b>', 'Projeyi seçin, (varsa) özet isteme tarihini girin, kaydedin.'],
        [p.mobile ? 'Projenin kartında aşama tarihlerini girin ya da ✓ düğmesine dokunun' : 'Satırda aşama hücrelerine tarih girin ya da ✓ ile tamamlayın', 'İlk aşama işaretlenince kayıt Tadiller sayfasına da taşınır.'],
        ['Ayrıntı için <b>Detayları Aç</b>', 'Tam tadil penceresi açılır.']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">✉️ Bedel maili hazırlamak</span></summary>
    ${STEPS([
        ['<b>Mail Hazırlığı</b> sayfasına gidin', ''],
        ['Tadil tipini, projeyi ve hitabı girin; gerekli güç değerlerini yazın', 'Bedel anında hesaplanır.'],
        ['Metni gözden geçirin, gerekirse düzenleyin', ''],
        ['<b>Konu → Kopyala</b> ve <b>📋 Maili Kopyala</b>', 'Mail programınıza yapıştırıp gönderin.']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">📄 Toplantı raporu almak</span></summary>
    ${STEPS([
        ['Ana Sayfa\'ya gidin', ''],
        [`${p.mobile ? '📄 ikonuna' : '<b>📄 Rapor Al</b> düğmesine'} ${t}`, ''],
        [p.native ? 'Paylaşım ekranından kaydedin veya gönderin' : 'İnen PDF\'i açın', '']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">🔔 Günlük özet saatini değiştirmek</span></summary>
    ${STEPS([
        ['<b>Ayarlar → Bildirim ve E-Posta Ayarları</b>', ''],
        ['Günleri ve saati seçin', ''],
        ['<b>💾 Ayarları Kaydet</b>', '']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">🛡️ Yedek almak</span></summary>
    ${STEPS([
        ['<b>Ayarlar → Veri Yönetimi</b>', ''],
        ['<b>🛡️ Güvenli Yedek Al</b>', 'Dosya "DaVinci Arşivi" biçiminde cihazınıza iner. Büyük bir değişiklikten önce alın.']
    ])}
    </details>

    <details class="g-acc"><summary><span class="g-acc-t">🔄 Yanlış ilerlettiğim aşamayı geri almak</span></summary>
    ${STEPS([
        ['Kartı açın', ''],
        ['Geri dönmek istediğiniz <b>tamamlanmış</b> aşamayı açın', ''],
        ['<b>🔄 Bu Aşamaya Geri Dön</b>', 'Süreç o aşamadan devam eder.']
    ])}
    </details>
    `;
}

function sTelefon(p) {
    if (!p.mobile) {
        return `
        ${LEAD(`Panelin bir <b>iPhone uygulaması</b> da vardır. Bilgisayardaki web sitesiyle <b>aynı veriyi</b> gösterir; sitede yaptığınız her değişiklik telefonda da görünür.`)}
        ${UL([
            '<b>Aynı kod, aynı veri:</b> uygulama, web sitesini çalıştıran bir iPhone kabuğudur. Sitedeki her yenilik telefona otomatik gelir; uygulamayı yeniden yüklemek gerekmez.',
            '<b>Anlık bildirimler</b> (günlük özet, yeni yükümlülük, tadil ilerlemesi), <b>Face ID kilidi</b> ve simge üzerinde <b>rozet</b> yalnızca uygulamada vardır.',
            'Uygulama şu an <b>TestFlight</b> ile ekibe dağıtılır. Kurulum için yöneticiden davet isteyin.',
            'Telefonun tarayıcısından siteyi açarsanız da çalışır; ama bildirimler ve Face ID için uygulama gerekir.'
        ])}
        ${TIP('Telefondaki kılavuzu görmek için sağ üstteki <b>📱 Telefon</b> düğmesine tıklayın.')}`;
    }
    const nat = p.native;
    return `
    ${LEAD(nat ? 'Şu an <b>iPhone uygulamasındasınız</b>. Aşağıda bu uygulamaya özel olanlar var.' : 'Şu an telefon tarayıcısındasınız. <b>iPhone uygulamasını</b> kurarsanız aşağıdaki özellikler de gelir.')}
    ${H('Uygulamayla gelenler')}
    ${CARDS([
        ['🔔', 'Anlık bildirimler', 'Uygulama kapalıyken bile günlük özet, yeni yükümlülük ve tadil ilerlemesi bildirimi gelir.'],
        ['🔐', 'Face ID kilidi', 'Uygulama açılırken ve 5 dakikadan uzun arka planda kaldıktan sonra kimlik doğrulaması ister. Face ID yoksa cihaz şifresi sorulur.'],
        ['🔴', 'Simge rozeti', 'Uygulama simgesinin üzerindeki sayı: bugünkü + gecikmiş yükümlülük sayısı.'],
        ['⬇️', 'Aşağı çekip yenile', 'Sayfanın en üstündeyken aşağı sürükleyin.'],
        ['📴', 'Çevrimdışı uyarısı', 'İnternet kesilince üstte kırmızı şerit çıkar.'],
        ['📤', 'PDF paylaşımı', 'Rapor Al\'dan sonra iOS paylaşım ekranı açılır: Dosyalar\'a kaydedin ya da mail atın.'],
        ['🔗', 'M-Files bağlantıları', 'Safari\'de açılır.'],
        ['↩️', 'Geri kaydırma', 'Ekranın sol kenarından kaydırarak bir önceki ekrana dönersiniz.']
    ])}
    ${H('Kurulum')}
    ${STEPS([
        ['Yöneticiden <b>TestFlight davetini</b> isteyin', 'Davet e-postası Apple\'dan gelir.'],
        ['iPhone\'unuza <b>TestFlight</b> uygulamasını kurun', 'App Store\'dan ücretsizdir.'],
        ['Davetteki bağlantıyla <b>Süre Takip</b>\'i yükleyin', ''],
        ['Açın, e-posta ve şifrenizle giriş yapın', 'Bildirim izni sorulursa <b>İzin Ver</b> deyin.'],
        ['Ayarlar > <b>📲 Mobil Bildirimler</b> bölümünden hangi bildirimleri istediğinizi seçin', '<b>Bu Cihazın Durumu</b> bölümü her şeyin yolunda olup olmadığını gösterir.']
    ])}
    ${NOTE('Bildirimler yalnızca <b>gerçek telefonda</b> çalışır; simülatörde çalışmaz.')}
    ${H('Telefonda dikkat')}
    ${UL([
        '<b>Tablolar kart olur:</b> Yükümlülükler ve Önlisans matrisi telefonda alt alta kartlar halinde gösterilir.',
        '<b>Pencereler alttan açılır</b> ve tam sayfa kayar; kapatmak için sağ üstteki ✕ düğmesini kullanın.',
        '<b>İş akışı düzenleme</b> (Ayarlar) yalnızca bilgisayarda yapılabilir.',
        'Excel yükleme/indirme telefonda çalışır ama bilgisayarda çok daha rahattır.'
    ])}
    `;
}

function sIpuclari(p) {
    return `
    ${LEAD(`Kısa ipuçları ve takıldığınızda bakacağınız yerler.`)}
    ${H('Kestirme yollar')}
    ${UL([
        '<b>Sayaçlar ' + (p.mobile ? 'dokunulabilir' : 'tıklanabilir') + ':</b> Ana Sayfa ve Tadiller\'deki sayı kutularına ' + tap(p) + ' ve ilgili sayfa o filtreyle açılsın.',
        '<b>Akıllı sıralama</b> açıkken Tadiller listesinin başı "bugün neye dokunmalıyım?" sorusunun cevabıdır.',
        '<b>Not düşme alışkanlığı:</b> Aşama kaydederken veya kurumla konuştuktan sonra karta kısa bir not yazın; kim ne zaman ne yaptığı kalır.',
        '<b>M-Files bağlantısı:</b> Yükümlülük ve TEA kayıtlarına arşiv bağlantısı ekleyin; tek ' + (p.mobile ? 'dokunuşla' : 'tıkla') + ' belgeye ulaşırsınız.',
        '<b>Büyük değişiklikten önce yedek:</b> Ayarlar > Güvenli Yedek Al.'
    ])}
    ${H('Sık sorulan sorular')}
    <details class="g-acc"><summary><span class="g-acc-t">Tadil kartım listede yok, nerede?</span></summary>
        ${UL(['Filtreleri kontrol edin: <b>Durum</b> açılışta "Aktif Süreçler"dir; tamamlanmışsa "Tamamlananlar" ya da "Tümü" seçin.', 'Henüz hiçbir aşaması başlamamış bir <b>önlisans süre uzatımı</b> ise yalnızca Önlisans sayfasında görünür (listede bilgi şeridi çıkar).', 'Şirket / Proje / Uzman / Tadil Tipi filtrelerinden biri seçili olabilir.'])}
    </details>
    <details class="g-acc"><summary><span class="g-acc-t">Bir aşama kilitli, açılmıyor.</span></summary>
        ${P('Önceki aşamalar tamamlanmadan sonraki açılmaz. Önce aktif (⚡) aşamayı kaydedin. Yanlışlıkla ilerlettiyseniz tamamlanmış aşamadaki <b>Bu Aşamaya Geri Dön</b> ile geri çekin.')}
    </details>
    <details class="g-acc"><summary><span class="g-acc-t">Yaptığım değişiklik başkasında görünmüyor.</span></summary>
        ${P('Kayıt buluta yazıldıktan sonra diğer kişi sayfayı yenilediğinde ' + (p.mobile ? '(uygulamada aşağı çekerek)' : '(<b>F5</b> ile)') + ' görür. Kayıt sırasında internet yoksa değişiklik buluta gitmez; bağlantıyı kontrol edip tekrar kaydedin.')}
    </details>
    <details class="g-acc"><summary><span class="g-acc-t">Bildirim ya da günlük özet gelmiyor.</span></summary>
        ${UL(['Ayarlar > Bildirim ve E-Posta Ayarları\'nda <b>gün ve saati</b> kontrol edin, <b>🔔 Test Gönder</b> ile deneyin.', 'Telefon bildirimi için: telefondaki uygulamadan Ayarlar > Mobil Bildirimler > <b>Bu Cihazın Durumu</b>\'na bakın; takılan adım orada yazar. Gerekirse <b>🔁 Bu Cihazı Kaydet</b>.', 'Mail spam / gereksiz klasörüne düşmüş olabilir.'])}
    </details>
    <details class="g-acc"><summary><span class="g-acc-t">Ekranda "Sistem Hatası" uyarısı çıktı.</span></summary>
        ${P('Uyarıdaki dosya ve satır bilgisini içeren bir <b>ekran görüntüsü</b> alıp yöneticiye iletin. Sayfayı yenilemek çoğu zaman sorunu giderir.')}
    </details>
    <details class="g-acc"><summary><span class="g-acc-t">Yanlışlıkla bir şeyi sildim.</span></summary>
        ${P('Hemen yöneticiye haber verin ve başka değişiklik yapmayın. Tadil silmeleri geri alınamaz; ancak "Güvenli Yedek" varsa oradan geri getirilebilir. Silmeden önce panel onay sorar, bu uyarıları dikkatle okuyun.')}
    </details>
    <details class="g-acc"><summary><span class="g-acc-t">Kılavuzda eksik / yanlış bir şey gördüm.</span></summary>
        ${P('Yöneticiye bildirin. Tadil tipleri ve sayılar canlı okunduğu için güncel kalır; anlatım metinleri ise güncelleme sırasında elle yenilenir.')}
    </details>
    `;
}

const SECTIONS = [
    { id: 'ozet', icon: '🧭', title: 'Bu panel ne işe yarar?', body: sOzet },
    { id: 'baslarken', icon: '🚪', title: 'Başlarken', body: sBaslarken },
    { id: 'ana-sayfa', icon: '📊', title: 'Ana Sayfa', body: sAnaSayfa },
    { id: 'tadiller', icon: '💼', title: 'Tadiller & Süreç Takibi', body: sTadiller },
    { id: 'tadil-tipleri', icon: '🛤️', title: 'Tadil Tipleri ve Aşamaları', body: sTadilTipleri },
    { id: 'onlisans', icon: '⌛', title: 'Önlisans Süre Uzatımları', body: sOnlisans },
    { id: 'tea', icon: '🍵', title: 'TEA Başvuruları', body: sTea },
    { id: 'yukumlulukler', icon: '📋', title: 'Yükümlülükler', body: sYukumlulukler },
    { id: 'projeler', icon: '🏭', title: 'Projeler', body: sProjeler },
    { id: 'mail', icon: '✉️', title: 'Mail Hazırlığı', body: sMail },
    { id: 'analiz', icon: '📈', title: 'Analiz', body: sAnaliz },
    { id: 'rapor', icon: '📄', title: 'Rapor Al', body: sRapor },
    { id: 'bildirimler', icon: '🔔', title: 'Bildirimler ve E-postalar', body: sBildirimler },
    { id: 'ayarlar', icon: '⚙️', title: 'Ayarlar', body: sAyarlar },
    { id: 'gorevler', icon: '🪜', title: 'Sık Yapılan İşler (adım adım)', body: sGorevler },
    { id: 'telefon', icon: '📲', title: p => (p.mobile ? 'iPhone Uygulaması' : 'Telefondan Kullanım'), body: sTelefon },
    { id: 'ipuclari', icon: '🛟', title: 'İpuçları ve Sorun Giderme', body: sIpuclari }
];

const sectionTitle = (s, p) => (typeof s.title === 'function' ? s.title(p) : s.title);

// ==========================================
// "Neler Yeni" (sürüm geçmişi) görünümü
// ==========================================

const GROUPS = [
    ['added', '➕', 'Eklenenler', 'add'],
    ['changed', '✏️', 'Değişenler', 'chg'],
    ['removed', '➖', 'Çıkarılanlar', 'rem'],
    ['fixed', '🛠️', 'Düzeltmeler', 'fix']
];

function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function releaseGroupsHtml(r) {
    return GROUPS.map(([key, icon, label, cls]) => {
        const items = r[key] || [];
        if (!items.length) return '';
        return `<div class="wn-group ${cls}"><div class="wn-group-h"><span>${icon}</span>${label}<em>${items.length}</em></div><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
    }).join('');
}

function newsView() {
    return `
    <div class="g-news">
        <p class="g-lead">Paneldeki her güncellemenin kaydı. En yeni en üstte. Bir güncellemede neyin eklendiğini, değiştiğini, çıkarıldığını ve düzeltildiğini buradan okuyabilirsiniz.</p>
        ${RELEASES.map((r, i) => `
            <article class="wn-release ${i === 0 ? 'latest' : ''}">
                <header class="wn-head">
                    <span class="wn-ver">${releaseLabel(r)}</span>
                    ${i === 0 ? '<span class="wn-badge">Güncel</span>' : ''}
                    <span class="wn-date">${esc(fmtDate(r.date))}</span>
                </header>
                <h3 class="wn-title">${esc(r.title)}</h3>
                ${releaseGroupsHtml(r)}
            </article>`).join('')}
    </div>`;
}

// ==========================================
// Kılavuz penceresi
// ==========================================

const state = { tab: 'guide', platform: 'desktop', query: '', spy: null };

function modalEl() { return document.getElementById('helpModal'); }
function shellEl() { return document.getElementById('guideModalContent'); }

function renderShell() {
    const root = shellEl();
    if (!root) return;
    const mobile = state.platform === 'mobile';
    const detected = detectPlatform();
    const p = { mobile, native: detected.native && mobile };

    const toc = SECTIONS.map(s => `<a href="#" class="g-toc-i" data-g-goto="${s.id}" data-g-toc="${s.id}"><span>${s.icon}</span><b>${esc(sectionTitle(s, p))}</b></a>`).join('');

    root.dataset.platform = state.platform;
    root.dataset.tab = state.tab;
    root.innerHTML = `
        <header class="g-head">
            <div class="g-head-l">
                <h2>📖 Kullanım Kılavuzu</h2>
                <button type="button" class="g-ver" data-g-tab="news" title="Sürüm geçmişi">${releaseLabel()}</button>
            </div>
            <button type="button" class="g-close" id="guideClose" aria-label="Kapat">&times;</button>
            <div class="g-head-r">
                <div class="g-seg" role="tablist" aria-label="Bölüm">
                    <button type="button" role="tab" class="${state.tab === 'guide' ? 'on' : ''}" data-g-tab="guide">📖 Kılavuz</button>
                    <button type="button" role="tab" class="${state.tab === 'news' ? 'on' : ''}" data-g-tab="news">🆕 Neler Yeni</button>
                </div>
                <div class="g-seg" role="tablist" aria-label="Cihaz">
                    <button type="button" role="tab" class="${!mobile ? 'on' : ''}" data-g-platform="desktop">💻 Bilgisayar</button>
                    <button type="button" role="tab" class="${mobile ? 'on' : ''}" data-g-platform="mobile">📱 Telefon</button>
                </div>
            </div>
        </header>
        <div class="g-banner${detected.mobile === mobile ? '' : ' mismatch'}">
            ${mobile
                ? (detected.native ? '📱 iPhone uygulamasına göre gösteriliyor.' : '📱 Telefon sürümü gösteriliyor.')
                : '💻 Bilgisayar (web sitesi) sürümü gösteriliyor.'}
            ${detected.mobile === mobile ? '' : '<span> · Bu cihazınıza göre değil, seçtiğiniz görünüme göre.</span>'}
        </div>
        ${state.tab === 'guide' ? `
        <div class="g-body">
            <nav class="g-toc" aria-label="İçindekiler">
                <div class="g-search"><input type="search" id="guideSearch" placeholder="🔍 Kılavuzda ara…" value="${esc(state.query)}" autocomplete="off"></div>
                <div class="g-toc-list">${toc}</div>
            </nav>
            <div class="g-scroll" id="guideScroll">
                ${SECTIONS.map(s => `
                    <section class="g-sec" id="g-sec-${s.id}" data-sec="${s.id}">
                        <h3 class="g-sec-h"><span class="g-sec-i">${s.icon}</span>${esc(sectionTitle(s, p))}</h3>
                        ${s.body(p)}
                    </section>`).join('')}
                <div class="g-empty" id="guideEmpty" hidden>Aramanızla eşleşen bölüm bulunamadı.</div>
                <footer class="g-foot">Sorunuz kaldıysa yöneticinize ulaşın. · ${releaseLabel()}</footer>
            </div>
        </div>` : `
        <div class="g-body news">
            <div class="g-scroll" id="guideScroll">${newsView()}</div>
        </div>`}
    `;

    if (state.tab === 'guide') {
        applySearch();
        setupSpy();
    }
}

function applySearch() {
    const q = state.query.trim().toLocaleLowerCase('tr');
    const root = shellEl();
    if (!root) return;
    let any = false;
    root.querySelectorAll('.g-sec').forEach(sec => {
        const hit = !q || sec.textContent.toLocaleLowerCase('tr').includes(q);
        sec.hidden = !hit;
        const link = root.querySelector(`[data-g-toc="${sec.dataset.sec}"]`);
        if (link) link.hidden = !hit;
        if (hit) any = true;
        // Aramada eşleşen bölümlerde, eşleşen kapalı kutuları aç.
        if (q && hit) sec.querySelectorAll('details').forEach(d => { d.open = d.textContent.toLocaleLowerCase('tr').includes(q); });
    });
    const empty = root.querySelector('#guideEmpty');
    if (empty) empty.hidden = any;
}

function setupSpy() {
    if (state.spy) { state.spy.disconnect(); state.spy = null; }
    const root = shellEl();
    const scroller = root?.querySelector('#guideScroll');
    if (!scroller || !('IntersectionObserver' in window)) return;
    const mark = id => {
        root.querySelectorAll('.g-toc-i').forEach(a => a.classList.toggle('on', a.dataset.gToc === id));
        const on = root.querySelector('.g-toc-i.on');
        // Telefonda içindekiler yatay şerit: etkin olanı görünür tut.
        if (on && root.dataset.platform === 'mobile') on.scrollIntoView({ inline: 'center', block: 'nearest' });
    };
    state.spy = new IntersectionObserver(entries => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) mark(vis[0].target.dataset.sec);
    }, { root: scroller, rootMargin: '0px 0px -70% 0px', threshold: 0 });
    scroller.querySelectorAll('.g-sec').forEach(s => state.spy.observe(s));
}

function scrollToSection(id) {
    const root = shellEl();
    const scroller = root?.querySelector('#guideScroll');
    const sec = root?.querySelector(`#g-sec-${id}`);
    if (!scroller || !sec) return;
    if (sec.hidden) {
        state.query = '';
        const input = root.querySelector('#guideSearch');
        if (input) input.value = '';
        applySearch();
    }
    // .g-scroll konumlu (position: relative) olduğundan sec.offsetTop zaten ona göre ölçülür.
    scroller.scrollTo({ top: Math.max(0, sec.offsetTop - 8), behavior: 'smooth' });
}

export function closeGuide() {
    modalEl()?.classList.remove('show');
    if (state.spy) { state.spy.disconnect(); state.spy = null; }
}

/** opts: { tab: 'guide' | 'news', section?: string, platform?: 'desktop' | 'mobile' } */
export function openGuide(opts = {}) {
    const modal = modalEl();
    if (!modal) return;
    const detected = detectPlatform();
    state.platform = opts.platform || (detected.mobile ? 'mobile' : 'desktop');
    state.tab = opts.tab || 'guide';
    state.query = '';
    renderShell();
    modal.classList.add('show');
    if (opts.section && state.tab === 'guide') setTimeout(() => scrollToSection(opts.section), 60);
    const scroller = shellEl()?.querySelector('#guideScroll');
    if (scroller && !opts.section) scroller.scrollTop = 0;
}

function onShellClick(e) {
    const t = e.target.closest('[data-g-tab],[data-g-platform],[data-g-goto],[data-g-page],#guideClose');
    if (!t) return;
    if (t.id === 'guideClose') { closeGuide(); return; }
    if (t.dataset.gTab) { state.tab = t.dataset.gTab; renderShell(); return; }
    if (t.dataset.gPlatform) { state.platform = t.dataset.gPlatform; renderShell(); return; }
    if (t.dataset.gGoto) {
        e.preventDefault();
        if (state.tab !== 'guide') { state.tab = 'guide'; renderShell(); }
        scrollToSection(t.dataset.gGoto);
        return;
    }
    if (t.dataset.gPage) {
        closeGuide();
        document.querySelector(`.nav-menu .nav-item[data-page="${t.dataset.gPage}"]`)?.click();
    }
}

// ==========================================
// "Son güncelleme" kartı (Ana Sayfa)
// ==========================================

const seenKey = email => 'sure_takip_seen_release:' + String(email || 'anon').toLowerCase();
function readSeen(email) { try { return localStorage.getItem(seenKey(email)); } catch (e) { return null; } }
function writeSeen(email, id) { try { localStorage.setItem(seenKey(email), id); } catch (e) { /* özel gezinti vb. */ } }

/**
 * Kullanıcı bu sürümü ilk kez görüyorsa Ana Sayfa'nın tepesine kartı koyar.
 * Kart bu oturumda sayfada kalır; ancak "görüldü" olarak hemen işaretlenir,
 * yani bir sonraki girişte (sürüm değişmedikçe) tekrar çıkmaz. Kaçıran
 * kullanıcı Kılavuz > Neler Yeni sekmesinden ya da menüdeki sürüm etiketinden
 * okuyabilir.
 */
export function renderWhatsNew(email) {
    const mount = document.getElementById('whatsNewMount');
    if (!mount) return;

    const seen = readSeen(email);
    if (seen === LATEST_RELEASE.id) { mount.innerHTML = ''; return; }

    // Son ziyaretten bu yana çıkan güncellemeler (en fazla 3); hiç ziyaret yoksa yalnızca sonuncu.
    const idx = RELEASES.findIndex(r => r.id === seen);
    const unseen = (idx === -1 ? [LATEST_RELEASE] : RELEASES.slice(0, idx)).slice(0, 3);
    const [latest, ...older] = unseen;

    mount.innerHTML = `
    <section class="wn-card" aria-label="Son güncelleme">
        <header class="wn-card-head">
            <div class="wn-card-t">
                <span class="wn-pill">🆕 Son güncelleme</span>
                <span class="wn-ver">${releaseLabel(latest)}</span>
                <span class="wn-date">${esc(fmtDate(latest.date))}</span>
            </div>
            <button type="button" class="wn-x" data-wn="close" aria-label="Kapat">&times;</button>
        </header>
        <h3 class="wn-title">${esc(latest.title)}</h3>
        <div class="wn-groups">${releaseGroupsHtml(latest)}</div>
        <button type="button" class="wn-more" data-wn="more">Devamını göster ▾</button>
        ${older.length ? `
        <details class="wn-older">
            <summary>Son ziyaretinizden bu yana ${older.length} güncelleme daha</summary>
            ${older.map(r => `<div class="wn-older-r"><div class="wn-older-h"><span class="wn-ver">${releaseLabel(r)}</span> ${esc(r.title)}</div>${releaseGroupsHtml(r)}</div>`).join('')}
        </details>` : ''}
        <footer class="wn-card-foot">
            <button type="button" class="btn btn-secondary btn-sm" data-wn="guide">📖 Kılavuzu aç</button>
            <button type="button" class="btn btn-secondary btn-sm" data-wn="history">Tüm güncelleme geçmişi</button>
            <button type="button" class="btn btn-primary btn-sm" data-wn="close">Anladım</button>
        </footer>
    </section>`;

    writeSeen(email, LATEST_RELEASE.id);

    mount.querySelector('.wn-card').addEventListener('click', e => {
        const b = e.target.closest('[data-wn]');
        if (!b) return;
        if (b.dataset.wn === 'close') mount.innerHTML = '';
        else if (b.dataset.wn === 'more') mount.querySelector('.wn-card').classList.add('expanded');
        else if (b.dataset.wn === 'guide') openGuide({ tab: 'guide' });
        else if (b.dataset.wn === 'history') openGuide({ tab: 'news' });
    });
}

// ==========================================
// Başlatma
// ==========================================

let initialised = false;

/** Uygulama açılırken bir kez çağrılır: kılavuz düğmesi, sürüm etiketi ve olay bağlantıları. */
export function initGuide() {
    if (initialised) return;
    initialised = true;

    const modal = modalEl();
    if (modal && !shellEl()) {
        modal.innerHTML = '<div class="modal-content guide-modal" id="guideModalContent" role="dialog" aria-modal="true" aria-label="Kullanım Kılavuzu"></div>';
    }
    shellEl()?.addEventListener('click', onShellClick);
    shellEl()?.addEventListener('input', e => {
        if (e.target.id === 'guideSearch') { state.query = e.target.value; applySearch(); }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modalEl()?.classList.contains('show')) closeGuide();
    });

    const ver = document.getElementById('sidebarVersionBtn');
    if (ver) {
        ver.textContent = `🆕 ${releaseLabel()} · Neler yeni`;
        ver.addEventListener('click', () => openGuide({ tab: 'news' }));
    }
}

/** Kenar çubuğundaki "Nasıl Kullanılır?" düğmesi için (app.js eski bağlamasını bununla değiştirir). */
export function bindHelpButton() {
    document.getElementById('sidebarHelpBtn')?.addEventListener('click', () => openGuide({ tab: 'guide' }));
}
